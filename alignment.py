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

model = stable_whisper.load_model('base')
text = 'Machines thinking, breeding. You were to bear us a new, promised land.'
result = model.align('in.wav', all_translated_text, language='vi')
# print(result)

alignment_json = "/output/alignment.json"
segments = result.segments
result.save_as_json(alignment_json)

alignment_json_data = json.load(open(alignment_json))
print(alignment_json_data['segments'])
with open('/output/segments.json', 'w') as f:
    f.write(str(alignment_json_data['segments']))
