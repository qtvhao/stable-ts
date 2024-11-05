import sys
import stable_whisper
import os
import json
import subprocess
from difflib import SequenceMatcher
import unicodedata

# Function to remove accents from text
def remove_accents(text):
    return ''.join(
        char for char in unicodedata.normalize('NFD', text)
        if unicodedata.category(char) != 'Mn'
    )

# Function to get the first and last few words of text
def get_first_and_last_words(text, num_words=5):
    words = text.split()
    if len(words) <= num_words * 2:
        return text  # Return full text if it's too short
    first_part = " ".join(words[:num_words])
    last_part = " ".join(words[-num_words:])
    return first_part + " " + last_part

# Function to find the best matching non-human segment for each human-written segment
def match_segments(human_segments, non_human_segments, threshold=0.5):
    matched_segments = []

    for human_segment in human_segments:
        human_text = remove_accents(human_segment["text"])
        
        # Get the first and last 5 words of the human segment without accents
        human_excerpt = get_first_and_last_words(human_text)
        
        start_timestamp = None
        end_timestamp = None
        matching_texts = []
        
        for non_human_segment in non_human_segments:
            non_human_text = remove_accents(non_human_segment["text"])
            
            # Get the first and last 5 words of the non-human segment without accents
            non_human_excerpt = get_first_and_last_words(non_human_text)
            
            # Compare the excerpts for similarity
            similarity = SequenceMatcher(None, human_excerpt, non_human_excerpt).ratio()

            # If similarity is above threshold, consider it a match
            if similarity >= threshold:
                matching_texts.append(non_human_segment["text"])
                
                # Update start and end timestamps
                if start_timestamp is None:
                    start_timestamp = non_human_segment["start"]
                end_timestamp = non_human_segment["end"]

        # Default timestamps when no match is found
        if not matching_texts:
            start_timestamp = 0.0 if start_timestamp is None else start_timestamp
            end_timestamp = 0.0 if end_timestamp is None else end_timestamp
            concatenated_text = ""  # No matched text
        else:
            concatenated_text = " ".join(matching_texts)

        # Assign timestamps to the human segment
        matched_segment = {
            "text": human_segment["text"],
            "matched_text": concatenated_text,
            "start": start_timestamp,
            "end": end_timestamp
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
model = stable_whisper.load_model('base')
result_language = None
for file in files:
    if file.endswith('.mp3'):
        file2 = file
        if result_language is None:
            result = model.transcribe(folder + '/' + file)
        else:
            result = model.transcribe(folder + '/' + file, language=result_language)
        result_json_file = folder + '/' + file + '.json'
        result.save_as_json(result_json_file)
        result_json = json.loads(open(result_json_file).read())
        result_language = result_json['language']

non_human_segments_with_timestamps = []
duration = 0
json_files = os.listdir(folder)
json_files.sort()
for file in json_files:
    if file.endswith('.json'):
        audio_file = file.replace('.json', '')
        parsed = json.loads(open(folder + '/' + file).read())
        segments = parsed['segments']
        for segment in segments:
            start = segment['start'] + duration
            end = segment['end'] + duration
            text = segment['text']
            print(start, end, text)
            non_human_segments_with_timestamps.append({
                "start": int(start),
                "end": int(end),
                "text": text
            })
        duration += get_duration_mp3(folder + '/' + audio_file)

# Run the function to get timestamps for human-tecn segments
matched_segments_with_timestamps = match_segments(human_written_segments, non_human_segments_with_timestamps)

# print(json.dumps(matched_segments_with_timestamps))
with open(output_file, 'w') as f:
    f.write(json.dumps(matched_segments_with_timestamps))

