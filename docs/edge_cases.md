# Edge Cases & Fixes for Clinic Co-Pilot

This document lists all identified edge cases, security issues, and robustness improvements needed.

---

## 🔴 CRITICAL - Security & Auth

### EC-01: Token Expiration Not Handled on Frontend

**Problem:** JWT tokens expire after 8 hours, but frontend doesn't detect expired tokens and redirect gracefully.
**Current:** User sees generic errors when token expires mid-session.
**Fix:** Check token expiration before API calls; show session expired message and redirect to login.
**Files:** `static/js/auth.js`, `static/js/nurse.js`, `static/js/doctor.js`

### EC-02: Password Minimum Length Not Enforced Consistently

**Problem:** Backend requires 6 chars, but frontend forms don't enforce/show this.
**Fix:** Add `minlength="6"` and validation message on registration forms.
**Files:** `user_interface/nurse_register.html`, `user_interface/doctor_register.html`

### EC-03: Brute Force Login Protection Missing

**Problem:** No rate limiting on login attempts - allows password guessing.
**Fix:** Add rate limiting (e.g., max 5 attempts per minute per IP/staff_id).
**Files:** `app/routers/auth_router.py`

### EC-04: CORS Not Configured

**Problem:** API may reject requests from different origins during development.
**Fix:** Add explicit CORS middleware with appropriate origins.
**Files:** `app/main.py`

---

## 🟠 HIGH - Data Validation

### EC-05: Patient Name Sanitization

**Problem:** Names with special characters (SQL injection, XSS) not sanitized.
**Current:** Pydantic validates length but not content.
**Fix:** Strip HTML tags, validate against regex pattern for names.
**Files:** `app/schemas.py` (IntakeCreate)

### EC-06: Age Boundary Edge Cases

**Problem:** Age 0 (newborns) and 130 (edge case) may need special handling in AI prompts.
**Fix:** Add age-appropriate context in clinical prompts; flag extremes.
**Files:** `app/services/ai.py`

### EC-07: Vitals Range Validation Too Loose

**Problem:** Current ranges allow impossible values (HR 0, BP 0/0, temp 25°C).
**Current:** `heart_rate: 0-300`, `temperature_c: 25-45`, BP ranges too wide.
**Fix:** Tighten to clinically valid ranges:

- heart_rate: 30-250 (allows bradycardia/tachycardia)
- respiratory_rate: 4-60
- temperature_c: 32-43 (hypothermia to hyperpyrexia)
- spo2: 50-100 (allows severe hypoxia)
- systolic_bp: 50-250, diastolic_bp: 30-150
  **Files:** `app/schemas.py` (VitalsCreate)

### EC-08: Empty Optional Fields

**Problem:** Empty strings in `history`, `medications`, `allergies` may confuse AI.
**Fix:** Normalize empty strings to "None reported" or similar in AI prompt.
**Files:** `app/services/ai.py`

---

## 🟡 MEDIUM - Workflow Logic

### EC-09: Re-submission of Vitals

**Problem:** Nurse can resubmit vitals, but old clinical summary is deleted.
**Current:** Previous AI analysis is lost on re-entry.
**Fix:** Consider versioning or confirmation dialog before overwrite.
**Files:** `app/routers/api.py` (submit_vitals)

### EC-10: Workflow Status Inconsistency

**Problem:** Can submit decision on intake without vitals (if DB manipulated).
**Current:** Only checks if `clinical_summary` exists, not `vitals`.
**Fix:** Add check: `if not intake.vitals: raise HTTPException`
**Files:** `app/routers/api.py` (update_decision)

### EC-11: Concurrent Vitals Submission

**Problem:** Two nurses could submit vitals for same patient simultaneously.
**Fix:** Add database-level locking or check-then-update pattern.
**Files:** `app/routers/api.py`

### EC-12: Decision Change After Completion

**Problem:** Doctor can change decision on already-completed cases.
**Current:** No check for `workflow_status == "COMPLETED"`.
**Fix:** Either block changes or track decision history.
**Files:** `app/routers/api.py` (update_decision)

---

## 🟢 LOW - UX & Polish

### EC-13: Form Field Auto-Uppercase Staff ID

**Problem:** Users may enter "nurse-1001" lowercase, causing login failures.
**Current:** Backend normalizes, but user sees lowercase in form.
**Fix:** Add CSS `text-transform: uppercase` and JS normalization on input.
**Files:** `user_interface/nurse_login.html`, `user_interface/doctor_login.html`

### EC-14: Patient Confirmation Missing

**Problem:** After patient submits intake, no confirmation number or next steps shown.
**Fix:** Show "Your queue number is #X. Please wait in the lobby."
**Files:** `user_interface/patient.html`, `static/js/patient.js`

### EC-15: Loading States Missing

**Problem:** No visual feedback during API calls (login, submit vitals, etc.).
**Fix:** Add loading spinners, disable submit buttons during requests.
**Files:** All JS files

### EC-16: Network Error Messages Vague

**Problem:** "Connection error" doesn't help users troubleshoot.
**Fix:** Distinguish between network offline, server down, timeout.
**Files:** `static/js/auth.js`, all other JS files

### EC-17: Session Persistence Confusion

**Problem:** Using `sessionStorage` means login lost on browser close.
**Current:** May be intentional for security, but not explained to users.
**Fix:** Either use `localStorage` with expiry or explain behavior.
**Files:** `static/js/auth.js`

---

## 🔵 INFRASTRUCTURE

### EC-18: Database Connection Pool

**Problem:** Each request creates new DB connection; no pooling configured.
**Fix:** Configure SQLAlchemy pool settings for production.
**Files:** `app/db.py`

### EC-19: AI API Timeout

**Problem:** Gemini API call has no timeout; could hang indefinitely.
**Fix:** Add timeout (e.g., 30 seconds) and proper error handling.
**Files:** `app/services/ai.py`

### EC-20: Environment Variable Validation

**Problem:** Missing required env vars cause cryptic errors at runtime.
**Current:** `JWT_SECRET_KEY` raises RuntimeError, but `GEMINI_API_KEY` silently fails.
**Fix:** Add startup validation for all required env vars with clear messages.
**Files:** `app/main.py`, `app/auth.py`

### EC-21: Health Check Incomplete

**Problem:** `/api/health` doesn't verify AI service connectivity.
**Fix:** Add optional Gemini connectivity check.
**Files:** `app/routers/api.py`

---

## 📋 IMPLEMENTATION PRIORITY

### Phase 1 - Must Fix (Security/Breaking)

1. EC-01: Token expiration handling
2. EC-02: Password length enforcement
3. EC-07: Vitals range validation
4. EC-10: Workflow status check
5. EC-04: CORS configuration

### Phase 2 - Should Fix (Robustness)

6. EC-05: Name sanitization
7. EC-09: Vitals re-submission confirmation
8. EC-12: Decision change protection
9. EC-19: AI API timeout
10. EC-20: Env var validation

### Phase 3 - Nice to Have (Polish)

11. EC-13: Auto-uppercase staff ID
12. EC-14: Patient confirmation
13. EC-15: Loading states
14. EC-16: Better error messages
15. EC-17: Session persistence explanation

---

## ✅ ALREADY HANDLED

- ✅ Staff ID format validation (NURSE-XXXX, DOC-XXXX)
- ✅ Password confirmation on registration
- ✅ Duplicate staff ID rejection
- ✅ Role-based access control (403 for wrong role)
- ✅ Unauthenticated access blocked (401)
- ✅ AI fallback to rule-based when API unavailable
- ✅ Workflow status tracking
- ✅ CORS configured (EC-04)
- ✅ Auto-uppercase Staff ID on input (EC-13)
- ✅ Password minlength="6" on registration forms (EC-02)

---

## ✅ FIXED IN THIS REVIEW

- ✅ EC-01: Token expiration detection added to auth.js
- ✅ EC-07: Vitals ranges tightened to clinically valid values
- ✅ EC-08: Empty optional fields normalized in AI prompt
- ✅ EC-10: Decision requires vitals check added
- ✅ EC-12: Decision change protection on completed cases
