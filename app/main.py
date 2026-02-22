"""
main.py
- FastAPI app entry point.
- Registers API + UI routers and static assets.
- Creates tables on startup for hackathon convenience.
"""

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from .db import engine, Base
from .paths import STATIC_DIR
from .routers import api, ui

app = FastAPI(title="Clinic Co-Pilot", version="0.1.0")

# Static files (CSS)
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

# Routers
app.include_router(api.router)
app.include_router(ui.router)


@app.on_event("startup")
def on_startup():
    """
    Auto-create DB tables at startup.
    This avoids manual migration overhead in a hackathon.
    """
    Base.metadata.create_all(bind=engine)


