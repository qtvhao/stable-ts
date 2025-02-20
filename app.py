from flask import Flask, request, jsonify, Response
from threading import Lock
import logging
import stable_whisper
import json
import os
import time
import tempfile
from werkzeug.utils import secure_filename
from audio_operations import recursive_get_segments_from_audio_file

# Initialize logging with format including timestamp
logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s")

# Load Stable-Whisper model globally
model_name = os.environ.get('WHISPER_MODEL', 'base')  # Default to 'base' model
logging.info(f"📢 Loading Stable-Whisper model: {model_name}")
model = stable_whisper.load_model(model_name)
logging.info(f"✅ Model '{model_name}' loaded successfully.")

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
    
    @app.route('/health', methods=['GET'])
    def health_check():
        logging.info("💚 Health check endpoint accessed.")
        return create_utf8_json_response({"status": "ok"}, 200)

    @app.route('/stabilize', methods=['POST'])
    def stabilize():
        try:
            with request_lock:
                start_time = time.time()

                if 'audio_file' not in request.files or 'tokens_texts' not in request.form:
                    logging.warning("⚠️ Missing required parameters: audio_file, tokens_texts")
                    return create_utf8_json_response({"error": "Missing required parameters (audio_file, tokens_texts)"}, 400)

                audio_file = request.files['audio_file']
                tokens_texts = json.loads(request.form['tokens_texts'])  # Expect JSON list

                if not audio_file.filename or not isinstance(tokens_texts, list) or not tokens_texts:
                    logging.warning("❌ Invalid input values for stabilization.")
                    return create_utf8_json_response({"error": "Invalid input values"}, 400)

                filename = secure_filename(audio_file.filename)
                file_size = len(audio_file.read())
                audio_file.seek(0)  # Reset file pointer

                logging.info(f"📂 Received file: {filename} ({file_size / 1024:.2f} KB)")
                logging.info(f"📊 Number of tokens: {len(tokens_texts)}")

                # Use a temporary file instead of saving permanently
                with tempfile.NamedTemporaryFile(delete=True, suffix=".wav") as temp_audio:
                    audio_file.save(temp_audio.name)
                    logging.info("🎙️ Audio file saved temporarily.")

                    # Transcribe audio using Stable-Whisper
                    transcript = model.transcribe(temp_audio.name)
                    logging.info("📝 Transcription complete.")

                    # Call custom audio processing function
                    segments = recursive_get_segments_from_audio_file(temp_audio.name, tokens_texts)
                    logging.info(f"🔍 Segmentation complete. {len(segments)} segments found.")

                elapsed_time = time.time() - start_time
                logging.info(f"✅ Stabilization completed in {elapsed_time:.2f} seconds.")

                return create_utf8_json_response({"transcription": transcript, "segments": segments}, 200)

        except Exception as e:
            logging.error(f"🔥 Error processing stabilization request: {str(e)}")
            return create_utf8_json_response({"error": "Internal Server Error"}, 500)

    @app.route('/align', methods=['POST'])
    def align_audio():
        try:
            with request_lock:
                start_time = time.time()

                if 'audio_file' not in request.files or 'text' not in request.form:
                    logging.warning("⚠️ Missing required parameters: audio_file, text")
                    return create_utf8_json_response({"error": "Missing required parameters (audio_file, text)"}, 400)

                audio_file = request.files['audio_file']
                text = request.form['text'].strip()

                if not audio_file.filename or not text:
                    logging.warning("❌ Invalid input values for alignment.")
                    return create_utf8_json_response({"error": "Invalid input values"}, 400)

                filename = secure_filename(audio_file.filename)
                file_size = len(audio_file.read())
                audio_file.seek(0)  # Reset file pointer

                logging.info(f"📂 Received file: {filename} ({file_size / 1024:.2f} KB)")
                logging.info(f"📝 Text to align: {text[:50]}... (truncated)")

                # Use a temporary file instead of saving permanently
                with tempfile.NamedTemporaryFile(delete=True, suffix=".wav") as temp_audio:
                    audio_file.save(temp_audio.name)
                    logging.info("🎙️ Audio file saved temporarily.")

                    # Perform alignment using Stable-Whisper
                    result = model.align(temp_audio.name, text, language='en')
                    logging.info("📌 Alignment complete.")

                elapsed_time = time.time() - start_time
                logging.info(f"✅ Alignment completed in {elapsed_time:.2f} seconds.")

                return create_utf8_json_response({"alignment": result.to_dict()}, 200)

        except Exception as e:
            logging.error(f"🔥 Error processing alignment request: {str(e)}")
            return create_utf8_json_response({"error": "Internal Server Error"}, 500)

    return app

app = create_app()
