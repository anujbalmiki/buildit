import os

from app.database import db
from fastapi import APIRouter, Body
from google import genai

router = APIRouter()

# Initialize Google AI
client = genai.Client(api_key=os.environ["GOOGLE_API_KEY"])

@router.post("/rewrite-resume-ai")
async def rewrite_resume_ai(jd: str = Body(...), resume: dict = Body(...)):
    prompt = (
        "Rewrite the following resume to best match this job description. "
        "Keep it truthful, but optimize for keywords, skills, and achievements relevant to the JD. "
        "Output in the same JSON structure as before keeping the formatting same as before.\n\n"
        f"Job Description:\n{jd}\n\nResume:\n{resume}"
    )
    
    response = client.models.generate_content(
        model="gemini-2.0-flash",
        contents=prompt,
    )
    import json
    raw = response.text.strip()
    raw = raw[raw.index("{"):]
    if raw.endswith("```"):
        raw = raw[:-3]
    data = json.loads(raw)
    return data