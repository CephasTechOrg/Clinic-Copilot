"""
models.py
- Defines database tables using SQLAlchemy ORM models.
- Keeps data structure consistent and simple.
"""

from sqlalchemy import String, Integer, DateTime, Text, ForeignKey, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime

from .db import Base


class User(Base):
    """
    Staff users (nurses and doctors) for authentication.
    Patients do not have accounts - they submit forms publicly.
    """
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    staff_id: Mapped[str] = mapped_column(String(50), unique=True, index=True)  # e.g., NURSE-1001, DOC-2001
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(20))  # NURSE or DOCTOR
    full_name: Mapped[str] = mapped_column(String(120))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class PatientIntake(Base):
    """
    Patient intake information submitted by the patient.
    This is created first in the workflow.
    """
    __tablename__ = "patient_intakes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    # Basic demographics
    full_name: Mapped[str] = mapped_column(String(120))
    age: Mapped[int] = mapped_column(Integer)
    sex: Mapped[str] = mapped_column(String(20))
    address: Mapped[str] = mapped_column(String(200))

    # Complaint
    chief_complaint: Mapped[str] = mapped_column(String(200))
    symptoms: Mapped[str] = mapped_column(Text)  # free text / multiline
    duration: Mapped[str] = mapped_column(String(80))  # e.g., "2 days"
    severity: Mapped[str] = mapped_column(String(80))  # e.g., "7/10"
    history: Mapped[str] = mapped_column(Text, default="")  # medical history
    medications: Mapped[str] = mapped_column(Text, default="")
    allergies: Mapped[str] = mapped_column(Text, default="")

    # Patient language + original text (for multilingual intake)
    preferred_language: Mapped[str] = mapped_column(String(10), default="en")
    chief_complaint_original: Mapped[str] = mapped_column(Text, default="")
    symptoms_original: Mapped[str] = mapped_column(Text, default="")
    duration_original: Mapped[str] = mapped_column(String(80), default="")
    history_original: Mapped[str] = mapped_column(Text, default="")
    medications_original: Mapped[str] = mapped_column(Text, default="")
    allergies_original: Mapped[str] = mapped_column(Text, default="")

    # Workflow status: PENDING_NURSE -> PENDING_DOCTOR -> COMPLETED
    workflow_status: Mapped[str] = mapped_column(String(30), default="PENDING_NURSE")
    # Doctor workflow status: PENDING -> ADMITTED / APPROVED / DELAYED
    doctor_status: Mapped[str] = mapped_column(String(30), default="PENDING")
    doctor_status_updated_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    vitals: Mapped["VitalsEntry"] = relationship(
        back_populates="intake",
        uselist=False,
        cascade="all, delete-orphan",
    )
    clinical_summary: Mapped["ClinicalSummary"] = relationship(
        back_populates="intake",
        uselist=False,
        cascade="all, delete-orphan",
    )


class VitalsEntry(Base):
    """
    Vitals entered by the health provider (nurse/assistant).
    This comes after the patient intake.
    """
    __tablename__ = "vitals_entries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    intake_id: Mapped[int] = mapped_column(ForeignKey("patient_intakes.id"), unique=True)

    heart_rate: Mapped[int] = mapped_column(Integer)
    respiratory_rate: Mapped[int] = mapped_column(Integer)
    temperature_c: Mapped[float] = mapped_column()
    spo2: Mapped[int] = mapped_column(Integer)  # oxygen saturation %
    systolic_bp: Mapped[int] = mapped_column(Integer)
    diastolic_bp: Mapped[int] = mapped_column(Integer)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    intake: Mapped[PatientIntake] = relationship(back_populates="vitals")


class ClinicalSummary(Base):
    """
    AI-generated summary + doctor decision.
    Created after vitals are entered and AI is run.
    """
    __tablename__ = "clinical_summaries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    intake_id: Mapped[int] = mapped_column(ForeignKey("patient_intakes.id"), unique=True)

    # AI outputs (store as text for simplicity; you can move to JSON later)
    short_summary: Mapped[str] = mapped_column(Text)
    priority_level: Mapped[str] = mapped_column(String(20))  # LOW / MED / HIGH
    red_flags: Mapped[str] = mapped_column(Text, default="")  # newline or comma-separated
    differential: Mapped[str] = mapped_column(Text, default="")
    recommended_next_steps: Mapped[str] = mapped_column(Text, default="")
    recommended_questions: Mapped[str] = mapped_column(Text, default="")

    # Doctor override
    doctor_note: Mapped[str] = mapped_column(Text, default="")
    decision: Mapped[str] = mapped_column(String(30), default="PENDING")  # ADMIT / NOT_ADMIT / PENDING

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    intake: Mapped[PatientIntake] = relationship(back_populates="clinical_summary")
