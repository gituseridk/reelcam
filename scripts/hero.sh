#!/usr/bin/env bash
# Renders the README videos with the tool itself: docs/hero.mp4 (16:9) and docs/hero-vertical.mp4
# (9:16), their poster frames, and each take's QA contact sheet in out/ (kept out of git).
set -euo pipefail
cd "$(dirname "$0")/.."
npm run build --silent
mkdir -p out
for name in hero hero-vertical; do
  node dist/cli.js render "examples/$name.yml" --out "docs/$name.mp4"
  mv "docs/$name.sheet.png" "out/$name.sheet.png"
  duration="$(ffprobe -v error -show_entries format=duration -of csv=p=0 "docs/$name.mp4")"
  ffmpeg -nostdin -loglevel error -y -ss "$(awk -v d="$duration" 'BEGIN { print d * 0.9 }')" -i "docs/$name.mp4" -frames:v 1 "docs/$name.png"
done
echo "docs/hero.mp4 docs/hero-vertical.mp4 (sheets in out/)"
