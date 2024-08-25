import stable_whisper
import os
import json
import sys

cli_args = sys.argv
print(cli_args)
if len(cli_args) < 2:
    exit()

# define a function
def djb2_hash(string):
    hash = 5381
    for char in string:
        hash = ((hash << 5) + hash) + ord(char)
    return hash & 0xFFFFFFFF

audio_file = "audio.json"
audio_json = json.load(open(audio_file))
videoScript = audio_json['data']['videoScript']

print(all_translated_text)

segments_file_path = "/output/segments-" + str(djb2_hash(all_translated_text)) + ".json"
if os.path.exists(segments_file_path):
    with open(segments_file_path, 'r') as f:
        segments = json.load(f)
else:
    model = stable_whisper.load_model('base')
    result = model.align('in.wav', all_translated_text, language='vi')
    alignment_json = "/tmp/alignment.json"
    # segments = result.segments
    result.save_as_json(alignment_json)

    alignment_json_data = json.load(open(alignment_json))
    print(alignment_json_data['segments'])
    segments = alignment_json_data['segments']
    with open(segments_file_path, 'w') as f:
        # f.write(str(segments)) with formated json
        json.dump(segments, f)

for i in range(len(segments)):
    words = segments[i]["words"]
    for j in range(len(words)):
        word = words[j]["word"]
        words[j] = {
            "start": words[j]["start"],
            "end": words[j]["end"],
            "word": word
        }
    segments[i] = {
        "start": segments[i]["start"],
        "end": segments[i]["end"],
        "text": segments[i]["text"],
        "words": words
    }
    
with open(segments_file_path, 'w') as f:
    json.dump(segments, f)
# stable-ts in.wav --model base --language vi --align /output/all.txt --overwrite --output ni.json
