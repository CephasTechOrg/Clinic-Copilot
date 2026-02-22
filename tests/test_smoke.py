import os
import uuid

os.environ.setdefault("JWT_SECRET_KEY", "test-secret")
os.environ.setdefault("GEMINI_API_KEY", "")
os.environ.setdefault("GEMINI_MODEL_NAME", "gemini-3-flash-preview")

from fastapi.testclient import TestClient

from app.main import app
from app.db import SessionLocal
from app.models import User, PatientIntake
from app.auth import hash_password


def _unique_staff_id(db, prefix: str) -> str:
    for _ in range(10):
        num = uuid.uuid4().int % 9000 + 1000
        staff_id = f"{prefix}-{num:04d}"
        exists = db.query(User).filter(User.staff_id == staff_id).first()
        if not exists:
            return staff_id
    raise RuntimeError("Unable to generate unique staff ID")


def _create_user(db, role: str) -> tuple[int, str, str]:
    password = "TestPass123!"
    prefix = "NURSE" if role == "NURSE" else "DOC"
    staff_id = _unique_staff_id(db, prefix)
    user = User(
        staff_id=staff_id,
        role=role,
        full_name=f"Test {role.title()} {staff_id}",
        password_hash=hash_password(password),
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user.id, staff_id, password


def _login(client: TestClient, staff_id: str, password: str) -> str:
    res = client.post("/auth/login", json={"staff_id": staff_id, "password": password})
    assert res.status_code == 200, res.text
    return res.json()["access_token"]


def _auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def test_end_to_end_workflow():
    created_user_ids: list[int] = []
    created_intake_id: int | None = None

    try:
        with TestClient(app) as client:
            # Create test users
            with SessionLocal() as db:
                nurse_user_id, nurse_id, nurse_pw = _create_user(db, "NURSE")
                doctor_user_id, doctor_id, doctor_pw = _create_user(db, "DOCTOR")
                created_user_ids.extend([nurse_user_id, doctor_user_id])

            nurse_token = _login(client, nurse_id, nurse_pw)
            doctor_token = _login(client, doctor_id, doctor_pw)

            # Create intake (public)
            intake_payload = {
                "full_name": "Test Patient",
                "age": 45,
                "sex": "Male",
                "address": "123 Test Street",
                "chief_complaint": "Chest pain",
                "symptoms": "Chest tightness with mild shortness of breath",
                "duration": "2 hours",
                "severity": "7/10",
                "history": "Hypertension",
                "medications": "Lisinopril",
                "allergies": "None",
            }
            res = client.post("/api/intakes", json=intake_payload)
            assert res.status_code == 200, res.text
            created_intake_id = res.json()["id"]

            # Nurse submits vitals -> AI summary created
            vitals_payload = {
                "heart_rate": 118,
                "respiratory_rate": 22,
                "temperature_c": 37.9,
                "spo2": 96,
                "systolic_bp": 128,
                "diastolic_bp": 84,
            }
            res = client.post(
                f"/api/intakes/{created_intake_id}/vitals",
                json=vitals_payload,
                headers=_auth_headers(nurse_token),
            )
            assert res.status_code == 200, res.text
            assert res.json().get("short_summary")

            # Doctor admits patient
            res = client.post(
                f"/api/intakes/{created_intake_id}/decision",
                json={"decision": "ADMIT", "doctor_note": "Admit for observation"},
                headers=_auth_headers(doctor_token),
            )
            assert res.status_code == 200, res.text

            # Doctor releases (approved/discharged)
            res = client.post(
                f"/api/intakes/{created_intake_id}/decision",
                json={"decision": "RELEASE", "doctor_note": "Stable, discharge"},
                headers=_auth_headers(doctor_token),
            )
            assert res.status_code == 200, res.text

            # Verify final status
            res = client.get(
                f"/api/intakes/{created_intake_id}",
                headers=_auth_headers(doctor_token),
            )
            assert res.status_code == 200, res.text
            data = res.json()
            assert data["workflow_status"] == "COMPLETED"
            assert data["doctor_status"] == "APPROVED"
            assert data["clinical_summary"]["decision"] == "APPROVED"
    finally:
        # Cleanup test data
        with SessionLocal() as db:
            if created_intake_id:
                intake = db.get(PatientIntake, created_intake_id)
                if intake:
                    db.delete(intake)
                    db.commit()
            if created_user_ids:
                for user_id in created_user_ids:
                    user = db.get(User, user_id)
                    if user:
                        db.delete(user)
                db.commit()
