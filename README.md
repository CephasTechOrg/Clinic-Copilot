# Clinic Co-Pilot (AI in Healthcare)

Clinic Co-Pilot is a lightweight AI-powered clinical intake + decision-support assistant designed to reduce wait-time friction and prevent critical details from being overlooked during rushed patient encounters.

**At a glance:** a calmer, safer patient journey — from first symptom to final decision — built for busy clinics and real human stress. We make sure no one is missed, no signal is lost, and every provider has the clearest next step.

When a patient walks in scared and in pain, their story often gets fragmented — one form, one hallway, one rushed handoff at a time. Clinic Co-Pilot is designed to restore that continuity: capture the story once, preserve it with empathy, and surface the right clinical signals so nurses and doctors can act with confidence. It does not diagnose — it supports the clinician’s judgment with clear summaries, red flags, and next-step recommendations that keep care moving.

<img src="static/image/hero.png" alt="Clinic Co-Pilot hero" width="800" />

## Pitch

- Full pitch: `docs/pitch.md`
- Quick pitch: `pitch.md`
- Pages & routes: `page.md`

## Product Walkthrough (Screens)

**Page 1 — Landing Page**  
Welcomes patients to the hospital system, sets trust, and routes them to the right intake flow with clarity and empathy.

![Landing page](static/image/page1.jpeg)

**Page 2 — Doctor Dashboard**  
Summarizes the case, highlights red flags, and supports structured clinical decisions with a clean, low-friction workflow.

![Doctor dashboard](static/image/page2.jpeg)

**Page 3 — Healthcare Provider (Nurse) Portal**  
Captures vitals and completes intake handoff, ensuring structured data reaches the doctor without delays.

![Healthcare provider portal](static/image/page3.jpeg)

**Page 4 — Patient Intake Form**  
Gives patients a clear, guided way to describe symptoms and history in their preferred language, reducing anxiety and missing details.

![Patient intake form](static/image/page4.jpeg)

## What It Does

Clinic Co-Pilot supports three roles in a single, continuous flow. The patient starts by telling their story in plain language — symptoms, history, and severity — without needing medical jargon. The nurse adds vitals and ensures the clinical picture is complete. The doctor then receives a concise, structured summary with red flags and recommended questions. The AI does not make diagnoses; it organizes the signal so the clinician can decide faster and with more confidence. Decisions are saved with clear status tracking, and clinical text can be translated for multilingual care.

## Why It Matters

Clinicians are overloaded and intake information is fragmented.
Clinic Co-Pilot reduces cognitive load and transforms raw data into clarity - fast.

## Tech Stack

- FastAPI (backend)
- HTML/CSS/JS (modern dashboards)
- SQLite (local DB)
- AI layer via prompt + structured JSON output
- Gemini translation for doctor language switching

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

Note: demo seed endpoints require `ALLOW_DEMO_SEED=true` in `.env`.

### API Endpoints

- `GET /api/health` - Health check
- `GET /api/intakes` - List all patient intakes
- `POST /api/intakes` - Create new intake
- `POST /api/intakes/{id}/vitals` - Submit vitals + generate AI summary
- `POST /api/intakes/{id}/decision` - Save doctor decision
- `POST /api/translate` - Translate clinical text for doctor view
- `POST /api/seed-demo-data` - Load demo patients
- `POST /api/seed-demo-users` - Preload staff IDs for controlled registration
- `POST /auth/register` - Activate staff account (requires preloaded ID)
- `POST /auth/login` - Staff login

## Demo Script (Quick)

1. Patient submits complaint
2. Provider adds vitals
3. Doctor sees summary + priority + red flags
4. Doctor edits note and submits decision
5. Saved record appears in history

## Notes

- If Gemini quota is exhausted, the system falls back to rule-based summaries and original language.
- For a clean demo, delete `clinic_copilot.db` and restart `uvicorn`.

## Disclaimer

Clinic Co-Pilot is a hackathon prototype and not a medical device. It is intended to assist clinicians, not replace medical judgment.
