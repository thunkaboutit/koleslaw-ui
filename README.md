# koleslaw-developer-portal

Vue 3 frontend for [koleslaw.ai](https://koleslaw.ai) — an AI-powered prompt enhancement tool. Users paste a rough prompt, optionally attach files (images, text, PDFs), and get back an improved version via streaming SSE.

## Features

- **Prompt enhancement** with real-time streaming response
- **Markdown rendering** (markdown-it + highlight.js) for AI responses and input preview
- **File attachments** — images show thumbnail previews; text/PDF files show as chips with filename and size (up to 5 files, 10 MB each)
- **Voice input** via Web Speech API
- **Copy to clipboard** (raw markdown, not rendered HTML)
- **Free-tier usage tracking** (10 prompts per session via localStorage)
- **GitHub OAuth** login with protected dashboard and API key management pages

## Setup

```sh
pnpm install
pnpm dev          # Dev server with hot reload
pnpm build        # Production build
pnpm lint         # ESLint + oxlint
pnpm type-check   # vue-tsc
```

A Husky pre-commit hook runs `lint`, `type-check`, and `build-only` before each commit.

## Blog

Posts are markdown files in `src/content/blog/`. The filename is the slug, so
`src/content/blog/my-post.md` serves at `/blog/my-post`. Frontmatter is parsed by
`src/content/frontmatter.ts`, which throws on malformed input so a bad post fails
the build instead of shipping. `draft: true` keeps a post off the index and out of
production builds, but it still ships inside the JS bundle: draft means unlisted,
not secret.

Because the portal is a client-rendered SPA and link unfurlers do not run
JavaScript, `plugins/blog-static.ts` runs inside `vite build` and writes
`dist/blog/<slug>.html` per post with its own title, canonical link, and Open
Graph tags, plus `rss.xml`, `sitemap.xml`, and `robots.txt` (emitted from the
same place as the sitemap so its URL has one source of truth). nginx serves
those files directly
via the `$uri.html` clause in `nginx.conf.template`, which also keeps canonical
URLs free of trailing slashes.

The social card is `public/og/default.png`, rendered from `scripts/og-card.html`
so it reuses the site's own palette, fonts, grain, and mascot rather than a
hand-copied approximation:

```sh
./scripts/render-og-card.sh     # edit the HTML, re-run, commit both files
```

Posts can override it per post with an `ogImage:` frontmatter field. Any card is
only referenced if the file is actually present in the build output, so the tags
never point at a 404.

That routing is load-bearing and easy to break, so it has its own check against a
real container:

```sh
./scripts/verify-blog-routes.sh
```

It builds the image, boots it, and asserts that a post URL returns its own
metadata with no redirect, that unknown and draft slugs fall through to the SPA,
that the existing routes and hashed assets are unaffected, and that the feeds
serve. It writes a temporary fixture post and removes it on exit. To watch the
assertions fail for the right reason, point it at a config without the
`$uri.html` clause:

```sh
NGINX_TEMPLATE=/path/to/legacy.conf.template ./scripts/verify-blog-routes.sh
```

## Key Components

| Component | Description |
|-----------|-------------|
| `EnhancePanel.vue` | Reusable prompt input with file attachments, voice input, markdown preview, and streaming response display |
| `useMarkdown.ts` | Composable wrapping markdown-it with highlight.js for syntax-highlighted code blocks |
| `api/chat.ts` | SSE streaming client for `/v1/chat` (JSON) and `/v1/chat/upload` (multipart with files) |
| `stores/chat.ts` | Pinia store managing messages, streaming state, and localStorage persistence |

## File Upload Flow

The `+` button in EnhancePanel opens a file picker (images, `.txt`, `.pdf`). Selected files appear as preview chips below the textarea. On submit, if files are attached, the frontend sends a `multipart/form-data` request to `/v1/chat/upload` with messages as a JSON form field and files as binary parts. The backend validates types/sizes, converts files to LLM content blocks, and streams the response back via SSE.
