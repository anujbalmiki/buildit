# Buildit - Resume Builder and Parser

A modern web application for building and parsing resumes using AI.

## Project Structure

```
buildit/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py              # FastAPI application entry point
│   │   ├── api/
│   │   │   ├── __init__.py
│   │   │   ├── routes/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── pdf.py       # PDF generation endpoints
│   │   │   │   └── resume.py    # Resume parsing endpoints
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── .streamlit/
│   └── app.py                   # Streamlit application
│   ├── requirements.txt         # Frontend dependencies
├── .gitignore
└── README.md
```

## Setup Instructions

1. Clone the repository

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
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

4. Create a `.env` file in the backend directory with your Google API key:
   ```
   GOOGLE_API_KEY=your_api_key_here
   ```

5. Run the development servers:
   - Backend: `uvicorn app.main:app --reload`
   - Frontend: `streamlit run app.py`

## Features

- Resume parsing using AI (Google Gemini)
- PDF generation with customizable options
- Modern Streamlit interface
- RESTful API endpoints

## API Documentation

Once the backend server is running, visit:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Technologies Used

- Backend:
  - FastAPI
  - WeasyPrint (PDF generation)
  - Google Gemini AI
  - Python-docx2txt
  - PDFMiner

- Frontend:
  - Streamlit
  - Python
