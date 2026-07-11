"""Resume file text extraction with input validation."""
import os
import tempfile

from fastapi import HTTPException, UploadFile

ALLOWED_EXTENSIONS = {"pdf", "docx"}
MAX_FILE_BYTES = 5 * 1024 * 1024  # 5 MB


def _extension(filename: str) -> str:
    return filename.rsplit(".", 1)[-1].lower() if "." in filename else ""


def validate_upload(filename: str, data: bytes) -> str:
    """Validate an uploaded resume and return its (lowercased) extension.

    Raises HTTPException with a 4xx status on any invalid input.
    """
    ext = _extension(filename or "")
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '.{ext or '?'}'. Allowed types: PDF, DOCX.",
        )
    if not data:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")
    if len(data) > MAX_FILE_BYTES:
        raise HTTPException(status_code=413, detail="File too large (max 5 MB).")
    return ext


def extract_text_from_file(file: UploadFile) -> str:
    """Validate an upload and extract its plain text (PDF or DOCX)."""
    data = file.file.read()
    ext = validate_upload(file.filename or "", data)

    with tempfile.NamedTemporaryFile(delete=False, suffix=f".{ext}") as tmp:
        tmp.write(data)
        tmp_path = tmp.name

    try:
        if ext == "pdf":
            from pdfminer.high_level import extract_text
            text = extract_text(tmp_path)
        else:  # docx
            import docx2txt
            text = docx2txt.process(tmp_path)
    finally:
        os.remove(tmp_path)

    return text
