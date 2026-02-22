import os
import sys
from pathlib import Path

# Ensure project root is on sys.path for test imports
ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

# Ensure required env vars for test imports
os.environ.setdefault("JWT_SECRET_KEY", "test-secret")
os.environ.setdefault("GEMINI_API_KEY", "")
os.environ.setdefault("GEMINI_MODEL_NAME", "gemini-3-flash-preview")
