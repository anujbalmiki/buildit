"""ATS readability self-check.

Renders the resume HTML to a real PDF (the same WeasyPrint path used for
export), then extracts the text back out with pdfminer — the same library an
ATS uses — and reports whether the important content survives extraction
cleanly, in order, and with spaces intact.
"""
import re
from io import BytesIO

from fastapi import APIRouter, HTTPException
from pdfminer.high_level import extract_text
from pydantic import BaseModel
from weasyprint import HTML

router = APIRouter()


class AtsCheckRequest(BaseModel):
    html: str
    # Phrases that should survive extraction verbatim (name, title, section
    # titles, a sample of each section's content). Multi-word phrases also
    # catch lost word-spacing: "Software Developer" won't be found if the PDF
    # extracts it as "SoftwareDeveloper".
    expected: list[str] = []


def _normalize(s: str) -> str:
    return re.sub(r"\s+", " ", s or "").strip().lower()


@router.post("/ats-check")
async def ats_check(req: AtsCheckRequest):
    buf = BytesIO()
    try:
        HTML(string=req.html).write_pdf(buf)
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"Could not render PDF for ATS check: {e}")
    buf.seek(0)
    text = extract_text(buf) or ""
    buf.close()

    norm = _normalize(text)
    words = text.split()

    found, missing = [], []
    last_pos = -1
    order_ok = True
    for item in req.expected:
        n = _normalize(item)
        if not n:
            continue
        pos = norm.find(n)
        if pos == -1:
            missing.append(item)
        else:
            found.append(item)
            if pos < last_pos:
                order_ok = False
            last_pos = pos

    # Very long tokens almost always mean multiple words fused together.
    # Kept conservative (>40) so tech terms like "PostgreSQL" don't false-flag.
    glued = [w for w in words if len(w) > 40]

    total_expected = len([e for e in req.expected if e.strip()])
    passed = bool(text.strip()) and not missing and order_ok and not glued

    return {
        "pass": passed,
        "checks": {
            "text_extracted": bool(text.strip()),
            "word_count": len(words),
            "expected_found": len(found),
            "expected_total": total_expected,
            "reading_order_ok": order_ok,
            "missing_from_extraction": missing,
            "suspicious_glued_tokens": glued[:10],
        },
        "extracted_text": text[:6000],
    }
