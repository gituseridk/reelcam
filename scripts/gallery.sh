#!/usr/bin/env bash
# Builds and films the gallery apps: docs/gallery/<app>.mp4 plus a poster, QA sheet in out/.
set -euo pipefail
cd "$(dirname "$0")/.."
npm run build --silent
mkdir -p docs/gallery out
for app in excalidraw; do
  dir="examples/gallery/$app"
  [[ -f "$dir/site/index.html" ]] || "$dir/build.sh"
  node dist/cli.js render "$dir/$app.yml" --out "docs/gallery/$app.mp4"
  mv "docs/gallery/$app.sheet.png" "out/gallery-$app.sheet.png"
  duration="$(ffprobe -v error -show_entries format=duration -of csv=p=0 "docs/gallery/$app.mp4")"
  ffmpeg -nostdin -loglevel error -y -ss "$(awk -v d="$duration" 'BEGIN { print d * 0.92 }')" -i "docs/gallery/$app.mp4" -frames:v 1 "docs/gallery/$app.png"
done
