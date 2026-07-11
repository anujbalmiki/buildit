"""Single integration point for the generative model.

Every call that talks to an LLM goes through here, so swapping or adding
providers (e.g. a local Ollama model + RAG later) only touches this file.

Provider strategy: **Gemini is primary, Groq is an automatic fallback.**
Each public call tries the configured providers in order and returns the
first success. If Gemini fails (e.g. free-tier quota 429) and a
``GROQ_API_KEY`` is set, the call transparently falls back to Groq. Set
only ``GROQ_API_KEY`` (and no ``GOOGLE_API_KEY``) to run on Groq alone.
"""
import json
import os

from google import genai
from google.genai import types

GEMINI_MODEL = "gemini-flash-latest"
# Groq model is env-overridable so it can be updated without a code change.
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")

_JSON_SYSTEM = (
    "You are a precise assistant. Respond with a single valid JSON object and nothing else."
)

_gemini_client: "genai.Client | None" = None
_groq_client = None


def _get_gemini() -> genai.Client:
    global _gemini_client
    if _gemini_client is None:
        api_key = os.getenv("GOOGLE_API_KEY")
        if not api_key:
            raise RuntimeError("GOOGLE_API_KEY is not set.")
        _gemini_client = genai.Client(api_key=api_key)
    return _gemini_client


def _get_groq():
    global _groq_client
    if _groq_client is None:
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            raise RuntimeError("GROQ_API_KEY is not set.")
        from groq import Groq

        _groq_client = Groq(api_key=api_key)
    return _groq_client


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


# --- Provider implementations (each returns raw text) ---


def _gemini_text(prompt: str) -> str:
    response = _get_gemini().models.generate_content(model=GEMINI_MODEL, contents=prompt)
    return response.text or ""


def _gemini_json(prompt: str) -> str:
    response = _get_gemini().models.generate_content(
        model=GEMINI_MODEL,
        contents=prompt,
        config=types.GenerateContentConfig(response_mime_type="application/json"),
    )
    return response.text or ""


def _groq_text(prompt: str) -> str:
    resp = _get_groq().chat.completions.create(
        model=GROQ_MODEL,
        messages=[{"role": "user", "content": prompt}],
    )
    return resp.choices[0].message.content or ""


def _groq_json(prompt: str) -> str:
    resp = _get_groq().chat.completions.create(
        model=GROQ_MODEL,
        messages=[
            {"role": "system", "content": _JSON_SYSTEM},
            {"role": "user", "content": prompt},
        ],
        response_format={"type": "json_object"},
    )
    return resp.choices[0].message.content or ""


def _providers(text_fn: str):
    """Yield (name, fn) for each configured provider, Gemini first."""
    providers = []
    if os.getenv("GOOGLE_API_KEY"):
        providers.append(("Gemini", _gemini_text if text_fn == "text" else _gemini_json))
    if os.getenv("GROQ_API_KEY"):
        providers.append(("Groq", _groq_text if text_fn == "text" else _groq_json))
    if not providers:
        raise RuntimeError(
            "No LLM provider configured. Set GOOGLE_API_KEY and/or GROQ_API_KEY in backend/.env."
        )
    return providers


def generate_text(prompt: str) -> str:
    """Return the model's plain-text response, trying each provider in turn."""
    errors = []
    for name, fn in _providers("text"):
        try:
            return (fn(prompt) or "").strip()
        except Exception as e:  # noqa: BLE001 - fall back to the next provider
            errors.append(f"{name}: {e}")
    raise RuntimeError("All LLM providers failed. " + " | ".join(errors))


def generate_json(prompt: str) -> dict:
    """Return the model's response parsed as a JSON object, with fallback.

    Requests JSON output mode from each provider so the payload is far less
    likely to be wrapped in prose, then parses defensively.
    """
    errors = []
    for name, fn in _providers("json"):
        try:
            return _extract_json(fn(prompt))
        except Exception as e:  # noqa: BLE001 - fall back to the next provider
            errors.append(f"{name}: {e}")
    raise RuntimeError("All LLM providers failed. " + " | ".join(errors))
