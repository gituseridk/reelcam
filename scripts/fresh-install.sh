#!/usr/bin/env bash
# Runs the README Quickstart, exactly as written, in a clean official Node container.
# The one substitution: until the package is published, "npm install --global showreel" installs
# the tarball from "npm pack" instead of the registry. Prerequisites the README names (ffmpeg) are
# installed first. Usage: scripts/fresh-install.sh [image]   (default node:22-bookworm)
set -euo pipefail
cd "$(dirname "$0")/.."
image="${1:-node:22-bookworm}"
engine="$(command -v docker || command -v podman)"

work="$(mktemp -d "${TMPDIR:-/tmp}/showreel-fresh-XXXXXX")"
trap 'rm -rf "$work"' EXIT
npm pack --silent --pack-destination "$work" >/dev/null
tarball="$(basename "$(ls "$work"/showreel-*.tgz)")"

quickstart="$(awk '/<!-- quickstart:start -->/{on=1; next} /<!-- quickstart:end -->/{on=0} on' README.md | sed '/^```/d')"
[[ -n "$quickstart" ]] || { echo "no quickstart block in README.md" >&2; exit 1; }
commands="${quickstart//npm install --global showreel/npm install --global /pkg/$tarball}"
printf '%s\n' "$commands" > "$work/quickstart.sh"
echo "== Quickstart as run (README with the tarball substitution):"
cat "$work/quickstart.sh"

results="$PWD/.showreel/fresh-install"
rm -rf "$results" && mkdir -p "$results"
"$engine" run --rm --memory 6g -v "$work:/pkg:ro" -v "$results:/result" -w /home/node "$image" bash -euo pipefail -c '
  apt-get update -qq && apt-get install -yqq ffmpeg >/dev/null
  echo "== node $(node --version), ffmpeg $(ffmpeg -version | head -1 | cut -d" " -f3)"
  bash -euxo pipefail /pkg/quickstart.sh
  echo "== result:"
  ffprobe -v error -select_streams v:0 -show_entries stream=width,height,codec_name:format=duration -of compact out/demo.mp4
  ls -la out/
  cp out/demo.mp4 out/demo.sheet.png /result/
'
echo "== fresh install check passed in $image; video and sheet in .showreel/fresh-install/"
