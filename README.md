# Clinic Co-Pilot (AI in Healthcare)

Clinic Co-Pilot is a lightweight AI-powered clinical intake + decision-support assistant designed to reduce wait-time friction and prevent critical details from being overlooked during rushed patient encounters.

## Pitch

- Full pitch: `docs/pitch.md`
- Quick pitch: `pitch.md`

## What It Does

**Clinic Co-Pilot** supports 3 roles:

### 1) Patient Intake

- Patient enters demographics + chief complaint
- Structured symptom capture (duration, severity, associated symptoms, history)

### 2) Provider Vitals

- Health provider enters vitals (HR, RR, Temp, SpO2, BP, etc.)

### 3) Doctor Dashboard

- Doctor receives a clean clinical summary generated from symptoms + vitals
- AI flags red alerts and suggests next questions/tests
- Doctor can edit notes and decide Admit / Not Admit
- Decisions saved to SQLite

## Why It Matters

Clinicians are overloaded and intake information is fragmented.
Clinic Co-Pilot reduces cognitive load and transforms raw data into clarity - fast.

## Tech Stack

- FastAPI (backend)
- HTML/CSS/JS (modern dashboards)
- SQLite (local DB)
- AI layer via prompt + structured JSON output

## Project Structure

- Overview: `structure.md`
- Full breakdown: `docs/structure.md`
- `app/` FastAPI app, routes, services
- `user_interface/` HTML pages (patient / nurse / doctor)
- `static/js/` UI scripts
- `docs/` pitch + architecture

## Run Locally

1. Create venv: `python -m venv venv`
2. Activate: `venv\Scripts\activate` (Windows) or `source venv/bin/activate` (Unix)
3. Install dependencies: `pip install -r requirements.txt`
4. Create `.env` file with your Gemini API key: `GEMINI_API_KEY=your-key-here`
5. Run server: `uvicorn app.main:app --reload`
6. Open browser: `http://localhost:8000`

### Quick Test with Demo Data

Seed the database with demo patients:

```bash
curl -X POST http://localhost:8000/api/seed-demo-data
```

### API Endpoints

- `GET /api/health` - Health check
- `GET /api/intakes` - List all patient intakes
- `POST /api/intakes` - Create new intake
- `POST /api/intakes/{id}/vitals` - Submit vitals + generate AI summary
- `POST /api/intakes/{id}/decision` - Save doctor decision
- `POST /api/seed-demo-data` - Load demo patients

## Demo Script (Quick)

1. Patient submits complaint
2. Provider adds vitals
3. Doctor sees summary + priority + red flags
4. Doctor edits note and submits decision
5. Saved record appears in history

## Disclaimer

Clinic Co-Pilot is a hackathon prototype and not a medical device. It is intended to assist clinicians, not replace medical judgment.
