#!/usr/bin/env bash
#
# Render scripts/og-card.html into the social cards under public/og/.
#
# With no arguments: public/og/default.png, the fallback card a post picks up
# when it declares no ogImage. With --posts: one card per published post,
# public/og/<slug>.png, the same page re-rendered with the post's title.
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
# Usage: ./scripts/render-og-card.sh [--posts]

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
IMAGE="${IMAGE:-zenika/alpine-chrome:latest}"
CONTENT_DIR="${REPO_ROOT}/src/content/blog"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

if ! command -v magick >/dev/null 2>&1; then
  echo 'ImageMagick (magick) is required to downscale the shot.' >&2
  exit 1
fi

# Shoot, downscale, validate. Both modes go through here, so a post card cannot
# be produced by a path the default card was never checked against.
render_card() {
  local target="$1" query="${2:-}"
  local shot="${WORK}/shot@2x.png"
  local name="${target#"${REPO_ROOT}/"}"

  rm -f "$shot"

  echo "==> shooting ${name} at 2400x1260"
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
    --screenshot=/out/shot@2x.png \
    "file:///work/scripts/og-card.html${query}" 2>/dev/null

  if [ ! -s "$shot" ]; then
    echo "the browser produced no screenshot for ${name}" >&2
    exit 1
  fi

  echo '==> downscaling to 1200x630'
  mkdir -p "$(dirname "$target")"
  magick "$shot" -resize 1200x630 -strip "$target"

  local size colours
  size="$(magick identify -format '%wx%h' "$target")"
  if [ "$size" != '1200x630' ]; then
    echo "expected 1200x630, got ${size}" >&2
    exit 1
  fi

  # A blank page still screenshots. Colour count catches a card that rendered
  # empty because the fonts, the mascot, or the page itself failed to load.
  colours="$(magick identify -format '%k' "$target")"
  if [ "$colours" -lt 100 ]; then
    echo "the card looks blank (only ${colours} colours); check the browser output" >&2
    exit 1
  fi

  magick identify -format '    %f  %wx%h  %k colours  %b\n' "$target"
  echo "PASS — wrote ${name}"
}

# Read one key out of a post's frontmatter: the block between the opening ---
# and the next one, so a matching line in the prose cannot win.
frontmatter_value() {
  awk -v key="$2" '
    NR == 1 && $0 == "---" { inside = 1; next }
    inside && $0 == "---" { exit }
    inside && index($0, key ":") == 1 {
      sub(/^[^:]*:[[:space:]]*/, "")
      print
      exit
    }
  ' "$1"
}

# YAML lets a title be bare or quoted; the cards want the text either way. Only
# a matched surrounding pair is a quote, so a title with quotes inside it —
# My "4-bit" quant was 6.2 bits per weight — comes through untouched.
strip_yaml_quotes() {
  local value="$1"
  if [ "${#value}" -ge 2 ]; then
    case "$value" in
      '"'*'"' | "'"*"'") value="${value:1:${#value}-2}" ;;
    esac
  fi
  printf '%s' "$value"
}

render_posts() {
  local file slug title
  for file in "${CONTENT_DIR}"/*.md; do
    slug="$(basename "$file" .md)"

    if [ "$(frontmatter_value "$file" draft)" = 'true' ]; then
      echo "==> skipping ${slug} (draft)"
      continue
    fi

    title="$(strip_yaml_quotes "$(frontmatter_value "$file" title)")"
    if [ -z "$title" ]; then
      echo "${slug}: frontmatter has no title" >&2
      exit 1
    fi

    # python3 rather than a shell escape: the titles carry quotes, colons, and
    # spaces, and a query string is no place to improvise.
    render_card "${REPO_ROOT}/public/og/${slug}.png" \
      "?title=$(python3 -c 'import sys,urllib.parse;print(urllib.parse.quote(sys.argv[1]))' "$title")"
  done
}

case "${1:-}" in
  '')
    render_card "${REPO_ROOT}/public/og/default.png"
    ;;
  --posts)
    render_posts
    ;;
  *)
    echo "usage: ${0} [--posts]" >&2
    exit 2
    ;;
esac
