import pytest

from app.llm import _extract_json


def test_plain_json():
    assert _extract_json('{"a": 1}') == {"a": 1}


def test_fenced_json():
    assert _extract_json('```json\n{"a": 1}\n```') == {"a": 1}


def test_json_with_surrounding_prose():
    raw = 'Here is your resume:\n{"a": 1, "b": [2, 3]}\nHope that helps!'
    assert _extract_json(raw) == {"a": 1, "b": [2, 3]}


def test_empty_response_raises():
    with pytest.raises(ValueError):
        _extract_json("")


def test_no_json_object_raises():
    with pytest.raises(ValueError):
        _extract_json("Sorry, I cannot help with that.")
