import os
import platform
import time

import psutil
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse

from app.api.routes import (ats_check, cover_letter, docx_export,
                            improve_bullet, pdf, proofread, resume,
                            rewrite_resume, rewrite_section, share, versions)

load_dotenv()

app = FastAPI()

# Allow CORS for local development and deployed frontends
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "https://buildit.streamlit.app",
        "https://buildit-production.up.railway.app/",
        "https://buildit-lime.vercel.app",
        "https://a8a3cc7ae0e34c7e94a00d85f9e28f0e-02048d2154dd489e98da85a6c.fly.dev",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(pdf.router, prefix="/api", tags=["pdf"])
app.include_router(resume.router, prefix="/api", tags=["resume"])
app.include_router(rewrite_resume.router, prefix="/api", tags=["rewrite_resume"])
app.include_router(rewrite_section.router, prefix="/api", tags=["rewrite_section"])
app.include_router(cover_letter.router, prefix="/api", tags=["cover_letter"])
app.include_router(ats_check.router, prefix="/api", tags=["ats_check"])
app.include_router(versions.router, prefix="/api", tags=["versions"])
app.include_router(improve_bullet.router, prefix="/api", tags=["improve_bullet"])
app.include_router(docx_export.router, prefix="/api", tags=["docx_export"])
app.include_router(proofread.router, prefix="/api", tags=["proofread"])
app.include_router(share.router, prefix="/api", tags=["share"])


@app.get("/wake")
async def wake():
    """Wake up the server (for free-tier cold starts)"""
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
            <p class="success">API is running successfully!</p>
            <p>Server Time: """ + time.strftime("%Y-%m-%d %H:%M:%S") + """</p>
        </div>

        <div class="card endpoints">
            <h2>Available Endpoints:</h2>
            <ul>
                <li><a href="/docs">/docs</a> - Interactive API documentation</li>
                <li><a href="/redoc">/redoc</a> - Alternative API documentation</li>
                <li><a href="/health">/health</a> - API health check</li>
                <li><a href="/info">/info</a> - API information</li>
                <li>/api/generate-pdf - Generate PDF from HTML</li>
                <li>/api/parse-resume - Parse resume using AI</li>
                <li>/api/rewrite-resume-ai - Rewrite resume to match a job description</li>
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
        disk = psutil.disk_usage("/")
        return {
            "api": {"name": "Buildit Backend Server", "version": "1.0.0"},
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
            },
        }
    except Exception:
        return {
            "api": {"name": "Buildit Backend Server", "version": "1.0.0"},
            "environment": {
                "python": platform.python_version(),
                "os": platform.system(),
                "platform": platform.platform(),
            },
        }
