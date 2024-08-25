FROM pytorch/pytorch:latest

RUN pip install -U stable-ts
COPY load_model.py .
RUN python3 ./load_model.py

COPY alignment.py .
COPY in.wav .
# RUN python3 ./alignment.py
COPY output/all.txt .
RUN stable-ts in.wav --model base --language vi --align all.txt --overwrite --output ni.json
