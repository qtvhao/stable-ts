from flask import Flask, request, jsonify, Response
from threading import Lock
import logging
import stable_whisper
import json
import os
from werkzeug.utils import secure_filename
from audio_operations import recursive_get_segments_from_audio_file

# Initialize logging
logging.basicConfig(level=logging.INFO)

# Load Stable-Whisper model globally to avoid reloading on each request
model = stable_whisper.load_model(os.environ.get('WHISPER_MODEL'))

# Lock to ensure only one request is processed at a time
request_lock = Lock()

# Directory for storing uploaded files
UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def create_utf8_json_response(data, status=200):
    """Return JSON response with UTF-8 encoding."""
    return Response(json.dumps(data, ensure_ascii=False), status=status, mimetype="application/json; charset=utf-8")

def create_app():
    app = Flask(__name__)
    app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER

    @app.route('/stabilize', methods=['POST'])
    def stabilize():
        try:
            with request_lock:
                if 'audio_file' not in request.files or 'tokens_texts' not in request.form:
                    return create_utf8_json_response({"error": "Missing required parameters (audio_file, tokens_texts)"}, 400)

                audio_file = request.files['audio_file']
                tokens_texts = json.loads(request.form['tokens_texts'])  # Expect JSON list

                if not audio_file.filename or not isinstance(tokens_texts, list) or not tokens_texts:
                    return create_utf8_json_response({"error": "Invalid input values"}, 400)

                filename = secure_filename(audio_file.filename)
                file_path = os.path.join(app.config["UPLOAD_FOLDER"], filename)
                audio_file.save(file_path)

                logging.info(f"Processing uploaded audio file: {filename} with {len(tokens_texts)} tokens")

                # Transcribe audio using Stable-Whisper
                transcript = model.transcribe(file_path)
                logging.info("Transcription complete.")

                # Call custom audio processing function
                segments = recursive_get_segments_from_audio_file(file_path, tokens_texts)

                return create_utf8_json_response({"transcription": transcript, "segments": segments}, 200)

        except Exception as e:
            logging.error(f"Error processing request: {str(e)}")
            return create_utf8_json_response({"error": "Internal Server Error"}, 500)

    @app.route('/align', methods=['POST'])
    def align_audio():
        try:
            with request_lock:
                if 'audio_file' not in request.files or 'text' not in request.form:
                    return create_utf8_json_response({"error": "Missing required parameters (audio_file, text)"}, 400)

                audio_file = request.files['audio_file']
                text = request.form['text']

                if not audio_file.filename or not text:
                    return create_utf8_json_response({"error": "Invalid input values"}, 400)

                filename = secure_filename(audio_file.filename)
                file_path = os.path.join(app.config["UPLOAD_FOLDER"], filename)
                audio_file.save(file_path)

                logging.info(f"Aligning text to uploaded audio file: {filename}")

                # Perform alignment using Stable-Whisper
                result = model.align(file_path, text, language='en')
                logging.info("Alignment complete.")

                return create_utf8_json_response({"alignment": result}, 200)

        except Exception as e:
            logging.error(f"Error processing alignment: {str(e)}")
            return create_utf8_json_response({"error": "Internal Server Error"}, 500)

    return app

app = create_app()
