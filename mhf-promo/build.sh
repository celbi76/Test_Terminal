#!/usr/bin/env bash
# Komplett neu rendern: Ton -> Bilder -> MP4 -> Prüfbericht
set -euo pipefail
cd "$(dirname "$0")"
export PLAYWRIGHT_MODULE="${PLAYWRIGHT_MODULE:-$(npm root -g)/playwright}"
python3 tools/audio.py > build/audio.log
head -1 build/audio.log
node tools/render.js
python3 tools/check.py
