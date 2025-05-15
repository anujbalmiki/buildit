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

load_dotenv()

api_key = os.environ["GOOGLE_API_KEY"]

app = FastAPI()

# Allow CORS for local development and Streamlit Cloud
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust in production!
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class PDFRequest(BaseModel):
    html: str
    # PDF customization options
    margins: dict = {"top": "20mm", "right": "20mm", "bottom": "20mm", "left": "20mm"}
    scale: float = 1.0
    page_size: str = "A4"
    zoom: float = 1.0
    spacing: float = 1.0  # Line spacing multiplier

@app.get("/wake")
async def wake():
    """Wake up the server (for Streamlit Cloud)"""
    return JSONResponse(content={"message": "Server is awake!"})

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
    """Generate PDF from HTML content using WeasyPrint with customizable options"""
    # Create a BytesIO buffer to store the PDF
    pdf_buffer = BytesIO()
    
    try:
        custom_css = f"""
        @page {{
            size: {req.page_size};
            margin: {req.margins.get("top", "20mm")} {req.margins.get("right", "20mm")} 
                    {req.margins.get("bottom", "20mm")} {req.margins.get("left", "20mm")};
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
    print(file)
    text = extract_text_from_file(file)
    if not text.strip():
        return JSONResponse(content={"error": "Could not extract text from file."}, status_code=400)
    client = genai.Client(api_key=api_key)  # Or use your config
    prompt = (
        "Extract the following information from this resume: "
        "name, email, phone, education, experience (with company, position, dates, bullet points), and skills. "
        "Return ONLY a valid JSON object, with NO markdown, no code block, and no explanation. Resume text:\n\n" + text
    )
    response = client.models.generate_content(
        model="gemini-2.0-flash",
        contents=prompt,
    )
    import json
    import re
    raw = response.text.strip()
    # Remove markdown code block if present
    if raw.startswith("```"):
        raw = re.sub(r"^```[a-zA-Z]*\n?", "", raw)
        raw = re.sub(r"\n?```$", "", raw)
    try:
        data = json.loads(raw)
    except Exception:
        return JSONResponse(content={"error": "AI response could not be parsed as JSON.", "raw": response.text}, status_code=400)

    # --- Normalize and refine the output ---
    refined = {
        "name": data.get("name", ""),
        "email": data.get("email", ""),
        "phone": data.get("phone", ""),
        "skills": data.get("skills", []),
        "education": [],
        "experience": []
    }

    # Normalize education
    for edu in data.get("education", []):
        refined["education"].append({
            "degree": edu.get("degree", ""),
            "institution": edu.get("institution", ""),
            "dates": edu.get("dates", ""),
            "details": edu.get("details", "")
        })

    # Normalize experience
    for exp in data.get("experience", []):
        refined["experience"].append({
            "company": exp.get("company", ""),
            "position": exp.get("position", ""),
            "date_range": exp.get("dates", ""),
            "bullet_points": exp.get("bullet_points", []) or exp.get("bullets", [])
        })

    # Optionally, add a summary field if present
    if "summary" in data:
        refined["summary"] = data["summary"]

    return refined