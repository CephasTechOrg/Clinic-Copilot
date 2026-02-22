# Clinic Co-Pilot - TODO (Hackathon)

> Status key: [x] Done [ ] Todo

## 1) Product & Pitch

- [x] Final project name: **Clinic Co-Pilot**
- [x] Clear problem statement (wait times, overload, fragmented info)
- [x] Emotional pitch (judge-friendly) in `docs/pitch.md`
- [x] GitHub repo description options (pick 1 and paste)
- [x] Demo flow defined (Patient -> Provider -> Doctor)

## 2) UX / UI

- [x] UI plan: 3 dashboards (Patient, Provider, Doctor)
- [x] Google Stitch prompts for all 3 dashboards (patient/provider/doctor)
- [x] Visual priority badges spec (LOW/MED/HIGH with colors)
- [ ] Optional "Risk Meter / Gauge" widget (extra demo wow)

## 3) Project Structure

- [x] Clean folder structure (FastAPI + templates + static + services + routers + prompts + docs)
- [x] Windows CMD folder/file creation commands
- [x] SQLite-only storage plan (no external DB)
- [x] Docs included: `docs/pitch.md`, `docs/architecture.md`

## 4) Backend (FastAPI) - Core Workflow

- [x] FastAPI app scaffold (`app/main.py`)
- [x] SQLite + SQLAlchemy setup (`app/db.py`)
- [x] Models: Intake, Vitals, Summary/Decision (`app/models.py`)
- [x] Schemas for validation (`app/schemas.py`)
- [x] Routers:
  - [x] Patient intake routes (`/patient/intake`)
  - [x] Provider queue + vitals routes (`/provider/queue`, `/provider/vitals/{id}`)
  - [x] Doctor dashboard + case review + decision routes (`/doctor/dashboard`, `/doctor/case/{id}`)
- [x] Templates for each stage (HTML pages)
- [x] CSS base styling (clean, readable, demo-ready)

## 5) AI Layer (Google Gemini)

- [x] Gemini integration in `app/services/ai.py`
- [x] Strict JSON response format enforced for UI stability
- [x] Safety-first fallback rules engine (`app/services/triage_rules.py`)
- [x] `.env` key support via `python-dotenv`
- [x] Fix note: install `google-generativeai` inside `(venv)` to avoid ModuleNotFoundError

## 6) Local Setup & Run

- [x] Virtual environment commands (Windows)
- [x] Requirements install: `pip install -r requirements.txt`
- [x] Run server: `uvicorn app.main:app --reload`
- [x] Add `.gitignore` (Python + venv + db + .env)
- [x] Add `.env.example` (safe template without real keys)

## 7) Submission / Presentation

- [ ] Final Devpost / submission write-up (short + impact + tech + safety)
- [ ] Final 2-3 minute demo script (who clicks what, in what order)
- [ ] Add disclaimer everywhere: "assistive tool, not diagnosis"
- [ ] Screenshots of all 3 dashboards for README

## 8) Optional "Judge Booster" Features

- [ ] Time-saved metric panel (e.g., "summary generated in 3s")
- [ ] Case history page (Admitted / Not Admitted)
- [ ] Highlight red flags in a warning card (strong visual)
- [x] Seed demo data button (1-click demo mode)
- [x] API health check endpoint
- [x] Loading states for AI generation
- [x] Success feedback after decisions
- [x] Input validation and sanitization

OK Overall: Core product + backend scaffold + Gemini AI + UI prompts are **covered**.
