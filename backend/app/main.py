import base64
import os
import platform
import sys
import tempfile
import time
from io import BytesIO

import psutil
from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, Response, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse
from google import genai
from pydantic import BaseModel
# Import WeasyPrint instead of Playwright
from weasyprint import CSS, HTML
from app.api.routes import pdf, resume

load_dotenv()

api_key = os.environ["GOOGLE_API_KEY"]

app = FastAPI()

# Allow CORS for local development and Streamlit Cloud
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000", 
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "https://buildit.streamlit.app",
        "https://buildit-production.up.railway.app/",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(pdf.router, prefix="/api", tags=["pdf"])
app.include_router(resume.router, prefix="/api", tags=["resume"])

class PDFRequest(BaseModel):
    html: str
    # PDF customization options
    margins: dict = {"top": "8mm", "right": "8mm", "bottom": "8mm", "left": "8mm"}
    scale: float = 1.0
    page_size: str = "A4"
    zoom: float = 1.0
    spacing: float = 1.0  # Line spacing multiplier

@app.get("/wake")
async def wake():
    """Wake up the server (for Streamlit Cloud)"""
    return {"message": "Server is awake!"}

@app.get("/", response_class=HTMLResponse)
async def root():
    """Return a simple HTML page showing the API is running"""
    return """
    <!DOCTYPE html>
    <html>
    <head>
        <title>Buildit Backend Server</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                max-width: 800px;
                margin: 0 auto;
                padding: 20px;
                line-height: 1.6;
            }
            h1 {
                color: #2c3e50;
                border-bottom: 1px solid #eee;
                padding-bottom: 10px;
            }
            .card {
                background: #f9f9f9;
                border-radius: 5px;
                padding: 15px;
                margin: 15px 0;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .success {
                color: #27ae60;
                font-weight: bold;
            }
            .endpoints {
                background: #e8f4fc;
            }
            a {
                color: #3498db;
                text-decoration: none;
            }
            a:hover {
                text-decoration: underline;
            }
        </style>
    </head>
    <body>
        <h1>Buildit Backend Server</h1>
        <div class="card">
            <p class="success">✅ API is running successfully!</p>
            <p>Server Time: """ + time.strftime("%Y-%m-%d %H:%M:%S") + """</p>
        </div>
        
        <div class="card endpoints">
            <h2>Available Endpoints:</h2>
            <ul>
                <li><a href="/docs">/docs</a> - Interactive API documentation</li>
                <li><a href="/redoc">/redoc</a> - Alternative API documentation</li>
                <li><a href="/health">/health</a> - API health check</li>
                <li><a href="/info">/info</a> - API information</li>
                <li><a href="/generate-pdf">/generate-pdf</a> - Generate PDF from HTML</li>
                <li><a href="/parse-resume-ai">/parse-resume-ai</a> - Parse resume using AI</li>
            </ul>
        </div>
    </body>
    </html>
    """

@app.get("/health")
async def health_check():
    """Return health status of the API"""
    return {"status": "healthy", "timestamp": time.time()}

@app.get("/info")
async def api_info():
    """Return information about the API and environment"""
    try:
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        
        return {
            "api": {
                "name": "Buildit Backend Server",
                "version": "1.0.0",
            },
            "environment": {
                "python": platform.python_version(),
                "os": platform.system(),
                "platform": platform.platform(),
                "cpu_count": os.cpu_count(),
            },
            "resources": {
                "memory_total": f"{memory.total / (1024**3):.2f} GB",
                "memory_available": f"{memory.available / (1024**3):.2f} GB",
                "memory_used_percent": f"{memory.percent}%",
                "disk_total": f"{disk.total / (1024**3):.2f} GB",
                "disk_free": f"{disk.free / (1024**3):.2f} GB",
                "disk_used_percent": f"{disk.percent}%",
            }
        }
    except Exception as e:
        # Simplified version if psutil is not available
        return {
            "api": {
                "name": "Buildit Backend Server",
                "version": "1.0.0",
            },
            "environment": {
                "python": platform.python_version(),
                "os": platform.system(),
                "platform": platform.platform(),
            }
        }

@app.post("/generate-pdf")
def generate_pdf_endpoint(req: PDFRequest):
    print(req)
    """Generate PDF from HTML content using WeasyPrint with customizable options"""
    # Create a BytesIO buffer to store the PDF
    pdf_buffer = BytesIO()
    
    try:
        custom_css = f"""
        .resume-container {{
            margin: 0 !important;
            padding: 0 !important;
        }}
        
        h1 {{ 
            margin: 0 !important;
        }}
        
        @page {{
            size: {req.page_size};
            margin: {req.margins.get("top", "8mm")} {req.margins.get("right", "8mm")} 
                    {req.margins.get("bottom", "8mm")} {req.margins.get("left", "8mm")};
        }}
        body {{
            zoom: {req.zoom};
            line-height: {req.spacing};
            transform: scale({req.scale});
            transform-origin: top left;
        }}
        """
        html = HTML(string=req.html)
        html.write_pdf(
            pdf_buffer,
            presentational_hints=True,
            stylesheets=[CSS(string=custom_css)],  # <-- Fix here
        )
        pdf_buffer.seek(0)
        return Response(
            content=pdf_buffer.getvalue(), 
            media_type="application/pdf"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {str(e)}")
    finally:
        pdf_buffer.close()

def extract_text_from_file(file: UploadFile):
    ext = file.filename.split('.')[-1].lower()
    with tempfile.NamedTemporaryFile(delete=False, suffix=f".{ext}") as tmp:
        tmp.write(file.file.read())
        tmp_path = tmp.name
    text = ""
    if ext == "pdf":
        from pdfminer.high_level import extract_text
        text = extract_text(tmp_path)
    elif ext == "docx":
        import docx2txt
        text = docx2txt.process(tmp_path)
    os.remove(tmp_path)
    return text

@app.post("/parse-resume-ai")
async def parse_resume_ai(file: UploadFile = File(...)):
    text = extract_text_from_file(file)
    if not text.strip():
        return JSONResponse(content={"error": "Could not extract text from file."}, status_code=400)
    client = genai.Client(api_key=api_key)  # Or use your config
    prompt = (
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
        "Input resume:\n" + text
    )
    response = client.models.generate_content(
        model="gemini-2.0-flash",
        contents=prompt,
    )
    import json
    raw = response.text.strip()
    raw = raw[raw.index("{"):]  # Extract JSON part
    # remove ``` from the end of the string
    if raw.endswith("```"):
        raw = raw[:-3]
    data = json.loads(raw)
    return data