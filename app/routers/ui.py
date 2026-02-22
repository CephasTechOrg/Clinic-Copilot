from fastapi import APIRouter
from fastapi.responses import FileResponse

from ..paths import UI_DIR

router = APIRouter(tags=["ui"])


def _file_response(name: str) -> FileResponse:
    return FileResponse(str(UI_DIR / name))


@router.get("/")
def root():
    return _file_response("patient.html")


@router.get("/patient")
def patient_ui():
    return _file_response("patient.html")


@router.get("/nurse")
def nurse_ui():
    return _file_response("nurse.html")


@router.get("/nurse/login")
def nurse_login_ui():
    return _file_response("nurse_login.html")




@router.get("/doctor")
def doctor_ui():
    return _file_response("doctor.html")


@router.get("/doctor/login")
def doctor_login_ui():
    return _file_response("doctor_login.html")

