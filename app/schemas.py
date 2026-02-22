"""
schemas.py
- Pydantic models for validation and internal consistency.
- For a hackathon MVP, we mainly use form inputs, but schemas help keep things clean.
"""

from pydantic import BaseModel, Field


class IntakeCreate(BaseModel):
    full_name: str = Field(min_length=1, max_length=120)
    age: int = Field(ge=0, le=130)
    sex: str = Field(max_length=20)
    address: str = Field(max_length=200)

    chief_complaint: str = Field(min_length=1, max_length=200)
    symptoms: str = Field(min_length=1, max_length=2000)
    duration: str = Field(max_length=80)
    severity: str = Field(max_length=80)
    history: str = Field(default="", max_length=2000)
    medications: str = Field(default="", max_length=2000)
    allergies: str = Field(default="", max_length=2000)


class VitalsCreate(BaseModel):
    heart_rate: int = Field(ge=0, le=300)
    respiratory_rate: int = Field(ge=0, le=80)
    temperature_c: float = Field(ge=25, le=45)
    spo2: int = Field(ge=0, le=100)
    systolic_bp: int = Field(ge=0, le=300)
    diastolic_bp: int = Field(ge=0, le=200)


class DecisionUpdate(BaseModel):
    decision: str = Field(pattern="^(ADMIT|NOT_ADMIT|PENDING)$")
    doctor_note: str = Field(default="", max_length=5000)
