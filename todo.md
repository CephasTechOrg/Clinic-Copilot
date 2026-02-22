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

## Review Findings (Immediate)

- [x] Replace default JWT secret with required env var (fail fast if missing)
- [x] Protect or remove demo seed endpoints (`/api/seed-demo-data`, `/api/seed-demo-users`)
- [x] Doctor queue: filter to `PENDING_DOCTOR` (exclude completed cases)
- [x] Remove or implement `/nurse/register` and `/doctor/register` routes + links
- [x] Fix mojibake/encoding artifacts in UI and seed data (e.g., `Â°C`, `â€¢`, `â†`)
- [x] Allow committing `.env.example` by removing it from `.gitignore`
- [ ] Add at least a basic smoke test (currently empty)

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

---

## 9) Auth + Role-Based Access Control (RBAC) - Security Layer

> **Goal**: Secure patient data. Only authenticated staff can access sensitive info.

### 9.1) Authentication System

- [x] Create `users` table:
  - `id` (pk)
  - `staff_id` (unique, e.g., `NURSE-1001`, `DOC-2001`)
  - `password_hash` (bcrypt/argon2)
  - `role` (enum: `NURSE`, `DOCTOR`)
  - `full_name`
  - `is_active` (boolean)
  - `created_at`

- [x] Build staff login endpoint: `POST /auth/login`
  - Accept: `staff_id` + `password`
  - Return: JWT access token
  - Store token in HttpOnly cookie or session storage

- [x] Implement password hashing (bcrypt via `passlib`)

- [x] Implement JWT token creation + verification
  - Use `python-jose` for JWT
  - Token contains: `staff_id`, `role`, `exp`

- [x] Create `get_current_user` dependency (FastAPI Depends)

- [x] Add `require_role(role)` guard decorator for NURSE/DOCTOR routes

- [x] Logout endpoint: `POST /auth/logout` (optional, invalidate token)

### 9.2) Database Schema Updates (SIMPLIFIED)

> Keeping existing schema but adding authentication layer

- [x] User model added to models.py
- [x] Demo users created (NURSE-1001, NURSE-1002, DOC-2001, DOC-2002)
- [ ] Optional: Add audit trail (entered_by_user_id) to vitals/decisions

### 9.3) Patient Flow (Public - No Auth)

- [x] Patient intake endpoint remains public: `POST /api/intakes`
- [x] Patient form page remains public (`/patient`)

### 9.4) Nurse Portal Flow (Protected)

- [x] Create nurse login page (`/nurse/login`)
- [x] Auth check in nurse.js - redirects to login if not authenticated
- [x] Protected API: `GET /api/intakes` (requires NURSE or DOCTOR role)
- [x] Protected API: `POST /api/intakes/{id}/vitals` (requires NURSE role)
- [x] Logout button in nurse portal header
- [x] Display logged-in user name in header

### 9.5) Doctor Portal Flow (Protected)

- [x] Create doctor login page (`/doctor/login`)
- [x] Auth check in doctor.js - redirects to login if not authenticated
- [x] Protected API: `GET /api/intakes/{id}` (requires NURSE or DOCTOR role)
- [x] Protected API: `POST /api/intakes/{id}/decision` (requires DOCTOR role)
- [x] Logout button in doctor portal header
- [x] Display logged-in user name in header

- [ ] Create doctor note endpoint: `POST /doctor/submission/{id}/note`
  - Save note with `entered_by_doctor_id`
  - Include decision field

- [ ] Create decision endpoint: `POST /doctor/submission/{id}/decision`
  - Update `status` to `DONE`
  - Record decision (ADMIT, DISCHARGE, etc.)

### 9.6) Security Checklist (Must-Do)

- [ ] ✅ Hash all passwords (bcrypt via `passlib[bcrypt]`)
- [ ] ✅ JWT authentication for Nurse/Doctor routes
- [ ] ✅ Role checks: nurse routes reject doctors and vice versa
- [ ] ✅ Ownership checks: verify user is assigned before returning data
- [ ] ✅ No patient data in guessable URLs without auth
- [ ] ✅ Rate limit login attempts (basic anti-bruteforce)
- [ ] ✅ HTTPS in production (not localhost)
- [ ] ⭐ Audit log (optional): record who viewed/edited/forwarded + timestamp

### 9.7) Frontend Updates

- [ ] Add login pages for nurse and doctor portals
- [ ] Store JWT token in sessionStorage (or HttpOnly cookie)
- [ ] Add Authorization header to all protected API calls
- [ ] Redirect to login if 401 Unauthorized
- [ ] Show logged-in user info in header
- [ ] Add logout button

### 9.8) Seed Data for Demo

- [ ] Create seed script with demo users:
  ```
  NURSE-1001 / nurse123 (Nurse Jane)
  NURSE-1002 / nurse123 (Nurse Mike)
  DOC-2001 / doctor123 (Dr. Smith)
  DOC-2002 / doctor123 (Dr. Patel)
  ```
- [ ] Create demo patient submissions assigned to demo users

---

## Implementation Priority Order

1. **Phase 1: Auth Foundation**
   - [ ] `users` table + User model
   - [ ] Password hashing utilities
   - [ ] Login endpoint + JWT generation
   - [ ] `get_current_user` dependency

2. **Phase 2: Protected Routes**
   - [ ] Role-based route guards
   - [ ] Update nurse routes with auth
   - [ ] Update doctor routes with auth
   - [ ] Ownership verification

3. **Phase 3: Assignment System**
   - [ ] `case_assignments` table
   - [ ] Auto-assign logic
   - [ ] Forward-to-doctor flow

4. **Phase 4: Frontend Auth**
   - [ ] Login pages
   - [ ] Token storage
   - [ ] Auth headers in fetch calls
   - [ ] Logout functionality

5. **Phase 5: Polish**
   - [ ] Rate limiting
   - [ ] Audit logging
   - [ ] Error handling
   - [ ] Demo seed data
