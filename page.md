# Clinic Co-Pilot Pages & Updates

## Web Pages (UI)

### Patient
- `/patient` → `user_interface/patient.html`
- Purpose: patient intake, multi-language form, submit to nurse.

### Nurse
- `/nurse/login` → `user_interface/nurse_login.html`
- `/nurse/register` → `user_interface/nurse_register.html`
- `/nurse` → `user_interface/nurse.html`
- Purpose: review intakes, capture vitals, send to doctor.

### Doctor
- `/doctor/login` → `user_interface/doctor_login.html`
- `/doctor/register` → `user_interface/doctor_register.html`
- `/doctor` → `user_interface/doctor.html`
- Purpose: AI summary review, triage status workflow, decision capture.

## API Endpoints (Key)

- `GET /api/health` — app health + AI status
- `GET /api/intakes` — list all intakes (staff only)
- `GET /api/intakes/{id}` — get intake detail (staff only)
- `POST /api/intakes` — create patient intake
- `POST /api/intakes/{id}/vitals` — submit vitals + generate AI summary (nurse only)
- `POST /api/intakes/{id}/decision` — doctor decision (doctor only)
- `POST /api/translate` — translate clinical text for doctor view (staff only)
- `POST /api/seed-demo-data` — seed demo patients (guarded by `ALLOW_DEMO_SEED`)
- `POST /api/seed-demo-users` — preload staff IDs (guarded by `ALLOW_DEMO_SEED`)
- `POST /auth/register` — activate preloaded staff (ID validation)
- `POST /auth/login` — staff login
- `GET /auth/me` — current staff user

## Recent Updates (Summary)

- Controlled registration: staff IDs must be preloaded; activation requires matching ID + name.
- Doctor workflow statuses: `Pending`, `Admitted`, `Approved`, `Delayed` with transitions + timestamps.
- Doctor queue: urgency scoring with SLA indicators; clean case cards.
- AI summary enforced with rule-based fallback if Gemini fails.
- Multilingual intake: patient chooses language; originals stored for audit.
- Doctor language selector: translate clinical text to 5 supported languages (uses Gemini).
- File-mode navigation: UI works via `file://` and `http://localhost:8000`.

## Notes

- For a clean demo, delete `clinic_copilot.db` and restart `uvicorn` to recreate tables.
- Translation and AI summaries depend on valid Gemini API quota and connectivity.
