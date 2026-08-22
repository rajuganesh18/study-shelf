#!/usr/bin/env bash
# Downloads the three typefaces the design system uses into www/fonts,
# so the app renders correctly with no network at all.
#
#   bash scripts/fetch-fonts.sh
#
# Run this once. Until you do, the app still works — the CSS falls back to
# system faces — but the display type will not look the way it was designed.
# Anton and IBM Plex are both licensed under the SIL Open Font License,
# so shipping the .woff2 files inside your APK is fine. Keep OFL.txt with them.

set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/www/fonts"
mkdir -p "$DIR"

UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36'

missed=0

grab () {                       # grab <css-url> <output-filename>
  local css out url
  css="$1"; out="$2"
  # Ask Google Fonts for the woff2 URL, then fetch the font itself.
  # `|| true` matters: under `set -e -o pipefail` a grep that matches
  # nothing returns 1, which would abort the whole script here and leave
  # the remaining fonts undownloaded. A miss should skip one font, not
  # the run — the app falls back to system faces and still works.
  url=$(curl -sfL -A "$UA" "$css" | grep -o 'https://[^)]*\.woff2' | head -1) || true
  if [ -z "$url" ]; then
    echo "  MISS  $out  (could not resolve a woff2 url)"; missed=$((missed+1)); return 0
  fi
  if ! curl -sfL -o "$DIR/$out" "$url"; then
    echo "  MISS  $out  (download failed)"; rm -f "$DIR/$out"; missed=$((missed+1)); return 0
  fi
  echo "  ok    $out  ($(du -h "$DIR/$out" | cut -f1))"
}

echo "Fetching fonts into $DIR"
grab 'https://fonts.googleapis.com/css2?family=Anton&display=swap'                    Anton-Regular.woff2
grab 'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400&display=swap'   IBMPlexSans-Regular.woff2
grab 'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@500&display=swap'   IBMPlexSans-Medium.woff2
grab 'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@600&display=swap'   IBMPlexSans-SemiBold.woff2
grab 'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400&display=swap'   IBMPlexMono-Regular.woff2
grab 'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@500&display=swap'   IBMPlexMono-Medium.woff2

cat > "$DIR/OFL.txt" <<'TXT'
Anton and IBM Plex are distributed under the SIL Open Font License 1.1.
Full licence: https://scripts.sil.org/OFL
Anton     — https://fonts.google.com/specimen/Anton
IBM Plex  — https://github.com/IBM/plex
TXT

if [ "$missed" -gt 0 ]; then
  echo
  echo "$missed font(s) could not be fetched. The app still works — the CSS falls"
  echo "back to system faces — but the display type will not look as designed."
  echo "Re-run this script when you have a working connection."
fi

echo "Done. Bump VERSION in www/service-worker.js so caches refresh."
