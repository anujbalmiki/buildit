from fastapi import APIRouter, Body, HTTPException

from app.llm import generate_text

router = APIRouter()


@router.post("/generate-cover-letter-ai")
async def generate_cover_letter(jd: str = Body(...), resume: dict = Body(...)):
    prompt = (
        "Write a professional cover letter for the following job description, using the provided resume as background. "
        "Be concise, highlight relevant experience, and address the employer directly. "
        "The letter signature block should be formatted as follows:\n\n"
        "Name\n"
        "Location\n   - If available in the resume"
        "Phone Number\n   - If available in the resume\n"
        "Email\n      - If available in the resume\n"
        "LinkedIn: [LinkedIn URL]\n      - If available in the resume\n"
        "GitHub: [GitHub URL]\n    - If available in the resume\n"
        "Return ONLY the cover letter text, with no explanation or extra text.\n\n"
        f"Job Description:\n{jd}\n\nResume:\n{resume}"
    )
    try:
        cover_letter = generate_text(prompt)
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=f"Failed to generate cover letter: {e}")

    if cover_letter.startswith("```"):
        cover_letter = cover_letter.strip("`").strip()
    return {"cover_letter": cover_letter}
