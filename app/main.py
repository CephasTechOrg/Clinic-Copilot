"""
main.py
- FastAPI app entry point.
- Registers routers and sets up templates/static.
- Creates tables on startup for hackathon convenience.
"""

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from .db import engine, Base
from .routers import patient, provider, doctor

app = FastAPI(title="Clinic Co-Pilot", version="0.1.0")

# Static files (CSS)
app.mount("/static", StaticFiles(directory="app/static"), name="static")

# Routers
app.include_router(patient.router)
app.include_router(provider.router)
app.include_router(doctor.router)


@app.on_event("startup")
def on_startup():
    """
    Auto-create DB tables at startup.
    This avoids manual migration overhead in a hackathon.
    """
    Base.metadata.create_all(bind=engine)


@app.get("/")
def root():
    """
    Simple landing redirect:
    For demo you can add a nicer landing page later.
    """
    return {"message": "Clinic Co-Pilot running. Go to /patient/intake"}