#!/bin/bash
set -x

docker compose up --build 2>&1 | tee  dlogs.txt
