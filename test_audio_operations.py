import pytest
import json
from hypothesis import given, strategies as st
from audio_operations import recursive_get_segments_from_audio_file, get_segments_from_segments_file
from utils import calculate_similarity_ratio

@pytest.mark.parametrize("tokens_json, audio_file, output_file", [
    (
        "tokens.json",
        "synthesize-result-2532432836.mp3",
        "output.json"
    ),
])
def test_get_segments_from_segments_file(tokens_json, audio_file, output_file):
    tokens = json.loads(open(tokens_json).read())
    tokens_texts = [token['text'] for token in tokens]
    # trimmed_audio_file, remaining_tokens, start, segments = get_segments_from_segments_file(audio_file, tokens_texts, output_file)
    segments = recursive_get_segments_from_audio_file(audio_file, tokens_texts, output_file)
    print(segments)
    for segment in segments:
        assert segment['start'] != segment['end'], f"Segment {segment} don't have time"
    tokens_joined = " ".join(tokens_texts)
    segments_joined = " ".join([segment['text'] for segment in segments])
    print(f"Tokens: {tokens_joined}")
    print(f"Segments: {segments_joined}")
    similarity_ratio = calculate_similarity_ratio(tokens_joined, segments_joined)
    print(f"Similarity ratio: {similarity_ratio}")
    assert similarity_ratio >= 0.8, "Similarity ratio is too low"

