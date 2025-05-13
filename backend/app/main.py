import asyncio
import base64
import os
import sys
import tempfile

from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware
from playwright.sync_api import sync_playwright
from pydantic import BaseModel

if sys.platform.startswith("win"):
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

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

@app.post("/generate-pdf")
def generate_pdf_endpoint(req: PDFRequest):
    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp_pdf:
        pdf_path = tmp_pdf.name

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch()
            page = browser.new_page()
            html_base64 = base64.b64encode(req.html.encode('utf-8')).decode('utf-8')
            data_url = f"data:text/html;base64,{html_base64}"
            page.goto(data_url, wait_until='networkidle')
            page.pdf(
                path=pdf_path,
                format='A4',
                margin={'top': '20px', 'right': '30px', 'bottom': '20px', 'left': '30px'},
                print_background=True,
                scale=0.95
            )
            browser.close()
        with open(pdf_path, "rb") as f:
            pdf_bytes = f.read()
        return Response(content=pdf_bytes, media_type="application/pdf")
    finally:
        if os.path.exists(pdf_path):
            os.remove(pdf_path)