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
from dotenv import load_dotenv
import google.generativeai as genai

from .triage_rules import rule_based_flags

# Load environment variables
load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

# Use fast Gemini model (good balance for hackathon)
MODEL_NAME = "gemini-1.5-flash"


def generate_clinical_summary(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Main function called by provider router.

    Attempts Gemini first.
    If it fails, falls back to deterministic rule-based summary.
    """

    try:
        if not GEMINI_API_KEY:
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
        print("Gemini failed, using fallback:", e)
        return fallback_summary(payload)


def build_prompt(payload: Dict[str, Any]) -> str:
    """
    Build structured clinical prompt.
    Forces Gemini to respond ONLY in JSON.
    """

    intake = payload["intake"]
    vitals = payload["vitals"]

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

VITALS:
Heart Rate: {vitals['heart_rate']}
Respiratory Rate: {vitals['respiratory_rate']}
Temperature (C): {vitals['temperature_c']}
SpO2: {vitals['spo2']}
Blood Pressure: {vitals['systolic_bp']}/{vitals['diastolic_bp']}

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

    return {
        "short_summary": f"{intake['full_name']} presents with {intake['chief_complaint']}.",
        "priority_level": priority,
        "red_flags": flags,
        "differential_considerations": ["Further clinical evaluation required."],
        "recommended_questions": ["Expand review of systems."],
        "recommended_next_steps": ["Follow hospital triage protocol."],
    }
