import sys
import stable_whisper
import os
import json
import subprocess
from difflib import SequenceMatcher
import unicodedata
# 
def find_best_match(tokens_texts, corrected_segments):
    """
    Finds the index of the best match in `tokens_texts` for the `corrected_segments_texts`.
    
    Args:
        tokens_texts (list of str): List of tokens from the original text.
        corrected_segments_texts (str): Concatenated text of corrected segments.
        
    Returns:
        int: Index of the best match token in `tokens_texts`.
    """
    # remove the first tokens_texts
    corrected_segments_texts = "\n\n".join([segment['text'] for segment in corrected_segments])
    to_compare = tokens_texts[0]
    best_match = None
    lowest_ratio = 1
    last_100_chars_corrected = corrected_segments_texts[-50:]
    last_100_chars_to_compare = to_compare[-50:]
    for i, token_text in enumerate(tokens_texts):
        if 0 == i:
            continue
        to_compare = "\n\n".join(tokens_texts[i:])
        ratio = SequenceMatcher(None, last_100_chars_corrected, last_100_chars_to_compare).ratio()
        if ratio < lowest_ratio:
            lowest_ratio = ratio
            best_match = i
    print(f"Best match: {best_match}")
    print(f"Last 100 chars of corrected: {last_100_chars_corrected}")
    print(f"Last 100 chars of to_compare: {last_100_chars_to_compare}")
    # raise Exception(f"Could not find a match for . Ratio: {lowest_ratio}. Best match: {best_match}")
    return best_match

# 
def cut_audio_file(audio_file, start = None, end = None):
    start_str = str(start).replace('.', '_') if start is not None else 'start'
    end_str = str(end).replace('.', '_') if end is not None else 'end'
    output_file = audio_file.replace('.mp3', f'_{start_str}_{end_str}.mp3')
    if start is None:
        subprocess.run(["ffmpeg", "-y", "-i", audio_file, "-to", str(end), "-c", "copy", output_file])
    elif end is None:
        subprocess.run(["ffmpeg", "-y", "-i", audio_file, "-ss", str(start), "-c", "copy", output_file])
    else:
        subprocess.run(["ffmpeg", "-y", "-i", audio_file, "-ss", str(start), "-to", str(end), "-c", "copy", output_file])
        
    return output_file
# 
tokens_json = sys.argv[1]
audio_file = sys.argv[2]
output_file = sys.argv[3]
# 
tokens = json.loads(open(tokens_json).read())
tokens_texts = [token['text'] for token in tokens]

model = stable_whisper.load_model('tiny')

def get_segments_from_audio_file(audio_file, tokens_texts):
    corrected_segments = []
    print(f"Aligning {audio_file} with {len(tokens_texts)} tokens")
    new_result = model.align(audio_file, '\n\n'.join(tokens_texts), language="vi")
    new_result.save_as_json(output_file)
    human_written_segments = json.loads(open(output_file).read())
    # 
    segments = human_written_segments['segments']
    for i, segment in enumerate(segments):
        start = segment['start']
        end = segment['end']
        text = segment['text']
        is_the_last_segment = i == len(human_written_segments) - 1
        is_the_start_segment = i == 0
        if end - start > 0 or is_the_last_segment or is_the_start_segment or end < 2:
            corrected_segments.append({
                'start': start,
                'end': end,
                'text': text
            })
        else:
            cut_processed = cut_audio_file(audio_file, 0, start)
            cutt_audio_file = cut_audio_file(audio_file, start)

            best_match = find_best_match(tokens_texts, corrected_segments)
            
            processed_tokens = tokens_texts[:best_match]
            processed_tokens_joined = "\n\n".join(processed_tokens)
            open(cut_processed + '-processed.txt', 'w').write(processed_tokens_joined)

            remaining_tokens = tokens_texts[best_match:]
            remaining_tokens_joined = "\n\n".join(remaining_tokens)
            open(cutt_audio_file + '-remaining.txt', 'w').write(remaining_tokens_joined)
            segments_from_audio_file = get_segments_from_audio_file(cutt_audio_file, remaining_tokens)
            # align timestamps by adding the start time of the previous segment to the start time of the current segment
            aligned_segments = [{
                'start': segment['start'] + start,
                'end': segment['end'] + start,
                'text': segment['text']
            } for segment in segments_from_audio_file]
            return corrected_segments + aligned_segments

    return corrected_segments

for segment in get_segments_from_audio_file(audio_file, tokens_texts):
    start = segment['start']
    end = segment['end']
    text = segment['text']
    print(f"{start} - {end}: {text}")
