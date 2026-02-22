# Clinic Co-Pilot - Pitch (AI in Healthcare)

## Hook
A patient arrives with chest tightness and dizziness after hours of waiting.
By the time they see a doctor, the visit is rushed.
The patient feels unheard, and the doctor is overloaded.

In busy clinics, details are scattered across forms, quick notes, and memory.
Important signals can be missed, not from neglect, but from pressure and time.

## Problem
Today, intake and triage are:
- Fragmented (symptoms here, vitals there, notes elsewhere)
- Slow (repeating questions, rewriting summaries, hunting for context)
- Risky under overload (red flags can be overlooked)
- Frustrating for patients and clinicians

Clinics do not need more complexity.
They need clarity at the moment it matters.

## Solution
Clinic Co-Pilot turns raw intake and vitals into a clean, structured clinical snapshot.

Flow:
1. Patient fills a guided intake form (symptoms, duration, severity, history).
2. Provider adds vitals (HR, RR, temp, SpO2, BP, etc.).
3. AI produces a clinician-ready brief:
   - Short summary
   - Priority level (LOW / MED / HIGH)
   - Red flag alerts
   - Differential considerations
   - Suggested questions and next steps
4. Doctor edits notes and records a decision (admit / not admit).

The doctor remains the final authority. The AI is assistive, not diagnostic.

## Why This Wins
- Faster: reduces manual summarization and repeated intake.
- Safer: highlights red flags under time pressure.
- Human-centered: gives clinicians more time to listen.
- Practical: lightweight MVP built on SQLite + FastAPI + HTML/CSS.

## Demo Flow
1. Patient submits intake.
2. Provider enters vitals and forwards to doctor.
3. Doctor sees the AI summary, red flags, and priority.
4. Doctor adds a note and submits a decision.

The wow moment: raw text + vitals become a clear, structured brief in seconds.

## Tech Stack
- FastAPI (backend + API)
- SQLite (local data storage)
- HTML/CSS/JS (dashboards)
- AI summary service with safe fallback rules

## Safety Note
Clinic Co-Pilot is a prototype decision-support tool.
It does not diagnose and does not replace clinical judgment.
