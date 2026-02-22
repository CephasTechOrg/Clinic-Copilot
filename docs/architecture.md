# Clinic Co-Pilot - Architecture

## Goal

Turn fragmented intake + vitals into a structured clinician-ready summary and triage signal, while keeping doctors fully in control.

## High-Level Components

1. **FastAPI App**
   - Serves HTML dashboards (patient/provider/doctor)
   - Accepts form submissions
   - Calls AI service for summary output
   - Writes to SQLite for persistence

2. **SQLite Database**
   Stores:
   - Patient intake
   - Vitals
   - AI-generated summary + flags
   - Doctor decision + notes

3. **AI Summary Service**
   Input:
   - Patient demographics
   - Chief complaint
   - Symptoms + duration + severity
   - Provider vitals

   Output (structured JSON):
   - short_summary
   - red_flags (list)
   - priority_level (LOW/MED/HIGH)
   - differential_considerations (list)
   - recommended_questions (list)
   - recommended_next_steps (list)

4. **Optional Rules Layer**
   `triage_rules.py` can provide deterministic safety checks:
   - SpO2 < 90 => HIGH priority flag
   - HR > 120 + fever => possible infection/sepsis risk flag
   - chest pain + sweating => cardiac risk flag

This helps you explain "safety-first" design to judges.

## Data Flow

### Patient -> Provider -> Doctor

1. Patient submits intake form -> saved to DB
2. Provider selects patient -> adds vitals -> saved to DB
3. System calls AI service with intake + vitals
4. AI returns structured summary + flags -> saved to DB
5. Doctor dashboard loads the case:
   - shows summary
   - doctor edits notes
   - doctor decides admit / not admit / more tests

## Why This Is Hackathon-Ready

- Simple UI: HTML/CSS dashboards
- Clean backend: FastAPI routes per role
- SQLite storage: no external infra needed
- Prompts are editable quickly during the hackathon

## Security & Privacy (Prototype Notes)

- Minimal PII display
- Avoid storing unnecessary identifiers
- Local-only SQLite for demo
- Add a disclaimer: "assistant, not diagnosis"
