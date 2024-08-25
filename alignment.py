import stable_whisper
import os
import json

audio_file = "audio.json"
# read the audio file and the text file
audio_json = json.load(open(audio_file))
# print(audio_json['data']['videoScript'])
videoScript = audio_json['data']['videoScript']
all_translated_text = ""
for i in range(len(videoScript)):
    all_translated_text += videoScript[i]['translated'] + " "

print(all_translated_text)

model = stable_whisper.load_model('base')
text = 'Machines thinking, breeding. You were to bear us a new, promised land.'
result = model.align('in.wav', all_translated_text, language='vi')
print(result)

result.save(audio_json)