#!/bin/sh
# Run from any directory. Requires Docker + Compose; no host Node.js needed.
set -eu
CDPATH= cd "$(dirname "$0")/.."
if ! command -v docker >/dev/null 2>&1; then
  printf '%s\n' 'Install Docker Desktop, or Docker Engine with the Compose plugin, first.' >&2
  exit 1
fi
docker compose version >/dev/null
docker info >/dev/null
if [ ! -f .env.local ]; then
  (umask 077; cp .env.example .env.local)
  printf '%s\n' 'Created .env.local. Add your Gemini API key there, then run this command again.'
  exit 1
fi
docker compose up --build -d --wait --wait-timeout 120
printf '%s\n' 'French Education Helper is running: http://localhost:3000' 'History: http://localhost:3000/history' 'Keep this computer and Docker running for access from other devices.'
