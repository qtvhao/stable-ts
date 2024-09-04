FROM ghcr.io/qtvhao/torch:main

RUN pip install -U stable-ts
RUN apt-get update && apt-get install -y ffmpeg

COPY in.wav .
COPY output/all.txt .
ENV STABLE_TS_MODEL=tiny
# tiny	    39   M	tiny.en	        tiny	~1 GB	~32x
# base	    74   M	base.en	        base	~1 GB	~16x
# small	    244  M	small.en	    small	~2 GB	~6x
# medium	769  M	medium.en	    medium	~5 GB	~2x
# large	    1550 M	N/A	            large	~10 GB	1x

ENV STABLE_TS_LANGUAGE=vi
RUN stable-ts in.wav --model ${STABLE_TS_MODEL} --language ${STABLE_TS_LANGUAGE} --align all.txt --overwrite --output ni.json

RUN pip install -U faster-whisper
# 1.999 ModuleNotFoundError: No module named 'faster_whisper'
RUN stable-ts in.wav --model ${STABLE_TS_MODEL} --language ${STABLE_TS_LANGUAGE} --align all.txt --overwrite --output ni.json -fw
RUN bash -c "set -xeo pipefail; cat ni.json | grep 'trong IaC mang lại nhiều lợi ích cho doanh nghiệp' > /dev/null"
COPY yarn.lock package.json ./
RUN yarn install
RUN which jest || npm install -g jest

COPY src/ .
COPY audio.json .
COPY alignment.js .
COPY getAlignedSubtitle.js .
# RUN node /workspace/alignment.js

