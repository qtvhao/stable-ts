FROM ghcr.io/qtvhao/torch:main

RUN pip install -U stable-ts
RUN apt-get update && apt-get install -y ffmpeg

ENV STABLE_TS_MODEL=tiny
# // tiny	39 M	tiny.en	tiny	~1 GB	~32x
# // base	74 M	base.en	base	~1 GB	~16x
# // small	244 M	small.en	small	~2 GB	~6x
# // medium	769 M	medium.en	medium	~5 GB	~2x
# // large	1550 M	N/A	large	~10 GB	1x

ENV STABLE_TS_LANGUAGE=vi
COPY in.wav .
ENV WHISPER_MODEL=base
COPY output/all.txt load_model.py .
# RUN stable-ts in.wav --model ${STABLE_TS_MODEL} --language ${STABLE_TS_LANGUAGE} --align all.txt --overwrite --output ni.json

RUN pip install -U faster-whisper
RUN pip install gunicorn flask
# RUN stable-ts in.wav --model ${STABLE_TS_MODEL} --language ${STABLE_TS_LANGUAGE} --align all.txt --overwrite --output ni.json -fw
ENV STABLE_TS_MODEL=tiny

RUN python3 load_model.py

# Expose the port for the application
EXPOSE 8000

COPY app.py audio_operations.py alignutils.py sentence_operations.py utils.py .
# RUN gunicorn -w 4 -b 0.0.0.0:8000 app:app

CMD ["gunicorn", "-w", "1", "-b", "0.0.0.0:8000", "app:app"]
