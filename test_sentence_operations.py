import pytest
from hypothesis import given, strategies as st
from sentence_operations import split_sentences_by_highest_similarity_to_segments

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
    (
        ["The quick brown fox", "jumps over the lazy dog", "and runs away."],
        [
            {
                "text": "The quick brown fox",
            },
            {
                "text": "jumps over the lazy dog",
            },
        ],
        [
            "The quick brown fox",
            "jumps over the lazy dog",
        ],
        [
            "and runs away.",
        ]
    ),
    (
        ["Hello world", "This is a test", "Another sentence"],
        [
            {
                "text": "Hello world",
            },
            {
                "text": "This is a test",
            },
        ],
        [
            "Hello world",
            "This is a test",
        ],
        [
            "Another sentence",
        ]
    ),
    (
        ["One sentence", "Two sentence", "Three sentence"],
        [
            {
                "text": "One sentence",
            },
            {
                "text": "Two sentence",
            },
        ],
        [
            "One sentence",
            "Two sentence",
        ],
        [
            "Three sentence",
        ]
    ),
    # Unhappy cases
    (
        ["Sentence without match"],
        [
            {
                "text": "No match here",
            },
        ],
        [],
        [
            "Sentence without match",
        ]
    ),
    (
        ["Partial match . sentence . . . . ", "Another one"],
        [
            {
                "text": "Partial 1, 2, 3, 4, 5, 6 match.",
            },
        ],
        [],
        [
            "Partial match . sentence . . . . ",
            "Another one",
        ]
    ),
    (
        ["Completely different sentence"],
        [
            {
                "text": "Totally unrelated segment",
            },
        ],
        [],
        [
            "Completely different sentence",
        ]
    ),
    (
        [],
        [
            {
                "text": "Segment without sentence",
            },
        ],
        [],
        []
    ),
    (
        ["Sentence without segment"],
        [],
        [],
        [
            "Sentence without segment",
        ]
    ),
])
def test_get_processed_and_remaining_sentences(sentences_texts, corrected_segments, expected_processed, expected_remaining):
    processed, remaining = split_sentences_by_highest_similarity_to_segments(sentences_texts, corrected_segments)
    assert processed == expected_processed
    assert remaining == expected_remaining

# @given(st.lists(st.text()), st.lists(st.text()))
# def test_get_processed_and_remaining_sentences_random(sentences_texts, corrected_segments):
#     processed, remaining = get_processed_and_remaining_sentences(sentences_texts, corrected_segments)
#     assert isinstance(processed, (str, type(None)))
#     assert isinstance(remaining, list)

# @given(st.lists(st.text()), st.lists(st.text()))
# def test_get_processed_and_remaining_sentences_random(sentences_texts, corrected_segments):
#     processed, remaining = get_processed_and_remaining_sentences(sentences_texts, corrected_segments)
#     assert isinstance(processed, (str, type(None)))
#     assert isinstance(remaining, list)