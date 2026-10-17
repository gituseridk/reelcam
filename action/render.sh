#!/usr/bin/env bash
# The GitHub Action's render step. Inputs arrive as environment variables (never interpolated into
# the script), outputs go to $GITHUB_OUTPUT.
set -euo pipefail

: "${RENDER_SCRIPT:?the "script" input is required}"
cli="${GITHUB_ACTION_PATH:?}/dist/cli.js"
args=(render "$RENDER_SCRIPT")
[[ -n "${RENDER_OUTPUT:-}" ]] && args+=(--out "$RENDER_OUTPUT")
[[ -n "${RENDER_PRESET:-}" ]] && args+=(--preset "$RENDER_PRESET")
[[ "${RENDER_GIF:-false}" == "true" ]] && args+=(--gif)
[[ "${RENDER_ALLOW_REMOTE:-false}" == "true" ]] && args+=(--allow-remote)

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
echo "render: video=$video sheet=$sheet exit=$status"
exit "$status"
