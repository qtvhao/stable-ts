import pytest
from hypothesis import given, strategies as st
from sentence_operations import get_processed_and_remaining_sentences

@pytest.mark.parametrize("sentences_texts, corrected_segments, expected_processed, expected_remaining", [
    (
        ["Lorem ipsum dolor sit amet", "consectetur adipiscing elit.", "Nullam nec nulla ac libero."],
        [
            {
                "text": "Lorem ipsum dolor sit amet",
            },
            {
                "text": "consectetur adipiscing elit.",
            },
            {
                "text": "Nullam nec",
            },
        ],
        [
            "Lorem ipsum dolor sit amet",
            "consectetur adipiscing elit.",
        ],
        [
            "Nullam nec nulla ac libero.",
        ]
    ),
])
def test_get_processed_and_remaining_sentences(sentences_texts, corrected_segments, expected_processed, expected_remaining):
    processed, remaining = get_processed_and_remaining_sentences(sentences_texts, corrected_segments)
    assert processed == expected_processed
    assert remaining == expected_remaining

# @given(st.lists(st.text()), st.lists(st.text()))
# def test_get_processed_and_remaining_sentences_random(sentences_texts, corrected_segments):
#     processed, remaining = get_processed_and_remaining_sentences(sentences_texts, corrected_segments)
#     assert isinstance(processed, (str, type(None)))
#     assert isinstance(remaining, list)