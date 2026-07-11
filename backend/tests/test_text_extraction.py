import pytest
from fastapi import HTTPException

from app.text_extraction import MAX_FILE_BYTES, validate_upload


def test_valid_pdf():
    assert validate_upload("resume.pdf", b"%PDF-1.4 data") == "pdf"


def test_valid_docx_case_insensitive():
    assert validate_upload("Resume.DOCX", b"PK\x03\x04") == "docx"


def test_unsupported_extension():
    with pytest.raises(HTTPException) as exc:
        validate_upload("resume.txt", b"hello")
    assert exc.value.status_code == 400


def test_no_extension():
    with pytest.raises(HTTPException) as exc:
        validate_upload("resume", b"hello")
    assert exc.value.status_code == 400


def test_empty_file():
    with pytest.raises(HTTPException) as exc:
        validate_upload("resume.pdf", b"")
    assert exc.value.status_code == 400


def test_oversized_file():
    with pytest.raises(HTTPException) as exc:
        validate_upload("resume.pdf", b"x" * (MAX_FILE_BYTES + 1))
    assert exc.value.status_code == 413
