"""
schemas.py
- Pydantic models for validation and internal consistency.
- For a hackathon MVP, we mainly use form inputs, but schemas help keep things clean.
"""

from pydantic import BaseModel, Field


class IntakeCreate(BaseModel):
    full_name: str
    age: int = Field(ge=0, le=130)
    sex: str
    address: str

    chief_complaint: str
    symptoms: str
    duration: str
    severity: str
    history: str = ""
    medications: str = ""
    allergies: str = ""


class VitalsCreate(BaseModel):
    heart_rate: int = Field(ge=0, le=300)
    respiratory_rate: int = Field(ge=0, le=80)
    temperature_c: float = Field(ge=25, le=45)
    spo2: int = Field(ge=0, le=100)
    systolic_bp: int = Field(ge=0, le=300)
    diastolic_bp: int = Field(ge=0, le=200)


class DecisionUpdate(BaseModel):
    decision: str
    doctor_note: str = ""
