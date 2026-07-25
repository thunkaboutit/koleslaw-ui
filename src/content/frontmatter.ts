/**
 * Minimal YAML-subset frontmatter parser.
 *
 * Deliberately not gray-matter: that pulls js-yaml into the client bundle to
 * read half a dozen flat key/value pairs. This supports exactly what posts
 * need — strings, numbers, booleans, and inline `[a, b]` lists — and throws on
 * anything malformed so a bad post fails the build instead of shipping.
 *
 * Shared by the app (via posts.ts) and the build-time static generator (via
 * plugins/blog-static.ts) so both read post metadata through one code path.
 */

export interface PostFrontmatter {
  title: string
  description: string
  /** ISO date, YYYY-MM-DD. */
  date: string
  /** Series name, when the post is part of one. */
  series?: string
  /** 1-based position within `series`. */
  part?: number
  tags: string[]
  draft: boolean
  /** Site-root-relative path to a social card image. */
  ogImage?: string
}

export interface ParsedPost {
  frontmatter: PostFrontmatter
  body: string
}

const FRONTMATTER_BLOCK = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

type Scalar = string | number | boolean | string[]

function unquote(value: string): string {
  const quoted =
    (value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))
  return quoted && value.length >= 2 ? value.slice(1, -1) : value
}

function parseScalar(raw: string): Scalar {
  const value = raw.trim()

  if (value.startsWith('[') && value.endsWith(']')) {
    const inner = value.slice(1, -1).trim()
    if (!inner) return []
    return inner
      .split(',')
      .map((item) => unquote(item.trim()))
      .filter((item) => item.length > 0)
  }

  if (value === 'true') return true
  if (value === 'false') return false

  // Bare dates must stay strings; Number('2026-08-01') is NaN so they do.
  if (value !== '' && !Number.isNaN(Number(value))) return Number(value)

  return unquote(value)
}

function requireString(fields: Record<string, Scalar>, key: string, where: string): string {
  const value = fields[key]
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${where}: frontmatter is missing a non-empty "${key}"`)
  }
  return value
}

/**
 * Split a raw markdown file into validated frontmatter and body.
 *
 * @param raw   Full file contents, frontmatter block first.
 * @param where Identifier used in error messages (usually the file path).
 */
export function parsePost(raw: string, where = 'post'): ParsedPost {
  const match = FRONTMATTER_BLOCK.exec(raw)
  const block = match?.[1]

  if (match === null || block === undefined) {
    throw new Error(`${where}: no frontmatter block found (file must open with ---)`)
  }

  const fields: Record<string, Scalar> = {}
  for (const line of block.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (trimmed === '' || trimmed.startsWith('#')) continue

    const separator = trimmed.indexOf(':')
    if (separator === -1) {
      throw new Error(`${where}: frontmatter line is not "key: value" — ${trimmed}`)
    }

    fields[trimmed.slice(0, separator).trim()] = parseScalar(trimmed.slice(separator + 1))
  }

  const date = requireString(fields, 'date', where)
  if (!ISO_DATE.test(date)) {
    throw new Error(`${where}: date must be YYYY-MM-DD, got "${date}"`)
  }

  const series = fields['series']
  const part = fields['part']
  if (series !== undefined && typeof part !== 'number') {
    throw new Error(`${where}: a post with a "series" also needs a numeric "part"`)
  }

  const tags = fields['tags']
  const ogImage = fields['ogImage']

  return {
    frontmatter: {
      title: requireString(fields, 'title', where),
      description: requireString(fields, 'description', where),
      date,
      ...(typeof series === 'string' ? { series } : {}),
      ...(typeof part === 'number' ? { part } : {}),
      tags: Array.isArray(tags) ? tags : [],
      draft: fields['draft'] === true,
      ...(typeof ogImage === 'string' ? { ogImage } : {}),
    },
    body: raw.slice(match[0].length),
  }
}
