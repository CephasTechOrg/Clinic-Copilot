# Clinic Co-Pilot (AI in Healthcare)

Clinic Co-Pilot is a lightweight AI-powered clinical intake + decision-support assistant designed to reduce wait-time friction and prevent critical details from being overlooked during rushed patient encounters.

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
- HTML/CSS templates (simple dashboards)
- SQLite (local DB)
- AI layer via prompt + structured JSON output

## Repo Structure

- `app/routers/` role-based routes (patient / provider / doctor)
- `app/templates/` simple dashboards
- `app/prompts/` prompts used by the AI summarizer
- `app/services/` AI service + optional rules engine
- `docs/` pitch + architecture

## Run Locally (later)

1. Create venv
2. `pip install -r requirements.txt`
3. `uvicorn app.main:app --reload`

## Demo Script (Quick)

1. Patient submits complaint
2. Provider adds vitals
3. Doctor sees summary + priority + red flags
4. Doctor edits note and submits decision
5. Saved record appears in history

## Disclaimer

Clinic Co-Pilot is a hackathon prototype and not a medical device. It is intended to assist clinicians, not replace medical judgment.
