#!/usr/bin/env bash
#
# Verify the routing contract a real production container serves.
#
# Three promises have to hold at once, and only a running container can show it:
#
#   * a shared post URL serves its own build-time page, because try_files puts
#     $uri.html ahead of the SPA shell — the whole social-unfurl design rests on
#     that one line;
#   * a URL the app does not serve answers 404, not 200 plus the shell. A soft
#     404 makes the site an infinite set of duplicate pages to a crawler;
#   * a trailing slash redirects to the canonical URL, relatively. nginx listens
#     on plain :80 behind Cloudflare and the ALB, so an absolute Location would
#     hand the client http:// and the wrong host and port.
#
# Build output on disk proves the files exist; only a running container proves
# they are reachable at the canonical URL, and that everything else is not.
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
HEADERS="${WORK}/headers"

failures=0
status=''
location=''

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
  status="$(curl -sS -o "$BODY" -D "$HEADERS" -w '%{http_code}' "${BASE}${1}")"
  # The raw header, not curl's %{redirect_url}: curl resolves a relative
  # Location against the request URL and hands back an absolute one, which would
  # hide the very thing the redirect has to get right behind a TLS-terminating
  # proxy on another port.
  location="$(sed -n 's/^[Ll]ocation: //p' "$HEADERS" | tr -d '\r')"
}

expect_status() {
  if [ "$status" = "$1" ]; then ok "status $1"; else bad "status is $status, want $1"; fi
}

expect_no_redirect() {
  if [ -z "$location" ]; then ok 'no redirect'; else bad "redirected to $location"; fi
}

expect_redirect() {
  if [ "$location" = "$1" ]; then ok "Location: $1"; else bad "Location is '${location}', want '$1'"; fi

  # Spelled out separately from the equality above because this is the part a
  # future edit is most likely to break: absolute_redirect off, always.
  case "$location" in
    '') ;; # nothing to judge, and the equality above has already failed
    *http*) bad "Location leaks a scheme: $location" ;;
    *:*) bad "Location leaks a host or port: $location" ;;
    *) ok 'Location stays relative' ;;
  esac
}

expect_contains() {
  if grep -qF -- "$1" "$BODY"; then ok "contains: $1"; else bad "missing: $1"; fi
}

# index.html is what app routes and every 404 are served. If a page's content is
# ever baked into it, a login screen and a not-found page both open on that text.
expect_neutral_shell() {
  expect_missing 'class="prerendered"'
  expect_missing 'rel="canonical"'
}

# A public page: its own head, its structured data, and its text in the body,
# all in the HTML as served, which is all a crawler that runs no scripts gets.
serves_baked() {
  fetch "$1"
  expect_status 200
  expect_no_redirect
  expect_contains "<title>$2</title>"
  expect_contains "<link rel=\"canonical\" href=\"https://koleslaw.ai$1\">"
  expect_contains '<script type="application/ld+json">'
  expect_contains '<main class="prerendered"'
  expect_contains "<h1>$3</h1>"
}

expect_missing() {
  if grep -qF -- "$1" "$BODY"; then bad "should not contain: $1"; else ok "absent: $1"; fi
}

serves_shell() {
  fetch "$1"
  if [ "$status" = '200' ] && grep -qF "<title>${SHELL_TITLE}</title>" "$BODY"; then
    ok "${1} serves the SPA shell"
  else
    bad "${1} returned ${status} and did not serve the SPA shell"
  fi
  expect_neutral_shell
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

echo "==> and the article itself, in the served HTML"
expect_contains '"@type":"BlogPosting"'
expect_contains '<main class="prerendered"'
expect_contains "<h1>${TITLE}</h1>"
expect_contains 'Fixture body.'

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
expect_contains '"@type":"Blog"'
expect_contains "<a href=\"/blog/${SLUG}\">${TITLE}</a>"
expect_missing "$DRAFT_SLUG"

# --- scenario: URLs the app does not serve are real 404s ----------------------
#
# The body is still the shell, so the SPA boots and renders its own not-found
# page; the status is what tells a crawler the page is not there.

echo "==> an unknown URL is a real 404"
fetch '/definitely-not-a-page'
expect_status 404
expect_contains "<title>${SHELL_TITLE}</title>"
expect_neutral_shell

echo "==> unknown blog URLs are real 404s"
fetch '/blog/does-not-exist'
expect_status 404
expect_contains "<title>${SHELL_TITLE}</title>"
expect_missing 'rel="canonical"'

echo "==> drafts get no generated page"
fetch "/blog/${DRAFT_SLUG}"
expect_status 404
expect_contains "<title>${SHELL_TITLE}</title>"
expect_missing 'rel="canonical"'

# A stale hashed asset and a missing image are the cases where answering 200
# with HTML is worst: the browser gets a script or a picture that parses as a
# web page.
echo "==> a missing file is a 404, not HTML with a 200"
fetch '/assets/nope-12345.js'
expect_status 404
fetch '/og/nope-12345.png'
expect_status 404

# A directory has to miss outright. If try_files ever matched one, nginx would
# redirect it to the trailing-slash form, which the rewrite above sends straight
# back: a redirect loop for any crawler that finds the URL.
echo "==> a directory with no index page is a 404, not a redirect"
fetch '/og'
expect_status 404
expect_no_redirect

# --- scenario: a trailing slash redirects to the canonical URL ----------------

echo "==> a trailing slash redirects, relatively"
fetch '/blog/'
expect_status 301
expect_redirect '/blog'

fetch '/pricing/'
expect_status 301
expect_redirect '/pricing'

fetch "/blog/${SLUG}/"
expect_status 301
expect_redirect "/blog/${SLUG}"

# The rewrite lives inside `location /` alone, so a URL claimed by a prefix
# location keeps its slash. That is load-bearing for the proxied ones: the API's
# MCP endpoint is /v1/mcp/ and answers nothing without the slash. /assets/
# stands in for them, since this container has no API behind it to talk to.
echo "==> a prefix location keeps its trailing slash"
fetch '/assets/'
expect_no_redirect

# --- scenario: public pages are prerendered, app routes are not ---------------

# Every public page is served with its own head and its own text. The titles and
# headings are the page registry's (src/config/pages.ts), spelled out here on
# purpose: this is the one check that reads what nginx really sends.
echo "==> public pages are served prerendered"
serves_baked '/' "$SHELL_TITLE" 'Stop Re-prompting.<br>Start Kolewoofing.'
expect_contains '"@type":"SoftwareApplication"'
serves_baked '/pricing' 'Pricing — Koleslaw' 'Pricing'
serves_baked '/contact' 'Contact — Koleslaw' 'Contact Us'
serves_baked '/terms' 'Terms of Service — Koleslaw' 'Terms of Service'
serves_baked '/privacy' 'Privacy Policy — Koleslaw' 'Privacy Policy'

# App routes never get a baked page — there is nothing public to prerender — so
# the shell is the permanent answer, and a bookmarked one must still boot.
echo "==> app routes still boot the SPA"
for route in '/login' '/signup' '/chat' '/dashboard' '/keys' '/profile'; do
  serves_shell "$route"
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
  echo "PASS — all route assertions held"
else
  echo "FAIL — ${failures} assertion(s) failed"
fi
echo "(image ${IMAGE} was left in place; remove it with: docker image rm ${IMAGE})"

exit $((failures == 0 ? 0 : 1))
