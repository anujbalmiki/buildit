from fastapi import APIRouter, Body, HTTPException

from app.llm import generate_json

router = APIRouter()


@router.post("/rewrite-resume-ai")
async def rewrite_resume_ai(jd: str = Body(...), resume: dict = Body(...)):
    prompt = (
        "Rewrite the following resume to best match this job description. "
        "Keep it truthful, but optimize for keywords, skills, and achievements relevant to the JD. "
        "Output in the same JSON structure as before keeping the formatting same as before.\n\n"
        f"Job Description:\n{jd}\n\nResume:\n{resume}"
    )
    try:
        return generate_json(prompt)
    except (ValueError, RuntimeError) as e:
        raise HTTPException(status_code=502, detail=f"Failed to rewrite resume: {e}")
