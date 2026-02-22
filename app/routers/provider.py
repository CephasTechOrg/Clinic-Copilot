"""
provider.py
- Provider queue: select an intake, add vitals, generate AI summary.
"""

from fastapi import APIRouter, Request, Form, Depends
from fastapi.responses import RedirectResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session
from sqlalchemy import select

from ..db import get_db
from ..paths import TEMPLATES_DIR
from ..models import PatientIntake, VitalsEntry, ClinicalSummary
from ..services.ai import generate_clinical_summary

router = APIRouter(prefix="/provider", tags=["provider"])
templates = Jinja2Templates(directory=str(TEMPLATES_DIR))


@router.get("/queue")
def provider_queue(request: Request, db: Session = Depends(get_db)):
    """
    List intakes. Provider can click to add vitals.
    For hackathon simplicity, show all intakes newest first.
    """
    intakes = db.execute(select(PatientIntake).order_by(PatientIntake.created_at.desc())).scalars().all()
    return templates.TemplateResponse("provider.html", {"request": request, "intakes": intakes})


@router.get("/vitals/{intake_id}")
def vitals_form(intake_id: int, request: Request, db: Session = Depends(get_db)):
    """Render vitals entry form for a selected intake."""
    intake = db.get(PatientIntake, intake_id)
    if not intake:
        return RedirectResponse(url="/provider/queue", status_code=303)

    return templates.TemplateResponse("provider_vitals.html", {"request": request, "intake": intake})


@router.post("/vitals/{intake_id}")
def submit_vitals(
    intake_id: int,
    heart_rate: int = Form(...),
    respiratory_rate: int = Form(...),
    temperature_c: float = Form(...),
    spo2: int = Form(...),
    systolic_bp: int = Form(...),
    diastolic_bp: int = Form(...),
    db: Session = Depends(get_db),
):
    """
    Save vitals, generate AI summary, store ClinicalSummary,
    then redirect to doctor dashboard.
    """
    intake = db.get(PatientIntake, intake_id)
    if not intake:
        return RedirectResponse(url="/provider/queue", status_code=303)

    # If vitals already exist, overwrite (simple hackathon behavior)
    if intake.vitals:
        db.delete(intake.vitals)
        db.commit()

    vitals = VitalsEntry(
        intake_id=intake_id,
        heart_rate=heart_rate,
        respiratory_rate=respiratory_rate,
        temperature_c=temperature_c,
        spo2=spo2,
        systolic_bp=systolic_bp,
        diastolic_bp=diastolic_bp,
    )
    db.add(vitals)
    db.commit()
    db.refresh(vitals)

    # Create/replace clinical summary
    if intake.clinical_summary:
        db.delete(intake.clinical_summary)
        db.commit()

    payload = {
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

    ai = generate_clinical_summary(payload)

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

    return RedirectResponse(url=f"/doctor/case/{intake_id}", status_code=303)
