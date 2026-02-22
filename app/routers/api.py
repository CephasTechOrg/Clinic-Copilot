from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select
import os
from dotenv import load_dotenv

from ..db import get_db
from ..models import PatientIntake, VitalsEntry, ClinicalSummary, User
from ..schemas import IntakeCreate, VitalsCreate, DecisionUpdate
from ..services.ai import generate_clinical_summary
from ..auth import require_nurse, require_doctor, require_staff

load_dotenv()

router = APIRouter(prefix="/api", tags=["api"])


@router.get("/health")
def health_check(db: Session = Depends(get_db)):
    """Health check endpoint to verify API and database connectivity."""
    try:
        # Test database connection
        db.execute(select(PatientIntake).limit(1))
        gemini_configured = bool(os.getenv("GEMINI_API_KEY"))
        return {
            "status": "healthy",
            "database": "connected",
            "ai_configured": gemini_configured
        }
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Service unavailable: {str(e)}")


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
        "created_at": summary.created_at.strftime("%Y-%m-%d %H:%M:%S"),
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
        "workflow_status": getattr(intake, 'workflow_status', 'PENDING_NURSE'),
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

def _demo_seed_allowed() -> bool:
    value = os.getenv("ALLOW_DEMO_SEED", "")
    return value.strip().lower() in {"1", "true", "yes", "on"}


@router.get("/intakes")
def list_intakes(db: Session = Depends(get_db), user: User = Depends(require_staff)):
    """List all intakes. Requires NURSE or DOCTOR role."""
    intakes = db.execute(select(PatientIntake).order_by(PatientIntake.created_at.desc())).scalars().all()
    return [_intake_to_dict(i) for i in intakes]


@router.get("/intakes/{intake_id}")
def get_intake(intake_id: int, db: Session = Depends(get_db), user: User = Depends(require_staff)):
    """Get a specific intake. Requires NURSE or DOCTOR role."""
    intake = db.get(PatientIntake, intake_id)
    if not intake:
        raise HTTPException(status_code=404, detail="Intake not found")
    return _intake_to_dict(intake)


@router.post("/intakes")
def create_intake(payload: IntakeCreate, db: Session = Depends(get_db)):
    intake = PatientIntake(**payload.model_dump())
    intake.workflow_status = "PENDING_NURSE"
    db.add(intake)
    db.commit()
    db.refresh(intake)
    return {"id": intake.id, "message": "Data successfully submitted to Nurse"}


@router.post("/intakes/{intake_id}/vitals")
def submit_vitals(intake_id: int, payload: VitalsCreate, db: Session = Depends(get_db), user: User = Depends(require_nurse)):
    """Submit vitals for an intake. Requires NURSE role."""
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
            "history": intake.history,
            "medications": intake.medications,
            "allergies": intake.allergies,
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
    
    # Update workflow status to PENDING_DOCTOR
    intake.workflow_status = "PENDING_DOCTOR"
    db.add(intake)
    db.commit()

    result = _summary_to_dict(summary)
    result["message"] = "Vitals successfully sent to Doctor"
    return result


@router.post("/intakes/{intake_id}/decision")
def update_decision(intake_id: int, payload: DecisionUpdate, db: Session = Depends(get_db), user: User = Depends(require_doctor)):
    """Update decision for an intake. Requires DOCTOR role."""
    intake = db.get(PatientIntake, intake_id)
    if not intake:
        raise HTTPException(status_code=404, detail="Intake not found")
    
    # EC-10: Must have vitals before making decision
    if not intake.vitals:
        raise HTTPException(status_code=400, detail="Cannot make decision without vitals")
    
    if not intake.clinical_summary:
        raise HTTPException(status_code=400, detail="Clinical summary not generated yet")
    
    # EC-12: Prevent changing decision on completed cases (optional: allow with flag)
    if intake.workflow_status == "COMPLETED" and intake.clinical_summary.decision != "PENDING":
        raise HTTPException(status_code=409, detail="Decision already finalized. Contact admin to modify.")

    summary: ClinicalSummary = intake.clinical_summary
    summary.decision = payload.decision
    summary.doctor_note = payload.doctor_note
    db.add(summary)
    
    # Update workflow status to COMPLETED
    intake.workflow_status = "COMPLETED"
    db.add(intake)
    db.commit()

    message = "Patient admitted successfully" if payload.decision == "ADMIT" else "Decision recorded successfully"
    return {"status": "ok", "message": message}


@router.post("/seed-demo-data")
def seed_demo_data(db: Session = Depends(get_db)):
    """
    Seeds the database with demo patient data for testing/demo purposes.
    """
    if not _demo_seed_allowed():
        raise HTTPException(status_code=404, detail="Not found")

    demo_patients = [
        {
            "full_name": "John Anderson",
            "age": 67,
            "sex": "Male",
            "address": "123 Oak Street, Medical City",
            "chief_complaint": "Chest pain and shortness of breath",
            "symptoms": "Experiencing crushing chest pain radiating to left arm, accompanied by sweating and nausea. Started 2 hours ago.",
            "duration": "2 hours",
            "severity": "9/10",
            "history": "Hypertension, Type 2 Diabetes",
            "medications": "Metformin 1000mg, Lisinopril 10mg",
            "allergies": "Penicillin"
        },
        {
            "full_name": "Sarah Martinez",
            "age": 34,
            "sex": "Female",
            "address": "456 Elm Avenue, Health Town",
            "chief_complaint": "Severe headache with vision changes",
            "symptoms": "Sudden onset severe headache, blurred vision, sensitivity to light. Never experienced this before.",
            "duration": "4 hours",
            "severity": "8/10",
            "history": "Migraines (occasional)",
            "medications": "Birth control pills",
            "allergies": "None"
        },
        {
            "full_name": "Robert Chen",
            "age": 45,
            "sex": "Male",
            "address": "789 Pine Road, Wellness City",
            "chief_complaint": "Persistent cough and fever",
            "symptoms": "Dry cough for 5 days, fever up to 102 F, fatigue, mild shortness of breath with exertion.",
            "duration": "5 days",
            "severity": "5/10",
            "history": "Asthma",
            "medications": "Albuterol inhaler as needed",
            "allergies": "Sulfa drugs"
        }
    ]
    
    created_ids = []
    for patient_data in demo_patients:
        intake = PatientIntake(**patient_data)
        db.add(intake)
        db.commit()
        db.refresh(intake)
        created_ids.append(intake.id)
    
    return {"status": "success", "created_patients": len(demo_patients), "ids": created_ids}


@router.post("/seed-demo-users")
def seed_demo_users(db: Session = Depends(get_db)):
    """
    Create demo staff users for testing.
    Creates 2 nurses and 2 doctors with preset credentials.
    
    WARNING: Demo endpoint - remove in production!
    """
    if not _demo_seed_allowed():
        raise HTTPException(status_code=404, detail="Not found")

    try:
        from ..models import User
        demo_users = [
            {
                "staff_id": "NURSE-1001",
                "role": "NURSE",
                "full_name": "Nurse Jane Smith"
            },
            {
                "staff_id": "NURSE-1002",
                "role": "NURSE",
                "full_name": "Nurse Mike Johnson"
            },
            {
                "staff_id": "NURSE-1003",
                "role": "NURSE",
                "full_name": "Nurse Alicia Brown"
            },
            {
                "staff_id": "NURSE-1004",
                "role": "NURSE",
                "full_name": "Nurse Kevin Lee"
            },
            {
                "staff_id": "NURSE-1005",
                "role": "NURSE",
                "full_name": "Nurse Emily Davis"
            },
            {
                "staff_id": "NURSE-1006",
                "role": "NURSE",
                "full_name": "Nurse Carlos Rivera"
            },
            {
                "staff_id": "NURSE-1007",
                "role": "NURSE",
                "full_name": "Nurse Hannah Clark"
            },
            {
                "staff_id": "NURSE-1008",
                "role": "NURSE",
                "full_name": "Nurse Sophia Martinez"
            },
            {
                "staff_id": "NURSE-1009",
                "role": "NURSE",
                "full_name": "Nurse Liam White"
            },
            {
                "staff_id": "NURSE-1010",
                "role": "NURSE",
                "full_name": "Nurse Olivia Hall"
            },
            {
                "staff_id": "DOC-2001",
                "role": "DOCTOR",
                "full_name": "Dr. Sarah Patel"
            },
            {
                "staff_id": "DOC-2002",
                "role": "DOCTOR",
                "full_name": "Dr. James Wilson"
            },
            {
                "staff_id": "DOC-2003",
                "role": "DOCTOR",
                "full_name": "Dr. Priya Raman"
            },
            {
                "staff_id": "DOC-2004",
                "role": "DOCTOR",
                "full_name": "Dr. Thomas Nguyen"
            },
            {
                "staff_id": "DOC-2005",
                "role": "DOCTOR",
                "full_name": "Dr. Aisha Khan"
            },
            {
                "staff_id": "DOC-2006",
                "role": "DOCTOR",
                "full_name": "Dr. Ethan Brooks"
            },
            {
                "staff_id": "DOC-2007",
                "role": "DOCTOR",
                "full_name": "Dr. Maya Singh"
            },
            {
                "staff_id": "DOC-2008",
                "role": "DOCTOR",
                "full_name": "Dr. Noah Turner"
            },
            {
                "staff_id": "DOC-2009",
                "role": "DOCTOR",
                "full_name": "Dr. Grace Kim"
            },
            {
                "staff_id": "DOC-2010",
                "role": "DOCTOR",
                "full_name": "Dr. Lucas Perez"
            }
        ]
        
        created_users = []
        for user_data in demo_users:
            # Check if user already exists
            existing = db.query(User).filter(User.staff_id == user_data["staff_id"]).first()
            if existing:
                continue
            
            user = User(
                staff_id=user_data["staff_id"],
                password_hash="",
                role=user_data["role"],
                full_name=user_data["full_name"],
                is_active=False
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            created_users.append({
                "staff_id": user.staff_id,
                "role": user.role,
                "full_name": user.full_name
            })
        
        return {
            "status": "success",
            "created_users": len(created_users),
            "users": created_users,
            "activation_required": True
        }
    except Exception as e:
        import traceback
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}\n{traceback.format_exc()}")
