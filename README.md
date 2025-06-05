# Buildit - Resume Builder and Parser

A modern web application for building and parsing resumes using AI.

## Project Structure

```
buildit/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py              # FastAPI application entry point
│   │   ├── database.py          # MongoDB database operations
│   │   ├── api/
│   │   │   ├── __init__.py
│   │   │   ├── routes/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── pdf.py       # PDF generation endpoints
│   │   │   │   └── resume.py    # Resume parsing endpoints
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── app/
│   │   ├── page.tsx            # Main application page
│   │   ├── layout.tsx          # Root layout component
│   │   └── globals.css         # Global styles
│   ├── components/
│   │   ├── ui/                 # Reusable UI components
│   │   ├── BasicInfoForm.tsx   # Basic info form component
│   │   ├── FileUpload.tsx      # File upload component
│   │   ├── FormattingOptions.tsx # Resume formatting options
│   │   ├── LoadResume.tsx      # Load saved resume component
│   │   ├── ResumePreview.tsx   # Live resume preview
│   │   └── SaveGenerate.tsx    # Save and generate PDF component
│   ├── types/
│   │   └── resume.ts           # TypeScript types
│   ├── package.json
│   └── next.config.mjs
├── .gitignore
└── README.md
```

## Setup Instructions

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd buildit
   ```

2. Set up the backend:
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

3. Set up the frontend:
   ```bash
   cd frontend
   npm install
   ```

4. Create a `.env` file in the backend directory with your API keys:
   ```
   GOOGLE_API_KEY=your_google_api_key_here
   MONGODB_URI=your_mongodb_connection_string
   ```

5. Create a `.env.local` file in the frontend directory:
   ```
   NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
   ```

6. Run the development servers:
   - Backend: 
     ```bash
     cd backend
     uvicorn app.main:app --reload
     ```
   - Frontend:
     ```bash
     cd frontend
     npm run dev
     ```

## Features

- Resume parsing using Google Gemini AI
  - Supports PDF and DOCX files
  - Extracts structured information
  - Auto-fills resume builder
- Modern Next.js frontend with TypeScript
  - Real-time resume preview
  - Drag-and-drop file upload
  - Customizable formatting options
- PDF generation with customizable options
  - Adjustable margins and spacing
  - Custom page size
  - Font size and weight controls
- MongoDB integration for saving resumes
- RESTful API endpoints
- CORS support for local development and deployment

## API Documentation

Once the backend server is running, visit:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Technologies Used

- Backend:
  - FastAPI
  - MongoDB
  - Google Gemini AI
  - WeasyPrint (PDF generation)
  - Python-docx2txt
  - PDFMiner

- Frontend:
  - Next.js 14
  - TypeScript
  - Tailwind CSS
  - Radix UI Components
  - React Hooks
  - Shadcn UI

## Deployment

The application can be deployed using:

- Backend: Railway or any Python-compatible hosting
- Frontend: Vercel (recommended) or any Next.js-compatible hosting
- Database: MongoDB Atlas

Make sure to set up the appropriate environment variables in your deployment platform.
