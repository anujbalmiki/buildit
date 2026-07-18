from fastapi import APIRouter, Body, HTTPException

from app.llm import generate_text

router = APIRouter()

IMPROVE_PROMPT = """You are a resume-writing coach. Rewrite the single resume bullet below so it is stronger:
- Start with a strong past-tense action verb (Built, Led, Reduced, Automated, Shipped…).
- Be specific and concise — ideally one line, under ~30 words.
- Emphasise impact and outcome. If the original states a measurable result, make it prominent.
- Do NOT invent numbers, percentages, names, or facts that are not in the original. Keep it truthful.
- Do not use the word "I"; write it as a resume bullet.
{context_line}{jd_line}
Return ONLY the rewritten bullet text — no surrounding quotes, no leading bullet symbol, no explanation.

Original bullet:
{bullet}
"""


@router.post("/improve-bullet")
async def improve_bullet(
    bullet: str = Body(...),
    jd: str = Body(""),
    context: str = Body(""),
):
    text = (bullet or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Bullet is empty.")

    context_line = f"- Context — this bullet belongs to: {context.strip()}\n" if context.strip() else ""
    jd_line = (
        f"- Where honest to do so, align wording with this job description:\n{jd.strip()}\n"
        if jd.strip()
        else ""
    )
    prompt = IMPROVE_PROMPT.format(context_line=context_line, jd_line=jd_line, bullet=text)

    try:
        improved = generate_text(prompt).strip()
        # Strip common wrappers the model sometimes adds.
        improved = improved.strip('"').strip("'").lstrip("-•*").strip()
        if not improved:
            improved = text
        return {"improved": improved}
    except (ValueError, RuntimeError) as e:
        raise HTTPException(status_code=502, detail=f"Failed to improve bullet: {e}")
