import uuid

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


def _create_user(db, role: str, active: bool = True) -> tuple[int, str, str]:
    password = "TestPass123!"
    prefix = "NURSE" if role == "NURSE" else "DOC"
    staff_id = _unique_staff_id(db, prefix)
    user = User(
        staff_id=staff_id,
        role=role,
        full_name=f"Test {role.title()} {staff_id}",
        password_hash=hash_password(password) if active else "",
        is_active=active,
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


def _create_intake(client: TestClient) -> int:
    payload = {
        "full_name": "Test Patient",
        "age": 38,
        "sex": "Male",
        "address": "123 Test Street",
        "chief_complaint": "Chest pain",
        "symptoms": "Chest tightness with mild shortness of breath",
        "duration": "2 hours",
        "severity": "6/10",
        "history": "Hypertension",
        "medications": "Lisinopril",
        "allergies": "None",
    }
    res = client.post("/api/intakes", json=payload)
    assert res.status_code == 200, res.text
    return res.json()["id"]


def _submit_vitals(client: TestClient, intake_id: int, token: str):
    vitals_payload = {
        "heart_rate": 118,
        "respiratory_rate": 22,
        "temperature_c": 37.9,
        "spo2": 96,
        "systolic_bp": 128,
        "diastolic_bp": 84,
    }
    res = client.post(
        f"/api/intakes/{intake_id}/vitals",
        json=vitals_payload,
        headers=_auth_headers(token),
    )
    assert res.status_code == 200, res.text
    return res.json()


def _cleanup(db, intake_ids: list[int], user_ids: list[int]):
    for intake_id in intake_ids:
        intake = db.get(PatientIntake, intake_id)
        if intake:
            db.delete(intake)
            db.commit()
    for user_id in user_ids:
        user = db.get(User, user_id)
        if user:
            db.delete(user)
    db.commit()


def test_health_endpoint():
    with TestClient(app) as client:
        res = client.get("/api/health")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "healthy"
        assert data["database"] == "connected"


def test_auth_register_and_login():
    created_user_ids = []
    try:
        with SessionLocal() as db:
            user_id, staff_id, _ = _create_user(db, "DOCTOR", active=False)
            created_user_ids.append(user_id)

        with TestClient(app) as client:
            res = client.post(
                "/auth/register",
                json={
                    "staff_id": staff_id,
                    "password": "NewPass123!",
                    "full_name": f"Test Doctor {staff_id}",
                    "role": "DOCTOR",
                },
            )
            assert res.status_code == 200, res.text

            res = client.post(
                "/auth/login",
                json={"staff_id": staff_id, "password": "NewPass123!"},
            )
            assert res.status_code == 200, res.text
            assert res.json().get("access_token")
    finally:
        with SessionLocal() as db:
            _cleanup(db, [], created_user_ids)


def test_register_invalid_staff_id_format():
    with TestClient(app) as client:
        res = client.post(
            "/auth/register",
            json={
                "staff_id": "BAD-1",
                "password": "BadPass123!",
                "full_name": "Bad User",
                "role": "DOCTOR",
            },
        )
        assert res.status_code in (400, 422)


def test_protected_routes_require_auth():
    with TestClient(app) as client:
        res = client.get("/api/intakes")
        assert res.status_code == 401


def test_role_restrictions_on_vitals_and_decision():
    created_user_ids = []
    intake_ids = []
    try:
        with SessionLocal() as db:
            nurse_user_id, nurse_id, nurse_pw = _create_user(db, "NURSE")
            doctor_user_id, doctor_id, doctor_pw = _create_user(db, "DOCTOR")
            created_user_ids.extend([nurse_user_id, doctor_user_id])

        with TestClient(app) as client:
            nurse_token = _login(client, nurse_id, nurse_pw)
            doctor_token = _login(client, doctor_id, doctor_pw)

            intake_id = _create_intake(client)
            intake_ids.append(intake_id)

            # Doctor should not submit vitals
            res = client.post(
                f"/api/intakes/{intake_id}/vitals",
                json={
                    "heart_rate": 100,
                    "respiratory_rate": 18,
                    "temperature_c": 37.0,
                    "spo2": 97,
                    "systolic_bp": 120,
                    "diastolic_bp": 80,
                },
                headers=_auth_headers(doctor_token),
            )
            assert res.status_code == 403

            _submit_vitals(client, intake_id, nurse_token)

            # Nurse should not submit decision
            res = client.post(
                f"/api/intakes/{intake_id}/decision",
                json={"decision": "ADMIT", "doctor_note": "N/A"},
                headers=_auth_headers(nurse_token),
            )
            assert res.status_code == 403

            # Doctor decision should succeed
            res = client.post(
                f"/api/intakes/{intake_id}/decision",
                json={"decision": "ADMIT", "doctor_note": "Admit"},
                headers=_auth_headers(doctor_token),
            )
            assert res.status_code == 200
    finally:
        with SessionLocal() as db:
            _cleanup(db, intake_ids, created_user_ids)


def test_status_transitions_and_invalid_transition():
    created_user_ids = []
    intake_ids = []
    try:
        with SessionLocal() as db:
            nurse_user_id, nurse_id, nurse_pw = _create_user(db, "NURSE")
            doctor_user_id, doctor_id, doctor_pw = _create_user(db, "DOCTOR")
            created_user_ids.extend([nurse_user_id, doctor_user_id])

        with TestClient(app) as client:
            nurse_token = _login(client, nurse_id, nurse_pw)
            doctor_token = _login(client, doctor_id, doctor_pw)

            intake_id = _create_intake(client)
            intake_ids.append(intake_id)
            _submit_vitals(client, intake_id, nurse_token)

            # Delay -> Admit -> Release
            res = client.post(
                f"/api/intakes/{intake_id}/decision",
                json={"decision": "DELAY", "doctor_note": "Observe"},
                headers=_auth_headers(doctor_token),
            )
            assert res.status_code == 200

            res = client.post(
                f"/api/intakes/{intake_id}/decision",
                json={"decision": "ADMIT", "doctor_note": "Admit now"},
                headers=_auth_headers(doctor_token),
            )
            assert res.status_code == 200

            res = client.post(
                f"/api/intakes/{intake_id}/decision",
                json={"decision": "RELEASE", "doctor_note": "Stable"},
                headers=_auth_headers(doctor_token),
            )
            assert res.status_code == 200

            # Invalid transition: Approved -> Delayed
            res = client.post(
                f"/api/intakes/{intake_id}/decision",
                json={"decision": "DELAY", "doctor_note": "Should fail"},
                headers=_auth_headers(doctor_token),
            )
            assert res.status_code == 409
    finally:
        with SessionLocal() as db:
            _cleanup(db, intake_ids, created_user_ids)
