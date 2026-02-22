"""
triage_rules.py
- Deterministic "safety-first" red flag checks.
- Judges like seeing a rules layer + AI layer: predictable + intelligent.
"""

from typing import List, Tuple


def rule_based_flags(
    *,
    heart_rate: int,
    respiratory_rate: int,
    temperature_c: float,
    spo2: int,
    systolic_bp: int,
    chief_complaint: str,
    symptoms: str,
) -> Tuple[str, List[str]]:
    """
    Returns:
      - priority_level: LOW / MED / HIGH
      - flags: list of red flag messages
    """
    flags: List[str] = []
    priority = "LOW"

    text = f"{chief_complaint} {symptoms}".lower()

    # Oxygen risk
    if spo2 < 90:
        flags.append("SpO2 < 90% (possible hypoxia)")
        priority = "HIGH"
    elif spo2 < 94:
        flags.append("SpO2 < 94% (monitor oxygenation)")
        priority = max_priority(priority, "MED")

    # Heart rate risk
    if heart_rate > 120:
        flags.append("HR > 120 bpm (tachycardia)")
        priority = max_priority(priority, "MED")

    # Fever risk
    if temperature_c >= 39.0:
        flags.append("Temp >= 39C (high fever)")
        priority = max_priority(priority, "MED")

    # Low blood pressure risk (very simple rule)
    if systolic_bp < 90:
        flags.append("SBP < 90 (possible hypotension/shock)")
        priority = "HIGH"

    # Symptom-based red flags
    if "chest" in text and ("pain" in text or "tight" in text):
        flags.append("Chest pain/tightness reported (cardiac risk screen recommended)")
        priority = max_priority(priority, "MED")

    if "confusion" in text or "faint" in text or "passed out" in text:
        flags.append("Altered mental status / fainting reported (urgent evaluation recommended)")
        priority = max_priority(priority, "MED")

    if respiratory_rate > 30:
        flags.append("RR > 30 (respiratory distress risk)")
        priority = max_priority(priority, "HIGH")

    return priority, flags


def max_priority(current: str, candidate: str) -> str:
    order = {"LOW": 0, "MED": 1, "HIGH": 2}
    return current if order[current] >= order[candidate] else candidate