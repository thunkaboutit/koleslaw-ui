#!/usr/bin/env bash
#
# Render scripts/og-card.html into public/og/default.png, the fallback social
# card every blog post picks up.
#
# The card is a real page using the site's own palette, fonts, grain, and
# mascot, so a browser has to render it. That browser is a container rather than
# a local Chrome: the same rendering on any machine, and no assumption about
# where Chrome is installed. Shot at 2x and downscaled so the type stays crisp
# at the 1200x630 that Open Graph consumers expect.
#
# The card loads Google Fonts, exactly as the site does, so this needs network
# access. Re-run after editing the card and commit both files.
#
# Usage: ./scripts/render-og-card.sh

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
IMAGE="${IMAGE:-zenika/alpine-chrome:latest}"
TARGET="${REPO_ROOT}/public/og/default.png"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

if ! command -v magick >/dev/null 2>&1; then
  echo 'ImageMagick (magick) is required to downscale the shot.' >&2
  exit 1
fi

echo '==> shooting the card at 2400x1260'
docker run --rm \
  -v "${REPO_ROOT}:/work" \
  -v "${WORK}:/out" \
  -w /work \
  --entrypoint chromium-browser \
  "$IMAGE" \
  --headless \
  --no-sandbox \
  --disable-gpu \
  --hide-scrollbars \
  --force-device-scale-factor=2 \
  --window-size=1200,630 \
  --virtual-time-budget=8000 \
  --screenshot=/out/card@2x.png \
  file:///work/scripts/og-card.html 2>/dev/null

if [ ! -s "${WORK}/card@2x.png" ]; then
  echo 'the browser produced no screenshot' >&2
  exit 1
fi

echo '==> downscaling to 1200x630'
mkdir -p "$(dirname "$TARGET")"
magick "${WORK}/card@2x.png" -resize 1200x630 -strip "$TARGET"

size="$(magick identify -format '%wx%h' "$TARGET")"
if [ "$size" != '1200x630' ]; then
  echo "expected 1200x630, got ${size}" >&2
  exit 1
fi

# A blank page still screenshots. Colour count catches a card that rendered
# empty because the fonts, the mascot, or the page itself failed to load.
colours="$(magick identify -format '%k' "$TARGET")"
if [ "$colours" -lt 100 ]; then
  echo "the card looks blank (only ${colours} colours); check the browser output" >&2
  exit 1
fi

magick identify -format '    %f  %wx%h  %k colours  %b\n' "$TARGET"
echo "PASS — wrote ${TARGET#"${REPO_ROOT}/"}"
