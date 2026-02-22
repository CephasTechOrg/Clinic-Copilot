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
    preferred_language: str = Field(default="en", pattern="^(en|es|fr|ar|pt)$")


class VitalsCreate(BaseModel):
    """Vitals with clinically valid ranges."""
    heart_rate: int = Field(ge=30, le=250, description="Beats per minute (30-250)")
    respiratory_rate: int = Field(ge=4, le=60, description="Breaths per minute (4-60)")
    temperature_c: float = Field(ge=32.0, le=43.0, description="Celsius (32-43)")
    spo2: int = Field(ge=50, le=100, description="Oxygen saturation % (50-100)")
    systolic_bp: int = Field(ge=50, le=250, description="Systolic mmHg (50-250)")
    diastolic_bp: int = Field(ge=30, le=150, description="Diastolic mmHg (30-150)")


class DecisionUpdate(BaseModel):
    decision: str = Field(pattern="^(ADMIT|ADMITTED|NOT_ADMIT|APPROVE|APPROVED|DELAY|DELAYED|RELEASE|PENDING)$")
    doctor_note: str = Field(default="", max_length=5000)


# =============================================================================
# Auth Schemas
# =============================================================================

class LoginRequest(BaseModel):
    """Request body for staff login."""
    staff_id: str = Field(min_length=1, max_length=50)
    password: str = Field(min_length=1, max_length=100)


class RegisterRequest(BaseModel):
    """Request body for staff registration/activation."""
    staff_id: str = Field(
        min_length=8,
        max_length=20,
        description="Staff ID in format NURSE-XXXX or DOC-XXXX"
    )
    password: str = Field(min_length=6, max_length=100)
    full_name: str = Field(min_length=2, max_length=120)
    role: str | None = Field(default=None, pattern="^(NURSE|DOCTOR)$")


class TokenResponse(BaseModel):
    """Response after successful login."""
    access_token: str
    token_type: str = "bearer"
    staff_id: str
    role: str
    full_name: str


class UserInfo(BaseModel):
    """Public user information (no password)."""
    id: int
    staff_id: str
    role: str
    full_name: str
    is_active: bool

    class Config:
        from_attributes = True


class UserCreate(BaseModel):
    """Schema for creating a new user (admin use)."""
    staff_id: str = Field(min_length=1, max_length=50)
    password: str = Field(min_length=6, max_length=100)
    role: str = Field(pattern="^(NURSE|DOCTOR)$")
    full_name: str = Field(min_length=1, max_length=120)


