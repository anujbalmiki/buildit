# Buildit — AI Resume Builder

Build an ATS-friendly resume, tailor it to a job description with AI, and export it as PDF or Word.

**Frontend:** Next.js + TypeScript + Tailwind (Vercel)
**Backend:** FastAPI + MongoDB + WeasyPrint (Railway)
**AI:** Google Gemini, with Groq as a fallback

## Features

- Upload an existing resume (PDF/DOCX) to autofill everything
- AI rewrite for the whole resume, a single section, or one bullet
- ATS score with fix-it hints, plus job-description keyword matching
- Spelling and grammar check
- Live preview that matches the real PDF, page breaks and all
- Export to PDF or Word (.docx), in your chosen template
- Undo/redo and version history, so nothing gets lost
- Public shareable link (opt-in, can be turned off or reset)
- Google sign-in with autosave

## Setup

Requires Python 3.11+, Node 18+, and a MongoDB database.

```bash
git clone <repository-url>
cd buildit

# Backend
python -m venv venv
venv\Scripts\activate          # Windows
source venv/bin/activate       # macOS/Linux
pip install -r backend/requirements.txt

# Frontend
cd frontend && npm install
```

### Environment variables

`backend/.env`:

```
GOOGLE_API_KEY=your_gemini_api_key
MONGODB_URI=your_mongodb_connection_string
GROQ_API_KEY=optional_fallback_key
```

`frontend/.env.local` — copy `frontend/.env.example` and fill it in (backend URL, `AUTH_SECRET`, and Google OAuth credentials).

## Running it

```bash
# Backend  → http://localhost:8000
cd backend && uvicorn app.main:app --reload

# Frontend → http://localhost:3000
cd frontend && npm run dev
```

API docs are at `http://localhost:8000/docs`.

## Notes

- Buildit started as a Streamlit app and was rebuilt on Next.js + FastAPI.
- If `npm run dev` misbehaves on a OneDrive-synced folder, use `npm run build && npm run start` instead.

## Project structure

```
buildit/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app, route registration, homepage
│   │   ├── llm.py               # Gemini + Groq fallback
│   │   ├── database.py          # MongoDB: resumes, versions, sharing
│   │   ├── text_extraction.py   # PDF/DOCX text extraction
│   │   └── api/routes/          # One file per endpoint group
│   ├── tests/
│   ├── Dockerfile
│   └── requirements.txt
└── frontend/
    ├── app/
    │   ├── page.tsx             # Main editor page
    │   └── r/[token]/           # Public shared resume page
    ├── components/              # Editor UI (sections, AI tools, dialogs)
    │   ├── sections/            # Per section-type editors
    │   └── ui/                  # shadcn/Radix primitives
    ├── lib/                     # Templates, export, ATS, sharing helpers
    ├── types/
    └── auth.ts                  # Auth.js (Google sign-in)
```
