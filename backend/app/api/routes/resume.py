from fastapi import APIRouter, File, UploadFile, HTTPException
from google import genai
import os
import tempfile
from datetime import datetime
from app.database import db

router = APIRouter()

# Initialize Google AI
client = genai.Client(api_key=os.environ["GOOGLE_API_KEY"])

def extract_text_from_file(file: UploadFile):
    ext = file.filename.split('.')[-1].lower()
    with tempfile.NamedTemporaryFile(delete=False, suffix=f".{ext}") as tmp:
        tmp.write(file.file.read())
        tmp_path = tmp.name
    text = ""
    if ext == "pdf":
        from pdfminer.high_level import extract_text
        text = extract_text(tmp_path)
    elif ext == "docx":
        import docx2txt
        text = docx2txt.process(tmp_path)
    os.remove(tmp_path)
    return text

@router.get("/resume/{email}")
async def get_resume(email: str):
    resume = db.get_resume(email)
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    return resume

@router.post("/resume/{email}")
async def save_resume(email: str, resume_data: dict):
    try:
        result = db.save_resume(email, resume_data)
        return {"message": "Resume saved successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/parse-resume")
async def parse_resume(file: UploadFile = File(...)):
    text = extract_text_from_file(file)
    if not text.strip():
        raise HTTPException(status_code=400, detail="Could not extract text from file.")
    
    prompt = (
        "You are an expert resume parser. Given the resume text below, extract all relevant information in structured JSON format as described:\n\n"
        "{\n"
        '  "name": "",\n'
        '  "title": "",\n'
        '  "contact_info": "",  // Combine all contact details and social links (phone, email, LinkedIn, location, etc.) and separate them with " | "\n'
        '  "sections": [\n'
        '    {\n'
        '      "type": "paragraph" | "bullet_points" | "experience",\n'
        '      "title": "",\n'
        '      "content": "",           // for paragraph type only\n'
        '      "items": [],             // for bullet_points or experience only\n'
        '      "title_formatting": {"alignment": "left", "font_size": 16, "font_weight": "bold"},\n'
        '      "content_formatting": {"alignment": "left", "font_size": 14, "font_weight": "normal"}\n'
        '    }\n'
        '  ]\n'
        "}\n\n"
        "Input resume:\n" + text
    )
    
    try:
        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt,
        )
        import json
        raw = response.text.strip()
        raw = raw[raw.index("{"):]  # Extract JSON part
        if raw.endswith("```"):
            raw = raw[:-3]
        data = json.loads(raw)
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse resume: {str(e)}") 