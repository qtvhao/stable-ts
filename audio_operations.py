import subprocess
import json
import os
import stable_whisper
from alignutils import find_best_segment_match
model = stable_whisper.load_model('tiny')

def cut_audio_file(audio_file, start=None, end=None):
    start_str = str(start).replace('.', '_') if start is not None else 'start'
    end_str = str(end).replace('.', '_') if end is not None else 'end'
    output_file = audio_file.replace('.mp3', f'_{start_str}_{end_str}.mp3')
    if start is None:
        subprocess.run(["ffmpeg", "-y", "-i", audio_file, "-to", str(end), "-c", "copy", output_file], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    elif end is None:
        subprocess.run(["ffmpeg", "-y", "-i", audio_file, "-ss", str(start), "-c", "copy", output_file], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    else:
        subprocess.run(["ffmpeg", "-y", "-i", audio_file, "-ss", str(start), "-to", str(end), "-c", "copy", output_file], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        
def get_segments_from_audio_file(audio_file, tokens_texts, output_file='output.json'):
    # Step 1: Align the tokens with the audio file
    alignment_result = model.align(audio_file, '\n\n'.join(tokens_texts), language="vi")
    alignment_result.save_as_json(output_file)

    # Step 2: Load the alignment results
    with open(output_file, 'r') as file:
        human_written_segments = json.load(file)
    
    segments = human_written_segments.get('segments', [])
    with open(output_file.replace('.json', '.txt'), 'w') as file:
        file.write("\n\n".join([str(segment['start']) + ' - ' + str(segment['end']) + ': ' + segment['text'] for segment in segments]))
    # remove output_file
    os.remove(output_file)

    # Step 3: Find the best match segment for the tokens
    segments_to_add, segments_end, remaining_tokens, matched_sentences = find_best_segment_match([{
        "start": segment['start'],
        "end": segment['end'],
        "text": segment['text']
    } for segment in segments], tokens_texts)
    
    # Step 4: Print debug information
    print(f"Matched sentences: {matched_sentences}")
    print('===')
    print(f"Best match segment text: {segments_to_add}")
    print('===')
    print(f"Best match segment end: {segments_end}")
    # print(f"Best match: {best_match}")
    print('===')
    # print(best_match_segment)
    print(f"Remaining tokens: {remaining_tokens}")

    # raise ValueError("Stop")

    # Step 5: If there are no remaining tokens, return the initial matched segments
    if not remaining_tokens:
        return [{'start': segment['start'], 'end': segment['end'], 'text': segment['text']} for segment in segments]
    
    # Step 6: Determine starting point for the next segment and process remaining tokens
    start = segments_end
    remaining_tokens_joined = "\n\n".join(remaining_tokens)
    matched_sentences_joined = "\n\n".join(matched_sentences)

    # Step 7: Cut the audio file from the best match endpoint and save remaining tokens
    none_start = cut_audio_file(audio_file, None, start)
    with open(f"{none_start}-processed.txt", 'w') as file:
        file.write(matched_sentences_joined)
    trimmed_audio_file = cut_audio_file(audio_file, start, None)
    with open(f"{trimmed_audio_file}-remaining.txt", 'w') as file:
        file.write(remaining_tokens_joined)
    raise ValueError("Stop")

    # Step 8: Recursively process remaining audio and tokens
    remaining_segments = get_segments_from_audio_file(trimmed_audio_file, remaining_tokens, trimmed_audio_file + '.json')

    # Step 9: Adjust the start and end times for the remaining segments and combine results
    aligned_segments = [{
        'start': segment['start'] + start,
        'end': segment['end'] + start,
        'text': segment['text']
    } for segment in remaining_segments]

    # Assuming corrected_segments is defined or meant to be the initially aligned segments
    return segments + aligned_segments

