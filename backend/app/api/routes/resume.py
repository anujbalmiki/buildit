from fastapi import APIRouter, File, HTTPException, UploadFile

from app.database import db
from app.llm import generate_json
from app.text_extraction import extract_text_from_file

router = APIRouter()

PARSE_PROMPT = (
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
    '    // Additional sections detected from the resume\n'
    '  ]\n'
    "}\n\n"
    "Strict Parsing Rules:\n"
    "1. Do NOT repeat or duplicate sections. Each section should appear only once.\n"
    "2. Use \"paragraph\" type when the section contains only a descriptive block of text. Put that in `content`, leave `items` empty.\n"
    "3. Use \"bullet_points\" if the section is a list (e.g., skills, certifications). Put points in `items`, leave `content` empty.\n"
    "4. Use \"experience\" for job history, projects, or certifications with multiple entries. Format each entry with:\n"
    '     {\n'
    '       "position": "",\n'
    '       "company": "",\n'
    '       "start_month": "",\n'
    '       "start_year": "",\n'
    '       "end_month": "",\n'
    '       "end_year": "",\n'
    '       "end_type": "None", None if there is no end month or       "Present" if the end month is "Present" or "Specific Month" if there is a end month given\n'
    '       "bullet_points": []\n'
    '     }\n'
    '     - If the date is not in range then it should be original value.\n'
    '          e.g. 03/2022 - Present -> March 2022 - Present\n'
    '          e.g. 03/2022 - 03/2023 -> March 2022 - March 2023\n'
    '          e.g. 03/2022 - 2023 -> March 2022 - 2023\n'
    '          e.g. 2022 - Present -> 2022 - Present\n'
    '          e.g. 2022 - 2023 -> 2022 - 2023\n'
    '          e.g. 03/2022 -> March 2022\n'
    '     - If there is no date than it should be null\n'
    "5. NEVER include empty sections. If a section has no `content` or `items`, do NOT include it at all.\n"
    "6. If a section has content but no title, assign a suitable inferred title (e.g., 'Summary', 'Objective').\n"
    "7. For the 'Skills' section:\n"
    "   - If the skills are categorized, list them with one bullet per category.\n"
    "   - If skills are listed inline (comma-separated or pipe-separated or dot-separated), return them as a paragraph with comma-separated values.\n"
    "   - If uncategorized, return them as a comma-separated string in the `content` field.\n"
    "8. Do not fabricate or infer experience/project entries. Only include what is explicitly mentioned.\n"
    "9. Maintain the natural order of content as it appears in the resume.\n"
    "10. Contact info must be compact, clear, and separated using ' | '.\n\n"
    "11. Use \"experience\" type for education sections, and format them as:\n"
    '     {\n'
    '       "degree": "",\n'
    '       "major": "",\n'
    '       "institution": "",\n'
    '       "start_month": "",\n'
    '       "start_year": "",\n'
    '       "end_month": "",\n'
    '       "end_year": "",\n'
    '       "end_type": "None", None if there is no end month or       "Present" if the end month is "Present" or "Specific Month" if there is a end month given\n'
    '       "bullet_points": []\n'
    '     }\n'
    '     - If the date is not in range then it should be original value.\n'
    '          e.g. 03/2022 - Present -> March 2022 - Present\n'
    '          e.g. 03/2022 - 03/2023 -> March 2022 - March 2023\n'
    '          e.g. 03/2022 - 2023 -> March 2022 - 2023\n'
    '          e.g. 2022 - Present -> 2022 - Present\n'
    '          e.g. 2022 - 2023 -> 2022 - 2023\n'
    '          e.g. 03/2022 -> March 2022\n'
    '     - If there is no date than it should be null\n'
)


@router.get("/resume/{email}")
async def get_resume(email: str):
    resume = db.get_resume(email)
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    return resume


@router.post("/resume/{email}")
async def save_resume(email: str, resume_data: dict):
    try:
        db.save_resume(email, resume_data)
        return {"message": "Resume saved successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/parse-resume")
async def parse_resume(file: UploadFile = File(...)):
    text = extract_text_from_file(file)
    if not text.strip():
        raise HTTPException(status_code=400, detail="Could not extract text from file.")

    try:
        return generate_json(PARSE_PROMPT + "\nInput resume:\n" + text)
    except (ValueError, RuntimeError) as e:
        raise HTTPException(status_code=502, detail=f"Failed to parse resume: {e}")
