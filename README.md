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

## Key Components

| Component | Description |
|-----------|-------------|
| `EnhancePanel.vue` | Reusable prompt input with file attachments, voice input, markdown preview, and streaming response display |
| `useMarkdown.ts` | Composable wrapping markdown-it with highlight.js for syntax-highlighted code blocks |
| `api/chat.ts` | SSE streaming client for `/v1/chat` (JSON) and `/v1/chat/upload` (multipart with files) |
| `stores/chat.ts` | Pinia store managing messages, streaming state, and localStorage persistence |

## File Upload Flow

The `+` button in EnhancePanel opens a file picker (images, `.txt`, `.pdf`). Selected files appear as preview chips below the textarea. On submit, if files are attached, the frontend sends a `multipart/form-data` request to `/v1/chat/upload` with messages as a JSON form field and files as binary parts. The backend validates types/sizes, converts files to LLM content blocks, and streams the response back via SSE.
