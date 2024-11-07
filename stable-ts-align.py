import sys
import os
import json
import subprocess
from difflib import SequenceMatcher
import unicodedata
# 
from utils import ends_with
from alignutils import calculate_similarity_ratio, find_best_segment_match, get_segments_by_index
from token_operations import get_remaining_tokens
from sentence_operations import get_processed_and_remaining_sentences
from audio_operations import cut_audio_file, get_segments_from_audio_file

tokens_json = sys.argv[1]
audio_file = sys.argv[2]
output_file = sys.argv[3]
# 
tokens = json.loads(open(tokens_json).read())
tokens_texts = [token['text'] for token in tokens]

import json
import stable_whisper
model = stable_whisper.load_model('tiny')

for segment in get_segments_from_audio_file(audio_file, tokens_texts):
    start = segment['start']
    end = segment['end']
    text = segment['text']
    print(f"{start} - {end}: {text}")
