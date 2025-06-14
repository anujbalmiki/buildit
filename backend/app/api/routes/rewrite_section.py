import os

from app.database import db
from fastapi import APIRouter, Body
from google import genai

router = APIRouter()

# Initialize Google AI
client = genai.Client(api_key=os.environ["GOOGLE_API_KEY"])

@router.post("/rewrite-section-ai")
async def rewrite_section_ai(jd: str = Body(...), section: dict = Body(...)):
    if jd.strip():
        prompt = (
            "Rewrite this resume section to better match the following job description. "
            "Keep the meaning, but optimize for relevance and clarity.\n\n"
            "Keep the formatting same as before.\n\n"
            "Return ONLY the rewritten section as a single JSON object, with no explanation or extra text.\n\n"
            f"Job Description:\n{jd}\n\nSection:\n{section}"
        )
    else:
        prompt = (
            "Improve the following resume section for grammar, readability, and standardization. "
            "Keep the meaning and formatting the same as before.\n\n"
            "Return ONLY the improved section as a single JSON object, with no explanation or extra text.\n\n"
            f"Section:\n{section}"
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