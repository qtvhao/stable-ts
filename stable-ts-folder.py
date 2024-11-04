import sys
import stable_whisper
import os
import json
import subprocess
from fuzzywuzzy import fuzz
from fuzzywuzzy import process

# Function to assign timestamps based on fuzzy matching
def assign_timestamps(human_segments, non_human_segments):
    for human_seg in human_segments:
        # Find best matching segment from non-human transcriptions
        best_match = process.extractOne(
            human_seg["text"],
            [seg["text"] for seg in non_human_segments],
            scorer=fuzz.partial_ratio
        )
        
        # Find the corresponding non-human segment with the best match
        for non_human_seg in non_human_segments:
            if non_human_seg["text"] == best_match[0]:
                # Assign timestamp from matched non-human segment to human segment
                human_seg["timestamp"] = non_human_seg["timestamp"]
                break
                
    return human_segments

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
tokens_content = open(tokens_file).read()
tokens = json.loads(tokens_content)
# print(tokens)
files = os.listdir(folder)
model = stable_whisper.load_model('base')
for file in files:
    if file.endswith('.mp3'):
        file2 = file
        result = model.transcribe(folder + '/' + file)
        result.save_as_json(folder + '/' + file + '.json')

final_transcript = []
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
            print(start, end, text)
        # print("Merge the segments to get the final transcript")
        # final_transcript.append(parsed['segments'])
