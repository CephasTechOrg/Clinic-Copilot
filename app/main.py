"""
main.py
- FastAPI app entry point.
- Registers API + UI routers and static assets.
- Creates tables on startup for hackathon convenience.
"""

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

from .db import engine, Base
from sqlalchemy import text
from .paths import STATIC_DIR
from .routers import api, ui
from .routers.auth_router import router as auth_router

app = FastAPI(title="Clinic Co-Pilot", version="0.1.0")

# CORS middleware for API testing
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For demo only - restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static files (CSS)
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

# Routers
app.include_router(auth_router)  # Auth routes: /auth/login, /auth/me
app.include_router(api.router)
app.include_router(ui.router)


@app.on_event("startup")
def on_startup():
    """
    Auto-create DB tables at startup.
    This avoids manual migration overhead in a hackathon.
    """
    Base.metadata.create_all(bind=engine)
    _ensure_doctor_status_columns()


def _ensure_doctor_status_columns() -> None:
    """
    Lightweight migration for new doctor_status fields in SQLite.
    """
    with engine.begin() as conn:
        cols = conn.execute(text("PRAGMA table_info(patient_intakes)")).fetchall()
        col_names = {row[1] for row in cols}

        if "doctor_status" not in col_names:
            conn.execute(text("ALTER TABLE patient_intakes ADD COLUMN doctor_status VARCHAR(30) DEFAULT 'PENDING'"))
        if "doctor_status_updated_at" not in col_names:
            conn.execute(text("ALTER TABLE patient_intakes ADD COLUMN doctor_status_updated_at DATETIME"))

        # Normalize existing decisions into doctor_status
        conn.execute(text("""
            UPDATE patient_intakes
            SET doctor_status = (
                SELECT CASE
                    WHEN cs.decision IN ('ADMIT', 'ADMITTED') THEN 'ADMITTED'
                    WHEN cs.decision IN ('NOT_ADMIT', 'APPROVE', 'APPROVED', 'RELEASE') THEN 'APPROVED'
                    WHEN cs.decision IN ('DELAY', 'DELAYED') THEN 'DELAYED'
                    WHEN cs.decision = 'PENDING' THEN 'PENDING'
                    ELSE 'PENDING'
                END
                FROM clinical_summaries cs
                WHERE cs.intake_id = patient_intakes.id
            )
            WHERE EXISTS (SELECT 1 FROM clinical_summaries cs WHERE cs.intake_id = patient_intakes.id);
        """))

        # Normalize existing decisions to new values
        conn.execute(text("""
            UPDATE clinical_summaries
            SET decision = CASE
                WHEN decision IN ('ADMIT', 'ADMITTED') THEN 'ADMITTED'
                WHEN decision IN ('NOT_ADMIT', 'APPROVE', 'APPROVED', 'RELEASE') THEN 'APPROVED'
                WHEN decision IN ('DELAY', 'DELAYED') THEN 'DELAYED'
                WHEN decision = 'PENDING' THEN 'PENDING'
                ELSE 'PENDING'
            END;
        """))

