"""
ai.py
Gemini AI Integration for Clinic Co-Pilot

This module:
1. Calls Google Gemini API
2. Forces structured JSON output
3. Falls back to rule-based logic if API fails
"""

import os
import json
from typing import Dict, Any
from pathlib import Path
from dotenv import load_dotenv
try:
    import google.generativeai as genai
except ModuleNotFoundError:
    genai = None

from .triage_rules import rule_based_flags

# Load environment variables
load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if GEMINI_API_KEY and genai:
    genai.configure(api_key=GEMINI_API_KEY)

# Use fast Gemini model (good balance for hackathon)
MODEL_NAME = "gemini-1.5-flash"

PROMPT_DIR = Path(__file__).resolve().parent.parent / "prompts"


def _load_prompt(name: str) -> str | None:
    path = PROMPT_DIR / name
    try:
        text = path.read_text(encoding="utf-8").strip()
    except FileNotFoundError:
        return None
    return text if text else None


def _render_prompt(template: str, context: dict[str, Any]) -> str:
    rendered = template
    for key, value in context.items():
        rendered = rendered.replace(f"{{{{{key}}}}}", str(value))
    return rendered


def generate_clinical_summary(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Main function called by provider router.

    Attempts Gemini first.
    If it fails, falls back to deterministic rule-based summary.
    """

    try:
        if not GEMINI_API_KEY or not genai:
            raise Exception("No Gemini API key found")

        model = genai.GenerativeModel(MODEL_NAME)

        prompt = build_prompt(payload)

        response = model.generate_content(prompt)

        # Extract raw text
        text_output = response.text.strip()

        # Gemini sometimes wraps JSON in ```json
        if "```" in text_output:
            text_output = text_output.split("```")[1]
            text_output = text_output.replace("json", "").strip()

        parsed = json.loads(text_output)

        required_keys = {
            "short_summary",
            "priority_level",
            "red_flags",
            "differential_considerations",
            "recommended_questions",
            "recommended_next_steps",
        }
        if not required_keys.issubset(parsed):
            raise ValueError("Gemini response missing required keys")
        list_keys = [
            "red_flags",
            "differential_considerations",
            "recommended_questions",
            "recommended_next_steps",
        ]
        if not all(isinstance(parsed.get(k), list) for k in list_keys):
            raise ValueError("Gemini response has invalid list fields")

        return parsed

    except Exception as e:
        try:
            print(f"Gemini AI failed: {type(e).__name__}: {e}")
            print("Falling back to rule-based summary for safety.")
        except Exception:
            pass
        return fallback_summary(payload)


def build_prompt(payload: Dict[str, Any]) -> str:
    """
    Build structured clinical prompt.
    Forces Gemini to respond ONLY in JSON.
    EC-08: Normalize empty fields to "None reported"
    """

    intake = payload["intake"]
    vitals = payload["vitals"]
    
    # Normalize empty optional fields
    history = intake.get('history', '').strip() or "None reported"
    medications = intake.get('medications', '').strip() or "None reported"
    allergies = intake.get('allergies', '').strip() or "None reported"

    base = _load_prompt("intake_summary.md")
    red_flags_guidance = _load_prompt("red_flags.md") or ""

    context = {
        "full_name": intake.get("full_name", ""),
        "age": intake.get("age", ""),
        "sex": intake.get("sex", ""),
        "chief_complaint": intake.get("chief_complaint", ""),
        "symptoms": intake.get("symptoms", ""),
        "duration": intake.get("duration", ""),
        "severity": intake.get("severity", ""),
        "history": history,
        "medications": medications,
        "allergies": allergies,
        "heart_rate": vitals.get("heart_rate", ""),
        "respiratory_rate": vitals.get("respiratory_rate", ""),
        "temperature_c": vitals.get("temperature_c", ""),
        "spo2": vitals.get("spo2", ""),
        "systolic_bp": vitals.get("systolic_bp", ""),
        "diastolic_bp": vitals.get("diastolic_bp", ""),
        "red_flags_guidance": red_flags_guidance,
    }

    if base:
        return _render_prompt(base, context)

    return f"""
You are a clinical decision-support assistant.
You do NOT diagnose.
You assist clinicians by summarizing structured intake data.

Return STRICT JSON with the following format:

{{
  "short_summary": string,
  "priority_level": "LOW" | "MED" | "HIGH",
  "red_flags": [string],
  "differential_considerations": [string],
  "recommended_questions": [string],
  "recommended_next_steps": [string]
}}

PATIENT DATA:
Name: {intake['full_name']}
Age: {intake['age']}
Sex: {intake['sex']}
Chief Complaint: {intake['chief_complaint']}
Symptoms: {intake['symptoms']}
Duration: {intake['duration']}
Severity: {intake['severity']}
Medical History: {history}
Current Medications: {medications}
Allergies: {allergies}

VITALS:
Heart Rate: {vitals['heart_rate']} bpm
Respiratory Rate: {vitals['respiratory_rate']} /min
Temperature: {vitals['temperature_c']} C
SpO2: {vitals['spo2']}%
Blood Pressure: {vitals['systolic_bp']}/{vitals['diastolic_bp']} mmHg

Important:
- Escalate to HIGH priority if vitals are critically abnormal.
- Be concise.
- No markdown.
- Return ONLY JSON.
"""


def fallback_summary(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Fallback rule-based logic if Gemini fails.
    Ensures demo never breaks.
    """

    intake = payload["intake"]
    vitals = payload["vitals"]

    priority, flags = rule_based_flags(
        heart_rate=vitals["heart_rate"],
        respiratory_rate=vitals["respiratory_rate"],
        temperature_c=vitals["temperature_c"],
        spo2=vitals["spo2"],
        systolic_bp=vitals["systolic_bp"],
        chief_complaint=intake["chief_complaint"],
        symptoms=intake["symptoms"],
    )

    age = intake.get("age", "")
    sex = intake.get("sex", "")
    name = intake.get("full_name", "Patient")
    chief = intake.get("chief_complaint", "")
    symptoms = intake.get("symptoms", "")
    duration = intake.get("duration", "")
    severity = intake.get("severity", "")

    vitals_summary = (
        f"Vitals: HR {vitals.get('heart_rate', '')} bpm, RR {vitals.get('respiratory_rate', '')}/min, "
        f"Temp {vitals.get('temperature_c', '')} C, SpO2 {vitals.get('spo2', '')}%, "
        f"BP {vitals.get('systolic_bp', '')}/{vitals.get('diastolic_bp', '')}."
    )

    short_summary = (
        f"{name} is a {age}-year-old {sex} presenting with {chief}. "
        f"Symptoms include {symptoms}. Duration: {duration}; Severity: {severity}. "
        f"{vitals_summary} Clinical assessment is required based on the above findings."
    )

    return {
        "short_summary": short_summary,
        "priority_level": priority,
        "red_flags": flags,
        "differential_considerations": ["Further clinical evaluation required."],
        "recommended_questions": ["Clarify symptom progression and associated symptoms."],
        "recommended_next_steps": ["Follow hospital triage protocol and consider targeted diagnostics."],
    }

