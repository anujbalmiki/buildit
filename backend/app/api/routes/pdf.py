from fastapi import APIRouter, HTTPException, Response
from pydantic import BaseModel
from io import BytesIO
from weasyprint import CSS, HTML

router = APIRouter()

class PDFRequest(BaseModel):
    html: str
    margins: dict = {"top": "8mm", "right": "8mm", "bottom": "8mm", "left": "8mm"}
    scale: float = 1.0
    page_size: str = "A4"
    zoom: float = 1.0
    spacing: float = 1.0

@router.post("/generate-pdf")
async def generate_pdf(req: PDFRequest):
    """Generate PDF from HTML content using WeasyPrint with customizable options"""
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
            stylesheets=[CSS(string=custom_css)],
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