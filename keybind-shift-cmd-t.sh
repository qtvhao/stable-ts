#!/bin/bash
set -x

docker compose up -d --build 2>&1 | tee  dlogs.txt
npx tsc
node dist/testEndpoint.js | tee  dlogs.txt
docker compose logs -f app
