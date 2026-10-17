#!/usr/bin/env bash
# Renders the README hero (docs/hero.mp4) with Showreel itself, plus its poster frame.
set -euo pipefail
cd "$(dirname "$0")/.."
npm run build --silent
node dist/cli.js render examples/hero.yml --out docs/hero.mp4
duration="$(ffprobe -v error -show_entries format=duration -of csv=p=0 docs/hero.mp4)"
ffmpeg -nostdin -loglevel error -y -ss "$(awk -v d="$duration" "BEGIN { print d * 0.82 }")" -i docs/hero.mp4 -frames:v 1 docs/hero.png
rm -f docs/hero.sheet.png
echo "docs/hero.mp4 docs/hero.png"
