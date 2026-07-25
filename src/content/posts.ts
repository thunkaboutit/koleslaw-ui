import { parsePost, type PostFrontmatter } from './frontmatter'

export interface BlogPost extends PostFrontmatter {
  /** URL segment, taken from the filename: blog/foo.md -> /blog/foo */
  slug: string
  /** Raw markdown, frontmatter stripped. */
  body: string
}

export interface SeriesNav {
  name: string
  parts: BlogPost[]
  /** 1-based position of the current post within the series. */
  position: number
  previous: BlogPost | undefined
  next: BlogPost | undefined
}

const files = import.meta.glob('./blog/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

function slugFromPath(path: string): string {
  return path.replace(/^\.\/blog\//, '').replace(/\.md$/, '')
}

/** Parse a map of path -> raw markdown into posts, newest first. */
export function buildPosts(source: Record<string, string>): BlogPost[] {
  return Object.entries(source)
    .map(([path, raw]) => {
      const { frontmatter, body } = parsePost(raw, path)
      return { ...frontmatter, slug: slugFromPath(path), body }
    })
    .sort((a, b) => b.date.localeCompare(a.date))
}

/**
 * Ordering + neighbours for a post within a given collection.
 *
 * Kept separate from `seriesNav` so the ordering rules are testable without
 * depending on whatever happens to be in src/content/blog.
 */
export function seriesNavIn(posts: BlogPost[], post: BlogPost): SeriesNav | null {
  const name = post.series
  if (name === undefined) return null

  const parts = posts
    .filter((candidate) => candidate.series === name)
    .sort((a, b) => (a.part ?? 0) - (b.part ?? 0))

  const index = parts.findIndex((candidate) => candidate.slug === post.slug)
  if (index === -1) return null

  return {
    name,
    parts,
    position: index + 1,
    previous: parts[index - 1],
    next: parts[index + 1],
  }
}

/**
 * Drafts render on `pnpm dev` so posts can be reviewed in place, and are
 * dropped from production builds. They are still present in the shipped JS
 * bundle, so treat "draft" as unlisted, not secret.
 */
export const allPosts: BlogPost[] = buildPosts(files).filter(
  (post) => !post.draft || import.meta.env.DEV,
)

export function findPost(slug: string): BlogPost | undefined {
  return allPosts.find((post) => post.slug === slug)
}

export function seriesNav(post: BlogPost): SeriesNav | null {
  return seriesNavIn(allPosts, post)
}

/** "1 August 2026" — pinned to UTC so the date never drifts by timezone. */
export function formatPostDate(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
}
