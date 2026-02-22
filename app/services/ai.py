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
import time
import logging
from typing import Dict, Any
from pathlib import Path
from dotenv import load_dotenv
GENAI_IMPORT_ERROR = None
try:
    from google import genai
except ModuleNotFoundError as e:
    genai = None
    GENAI_IMPORT_ERROR = str(e)
except Exception as e:
    genai = None
    GENAI_IMPORT_ERROR = str(e)

from .triage_rules import rule_based_flags

# Load environment variables
load_dotenv(override=True)

logger = logging.getLogger(__name__)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# Use fast Gemini model (good balance for hackathon)
MODEL_NAME = os.getenv("GEMINI_MODEL_NAME", "gemini-3-flash-preview")

GENAI_CLIENT = None
if GEMINI_API_KEY and genai:
    try:
        GENAI_CLIENT = genai.Client(api_key=GEMINI_API_KEY)
    except Exception:
        GENAI_CLIENT = None

PROMPT_DIR = Path(__file__).resolve().parent.parent / "prompts"

LANGUAGE_NAMES = {
    "en": "English",
    "es": "Spanish",
    "fr": "French",
    "ar": "Arabic",
    "pt": "Portuguese",
}


def language_name(code_or_name: str) -> str:
    if not code_or_name:
        return "English"
    code = code_or_name.strip().lower()
    return LANGUAGE_NAMES.get(code, code_or_name)


def is_gemini_ready() -> bool:
    return bool(GEMINI_API_KEY and genai and GENAI_CLIENT)


def gemini_status() -> dict:
    return {
        "configured": bool(GEMINI_API_KEY),
        "library_loaded": bool(genai),
        "client_ready": bool(GENAI_CLIENT),
        "model": MODEL_NAME,
        "import_error": GENAI_IMPORT_ERROR,
    }


def _extract_text_from_response(response: Any) -> str:
    try:
        candidates = getattr(response, "candidates", None) or []
        if candidates:
            parts = getattr(candidates[0].content, "parts", []) or []
            text_parts = [getattr(p, "text", "") for p in parts if getattr(p, "text", "")]
            if text_parts:
                return "".join(text_parts)
    except Exception:
        pass
    return getattr(response, "text", "") or ""


def translate_text(text: str, target_language: str) -> str:
    if not text or not str(text).strip():
        return text
    if not is_gemini_ready():
        logger.warning("Gemini not configured; translation skipped.")
        return text
    language = language_name(target_language)
    prompt = (
        f"Translate the following text to {language}. "
        "Return only the translated text with no extra commentary.\n\n"
        f"Text:\n{text}"
    )
    try:
        response = GENAI_CLIENT.models.generate_content(
            model=MODEL_NAME,
            contents=prompt,
        )
        output = _extract_text_from_response(response)
        output = output.strip()
        if not output:
            logger.warning("Gemini translate returned empty text; using original.")
        return output or text
    except Exception as e:
        logger.warning("Gemini translate failed (%s); using original.", e)
        return text


def translate_text_with_status(text: str, target_language: str) -> tuple[str, bool]:
    if not text or not str(text).strip():
        return text, False
    if not is_gemini_ready():
        logger.warning("Gemini not configured; translation skipped.")
        return text, False
    language = language_name(target_language)
    prompt = (
        f"Translate the following text to {language}. "
        "Return only the translated text with no extra commentary.\n\n"
        f"Text:\n{text}"
    )
    try:
        response = GENAI_CLIENT.models.generate_content(
            model=MODEL_NAME,
            contents=prompt,
        )
        output = _extract_text_from_response(response)
        output = output.strip()
        if not output:
            logger.warning("Gemini translate returned empty text; using original.")
            return text, False
        return output, True
    except Exception as e:
        logger.warning("Gemini translate failed (%s); using original.", e)
        return text, False


def translate_fields_payload(fields: Dict[str, Any], target_language: str) -> tuple[Dict[str, Any], bool, str | None]:
    if not fields:
        return fields, False, "empty_fields"
    if not is_gemini_ready():
        logger.warning("Gemini not configured; translation skipped.")
        return fields, False, "ai_not_configured"
    language = language_name(target_language)
    payload = json.dumps(fields, ensure_ascii=False)
    prompt = (
        f"Translate all string values in the following JSON to {language}. "
        "Preserve keys, structure, numbers, and arrays. Return ONLY valid JSON.\n\n"
        f"JSON:\n{payload}"
    )
    attempts = 2
    for idx in range(attempts):
        try:
            response = GENAI_CLIENT.models.generate_content(
                model=MODEL_NAME,
                contents=prompt,
            )
            output = _extract_text_from_response(response)
            output = output.strip()
            if "```" in output:
                output = output.split("```")[1]
                output = output.replace("json", "").strip()
            if not output:
                logger.warning("Gemini translate returned empty JSON; using original.")
                return fields, False, "empty_response"
            parsed = json.loads(output)
            if not isinstance(parsed, dict):
                logger.warning("Gemini translate returned non-dict JSON; using original.")
                return fields, False, "invalid_json"
            return parsed, True, None
        except Exception as e:
            message = str(e)
            if "RESOURCE_EXHAUSTED" in message or "429" in message:
                logger.warning("Gemini translate quota exhausted; using original.")
                return fields, False, "quota_exceeded"
            if "UNAVAILABLE" in message or "503" in message:
                logger.warning("Gemini translate unavailable (high demand).")
                if idx < attempts - 1:
                    time.sleep(1.5)
                    continue
                return fields, False, "service_unavailable"
            logger.warning("Gemini translate failed (%s); using original.", e)
            return fields, False, "failed"


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
        if not GEMINI_API_KEY or not genai or not GENAI_CLIENT:
            raise Exception("Gemini client not configured")

        prompt = build_prompt(payload)

        response = GENAI_CLIENT.models.generate_content(
            model=MODEL_NAME,
            contents=prompt,
        )
        text_output = _extract_text_from_response(response)

        text_output = text_output.strip()
        if not text_output:
            raise ValueError("Gemini response was empty")

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

