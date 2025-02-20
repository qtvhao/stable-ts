import stable_whisper
import os

model = stable_whisper.load_model(os.environ.get('STABLE_TS_MODEL'))
