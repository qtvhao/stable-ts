import pytest
from alignutils import calculate_similarity_ratio, find_best_segment_match
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

@pytest.mark.parametrize("segments, sentences_texts, expected_matched_segments, expected_matched_segment_end, expected_remaining_sentences, expected_processed_sentences", [
    (
        [{"text": "This is a test segment.", "end": 10}, {"text": "Another segment here.", "end": 20}],
        ["This is a test segment.", "Completely different sentence."],
        [{"text": "This is a test segment.", "end": 10}],
        10,
        ["Completely different sentence."],
        ["This is a test segment."]
    ),
    (
        [{"text": "Short segment.", "end": 5}, {"text": "Another short segment.", "end": 15}],
        ["Short segment.", "Another short segment."],
        [{"text": "Short segment.", "end": 5}, {"text": "Another short segment.", "end": 15}],
        15,
        [],
        ["Short segment.", "Another short segment."]
    ),
    (
        [{"text": "Short segment.", "end": 5}, {"text": "Another short segment.", "end": 15}],
        ["Short segment.", "Another short segment.", "Third short segment."],
        [{"text": "Short segment.", "end": 5}, {"text": "Another short segment.", "end": 15}],
        15,
        ["Third short segment."],
        ["Short segment.", "Another short segment."]
    ),
    (
        [{"text": "Segment one.", "end": 5}, {"text": "Segment two.", "end": 10}],
        ["No match here.", "Another non-matching sentence."],
        None,
        None,
        ["No match here.", "Another non-matching sentence."],
        []
    )
])
def test_find_best_segment_match(segments, sentences_texts, expected_matched_segments, expected_matched_segment_end, expected_remaining_sentences, expected_processed_sentences):
    matched_segments, matched_segment_end, remaining_sentences, processed_sentences = find_best_segment_match(segments, sentences_texts)
    assert matched_segments == expected_matched_segments, f"Expected {expected_matched_segments}, but got {matched_segments}"
    assert matched_segment_end == expected_matched_segment_end, f"Expected {expected_matched_segment_end}, but got {matched_segment_end}"
    assert remaining_sentences == expected_remaining_sentences, f"Expected {expected_remaining_sentences}, but got {remaining_sentences}"
    assert processed_sentences == expected_processed_sentences, f"Expected {expected_processed_sentences}, but got {processed_sentences}"

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
