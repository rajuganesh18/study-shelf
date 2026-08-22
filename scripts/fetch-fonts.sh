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

grab () {                       # grab <css-url> <output-filename>
  local css out url
  css="$1"; out="$2"
  # ask Google Fonts for the woff2 URL, then fetch the font itself
  url=$(curl -sL -A "$UA" "$css" | grep -o 'https://[^)]*\.woff2' | head -1)
  if [ -z "$url" ]; then
    echo "  MISS  $out  (could not resolve a woff2 url)"; return 0
  fi
  curl -sL -o "$DIR/$out" "$url"
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

echo "Done. Bump VERSION in www/service-worker.js so caches refresh."
