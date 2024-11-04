import sys
import stable_whisper
import os
import json
import subprocess
from difflib import SequenceMatcher

# Function to find the best matching non-human segment for each human-written segment
def match_segments(human_segments, non_human_segments):
    matched_segments = []

    for human_segment in human_segments:
        human_text = human_segment["text"]
        best_match = None
        highest_ratio = 0.0

        # Find the best match in non-human segments
        for non_human_segment in non_human_segments:
            non_human_text = non_human_segment["text"]
            similarity = SequenceMatcher(None, human_text, non_human_text).ratio()

            # Update best match if a higher similarity is found
            if similarity > highest_ratio:
                highest_ratio = similarity
                best_match = non_human_segment

        # Assign timestamps to the human segment from the best-matched non-human segment
        if best_match:
            matched_segment = {
                "text": human_text,
                "start": best_match["start"],
                "end": best_match["end"]
            }
            matched_segments.append(matched_segment)

    return matched_segments


def get_duration_mp3(file):
    result = subprocess.Popen([
        "ffprobe",
        "-v", "error",
        "-show_entries", "format=duration",
        "-of", "json",
        file
    ], stdout = subprocess.PIPE, stderr = subprocess.STDOUT)
    output = result.stdout.read()
    duration = json.loads(output)
    return int(float(duration['format']['duration']))

cli_args = sys.argv 
folder = cli_args[1]
tokens_file = cli_args[2]
output_file = cli_args[3]
tokens_content = open(tokens_file).read()
human_written_segments = json.loads(tokens_content)
files = os.listdir(folder)
model = stable_whisper.load_model('tiny')
for file in files:
    if file.endswith('.mp3'):
        file2 = file
        result = model.transcribe(folder + '/' + file)
        result.save_as_json(folder + '/' + file + '.json')

non_human_segments_with_timestamps = []
duration = 0
json_files = os.listdir(folder)
json_files.sort()
for file in json_files:
    if file.endswith('.json'):
        audio_file = file.replace('.json', '')
        duration += get_duration_mp3(folder + '/' + audio_file)
        parsed = json.loads(open(folder + '/' + file).read())
        segments = parsed['segments']
        for segment in segments:
            start = segment['start'] + duration
            end = segment['end'] + duration
            text = segment['text']
            non_human_segments_with_timestamps.append({
                "start": int(start),
                "end": int(end),
                "text": text
            })

# Run the function to get timestamps for human-tecn segments
matched_segments_with_timestamps = match_segments(human_written_segments, non_human_segments_with_timestamps)

print(json.dumps(matched_segments_with_timestamps))
with open(output_file, 'w') as f:
    f.write(json.dumps(matched_segments_with_timestamps))

