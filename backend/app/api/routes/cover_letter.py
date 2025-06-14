import os

from app.database import db
from fastapi import APIRouter, Body
from google import genai

router = APIRouter()

# Initialize Google AI
client = genai.Client(api_key=os.environ["GOOGLE_API_KEY"])

@router.post("/generate-cover-letter-ai")
async def generate_cover_letter(jd: str = Body(...), resume: dict = Body(...)):
    prompt = (
        "Write a professional cover letter for the following job description, using the provided resume as background. "
        "Be concise, highlight relevant experience, and address the employer directly. "
        "Return ONLY the cover letter text, with no explanation or extra text.\n\n"
        f"Job Description:\n{jd}\n\nResume:\n{resume}"
    )
    response = client.models.generate_content(
        model="gemini-2.0-flash",
        contents=prompt,
    )
    cover_letter = response.text.strip()
    # Remove markdown code block if present
    if cover_letter.startswith("```"):
        cover_letter = cover_letter.strip("`").strip()
    return {"cover_letter": cover_letter}