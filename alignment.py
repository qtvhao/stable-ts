import stable_whisper
import os
import json

# define a function
def djb2_hash(string):
    hash = 5381
    for char in string:
        hash = ((hash << 5) + hash) + ord(char)
    return hash & 0xFFFFFFFF

audio_file = "audio.json"
# read the audio file and the text file
audio_json = json.load(open(audio_file))
# print(audio_json['data']['videoScript'])
videoScript = audio_json['data']['videoScript']
all_translated_text = ""
for i in range(len(videoScript)):
    all_translated_text += videoScript[i]['translated'] + " "

print(all_translated_text)
with open('/output/all.txt', 'w') as f:
    f.write(all_translated_text)

segments_file_path = "/output/segments-" + str(djb2_hash(all_translated_text)) + ".json"
if os.path.exists(segments_file_path):
    with open(segments_file_path, 'r') as f:
        segments = json.load(f)
else:
    model = stable_whisper.load_model('base')
    result = model.align('in.wav', all_translated_text, language='vi')
    alignment_json = "/output/alignment.json"
    # segments = result.segments
    result.save_as_json(alignment_json)

    alignment_json_data = json.load(open(alignment_json))
    print(alignment_json_data['segments'])
    segments = alignment_json_data['segments']
    with open(segments_file_path, 'w') as f:
        # f.write(str(segments)) with formated json
        json.dump(segments, f)
