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


ENDPOINT_GROUPS = [
    ("Resume", [
        ("POST", "/api/parse-resume", "Parse an uploaded PDF/DOCX into structured resume data"),
        ("GET", "/api/resume/{email}", "Fetch a saved resume"),
        ("POST", "/api/resume/{email}", "Save a resume"),
    ]),
    ("AI", [
        ("POST", "/api/rewrite-resume-ai", "Rewrite the whole resume for a job description"),
        ("POST", "/api/rewrite-section-ai", "Rewrite a single section"),
        ("POST", "/api/improve-bullet", "Improve one bullet point"),
        ("POST", "/api/generate-cover-letter-ai", "Draft a cover letter"),
        ("POST", "/api/proofread", "Find spelling and grammar issues"),
        ("POST", "/api/ats-check", "Score the generated PDF for ATS readability"),
    ]),
    ("Export", [
        ("POST", "/api/generate-pdf", "Render the resume HTML to PDF"),
        ("POST", "/api/generate-docx", "Export the resume as a Word document"),
    ]),
    ("Version history", [
        ("GET", "/api/resume/{email}/versions", "List saved versions"),
        ("POST", "/api/resume/{email}/versions", "Store a version snapshot"),
        ("GET", "/api/resume/{email}/versions/{id}", "Fetch one version"),
    ]),
    ("Sharing", [
        ("GET", "/api/resume/{email}/share", "Current sharing state"),
        ("POST", "/api/resume/{email}/share", "Enable the public link"),
        ("POST", "/api/resume/{email}/share/disable", "Turn the public link off"),
        ("POST", "/api/resume/{email}/share/regenerate", "Mint a new link, killing the old one"),
        ("GET", "/api/r/{token}", "Public, read-only shared resume"),
    ]),
]


@app.get("/", response_class=HTMLResponse)
async def root():
    """Return a simple HTML page showing the API is running"""
    groups = "".join(
        "<h2>{}</h2><table>{}</table>".format(
            name,
            "".join(
                '<tr><td class="m">{}</td><td class="p">{}</td><td class="d">{}</td></tr>'.format(
                    method, path, desc
                )
                for method, path, desc in routes
            ),
        )
        for name, routes in ENDPOINT_GROUPS
    )

    return """
    <!DOCTYPE html>
    <html>
    <head>
        <title>Buildit API</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
            :root { color-scheme: light dark; }
            body {
                font-family: system-ui, -apple-system, Segoe UI, sans-serif;
                max-width: 820px;
                margin: 0 auto;
                padding: 32px 20px 64px;
                line-height: 1.6;
            }
            h1 { margin-bottom: 4px; }
            h2 {
                font-size: 15px;
                text-transform: uppercase;
                letter-spacing: .04em;
                opacity: .6;
                margin: 28px 0 8px;
            }
            .status { color: #16a34a; font-weight: 600; }
            .sub { opacity: .6; font-size: 14px; margin-top: 0; }
            .links { margin: 20px 0 8px; }
            .links a {
                display: inline-block;
                margin-right: 14px;
                color: #2563eb;
                text-decoration: none;
            }
            .links a:hover { text-decoration: underline; }
            table { width: 100%; border-collapse: collapse; }
            td { padding: 6px 8px; border-top: 1px solid rgba(128,128,128,.25); vertical-align: top; }
            .m { font-family: ui-monospace, monospace; font-size: 12px; opacity: .7; width: 52px; }
            .p { font-family: ui-monospace, monospace; font-size: 13px; white-space: nowrap; }
            .d { opacity: .7; font-size: 14px; }
            @media (max-width: 640px) {
                .p { white-space: normal; }
                .d { display: none; }
            }
        </style>
    </head>
    <body>
        <h1>Buildit API</h1>
        <p class="sub">Backend for the Buildit resume builder.</p>
        <p><span class="status">Running</span> &middot; """ + time.strftime("%Y-%m-%d %H:%M:%S") + """</p>

        <div class="links">
            <a href="/docs">API docs</a>
            <a href="/redoc">ReDoc</a>
            <a href="/health">Health</a>
            <a href="/info">Info</a>
        </div>
        """ + groups + """
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
