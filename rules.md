# WHO-ALIGNED TRIAGE VALUE CORRECTIONS

**Project:** Clinic Copilot  
**Module Reviewed:** triage_rules.py  
**Document Purpose:** Compare current triage thresholds against World Health Organization (WHO) emergency guidance and provide recommended corrections.

---

# 1. OVERVIEW

This document evaluates the deterministic triage rules implemented in `triage_rules.py` against:

- WHO Emergency Triage Assessment and Treatment (ETAT)
- WHO Oxygen Therapy Guidelines
- WHO Emergency & Essential Care Standards
- International adult vital sign reference ranges

The goal is to ensure:

- Clinical safety
- Evidence-based escalation
- Defensible thresholds for hackathon judging
- WHO-aligned emergency prioritization

---

# 2. VITAL SIGN THRESHOLD COMPARISON

---

## 2.1 Oxygen Saturation (SpO2)

### WHO Reference

- Normal: 95-100%
- Hypoxemia: < 94%
- Severe hypoxemia: < 90%
- Oxygen therapy recommended: < 90%

### Current Code (Updated)

- SpO2 < 90 -> HIGH
- SpO2 < 94 -> MED

### Evaluation

OK: Correct  
OK: Fully WHO-aligned  
OK: No modification required

---

## 2.2 Heart Rate (HR)

### WHO / Clinical Reference (Adults)

- Normal: 60-100 bpm
- Mild tachycardia: 101-110 bpm
- Concerning tachycardia: > 120 bpm
- Severe instability: >= 130 bpm

### Current Code (Updated)

- HR >= 130 -> HIGH
- HR 110-129 -> MED

### Evaluation

OK: WHO-aligned escalation

---

## 2.3 Temperature

### WHO Clinical Reference

- Normal: 36.1-37.5 C
- Fever: >= 38 C
- High fever: >= 39 C
- Hyperpyrexia: >= 40 C (medical emergency risk)

### Current Code (Updated)

- Temp >= 40.0 C -> HIGH
- Temp >= 38.5 C -> MED

### Evaluation

OK: WHO-aligned escalation

---

## 2.4 Systolic Blood Pressure (SBP)

### WHO Clinical Reference

- Normal: 100-120 mmHg
- Hypotension: < 90 mmHg
- Shock threshold: < 90 mmHg

### Current Code

- SBP < 90 -> HIGH

### Evaluation

OK: Fully aligned with WHO shock criteria  
OK: No modification required

---

## 2.5 Respiratory Rate (RR)

### WHO Adult Reference

- Normal: 12-20 breaths/min
- Tachypnea: > 20
- Severe respiratory distress: >= 30

### Current Code (Updated)

- RR >= 30 -> HIGH
- RR 21-29 -> MED

### Evaluation

OK: WHO-aligned escalation

---

# 3. SYMPTOM-BASED RED FLAGS

---

## 3.1 Chest Pain

### WHO Classification

Chest pain is potentially life-threatening.

### Current Code (Updated)

- Chest pain -> MED
- Chest pain + abnormal vitals -> HIGH

### Evaluation

OK: High-risk combination escalates appropriately

---

## 3.2 Altered Mental Status

Symptoms include:

- Confusion
- Fainting
- Loss of consciousness

### WHO Classification

Considered an emergency red flag.

### Current Code (Updated)

- Escalate to HIGH

### Evaluation

OK: Emergency red flag escalated to HIGH

---

# 4. SUMMARY OF CORRECTIONS

| Parameter | Current Code | WHO-Aligned Recommendation |
| --------- | ------------ | -------------------------- |
| SpO2      | <90 HIGH, <94 MED | Keep |
| HR        | >=130 HIGH, 110-129 MED | Keep |
| Temp      | >=40 HIGH, >=38.5 MED | Keep |
| SBP       | <90 HIGH | Keep |
| RR        | >=30 HIGH, 21-29 MED | Keep |
| Chest pain | MED, HIGH if abnormal vitals | Keep |
| Confusion | HIGH | Keep |

---

# 5. CONCLUSION

The existing triage logic demonstrates strong safety-first design and structured escalation.

After implementing the recommended updates:

- The system aligns with WHO emergency triage standards
- Risk of under-triaging critical patients is reduced
- Clinical defensibility improves
- Hackathon presentation strength increases

This rule-based safety layer is suitable for integration with an AI-assisted triage system to provide both predictability and intelligent risk assessment.

---
