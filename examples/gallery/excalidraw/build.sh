#!/bin/sh
# Builds a local, offline Excalidraw into site/ for the gallery video (no install scripts run).
set -eu
cd "$(dirname "$0")"
npm ci --ignore-scripts --no-audit --no-fund
rm -rf site && mkdir -p site
node node_modules/esbuild/bin/esbuild src/main.jsx --bundle --format=esm --minify --jsx=automatic \
  --conditions=production --loader:.woff2=file --define:process.env.NODE_ENV='"production"' --outfile=site/main.js
cp index.html site/index.html
cp -r node_modules/@excalidraw/excalidraw/dist/prod/fonts site/fonts
echo "built site/"
