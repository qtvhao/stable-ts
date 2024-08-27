FROM ghcr.io/qtvhao/torch:main

RUN pip install -U stable-ts

COPY in.wav .
COPY output/all.txt .

RUN stable-ts in.wav --model tiny --language vi --align all.txt --overwrite --output ni.json
RUN apt-get update && apt-get install -y ffmpeg
RUN bash -c "set -xeo pipefail; cat ni.json | grep 'trong IaC mang lại nhiều lợi ích cho doanh nghiệp' > /dev/null"
COPY yarn.lock package.json ./
RUN yarn install

COPY audio.json .
COPY alignment.js .
RUN node /workspace/alignment.js

