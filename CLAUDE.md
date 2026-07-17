# koleslaw-developer-portal

Vue 3 SPA developer portal for the koleslaw-api backend. Provides auth, API key management, usage dashboard, and a chat/enhance playground.

## Tech Stack

- **Framework:** Vue 3 (Composition API, `<script setup>`)
- **Language:** TypeScript 5.9
- **Build:** Vite 7, pnpm
- **State:** Pinia 3
- **Routing:** Vue Router 4
- **Forms:** VeeValidate + Yup
- **Styling:** CSS (no framework)
- **Testing:** Vitest + jsdom + @vue/test-utils
- **Linting:** OxLint + ESLint (vue + typescript plugins)
- **Formatting:** Prettier (no semi, single quotes, 100 print width)
- **Git hooks:** Husky

## Project Layout

```
src/
  main.ts               # App entrypoint
  App.vue               # Root component
  api/                  # HTTP client and typed API calls
    client.ts           # Fetch wrapper
    chat.ts             # Chat/enhance API
    types.ts            # Shared API types
  components/           # Reusable UI components
  composables/          # Vue composables (useMarkdown, etc.)
  pages/                # Route-level page components
  router/index.ts       # Vue Router config
  stores/               # Pinia stores (auth, chat, keys, usage)
  assets/               # Static assets
```

## Common Commands

```bash
pnpm dev              # Start dev server (Vite, port 5173)
pnpm build            # Type-check + production build
pnpm build-only       # Vite build without type-check
pnpm test:unit        # Run Vitest
pnpm lint             # OxLint + ESLint (with --fix)
pnpm format           # Prettier (src/)
pnpm type-check       # vue-tsc --build
pnpm preview          # Preview production build
```

## Dev Proxy

Vite proxies `/auth` and `/v1` to `http://localhost:8000` (the koleslaw-api backend).

## Docker

Multi-stage build: Node 22 for build, Nginx for serving. The `API_UPSTREAM` env var configures the backend proxy (defaults to `http://host.docker.internal:8000`).

## Path Alias

`@` maps to `./src` (configured in vite.config.ts and tsconfig).

## Code Navigation

IMPORTANT: When applicable, prefer using intellij-index MCP tools for code navigation and refactoring.
