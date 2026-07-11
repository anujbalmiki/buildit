"""Single integration point for the generative model.

Everything that talks to the LLM goes through here, so swapping the provider
later (e.g. a local Ollama model + RAG) only touches this file.
"""
import json
import os

from google import genai
from google.genai import types

# "gemini-flash-latest" is an alias that always resolves to a current Gemini
# Flash model. Using it (instead of a pinned version like gemini-2.0-flash)
# avoids the free-tier "limit: 0" quota walls that hit specific pinned models.
MODEL = "gemini-flash-latest"

_client: genai.Client | None = None


def _get_client() -> genai.Client:
    global _client
    if _client is None:
        api_key = os.getenv("GOOGLE_API_KEY")
        if not api_key:
            raise RuntimeError(
                "GOOGLE_API_KEY is not set. Add it to backend/.env before using AI features."
            )
        _client = genai.Client(api_key=api_key)
    return _client


def _extract_json(raw: str) -> dict:
    """Parse a JSON object out of a model response.

    Tolerates code fences and surrounding prose by taking the outermost
    ``{ ... }`` span, which is far more robust than slicing from the first
    brace to the end of the string.
    """
    if not raw or not raw.strip():
        raise ValueError("Model returned an empty response.")

    text = raw.strip()
    if text.startswith("```"):
        text = text.strip("`")
        if text.lstrip().lower().startswith("json"):
            text = text.lstrip()[4:]

    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1 or end < start:
        raise ValueError(f"Model response did not contain JSON: {raw[:200]}")

    return json.loads(text[start : end + 1])


def generate_text(prompt: str) -> str:
    """Return the model's plain-text response."""
    response = _get_client().models.generate_content(model=MODEL, contents=prompt)
    return (response.text or "").strip()


def generate_json(prompt: str) -> dict:
    """Return the model's response parsed as a JSON object.

    Requests JSON output mode so the model is far less likely to wrap the
    payload in prose, then parses defensively.
    """
    response = _get_client().models.generate_content(
        model=MODEL,
        contents=prompt,
        config=types.GenerateContentConfig(response_mime_type="application/json"),
    )
    return _extract_json(response.text or "")
