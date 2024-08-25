FROM ghcr.io/qtvhao/torch:main

RUN pip install -U stable-ts
COPY load_model.py .
RUN python3 ./load_model.py

COPY alignment.py .
COPY in.wav .
# RUN python3 ./alignment.py
COPY output/all.txt .
RUN stable-ts in.wav --model base --language vi --align all.txt --overwrite --output ni.json
RUN bash -c "set -xeo pipefail; cat ni.json | grep 'trong IaC mang lại nhiều lợi ích cho doanh nghiệp'"
