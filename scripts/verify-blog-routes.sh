#!/usr/bin/env bash
#
# Verify that a real production container serves the blog's build-time pages.
#
# The whole social-unfurl design rests on one nginx line: try_files puts
# $uri.html ahead of $uri/, so /blog/<slug> serves the generated
# dist/blog/<slug>.html with its own title and Open Graph tags instead of the
# generic SPA shell. Build output on disk proves the files exist; only a running
# container proves they are reachable at the canonical URL.
#
# Builds the image, boots it, asserts, and cleans up after itself. A temporary
# fixture post is written into src/content/blog so the check does not depend on
# whatever real content happens to be published, and is removed on exit.
#
# Usage:  ./scripts/verify-blog-routes.sh
# Env:    PORT (default 8088), IMAGE, CONTAINER, NGINX_TEMPLATE (override the
#         config baked into the image, used to prove the assertions can fail)

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PORT="${PORT:-8088}"
IMAGE="${IMAGE:-koleslaw-ui-verify:local}"
CONTAINER="${CONTAINER:-koleslaw-ui-verify}"
BASE="http://127.0.0.1:${PORT}"

SLUG='nginx-route-check'
DRAFT_SLUG='nginx-route-check-draft'
TITLE='Route check fixture'
SHELL_TITLE='Koleslaw — AI Prompt Enhancement'

FIXTURE="${REPO_ROOT}/src/content/blog/${SLUG}.md"
DRAFT_FIXTURE="${REPO_ROOT}/src/content/blog/${DRAFT_SLUG}.md"
WORK="$(mktemp -d)"
BODY="${WORK}/body"

failures=0
status=''
redirect=''

cleanup() {
  rm -f "$FIXTURE" "$DRAFT_FIXTURE"
  rm -rf "$WORK"
  docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
}
trap cleanup EXIT

ok() { printf '    ok    %s\n' "$1"; }
bad() {
  printf '    FAIL  %s\n' "$1"
  failures=$((failures + 1))
}

fetch() {
  local meta
  meta="$(curl -sS -o "$BODY" -w '%{http_code} %{redirect_url}' "${BASE}${1}")"
  status="${meta%% *}"
  redirect="${meta#* }"
}

expect_status() {
  if [ "$status" = "$1" ]; then ok "status $1"; else bad "status is $status, want $1"; fi
}

expect_no_redirect() {
  if [ -z "$redirect" ]; then ok 'no redirect'; else bad "redirected to $redirect"; fi
}

expect_contains() {
  if grep -qF -- "$1" "$BODY"; then ok "contains: $1"; else bad "missing: $1"; fi
}

expect_missing() {
  if grep -qF -- "$1" "$BODY"; then bad "should not contain: $1"; else ok "absent: $1"; fi
}

# --- fixtures -----------------------------------------------------------------

for path in "$FIXTURE" "$DRAFT_FIXTURE"; do
  if [ -e "$path" ]; then
    echo "refusing to overwrite existing file: $path" >&2
    exit 2
  fi
done

cat >"$FIXTURE" <<EOF
---
title: ${TITLE}
description: Temporary fixture used by scripts/verify-blog-routes.sh.
date: 2026-01-02
tags: [fixture]
draft: false
---

Fixture body.
EOF

cat >"$DRAFT_FIXTURE" <<EOF
---
title: Route check draft fixture
description: Draft fixture; must not get a generated page.
date: 2026-01-03
tags: [fixture]
draft: true
---

Draft fixture body.
EOF

# --- build and boot -----------------------------------------------------------

echo "==> building image ${IMAGE}"
docker build -q -t "$IMAGE" "$REPO_ROOT" >/dev/null

echo "==> starting container on port ${PORT}"
docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
if [ -n "${NGINX_TEMPLATE:-}" ]; then
  echo "    (overriding nginx config with ${NGINX_TEMPLATE})"
  docker run -d --name "$CONTAINER" -p "${PORT}:80" \
    -v "${NGINX_TEMPLATE}:/etc/nginx/templates/default.conf.template:ro" \
    "$IMAGE" >/dev/null
else
  docker run -d --name "$CONTAINER" -p "${PORT}:80" "$IMAGE" >/dev/null
fi

# Retry on any failure, not just refusals: the docker proxy accepts and then
# resets connections while nginx is still booting, which --retry-connrefused
# would treat as fatal.
reachable=''
for _ in $(seq 1 30); do
  if curl -sS -o /dev/null "${BASE}/" 2>/dev/null; then reachable=1; break; fi
  sleep 1
done
[ -n "$reachable" ] \
  || { echo 'container never became reachable' >&2; docker logs "$CONTAINER" >&2; exit 1; }

# --- scenario: a shared post URL returns its own metadata ---------------------

echo "==> a shared post URL returns its own metadata"
fetch "/blog/${SLUG}"
expect_status 200
expect_no_redirect
expect_contains "<title>${TITLE} — The Koleslaw Blog</title>"
expect_contains "<link rel=\"canonical\" href=\"https://koleslaw.ai/blog/${SLUG}\">"
expect_contains "<meta property=\"og:url\" content=\"https://koleslaw.ai/blog/${SLUG}\">"
expect_contains '<meta property="og:type" content="article">'
expect_contains '<meta property="article:published_time" content="2026-01-02">'
expect_contains '<meta property="og:image" content="https://koleslaw.ai/og/default.png">'
expect_contains '<meta name="twitter:card" content="summary_large_image">'
expect_missing "<title>${SHELL_TITLE}</title>"

echo "==> the card art the tags point at is really there"
fetch '/og/default.png'
expect_status 200
if [ -s "$BODY" ] && [ "$(head -c 4 "$BODY" | tail -c 3)" = 'PNG' ]; then
  ok 'serves a PNG'
else
  bad 'og/default.png is missing or is not a PNG'
fi

# --- scenario: the blog index has its own metadata too ------------------------

echo "==> the blog index has its own metadata"
fetch '/blog'
expect_status 200
expect_no_redirect
expect_contains '<title>The Koleslaw Blog — koleslaw.ai</title>'
expect_contains '<link rel="canonical" href="https://koleslaw.ai/blog">'

# --- scenario: unknown blog URLs still reach the SPA --------------------------

echo "==> unknown blog URLs still reach the SPA"
fetch '/blog/does-not-exist'
expect_status 200
expect_contains "<title>${SHELL_TITLE}</title>"
expect_missing 'rel="canonical"'

echo "==> drafts get no generated page"
fetch "/blog/${DRAFT_SLUG}"
expect_status 200
expect_contains "<title>${SHELL_TITLE}</title>"
expect_missing 'rel="canonical"'

# --- scenario: existing routes are unaffected ---------------------------------

echo "==> existing routes are unaffected"
for path in '/' '/pricing' '/privacy' '/contact' '/terms' '/login'; do
  fetch "$path"
  if [ "$status" = '200' ] && grep -qF "<title>${SHELL_TITLE}</title>" "$BODY"; then
    ok "${path} serves the SPA shell"
  else
    bad "${path} returned ${status} and did not serve the SPA shell"
  fi
done

echo "==> hashed assets are still served as real files"
fetch '/'
asset="$(grep -oE '/assets/[A-Za-z0-9_.-]+\.js' "$BODY" | head -1)"
if [ -z "$asset" ]; then
  bad 'no hashed asset reference found in the shell'
else
  fetch "$asset"
  expect_status 200
  expect_missing "<title>${SHELL_TITLE}</title>"
fi

# --- scenario: feeds are served -----------------------------------------------

echo "==> rss.xml and sitemap.xml are served"
fetch '/rss.xml'
expect_status 200
expect_contains "<link>https://koleslaw.ai/blog/${SLUG}</link>"
expect_missing "$DRAFT_SLUG"

fetch '/sitemap.xml'
expect_status 200
expect_contains "<loc>https://koleslaw.ai/blog/${SLUG}</loc>"
expect_contains '<loc>https://koleslaw.ai/blog</loc>'
expect_missing '<loc>https://koleslaw.ai/keys</loc>'

echo "==> robots.txt is served and names the sitemap"
fetch '/robots.txt'
expect_status 200
expect_contains 'Sitemap: https://koleslaw.ai/sitemap.xml'
expect_contains 'Disallow: /keys'
expect_missing 'Disallow: /blog'

# --- result -------------------------------------------------------------------

echo
if [ "$failures" -eq 0 ]; then
  echo "PASS — all blog route assertions held"
else
  echo "FAIL — ${failures} assertion(s) failed"
fi
echo "(image ${IMAGE} was left in place; remove it with: docker image rm ${IMAGE})"

exit $((failures == 0 ? 0 : 1))
