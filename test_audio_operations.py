import pytest
import json
from hypothesis import given, strategies as st
from audio_operations import cut_audio_file, get_segments_from_segments_file

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
    segments = get_segments_from_segments_file(audio_file, tokens_texts, output_file)
    assert segments != None

