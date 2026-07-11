from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health():
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "healthy"


def test_generate_pdf():
    resp = client.post(
        "/api/generate-pdf",
        json={"html": "<html><body><h1>Hi</h1></body></html>"},
    )
    assert resp.status_code == 200
    assert resp.headers["content-type"] == "application/pdf"
    assert resp.content[:4] == b"%PDF"


def test_parse_resume_rejects_bad_extension():
    resp = client.post(
        "/api/parse-resume",
        files={"file": ("resume.txt", b"hello", "text/plain")},
    )
    assert resp.status_code == 400
