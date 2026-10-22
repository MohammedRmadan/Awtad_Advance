#!/bin/sh
# Awtad BD Hub – trial run (macOS / Linux)
set -e
cd "$(dirname "$0")"
docker info >/dev/null 2>&1 || { echo "Docker is not running. Start Docker Desktop and try again."; exit 1; }
docker compose -f docker-compose.trial.yml up -d --build
echo "Waiting for the system to start..."
for i in $(seq 1 30); do
  curl -fs http://localhost:8080/healthz >/dev/null 2>&1 && break
  sleep 2
done
echo "Open http://localhost:8080  - user: admin  password: Trial-Admin-2026"
command -v open >/dev/null && open http://localhost:8080 || true
echo "To stop: docker compose -f docker-compose.trial.yml down"
