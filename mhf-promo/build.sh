#!/usr/bin/env bash
# Komplett neu rendern: Ton -> Bilder -> MP4 -> Prüfbericht
#   ./build.sh          Standardversion (Mosaik-Look)  -> out/mhf-promo.mp4
#   ./build.sh foto     Zweitversion mit Foto          -> out/mhf-promo-foto.mp4
set -euo pipefail
cd "$(dirname "$0")"
export PLAYWRIGHT_MODULE="${PLAYWRIGHT_MODULE:-$(npm root -g)/playwright}"
V="${1:-}"
python3 tools/audio.py > build/audio.log
head -1 build/audio.log
if [ -n "$V" ]; then
  [ -f assets/flyer_clean.png ] || python3 tools/clean_flyer.py
  node tools/render.js --variant "$V"
  python3 tools/check.py "$V"
else
  node tools/render.js
  python3 tools/check.py
fi
