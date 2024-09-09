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
COPY output/all.txt .
RUN stable-ts in.wav --model ${STABLE_TS_MODEL} --language ${STABLE_TS_LANGUAGE} --align all.txt --overwrite --output ni.json

RUN pip install -U faster-whisper
RUN stable-ts in.wav --model ${STABLE_TS_MODEL} --language ${STABLE_TS_LANGUAGE} --align all.txt --overwrite --output ni.json -fw
RUN bash -c "set -xeo pipefail; cat ni.json | grep 'trong IaC mang lại nhiều lợi ích cho doanh nghiệp' > /dev/null"
COPY yarn.lock package.json ./
RUN yarn install
RUN which jest || npm install -g jest
RUN mkdir -p /workspace/align-input/ /workspace/align-output/

COPY audio.json .
COPY alignment.js .
COPY backup-processor.js .
COPY getAlignedSubtitle.js .
COPY src src
# RUN node /workspace/alignment.js

