from fastapi import APIRouter, HTTPException

from app.llm import generate_json

router = APIRouter()

PROOFREAD_PROMPT = """You are a meticulous proofreader for resumes. Find ONLY genuine spelling mistakes and grammar errors in the text below.

Rules:
- Report ONLY real errors: misspellings, wrong verb tense, subject-verb agreement, punctuation, doubled words ("the the"), wrong or missing articles.
- DO NOT flag correct technical terms, product names, acronyms, or proper nouns as misspelled (e.g. FastAPI, Kubernetes, PostgreSQL, CI/CD, Nginx, Pydantic).
- DO NOT rewrite for style, tone, wording, or conciseness. Only fix outright errors.
- For each error, copy the SMALLEST original phrase that contains it EXACTLY as written (so it can be found and replaced), and give the corrected phrase.

Return ONLY a JSON object of this shape:
{"issues": [{"original": "<exact snippet from the text>", "suggestion": "<corrected snippet>", "reason": "<short reason>"}]}
If there are no errors, return {"issues": []}.

Text to proofread:
"""


def _collect_texts(resume: dict) -> list[str]:
    parts: list[str] = []
    for s in resume.get("sections") or []:
        t = s.get("type")
        if t == "paragraph" and s.get("content"):
            parts.append(s["content"])
        elif t in ("experience", "project"):
            for it in s.get("items") or []:
                for b in it.get("bullet_points") or []:
                    if b and str(b).strip():
                        parts.append(str(b))
        elif t == "education":
            for it in s.get("items") or []:
                if it.get("details"):
                    parts.append(it["details"])
    return parts


@router.post("/proofread")
async def proofread(resume: dict):
    parts = _collect_texts(resume)
    text = "\n".join(parts).strip()
    if not text:
        return {"issues": []}

    try:
        result = generate_json(PROOFREAD_PROMPT + text)
    except (ValueError, RuntimeError) as e:
        raise HTTPException(status_code=502, detail=f"Proofreading failed: {e}")

    raw = result.get("issues", []) if isinstance(result, dict) else []
    # Keep only issues whose original actually appears verbatim and changes something.
    issues = [
        {
            "original": i["original"],
            "suggestion": i["suggestion"],
            "reason": i.get("reason", ""),
        }
        for i in raw
        if isinstance(i, dict)
        and i.get("original")
        and i.get("suggestion")
        and i["original"] in text
        and i["original"] != i["suggestion"]
    ]
    return {"issues": issues}
