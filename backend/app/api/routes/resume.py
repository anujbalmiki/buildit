from fastapi import APIRouter, File, HTTPException, UploadFile

from app.database import db
from app.llm import generate_json
from app.text_extraction import extract_text_from_file

router = APIRouter()

PARSE_PROMPT = """You are an expert resume parser. Read the resume text below and return ONLY a JSON object with this exact shape:

{
  "name": "",
  "title": "",
  "contact_info": "",
  "sections": [
    {
      "type": "paragraph | bullet_points | experience | education | project",
      "title": "",
      "content": "",
      "items": [],
      "title_formatting": {"alignment": "left", "font_size": 16, "font_weight": "bold"},
      "content_formatting": {"alignment": "left", "font_size": 14, "font_weight": "normal"}
    }
  ]
}

GENERAL RULES
- Do not invent information. Use only what is present in the text.
- Keep the natural order of sections as they appear.
- Never output an empty section (no content and no items). Omit it entirely.
- Do not duplicate a section.
- contact_info: combine phone, email, location, and links into one string separated by " | ".
- If a section has content but no clear title, infer a sensible one (e.g. "Summary").

SECTION TYPES
1. "paragraph": one descriptive block (e.g. summary/objective). Put the text in "content"; leave "items" empty.
2. "bullet_points": a list such as Skills or Certifications. Put each point in "items" (array of strings); leave "content" empty.
   - Skills that are CATEGORISED: output ONE item per category, formatted as "Category: value1, value2, ...".
   - Skills laid out in MULTIPLE COLUMNS often extract in a scrambled order (all the category labels grouped together, then all the value lists grouped together, sometimes with a later heading mixed in). Re-pair each category label with the value list that belongs to it as best you can, and drop any heading that clearly belongs to a different section.
   - Skills listed inline (comma/pipe/dot separated and uncategorised): use a "paragraph" with a comma-separated string in "content".
3. "experience": jobs / work history only. "items" is an array of:
   {"position": "", "company": "", "start_month": "", "start_year": "", "end_month": "", "end_year": "", "end_type": "", "bullet_points": []}
4. "education": schooling only. "items" is an array of:
   {"degree": "", "institution": "", "start_month": "", "start_year": "", "end_month": "", "end_year": "", "end_type": "", "details": ""}
5. "project": personal, academic, or side projects. "items" is an array of:
   {"name": "", "tech": "", "github": "", "link": "", "start_month": "", "start_year": "", "end_month": "", "end_year": "", "end_type": "", "bullet_points": []}
   - "tech": the tech stack (often written as a "Stack: ..." line).
   - "github": any github.com URL for the project. "link": any other live/demo URL. Leave "" if absent.
   - Put projects under "project", NEVER under "experience". Likewise put education under "education", never under "experience".

DATES (apply to experience, education, and project entries)
- Use full month names with 4-digit years, e.g. "March 2022".
- "end_type": "Present" if the entry is ongoing; "Specific Month" if there is a real end date; "None" if there is no end date at all.
- Preserve the original granularity:
    "03/2022 - Present" -> start_month "March", start_year "2022", end_type "Present"
    "03/2022 - 03/2023" -> start "March 2022", end "March 2023", end_type "Specific Month"
    "2020 - 2023"       -> start_year "2020", end_year "2023", months "", end_type "Specific Month"
    "May 2025"          -> start_month "May", start_year "2025", end_type "None"
    no date             -> all date fields "", end_type "None"
"""


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
