#!/usr/bin/env bash
# The GitHub Action's render step. Inputs arrive as environment variables (never interpolated into
# the script), outputs go to $GITHUB_OUTPUT.
set -euo pipefail

: "${SHOWREEL_SCRIPT:?the "script" input is required}"
cli="${GITHUB_ACTION_PATH:?}/dist/cli.js"
args=(render "$SHOWREEL_SCRIPT")
[[ -n "${SHOWREEL_OUTPUT:-}" ]] && args+=(--out "$SHOWREEL_OUTPUT")
[[ -n "${SHOWREEL_PRESET:-}" ]] && args+=(--preset "$SHOWREEL_PRESET")
[[ "${SHOWREEL_GIF:-false}" == "true" ]] && args+=(--gif)
[[ "${SHOWREEL_ALLOW_REMOTE:-false}" == "true" ]] && args+=(--allow-remote)

status=0
files="$(node "$cli" "${args[@]}")" || status=$?

video="" ; gif="" ; sheet=""
while IFS= read -r line; do
  case "$line" in
    *.mp4) video="$line" ;;
    *.gif) gif="$line" ;;
    *.sheet.png) sheet="$line" ;;
  esac
done <<< "$files"

{
  echo "video=$video"
  echo "gif=$gif"
  echo "sheet=$sheet"
  echo "status=$status"
} >> "${GITHUB_OUTPUT:-/dev/null}"
echo "showreel: video=$video sheet=$sheet exit=$status"
exit "$status"
