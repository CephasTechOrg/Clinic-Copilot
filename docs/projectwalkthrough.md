# Clinic Co-Pilot — Complete Project Walkthrough

> A decision-support tool that captures the patient story once, preserves it with empathy, and delivers the right clinical signals at the moment they matter.

**📖 Reading Guide:** This document is written so anyone on the team—technical or not—can understand how our system works. Think of it as a story: we'll start with "why we built this," then walk through "how each piece works," and end with "questions judges might ask."

---

## Table of Contents

1. [Project Overview](#1-project-overview) — _The "why" behind our project_
2. [System Architecture](#2-system-architecture) — _The big picture of how everything connects_
3. [Technology Stack](#3-technology-stack) — _The tools we used and why_
4. [Folder Structure](#4-folder-structure) — _Where to find what in our code_
5. [Database Design](#5-database-design) — _How we store patient data_
6. [Backend Deep Dive](#6-backend-deep-dive) — _How the server works_
7. [AI Integration](#7-ai-integration) — _How we use Google Gemini_
8. [Translation System](#8-translation-system) — _How 5 languages work_
9. [Authentication & Authorization](#9-authentication--authorization) — _How login works_
10. [Frontend Architecture](#10-frontend-architecture) — _How the web pages work_
11. [API Communication Flow](#11-api-communication-flow) — _How frontend talks to backend_
12. [Safety & Fallback Design](#12-safety--fallback-design) — _What happens when AI fails_
13. [Requirements Breakdown](#13-requirements-breakdown) — _Why we need each library_
14. [Common Judge Questions](#14-common-judge-questions) — _Prepare for Q&A_

---

## 1. Project Overview

### The Story Behind This Project

Imagine this scene: A patient named Maria arrives at a busy clinic. She's been waiting for two hours. Her chest feels tight. She's dizzy. She's scared. She speaks Spanish, and the intake form is in English. When she finally sees a nurse, she struggles to explain her symptoms. The nurse jots down quick notes. An hour later, when the doctor finally sees Maria, the story is fragmented—pieces here, pieces there. The doctor is exhausted from seeing 30 patients already. In the rush, something important might be missed.

**This is not neglect. This is overload.**

We built Clinic Co-Pilot to fix this.

### The Problem (In Simple Terms)

In busy clinics, patient intake is broken:

| Problem               | What It Means                                                                          |
| --------------------- | -------------------------------------------------------------------------------------- |
| **Fragmented**        | Symptoms written on one paper, vitals on another, doctor notes somewhere else          |
| **Slow**              | Patient tells the same story to the receptionist, then nurse, then doctor (3-5 times!) |
| **Risky**             | When doctors are tired, they might miss warning signs (like low oxygen)                |
| **Language barriers** | A Spanish-speaking patient can't properly describe "chest tightness" in English        |

### Our Solution (The Simple Version)

We built a **three-step digital workflow**:

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│    STEP 1       │      │    STEP 2       │      │    STEP 3       │
│    PATIENT      │ ───► │    NURSE        │ ───► │    DOCTOR       │
│                 │      │                 │      │                 │
│ Fills form in   │      │ Adds vitals:    │      │ Sees AI summary │
│ their language  │      │ heart rate,     │      │ with red flags, │
│ (Spanish, etc.) │      │ temperature,    │      │ makes decision  │
│                 │      │ blood pressure  │      │ (admit/release) │
└─────────────────┘      └─────────────────┘      └─────────────────┘
```

**What makes this special:**

1. ✅ Patient fills form ONCE, in their own language
2. ✅ System automatically translates to English for clinical use
3. ✅ AI reads the symptoms + vitals and highlights dangerous signs
4. ✅ Doctor sees everything organized, can view in their preferred language
5. ✅ Doctor is still the boss—AI only assists, never diagnoses

---

## 2. System Architecture

### The Big Picture (Like a Restaurant)

Think of our system like a restaurant:

| Restaurant                        | Our System                                |
| --------------------------------- | ----------------------------------------- |
| **Customer** fills out order form | **Patient** fills intake form             |
| **Waiter** takes order to kitchen | **Nurse** adds vitals, forwards to doctor |
| **Kitchen** prepares the food     | **AI** generates clinical summary         |
| **Chef** approves the dish        | **Doctor** reviews and makes decision     |
| **Menu** (paper)                  | **Frontend** (web pages)                  |
| **Kitchen staff**                 | **Backend** (server)                      |
| **Recipe book**                   | **Database** (stores all data)            |

### The Technical Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                    FRONTEND (What Users See)                     │
│                                                                  │
│   Patient Form    Nurse Dashboard    Doctor Dashboard            │
│   (patient.html)  (nurse.html)       (doctor.html)               │
│        │               │                  │                      │
│        └───────────────┴──────────────────┘                      │
│                         │                                        │
│              Sends data over the internet (JSON)                 │
└─────────────────────────┼────────────────────────────────────────┘
                          ▼
┌──────────────────────────────────────────────────────────────────┐
│                 BACKEND (The Brain / Server)                     │
│                                                                  │
│   Receives requests, processes data, talks to AI and database   │
│                                                                  │
│   Built with: FastAPI (Python)                                   │
│   Runs on: Uvicorn (web server)                                  │
└─────────────────────────┼────────────────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
   ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
   │  DATABASE   │ │   GEMINI    │ │  FALLBACK   │
   │  (SQLite)   │ │   (AI API)  │ │   RULES     │
   │             │ │             │ │             │
   │ Stores all  │ │ Generates   │ │ Backup if   │
   │ patient     │ │ summaries,  │ │ AI fails    │
   │ data        │ │ translates  │ │             │
   └─────────────┘ └─────────────┘ └─────────────┘
```

### What Each Layer Does

**Frontend (Browser)**

- The web pages users see and interact with
- Built with HTML (structure), CSS (styling), JavaScript (interactivity)
- Like the "face" of our application

**Backend (Server)**

- The "brain" that processes all requests
- Receives data from frontend, saves to database, calls AI
- Built with Python and FastAPI
- Like the "kitchen" where all the work happens

**Database (Storage)**

- Where we save all patient information permanently
- Uses SQLite (a simple file-based database)
- Like a "filing cabinet" that remembers everything

**AI Service (Google Gemini)**

- External service that generates clinical summaries
- Also handles translations between languages
- Like having a "smart assistant" who reads patient info and highlights important stuff

---

## 3. Technology Stack

### What is a "Technology Stack"?

A technology stack is simply the list of tools/technologies we used to build the project. Think of it like the ingredients in a recipe.

### Backend Technologies (Server-Side)

| Tool             | What It Is           | Why We Use It                       | Simple Analogy                               |
| ---------------- | -------------------- | ----------------------------------- | -------------------------------------------- |
| **Python**       | Programming language | Easy to read, great for AI          | The "language" we write in                   |
| **FastAPI**      | Web framework        | Handles web requests, super fast    | The "skeleton" of our app                    |
| **Uvicorn**      | Web server           | Runs our FastAPI app                | The "engine" that powers the server          |
| **SQLAlchemy**   | Database tool        | Lets Python talk to database easily | The "translator" between Python and database |
| **SQLite**       | Database             | Stores data in a single file        | A "filing cabinet" in one file               |
| **Pydantic**     | Data validation      | Makes sure data is correct format   | A "quality checker" for incoming data        |
| **google-genai** | AI library           | Connects to Google Gemini AI        | The "phone line" to our AI assistant         |
| **bcrypt**       | Password security    | Hashes passwords safely             | A "vault" for passwords                      |
| **python-jose**  | Authentication       | Creates login tokens (JWT)          | The "ID badge" system                        |

### Frontend Technologies (Browser-Side)

| Tool                 | What It Is     | Why We Use It                  |
| -------------------- | -------------- | ------------------------------ |
| **HTML**             | Page structure | The "bones" of a webpage       |
| **Tailwind CSS**     | Styling        | Makes things look pretty, fast |
| **JavaScript**       | Interactivity  | Makes buttons work, sends data |
| **Material Symbols** | Icons          | Professional medical icons     |
| **Inter Font**       | Typography     | Clean, readable text           |

### Why These Choices?

**Why FastAPI instead of Flask or Django?**

> FastAPI is newer and faster. It automatically validates data and generates documentation. For a hackathon, speed matters!

**Why SQLite instead of PostgreSQL or MySQL?**

> SQLite needs zero setup—it's just a file. Perfect for demos. We can switch to PostgreSQL later with minimal changes.

**Why Vanilla JavaScript instead of React or Vue?**

> No build step required. For a hackathon prototype, simpler is better. We can add React later if needed.

---

## 4. Folder Structure

### Understanding the Folder Layout

Think of our project folder like a house with different rooms:

```
clinic-copilot/                    🏠 The whole house
│
├── app/                           🧠 The "brain room" (backend code)
│   ├── main.py                    🚪 Front door - where the app starts
│   ├── db.py                      🗄️ Filing cabinet - database connection
│   ├── models.py                  📋 Forms - what data looks like
│   ├── schemas.py                 ✅ Checklist - data validation rules
│   │
│   ├── routers/                   📬 Mail room - handles requests
│   │   ├── patient.py                 Patient API endpoints
│   │   ├── provider.py                Nurse API endpoints
│   │   └── doctor.py                  Doctor API endpoints
│   │
│   ├── services/                  ⚙️ Workshop - business logic
│   │   ├── ai.py                      AI integration (Gemini)
│   │   └── triage_rules.py            Backup rules if AI fails
│   │
│   └── prompts/                   📝 Script room - AI instructions
│       ├── intake_summary.md          How to summarize patients
│       └── red_flags.md               Warning signs to detect
│
├── templates/                     🖥️ Display room (HTML pages)
│   ├── base.html                      Shared template
│   ├── patient.html                   Patient intake form
│   ├── provider.html                  Nurse dashboard
│   ├── doctor.html                    Doctor dashboard
│   └── ...                            Other pages
│
├── static/                        🎨 Art room (CSS, JS, images)
│   └── css/styles.css                 Extra styling
│
├── docs/                          📚 Library (documentation)
├── tests/                         🧪 Testing lab
├── requirements.txt               📦 Shopping list (Python packages)
├── .env                           🔑 Secret keys (not shared)
└── README.md                      📖 Welcome guide
```

### What Each Important File Does

| File              | Location      | Purpose                       | When It Runs              |
| ----------------- | ------------- | ----------------------------- | ------------------------- |
| `main.py`         | app/          | Starts the entire application | When server starts        |
| `db.py`           | app/          | Connects to SQLite database   | Every database operation  |
| `models.py`       | app/          | Defines table structures      | When saving/loading data  |
| `schemas.py`      | app/          | Validates incoming data       | Every API request         |
| `ai.py`           | app/services/ | Calls Gemini AI               | When nurse submits vitals |
| `triage_rules.py` | app/services/ | Backup if AI fails            | When Gemini is down       |

---

## 5. Database Design

### What is a Database?

A database is like a spreadsheet with superpowers. It stores information in **tables** (like sheets), with **rows** (like records) and **columns** (like fields).

### Our Four Tables

We have 4 tables in our database:

```
TABLE 1: users               TABLE 2: patient_intakes
┌──────────────────┐         ┌──────────────────────┐
│ Staff accounts   │         │ Patient information  │
│                  │         │                      │
│ • Nurse accounts │         │ • Name, age, sex     │
│ • Doctor accounts│         │ • Symptoms           │
│ • Passwords      │         │ • Chief complaint    │
│ • Role (N or D)  │         │ • Medical history    │
└──────────────────┘         │ • Language           │
                             └──────────┬───────────┘
                                        │
                    ┌───────────────────┼───────────────────┐
                    │                   │                   │
                    ▼                   ▼                   ▼
        TABLE 3: vitals_entries    TABLE 4: clinical_summaries
        ┌──────────────────┐       ┌──────────────────────┐
        │ Nurse-entered    │       │ AI-generated +       │
        │ vital signs      │       │ Doctor decisions     │
        │                  │       │                      │
        │ • Heart rate     │       │ • AI summary         │
        │ • Temperature    │       │ • Priority level     │
        │ • Blood pressure │       │ • Red flags          │
        │ • Oxygen level   │       │ • Doctor's decision  │
        └──────────────────┘       │ • Doctor's notes     │
                                   └──────────────────────┘
```

### How Tables Connect (Relationships)

Think of it like a family tree:

```
One Patient Intake
        │
        ├── has ONE set of Vitals (added by nurse)
        │
        └── has ONE Clinical Summary (generated by AI, updated by doctor)
```

This is called a **one-to-one relationship**. Each patient intake can only have one vitals entry and one summary.

### Real Example: Maria's Data

When Maria visits the clinic, here's what gets stored:

**patient_intakes table:**
| id | full_name | age | chief_complaint | preferred_language |
|----|-----------|-----|-----------------|-------------------|
| 1 | Maria Garcia | 45 | Chest tightness | es |

**vitals_entries table:**
| id | intake_id | heart_rate | temperature | spo2 |
|----|-----------|------------|-------------|------|
| 1 | 1 | 92 | 37.2 | 96 |

**clinical_summaries table:**
| id | intake_id | priority_level | red_flags | decision |
|----|-----------|----------------|-----------|----------|
| 1 | 1 | MED | Chest pain with normal vitals | PENDING |

### The Workflow Status

Each patient intake goes through stages:

```
PENDING_NURSE  ──►  PENDING_DOCTOR  ──►  COMPLETED
     │                    │                  │
     │                    │                  │
  Patient             Nurse added         Doctor made
  submitted           vitals              decision
```

### The Doctor's Decision Options

| Decision   | Meaning                                    |
| ---------- | ------------------------------------------ |
| `PENDING`  | Doctor hasn't reviewed yet                 |
| `ADMITTED` | Patient needs hospital admission           |
| `APPROVED` | Patient can be released/treated outpatient |
| `DELAYED`  | Need more tests/observation                |

---

## 6. Backend Deep Dive

### What is the Backend?

The backend is the "invisible" part of our application. Users never see it directly, but it does all the heavy lifting:

- Receives data from the web pages
- Saves data to the database
- Calls the AI for summaries
- Sends responses back to the web pages

### How FastAPI Works (Simple Explanation)

Imagine a restaurant again:

1. **Customer (Browser)** sends an order (request)
2. **Waiter (FastAPI)** receives the order
3. **Kitchen (Our Code)** prepares the food (processes data)
4. **Waiter** brings the food back (response)

```python
# This is how we define an "order" (API endpoint)
@router.post("/api/intakes")      # When someone sends patient data
def create_intake(data):          # Our function to handle it
    # Save to database
    # Return confirmation
    return {"message": "Saved!"}
```

### The Main Application File (`main.py`)

This is where everything starts. Think of it as the "front door" of our backend:

```python
# Create the FastAPI application
app = FastAPI(title="Clinic Co-Pilot")

# Allow web pages to talk to our server (CORS)
app.add_middleware(CORSMiddleware, allow_origins=["*"])

# Serve static files (images, CSS, JS)
app.mount("/static", StaticFiles(directory="static"))

# Register all our routes (different "departments")
app.include_router(patient_router)  # Patient routes
app.include_router(provider_router) # Nurse routes
app.include_router(doctor_router)   # Doctor routes

# When server starts, create database tables
@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)
```

### Database Connection (`db.py`)

This file sets up our connection to SQLite:

```python
# Where our database file lives
DATABASE_URL = "sqlite:///./clinic_copilot.db"

# Create the connection
engine = create_engine(DATABASE_URL)

# How other code gets a database session
def get_db():
    db = SessionLocal()    # Open connection
    try:
        yield db           # Use it
    finally:
        db.close()         # Always close when done
```

### Data Validation (`schemas.py`)

Before saving any data, we check if it's valid:

```python
class IntakeCreate(BaseModel):
    full_name: str        # Must be text
    age: int              # Must be number between 0-130
    preferred_language: str  # Must be: en, es, fr, ar, or pt

# If someone sends age="hello", Pydantic rejects it automatically!
```

---

## 7. AI Integration

### When Does AI Get Called?

AI is called at specific moments:

```
Moment 1: Nurse submits vitals
   └── AI generates clinical summary with red flags

Moment 2: Doctor changes language (optional)
   └── AI translates summary to doctor's language
```

### How We Call Gemini AI

Here's the simplified flow:

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│  Our Code   │  ────►  │   Gemini    │  ────►  │   Response  │
│             │         │    API      │         │             │
│ "Summarize  │         │ (Google's   │         │ "45-year-old│
│  this       │         │  servers)   │         │  female with│
│  patient"   │         │             │         │  chest pain"│
└─────────────┘         └─────────────┘         └─────────────┘
```

### The Code That Calls AI (`ai.py`)

```python
from google import genai

# Connect to Gemini
client = genai.Client(api_key="your-api-key")

def generate_clinical_summary(patient_data):
    # Build a prompt (instructions for AI)
    prompt = f"""
    Summarize this patient case:
    Name: {patient_data['name']}
    Symptoms: {patient_data['symptoms']}
    Vitals: {patient_data['vitals']}

    Return JSON with: summary, priority, red_flags
    """

    # Call Gemini
    response = client.generate_content(prompt)

    # Parse the response
    return json.loads(response.text)
```

### What We Ask AI to Return

We ask Gemini to return data in a specific format (JSON):

```json
{
  "short_summary": "45-year-old female presenting with chest tightness...",
  "priority_level": "MED",
  "red_flags": ["Chest pain reported"],
  "differential_considerations": ["Anxiety", "Musculoskeletal"],
  "recommended_questions": ["Any shortness of breath?"],
  "recommended_next_steps": ["ECG if symptoms persist"]
}
```

### Prompt Engineering

We store our AI instructions in files (app/prompts/):

**intake_summary.md:**

```
You are a clinical decision-support assistant.
You do NOT diagnose.
You summarize and flag risks.

Return STRICT JSON with:
- short_summary: 3-5 sentences
- priority_level: LOW, MED, or HIGH
- red_flags: list of warning signs
...
```

### Why JSON?

JSON (JavaScript Object Notation) is a standard format for data:

- Easy for code to read
- Structured and predictable
- Works in Python and JavaScript

---

## 8. Translation System

### The 5 Supported Languages

| Code | Language               | Script Direction |
| ---- | ---------------------- | ---------------- |
| `en` | English                | Left-to-Right →  |
| `es` | Español (Spanish)      | Left-to-Right →  |
| `fr` | Français (French)      | Left-to-Right →  |
| `ar` | العربية (Arabic)       | Right-to-Left ←  |
| `pt` | Português (Portuguese) | Left-to-Right →  |

### How Translation Works: Patient Side

**Step 1:** Patient selects Spanish in the form
**Step 2:** All form labels change to Spanish
**Step 3:** Patient types symptoms in Spanish
**Step 4:** On submit, data is saved

### How Translation Works: Doctor Side

**Step 1:** Doctor opens case (sees English by default)
**Step 2:** Doctor changes language dropdown to French
**Step 3:** System translates the summary to French via AI
**Step 4:** Doctor reads in their preferred language

### The Translation Code Concept

```python
def translate_text(text, target_language):
    prompt = f"""
    Translate this to {target_language}:
    "{text}"

    Return ONLY the translated text.
    """

    response = client.generate_content(prompt)
    return response.text
```

### Frontend Language Switching

In the patient form, we have translations built-in:

```javascript
const TRANSLATIONS = {
  en: {
    welcome_title: "Welcome to Your Visit",
    label_name: "Full Name",
  },
  es: {
    welcome_title: "Bienvenido a su visita",
    label_name: "Nombre completo",
  },
  // ... more languages
};

// When user changes language, update all text
function applyTranslations(lang) {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = TRANSLATIONS[lang][el.dataset.i18n];
  });
}
```

---

## 9. Authentication & Authorization

### Authentication vs Authorization (Simple)

| Term               | Question It Answers | Example                            |
| ------------------ | ------------------- | ---------------------------------- |
| **Authentication** | "Who are you?"      | Logging in with password           |
| **Authorization**  | "What can you do?"  | Nurses can't make doctor decisions |

### How Login Works (Step by Step)

```
┌──────────────────────────────────────────────────────────────┐
│                     LOGIN FLOW                                │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  1. User enters: Staff ID + Password                         │
│     ┌─────────────────────────────────────────────┐         │
│     │  Staff ID: [NRS-1001        ]               │         │
│     │  Password: [********        ]               │         │
│     │            [   Sign In      ]               │         │
│     └─────────────────────────────────────────────┘         │
│                         │                                    │
│                         ▼                                    │
│  2. Server checks:                                           │
│     - Does this staff_id exist?                              │
│     - Does password match the hash?                          │
│                         │                                    │
│                    ┌────┴────┐                               │
│                    │         │                               │
│                 ✅ Yes     ❌ No                             │
│                    │         │                               │
│                    ▼         ▼                               │
│  3a. Generate JWT token    3b. Return error                  │
│      Send to browser           "Invalid credentials"         │
│                    │                                         │
│                    ▼                                         │
│  4. Browser saves token in sessionStorage                    │
│                    │                                         │
│                    ▼                                         │
│  5. Every future request includes token                      │
│     "Authorization: Bearer eyJhbGc..."                       │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### What is a JWT Token?

JWT = JSON Web Token. It's like a digital ID badge:

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.    ← Header (type of token)
eyJzdWIiOiJOUlMtMTAwMSIsInJvbGUiOiJOVVJTRSJ9.  ← Payload (who you are)
SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c     ← Signature (proof it's real)
```

The payload contains information like:

```json
{
  "sub": "NRS-1001", // Staff ID
  "role": "NURSE", // Role
  "exp": 1708776000 // Expiration time
}
```

### Password Security

We never store actual passwords! We store a **hash**:

```
Password: "mypassword123"
                │
                ▼ (bcrypt hashing)
                │
Hash: "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4o..."
```

**Why?**

- If database is stolen, hackers can't see passwords
- Hash is one-way: can't reverse it to get password
- Same password always gives same hash (for verification)

### Role-Based Access Control

Different roles can do different things:

| Action             | Patient | Nurse | Doctor |
| ------------------ | ------- | ----- | ------ |
| Submit intake form | ✅      | ❌    | ❌     |
| View patient list  | ❌      | ✅    | ✅     |
| Add vitals         | ❌      | ✅    | ❌     |
| View AI summary    | ❌      | ❌    | ✅     |
| Make decision      | ❌      | ❌    | ✅     |

---

## 10. Frontend Architecture

### How Web Pages Work

When you visit our website:

1. Browser requests HTML page from server
2. Server sends HTML file
3. Browser renders the HTML
4. Browser loads CSS (styling)
5. Browser loads JavaScript (interactivity)
6. JavaScript makes API calls to get/send data

### Our Pages and Their Roles

```
┌────────────────────────────────────────────────────────────┐
│                Landing Page (index.html)                   │
│                                                            │
│                 Greenfield Medical Center                  │
│                 ┌─────┐ ┌─────┐ ┌──────┐                   │
│                 │Patient│ │Nurse│ │Doctor│                 │
│                 └──┬──┘ └──┬──┘ └──┬───┘                   │
└────────────────────┼──────┼───────┼────────────────────────┘
                     │      │       │
                     ▼      │       │
              ┌──────────┐  │       │
              │patient.html│ │       │
              │           │ │       │
              │ No login  │ │       │
              │ required  │ │       │
              └───────────┘ │       │
                            │       │
                    ┌───────┴───────┐
                    │               │
             ┌──────▼─────┐  ┌──────▼─────┐
             │ nurse pages │  │doctor pages│
             │             │  │            │
             │ Protected   │  │ Protected  │
             │ by login    │  │ by login   │
             └─────────────┘  └────────────┘
```

---

## 11. API Communication Flow

### What is an API?

API = Application Programming Interface

Think of it like a waiter in a restaurant:

- You (frontend) tell the waiter (API) what you want
- Waiter goes to kitchen (backend)
- Kitchen prepares your order
- Waiter brings it back to you

### The Complete Patient Journey

Let's follow Maria through the entire system:

```
═══════════════════════════════════════════════════════════════════
STEP 1: Maria Submits Her Intake Form
═══════════════════════════════════════════════════════════════════

Maria (Browser)                              Server
    │                                           │
    │  POST /patient/                           │
    │  {                                        │
    │    "full_name": "Maria Garcia",           │
    │    "age": 45,                             │
    │    "chief_complaint": "Chest tightness",  │
    │    "preferred_language": "es"             │
    │  }                                        │
    │ ─────────────────────────────────────────►│
    │                                           │
    │                    Server does:            │
    │                    1. Validate data ✓     │
    │                    2. Save to database    │
    │                    3. Return success      │
    │                                           │
    │◄───────────────────────────────────────── │
    │  { "id": 1, "message": "Submitted!" }     │
    │                                           │

═══════════════════════════════════════════════════════════════════
STEP 2: Nurse Adds Vitals
═══════════════════════════════════════════════════════════════════

Nurse (Browser)                              Server
    │                                           │
    │  GET /provider/cases                      │
    │  (with auth token)                        │
    │ ─────────────────────────────────────────►│
    │                                           │
    │◄───────────────────────────────────────── │
    │  [list of patients waiting]               │
    │                                           │
    │  POST /provider/cases/1/vitals            │
    │  {                                        │
    │    "heart_rate": 92,                      │
    │    "temperature_c": 37.2,                 │
    │    "spo2": 96,                            │
    │    "systolic_bp": 128,                    │
    │    "diastolic_bp": 82                     │
    │  }                                        │
    │ ─────────────────────────────────────────►│
    │                                           │
    │                    Server does:            │
    │                    1. Save vitals ✓       │
    │                    2. CALL GEMINI AI      │
    │                    3. Save AI summary     │
    │                    4. Update status       │
    │                                           │
    │◄───────────────────────────────────────── │
    │  { "priority": "MED", "red_flags": [...] }│
    │                                           │

═══════════════════════════════════════════════════════════════════
STEP 3: Doctor Reviews and Decides
═══════════════════════════════════════════════════════════════════

Doctor (Browser)                             Server
    │                                           │
    │  GET /doctor/cases/1                      │
    │  (with auth token)                        │
    │ ─────────────────────────────────────────►│
    │                                           │
    │◄───────────────────────────────────────── │
    │  { full case with AI summary }            │
    │                                           │
    │  (Doctor reads summary, makes decision)   │
    │                                           │
    │  POST /doctor/cases/1/decision            │
    │  {                                        │
    │    "decision": "APPROVED",                │
    │    "doctor_note": "Likely anxiety..."     │
    │  }                                        │
    │ ─────────────────────────────────────────►│
    │                                           │
    │◄───────────────────────────────────────── │
    │  { "message": "Decision recorded" }       │
    │                                           │
═══════════════════════════════════════════════════════════════════
```

### API Endpoints Quick Reference

| What You Want To Do    | HTTP Method | Endpoint                      | Who Can Use |
| ---------------------- | ----------- | ----------------------------- | ----------- |
| Submit patient form    | POST        | `/patient/`                   | Anyone      |
| List patients (nurse)  | GET         | `/provider/cases`             | Nurse       |
| Add vitals             | POST        | `/provider/cases/{id}/vitals` | Nurse       |
| List patients (doctor) | GET         | `/doctor/cases`               | Doctor      |
| Get one patient        | GET         | `/doctor/cases/{id}`          | Doctor      |
| Make decision          | POST        | `/doctor/cases/{id}/decision` | Doctor      |

---

## 12. Safety & Fallback Design

### Why Do We Need Fallbacks?

AI services can fail:

- 🚫 **Quota exceeded** - Too many requests
- 🚫 **Server down** - Google's servers are busy
- 🚫 **Network error** - Internet connection issue
- 🚫 **Bad response** - AI returned garbage

**In healthcare, the demo must NEVER break!**

### Our Safety Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                   AI REQUEST FLOW                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│    ┌──────────────┐                                         │
│    │ Try Gemini   │                                         │
│    │     AI       │                                         │
│    └──────┬───────┘                                         │
│           │                                                 │
│     ┌─────┴─────┐                                           │
│     │           │                                           │
│   ✅ Success   ❌ Failure                                   │
│     │           │                                           │
│     ▼           ▼                                           │
│  ┌─────────┐  ┌─────────────────┐                          │
│  │ Return  │  │ Use Fallback    │                          │
│  │ AI      │  │ Rules Engine    │                          │
│  │ Summary │  │ (triage_rules.py)│                          │
│  └─────────┘  └─────────────────┘                          │
│                                                             │
│         Either way, doctor gets a summary!                  │
└─────────────────────────────────────────────────────────────┘
```

### The Fallback Rules Engine

If AI fails, we use simple IF-THEN rules:

```python
def rule_based_flags(heart_rate, spo2, temperature, symptoms):
    flags = []
    priority = "LOW"

    # Rule 1: Low oxygen is dangerous
    if spo2 < 90:
        flags.append("⚠️ SpO2 < 90% (possible hypoxia)")
        priority = "HIGH"

    # Rule 2: Fast heart rate
    if heart_rate >= 130:
        flags.append("⚠️ Heart rate >= 130 (severe tachycardia)")
        priority = "HIGH"

    # Rule 3: High fever
    if temperature >= 40.0:
        flags.append("⚠️ Temp >= 40°C (hyperpyrexia)")
        priority = "HIGH"

    # Rule 4: Chest pain keywords
    if "chest" in symptoms and "pain" in symptoms:
        flags.append("⚠️ Chest pain reported")
        priority = max(priority, "MED")

    return priority, flags
```

### Error Handling in Code

```python
def generate_clinical_summary(payload):
    try:
        # Try AI first
        response = call_gemini(payload)
        return parse_response(response)

    except Exception as e:
        # If anything fails, use backup rules
        print(f"⚠️ AI failed: {e}, using fallback")
        return fallback_summary(payload)
```

---

## 13. Requirements Breakdown

### What is requirements.txt?

It's a "shopping list" of Python packages our project needs. When setting up the project, you run:

```bash
pip install -r requirements.txt
```

This installs everything automatically.

### Every Package Explained

| Package            | What It Does     | Why We Need It                  |
| ------------------ | ---------------- | ------------------------------- |
| `fastapi`          | Web framework    | Creates our API endpoints       |
| `uvicorn`          | Web server       | Runs FastAPI application        |
| `sqlalchemy`       | Database ORM     | Lets Python talk to SQLite      |
| `pydantic`         | Data validation  | Checks if data is correct       |
| `python-dotenv`    | Load .env files  | Reads secret keys safely        |
| `google-genai`     | Gemini AI        | Generates summaries, translates |
| `passlib[bcrypt]`  | Password hashing | Secures passwords               |
| `python-jose`      | JWT tokens       | Creates login tokens            |
| `python-multipart` | Form parsing     | Handles form submissions        |
| `pytest`           | Testing          | Runs our tests                  |

### Environment Variables (.env)

The `.env` file contains secrets we don't want in code:

```bash
# REQUIRED - Without these, the app won't work properly
GEMINI_API_KEY=your-google-ai-api-key

# JWT Settings
JWT_SECRET_KEY=some-random-secret-string
```

**⚠️ NEVER commit .env to git!** It contains secrets.

---

## 14. Common Judge Questions

### Project Concept Questions

**Q: What problem does this solve?**

> Patients repeat their story 3-5 times. Details get lost. Doctors are overloaded. Our system captures the patient story once, and delivers an AI-organized summary with red flags highlighted.

**Q: Who are your users?**

> Three user types: (1) Patients who fill intake forms, (2) Nurses who add vitals, (3) Doctors who review cases and make decisions.

**Q: How is AI used?**

> Generate clinical summaries with priority levels, red flags, and recommended questions. Also powers translation between languages.

**Q: What makes your project different?**

> Multi-language support (5 languages), AI-generated clinical summaries, deterministic fallback when AI fails, and clean role-based workflow.

### Technical Questions

**Q: Why FastAPI?**

> Automatic data validation, built-in API documentation, async support, and modern Python type hints. Faster development than Flask.

**Q: Why SQLite?**

> Zero configuration, single file, portable. Perfect for demos. We can migrate to PostgreSQL with minimal changes.

**Q: What happens if Gemini AI fails?**

> We have a rule-based fallback engine (triage_rules.py) that uses IF-THEN logic to detect red flags. The demo never breaks.

**Q: How do you handle security?**

> Passwords are hashed with bcrypt (never stored plain text). JWT tokens for authentication. Role-based access control for authorization.

### Demo Flow (3 minutes)

1. **Show landing page** (30s)
   - "This is Greenfield Medical Center patient portal"

2. **Submit patient form** (45s)
   - Select Spanish, fill in symptoms
   - Show submission success

3. **Nurse dashboard** (45s)
   - Login as nurse
   - See patient waiting
   - Add vitals, submit

4. **Doctor dashboard** (60s)
   - Login as doctor
   - See AI summary with red flags
   - Change language dropdown
   - Make decision (APPROVED)

5. **Wrap up** (30s)
   - "Patient told story once, in their language"
   - "Doctor saw organized summary with red flags"
   - "AI assists, doctor decides"

---

## Quick Reference Commands

```powershell
# Setup (run once)
python -m venv venv
.\venv\Scripts\Activate.ps1   # Windows
pip install -r requirements.txt

# Run server
uvicorn app.main:app --reload --port 8000

# Access URLs
http://localhost:8000/          # Landing page
http://localhost:8000/patient   # Patient form
http://localhost:8000/provider  # Nurse dashboard
http://localhost:8000/doctor    # Doctor dashboard
http://localhost:8000/docs      # API documentation
```

---

## Glossary

| Term         | Simple Definition                                    |
| ------------ | ---------------------------------------------------- |
| **API**      | Way for different software to talk to each other     |
| **Backend**  | Server code that processes data (invisible to users) |
| **Frontend** | Web pages that users see and interact with           |
| **Database** | Where data is stored permanently                     |
| **JWT**      | A digital ID card for authentication                 |
| **Hash**     | One-way encryption (password → jumbled text)         |
| **CRUD**     | Create, Read, Update, Delete (basic data operations) |
| **REST**     | A standard way to design APIs                        |
| **JSON**     | A format for sending data (like { "name": "John" })  |
| **ORM**      | Tool that lets code talk to database easily          |
| **CORS**     | Permission system for cross-website requests         |

---

_Document written for Clinic Co-Pilot hackathon team_
_Think of this as your "story guide" - read it section by section!_
