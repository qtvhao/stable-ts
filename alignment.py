import stable_whisper
model = stable_whisper.load_model('base')
text = 'Machines thinking, breeding. You were to bear us a new, promised land.'
result = model.align('in.wav', text, language='en')
print(result)
