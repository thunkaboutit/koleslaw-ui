import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { parsePost } from '../frontmatter'

/**
 * Guards the social cards the posts point at.
 *
 * A card that is missing, mis-sized, or borrowed from another post is
 * invisible until someone shares the link and the unfurl comes back wrong, by
 * which time the post is already out. The files are on disk, so check them
 * here. Each assertion collects every offending post rather than stopping at
 * the first, and says what to run.
 */

// Resolved with path, not `new URL`: under jsdom the URL global resolves a
// relative reference against the document, not against this file.
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const BLOG_DIR = join(REPO_ROOT, 'src/content/blog')
const PUBLIC_DIR = join(REPO_ROOT, 'public')

const CARD_PATH = /^\/og\/[a-z0-9-]+\.png$/
const CARD_SIZE = '1200x630'
const MISSING = 'not in public/'
const FIX = 'run ./scripts/render-og-card.sh --posts'

/**
 * A PNG's IHDR carries width and height as big-endian uint32s at bytes 16 and
 * 20. Reading them straight off the header keeps an image library out of the
 * devDependencies for two numbers.
 */
function sizeOf(file: string): string {
  if (!existsSync(file)) return MISSING
  const header = readFileSync(file).subarray(0, 24)
  return `${header.readUInt32BE(16)}x${header.readUInt32BE(20)}`
}

const posts = readdirSync(BLOG_DIR)
  .filter((name) => name.endsWith('.md'))
  .map((name) => {
    const slug = name.replace(/\.md$/, '')
    const { frontmatter } = parsePost(readFileSync(join(BLOG_DIR, name), 'utf8'), name)
    return { slug, frontmatter }
  })

const published = posts.filter(({ frontmatter }) => !frontmatter.draft)

const cards = posts.flatMap(({ slug, frontmatter }) =>
  frontmatter.ogImage === undefined
    ? []
    : [
        {
          slug,
          ogImage: frontmatter.ogImage,
          size: sizeOf(join(PUBLIC_DIR, frontmatter.ogImage)),
        },
      ],
)

/** One actionable line per offender, so an empty array is the whole contract. */
function offenders<T extends { slug: string }>(
  entries: T[],
  broken: (entry: T) => boolean,
  explain: (entry: T) => string,
): string[] {
  return entries.filter(broken).map((entry) => `${entry.slug}: ${explain(entry)} — ${FIX}`)
}

describe('blog social cards', () => {
  it('has posts to check', () => {
    expect(posts.length).toBeGreaterThan(0)
  })

  it('gives every published post a card of its own', () => {
    const problems = offenders(
      published,
      ({ slug, frontmatter }) => frontmatter.ogImage !== `/og/${slug}.png`,
      ({ frontmatter }) => `ogImage is ${frontmatter.ogImage ?? 'unset'}`,
    )

    expect(problems).toEqual([])
  })

  it('names the card after the post it belongs to', () => {
    const problems = offenders(
      cards,
      ({ slug, ogImage }) => basename(ogImage) !== `${slug}.png`,
      ({ ogImage }) => `card is ${basename(ogImage)}`,
    )

    expect(problems).toEqual([])
  })

  it('declares every card as a root-relative /og/<name>.png path', () => {
    const problems = offenders(
      cards,
      ({ ogImage }) => !CARD_PATH.test(ogImage),
      ({ ogImage }) => `"${ogImage}" is not /og/<name>.png`,
    )

    expect(problems).toEqual([])
  })

  it('ships every declared card in public/', () => {
    const problems = offenders(
      cards,
      ({ size }) => size === MISSING,
      ({ ogImage }) => `${ogImage} is ${MISSING}`,
    )

    expect(problems).toEqual([])
  })

  it('renders every card at 1200x630', () => {
    const problems = offenders(
      cards,
      ({ size }) => size !== MISSING && size !== CARD_SIZE,
      ({ ogImage, size }) => `${ogImage} is ${size}, not ${CARD_SIZE}`,
    )

    expect(problems).toEqual([])
  })
})
