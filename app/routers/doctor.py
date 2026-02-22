"""
doctor.py
- Doctor views AI summary and makes final decision.
"""

from fastapi import APIRouter, Request, Form, Depends
from fastapi.responses import RedirectResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session
from sqlalchemy import select

from ..db import get_db
from ..models import PatientIntake, ClinicalSummary

router = APIRouter(prefix="/doctor", tags=["doctor"])
templates = Jinja2Templates(directory="app/templates")


@router.get("/dashboard")
def dashboard(request: Request, db: Session = Depends(get_db)):
    """
    Doctor dashboard lists cases that have AI summaries (i.e., provider entered vitals).
    """
    cases = (
        db.execute(select(PatientIntake).order_by(PatientIntake.created_at.desc()))
        .scalars()
        .all()
    )

    # Only show cases with a summary (ready for doctor)
    ready = [c for c in cases if c.clinical_summary is not None]
    return templates.TemplateResponse("doctor.html", {"request": request, "cases": ready})


@router.get("/case/{intake_id}")
def case_view(intake_id: int, request: Request, db: Session = Depends(get_db)):
    intake = db.get(PatientIntake, intake_id)
    if not intake or not intake.clinical_summary:
        return RedirectResponse(url="/doctor/dashboard", status_code=303)

    return templates.TemplateResponse("doctor_case.html", {"request": request, "intake": intake})


@router.post("/case/{intake_id}/decision")
def update_decision(
    intake_id: int,
    decision: str = Form(...),  # ADMIT or NOT_ADMIT
    doctor_note: str = Form(""),
    db: Session = Depends(get_db),
):
    intake = db.get(PatientIntake, intake_id)
    if not intake or not intake.clinical_summary:
        return RedirectResponse(url="/doctor/dashboard", status_code=303)

    summary: ClinicalSummary = intake.clinical_summary
    summary.decision = decision
    summary.doctor_note = doctor_note

    db.add(summary)
    db.commit()

    return RedirectResponse(url="/doctor/dashboard", status_code=303)