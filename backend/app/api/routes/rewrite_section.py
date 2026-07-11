from fastapi import APIRouter, Body, HTTPException

from app.llm import generate_json

router = APIRouter()


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
    try:
        return generate_json(prompt)
    except (ValueError, RuntimeError) as e:
        raise HTTPException(status_code=502, detail=f"Failed to rewrite section: {e}")
