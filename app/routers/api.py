from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select

from ..db import get_db
from ..models import PatientIntake, VitalsEntry, ClinicalSummary
from ..schemas import IntakeCreate, VitalsCreate, DecisionUpdate
from ..services.ai import generate_clinical_summary

router = APIRouter(prefix="/api", tags=["api"])


def _split_lines(value: str) -> list[str]:
    if not value:
        return []
    return [line for line in value.splitlines() if line.strip()]


def _summary_to_dict(summary: ClinicalSummary | None) -> dict:
    if not summary:
        return {}
    return {
        "short_summary": summary.short_summary,
        "priority_level": summary.priority_level,
        "red_flags": _split_lines(summary.red_flags),
        "differential": _split_lines(summary.differential),
        "recommended_questions": _split_lines(summary.recommended_questions),
        "recommended_next_steps": _split_lines(summary.recommended_next_steps),
        "doctor_note": summary.doctor_note,
        "decision": summary.decision,
    }


def _intake_to_dict(intake: PatientIntake) -> dict:
    return {
        "id": intake.id,
        "full_name": intake.full_name,
        "age": intake.age,
        "sex": intake.sex,
        "address": intake.address,
        "chief_complaint": intake.chief_complaint,
        "symptoms": intake.symptoms,
        "duration": intake.duration,
        "severity": intake.severity,
        "history": intake.history,
        "medications": intake.medications,
        "allergies": intake.allergies,
        "created_at": intake.created_at.strftime("%Y-%m-%d %H:%M"),
        "has_vitals": intake.vitals is not None,
        "has_summary": intake.clinical_summary is not None,
        "priority_level": intake.clinical_summary.priority_level if intake.clinical_summary else None,
        "clinical_summary": _summary_to_dict(intake.clinical_summary),
        "vitals": {
            "heart_rate": intake.vitals.heart_rate,
            "respiratory_rate": intake.vitals.respiratory_rate,
            "temperature_c": intake.vitals.temperature_c,
            "spo2": intake.vitals.spo2,
            "systolic_bp": intake.vitals.systolic_bp,
            "diastolic_bp": intake.vitals.diastolic_bp,
        }
        if intake.vitals
        else None,
    }


@router.get("/intakes")
def list_intakes(db: Session = Depends(get_db)):
    intakes = db.execute(select(PatientIntake).order_by(PatientIntake.created_at.desc())).scalars().all()
    return [_intake_to_dict(i) for i in intakes]


@router.get("/intakes/{intake_id}")
def get_intake(intake_id: int, db: Session = Depends(get_db)):
    intake = db.get(PatientIntake, intake_id)
    if not intake:
        raise HTTPException(status_code=404, detail="Intake not found")
    return _intake_to_dict(intake)


@router.post("/intakes")
def create_intake(payload: IntakeCreate, db: Session = Depends(get_db)):
    intake = PatientIntake(**payload.model_dump())
    db.add(intake)
    db.commit()
    db.refresh(intake)
    return {"id": intake.id}


@router.post("/intakes/{intake_id}/vitals")
def submit_vitals(intake_id: int, payload: VitalsCreate, db: Session = Depends(get_db)):
    intake = db.get(PatientIntake, intake_id)
    if not intake:
        raise HTTPException(status_code=404, detail="Intake not found")

    if intake.vitals:
        db.delete(intake.vitals)
        db.commit()

    vitals = VitalsEntry(intake_id=intake_id, **payload.model_dump())
    db.add(vitals)
    db.commit()
    db.refresh(vitals)

    if intake.clinical_summary:
        db.delete(intake.clinical_summary)
        db.commit()

    payload_ai = {
        "intake": {
            "full_name": intake.full_name,
            "age": intake.age,
            "sex": intake.sex,
            "chief_complaint": intake.chief_complaint,
            "symptoms": intake.symptoms,
            "duration": intake.duration,
            "severity": intake.severity,
        },
        "vitals": {
            "heart_rate": vitals.heart_rate,
            "respiratory_rate": vitals.respiratory_rate,
            "temperature_c": vitals.temperature_c,
            "spo2": vitals.spo2,
            "systolic_bp": vitals.systolic_bp,
            "diastolic_bp": vitals.diastolic_bp,
        },
    }

    ai = generate_clinical_summary(payload_ai)

    summary = ClinicalSummary(
        intake_id=intake_id,
        short_summary=ai["short_summary"],
        priority_level=ai["priority_level"],
        red_flags="\n".join(ai["red_flags"]),
        differential="\n".join(ai["differential_considerations"]),
        recommended_questions="\n".join(ai["recommended_questions"]),
        recommended_next_steps="\n".join(ai["recommended_next_steps"]),
        decision="PENDING",
    )
    db.add(summary)
    db.commit()

    return _summary_to_dict(summary)


@router.post("/intakes/{intake_id}/decision")
def update_decision(intake_id: int, payload: DecisionUpdate, db: Session = Depends(get_db)):
    intake = db.get(PatientIntake, intake_id)
    if not intake or not intake.clinical_summary:
        raise HTTPException(status_code=404, detail="Summary not found")

    summary: ClinicalSummary = intake.clinical_summary
    summary.decision = payload.decision
    summary.doctor_note = payload.doctor_note
    db.add(summary)
    db.commit()

    return {"status": "ok"}
