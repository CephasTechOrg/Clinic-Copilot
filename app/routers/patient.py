"""
patient.py
- Patient intake pages + create intake record.
"""

from fastapi import APIRouter, Request, Form
from fastapi.responses import RedirectResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import PatientIntake
from fastapi import Depends

router = APIRouter(prefix="/patient", tags=["patient"])
templates = Jinja2Templates(directory="app/templates")


@router.get("/intake")
def intake_form(request: Request):
    """Render patient intake form."""
    return templates.TemplateResponse("patient.html", {"request": request})


@router.post("/intake")
def submit_intake(
    request: Request,
    full_name: str = Form(...),
    age: int = Form(...),
    sex: str = Form(...),
    address: str = Form(...),
    chief_complaint: str = Form(...),
    symptoms: str = Form(...),
    duration: str = Form(...),
    severity: str = Form(...),
    history: str = Form(""),
    medications: str = Form(""),
    allergies: str = Form(""),
    db: Session = Depends(get_db),
):
    """Create intake in DB then redirect to confirmation."""
    intake = PatientIntake(
        full_name=full_name,
        age=age,
        sex=sex,
        address=address,
        chief_complaint=chief_complaint,
        symptoms=symptoms,
        duration=duration,
        severity=severity,
        history=history,
        medications=medications,
        allergies=allergies,
    )
    db.add(intake)
    db.commit()
    db.refresh(intake)

    # Redirect to a provider queue (simple hackathon flow)
    return RedirectResponse(url="/provider/queue", status_code=303)