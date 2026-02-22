# Project Structure

## Stack
- FastAPI for the backend and API routes
- SQLite for local persistence
- HTML/CSS/JS for the patient, provider, and doctor dashboards
- Optional AI summary service with a rule-based fallback

## Directory Map
```text
clinic-copilot/
  app/
    main.py
    db.py
    models.py
    schemas.py
    paths.py
    routers/
      api.py
      ui.py
    services/
      ai.py
      triage_rules.py
    prompts/
      intake_summary.md
      red_flags.md
  static/
    js/
      patient.js
      nurse.js
      doctor.js
  user_interface/
    patient.html
    nurse.html
    doctor.html
  docs/
    pitch.md
    architecture.md
    structure.md
  tests/
    test_smoke.py
  clinic_copilot.db
  requirements.txt
  README.md
  .env
  .env.example
```

## Key Files
- `app/main.py`: FastAPI app startup, routes, and static assets
- `app/db.py`: SQLite connection and session dependency
- `app/models.py`: ORM models for intake, vitals, and summaries
- `app/schemas.py`: Pydantic validation schemas
- `app/routers/api.py`: REST endpoints for intake, vitals, and decisions
- `app/routers/ui.py`: Serves patient, provider, and doctor dashboards
- `app/services/ai.py`: AI summary generation + JSON enforcement
- `app/services/triage_rules.py`: deterministic red-flag checks
- `user_interface/*.html`: UI pages for each role
- `static/js/*.js`: frontend logic for API calls and rendering

## Data Flow (High Level)
1. Patient submits intake -> saved to SQLite.
2. Provider enters vitals -> AI summary generated.
3. Doctor reviews summary -> adds note and decision.

## Notes
- `clinic_copilot.db` is created/updated at runtime.
- AI is assistive only; final decisions remain with clinicians.
