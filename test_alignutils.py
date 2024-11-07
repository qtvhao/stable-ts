import pytest
from alignutils import calculate_similarity_ratio
from hypothesis import given, strategies as st

@pytest.mark.parametrize("segment_text, candidate_text, expected_ratio", [
    (
        "This is a test segment with exactly ten words here.", 
        "Completely different text with no matching words. This is a test segment with, exactly  ten  words  here.", 
        0.99
    ),
    ("Short text.", "Short text.", 1.0),
    ("Short text.", "Different text.", 0.61),
    ("", "", 0.0),
    ("", "Non-empty text.", 0.0),
    ("Non-empty text.", "", 0.0)
])
def test_calculate_similarity_ratio(segment_text, candidate_text, expected_ratio):
    ratio = calculate_similarity_ratio(segment_text, candidate_text)
    assert ratio == pytest.approx(expected_ratio, rel=1e-2), f"Expected {expected_ratio}, but got {ratio}"
# 
@given(st.text(), st.text())
def test_calculate_similarity_ratio_2(segment_text, candidate_text):
    ratio = calculate_similarity_ratio(segment_text, candidate_text)
    assert 0.0 <= ratio <= 1.0, "The similarity ratio should be between 0 and 1"

def test_calculate_similarity_ratio_exact_match():
    segment_text = "This is a test segment with exactly ten words here."
    candidate_text = "This is a test segment with exactly ten words here."
    ratio = calculate_similarity_ratio(segment_text, candidate_text)
    assert ratio == 1.0, "The similarity ratio should be 1.0 for exact matches"
