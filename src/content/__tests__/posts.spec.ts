import { describe, expect, it } from 'vitest'
import { allPosts, buildPosts, chronologicalNavIn, seriesNavIn } from '../posts'

function post(slug: string, date: string, extra: string[] = []): [string, string] {
  return [
    `./blog/${slug}.md`,
    `---\ntitle: ${slug}\ndescription: About ${slug}\ndate: ${date}\n${extra.join('\n')}${
      extra.length ? '\n' : ''
    }---\nBody of ${slug}.\n`,
  ]
}

const SERIES = ['series: Cutting the bill']

describe('buildPosts', () => {
  it('derives the slug from the filename', () => {
    const posts = buildPosts(Object.fromEntries([post('the-quant-that-didnt-fit', '2026-08-01')]))

    expect(posts[0]?.slug).toBe('the-quant-that-didnt-fit')
  })

  it('orders newest first', () => {
    const posts = buildPosts(
      Object.fromEntries([
        post('middle', '2026-08-08'),
        post('oldest', '2026-08-01'),
        post('newest', '2026-08-15'),
      ]),
    )

    expect(posts.map((entry) => entry.slug)).toEqual(['newest', 'middle', 'oldest'])
  })

  it('strips the frontmatter from the body', () => {
    const posts = buildPosts(Object.fromEntries([post('one', '2026-08-01')]))

    expect(posts[0]?.body).toBe('Body of one.\n')
  })
})

describe('seriesNavIn', () => {
  const posts = buildPosts(
    Object.fromEntries([
      post('part-one', '2026-08-01', [...SERIES, 'part: 1']),
      post('part-two', '2026-08-08', [...SERIES, 'part: 2']),
      post('part-three', '2026-08-15', [...SERIES, 'part: 3']),
      post('unrelated', '2026-08-20'),
    ]),
  )

  function find(slug: string) {
    const match = posts.find((entry) => entry.slug === slug)
    if (!match) throw new Error(`fixture missing: ${slug}`)
    return match
  }

  it('orders by part number, not by date', () => {
    const nav = seriesNavIn(posts, find('part-one'))

    expect(nav?.parts.map((entry) => entry.slug)).toEqual(['part-one', 'part-two', 'part-three'])
  })

  it('reports position within the series', () => {
    expect(seriesNavIn(posts, find('part-two'))?.position).toBe(2)
    expect(seriesNavIn(posts, find('part-two'))?.parts).toHaveLength(3)
  })

  it('links neighbours', () => {
    const nav = seriesNavIn(posts, find('part-two'))

    expect(nav?.previous?.slug).toBe('part-one')
    expect(nav?.next?.slug).toBe('part-three')
  })

  it('leaves the ends open', () => {
    expect(seriesNavIn(posts, find('part-one'))?.previous).toBeUndefined()
    expect(seriesNavIn(posts, find('part-three'))?.next).toBeUndefined()
  })

  it('returns null for a post in no series', () => {
    expect(seriesNavIn(posts, find('unrelated'))).toBeNull()
  })

  it('ignores posts from other series', () => {
    const mixed = buildPosts(
      Object.fromEntries([
        post('a1', '2026-08-01', ['series: A', 'part: 1']),
        post('b1', '2026-08-02', ['series: B', 'part: 1']),
      ]),
    )
    const a1 = mixed.find((entry) => entry.slug === 'a1')

    expect(a1 && seriesNavIn(mixed, a1)?.parts).toHaveLength(1)
  })
})

describe('chronologicalNavIn', () => {
  const posts = buildPosts(
    Object.fromEntries([
      post('oldest', '2026-08-01'),
      post('middle', '2026-08-08'),
      post('newest', '2026-08-15'),
    ]),
  )

  function find(slug: string, collection = posts) {
    const match = collection.find((entry) => entry.slug === slug)
    if (!match) throw new Error(`fixture missing: ${slug}`)
    return match
  }

  it('offers the older post as previous and the newer as next', () => {
    const nav = chronologicalNavIn(posts, find('middle'))

    expect(nav?.previous?.slug).toBe('oldest')
    expect(nav?.next?.slug).toBe('newest')
  })

  it('leaves the newest post without a next', () => {
    const nav = chronologicalNavIn(posts, find('newest'))

    expect(nav?.next).toBeUndefined()
    expect(nav?.previous?.slug).toBe('middle')
  })

  it('leaves the oldest post without a previous', () => {
    const nav = chronologicalNavIn(posts, find('oldest'))

    expect(nav?.previous).toBeUndefined()
    expect(nav?.next?.slug).toBe('middle')
  })

  it('steps over drafts', () => {
    const withDraft = buildPosts(
      Object.fromEntries([
        post('published-older', '2026-08-01'),
        post('unfinished', '2026-08-08', ['draft: true']),
        post('published-newer', '2026-08-15'),
      ]),
    )
    const nav = chronologicalNavIn(withDraft, find('published-newer', withDraft))

    expect(nav?.previous?.slug).toBe('published-older')
  })

  it('returns null for a draft, which has no place in the chronology yet', () => {
    const withDraft = buildPosts(
      Object.fromEntries([
        post('published', '2026-08-01'),
        post('unfinished', '2026-08-08', ['draft: true']),
      ]),
    )

    expect(chronologicalNavIn(withDraft, find('unfinished', withDraft))).toBeNull()
  })

  it('returns null when there is nowhere to go', () => {
    const only = buildPosts(Object.fromEntries([post('lonely', '2026-08-01')]))

    expect(chronologicalNavIn(only, find('lonely', only))).toBeNull()
  })
})

describe('content directory', () => {
  // Importing posts.ts parses every real file, so a malformed post fails here
  // rather than at build time.
  it('parses every post in src/content/blog', () => {
    expect(Array.isArray(allPosts)).toBe(true)
  })
})
