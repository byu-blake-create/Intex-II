#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_PROJECT="$ROOT_DIR/backend/NorthStarShelter.API/NorthStarShelter.API.csproj"
BACKEND_URL="https://localhost:5000"
FRONTEND_DIR="$ROOT_DIR/frontend"

if ! command -v dotnet >/dev/null 2>&1; then
  echo "dotnet is required to run the backend." >&2
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "npm is required to run the frontend." >&2
  exit 1
fi

echo "Starting backend on $BACKEND_URL"
dotnet run --project "$BACKEND_PROJECT" --urls "$BACKEND_URL" &
BACKEND_PID=$!

cleanup() {
  if kill -0 "$BACKEND_PID" >/dev/null 2>&1; then
    kill "$BACKEND_PID" >/dev/null 2>&1 || true
    wait "$BACKEND_PID" 2>/dev/null || true
  fi
}

trap cleanup EXIT INT TERM

echo "Starting frontend on http://localhost:3000"
cd "$FRONTEND_DIR"
npm run dev
