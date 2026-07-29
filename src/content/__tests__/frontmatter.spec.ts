import { describe, expect, it } from 'vitest'
import { parsePost } from '../frontmatter'

function withFrontmatter(lines: string[], body = 'Body text.\n'): string {
  return `---\n${lines.join('\n')}\n---\n${body}`
}

const MINIMAL = ['title: A title', 'description: A description', 'date: 2026-08-01']

describe('parsePost', () => {
  it('reads the required fields and returns the body', () => {
    const { frontmatter, body } = parsePost(withFrontmatter(MINIMAL))

    expect(frontmatter.title).toBe('A title')
    expect(frontmatter.description).toBe('A description')
    expect(frontmatter.date).toBe('2026-08-01')
    expect(body).toBe('Body text.\n')
  })

  it('defaults tags to empty and draft to false', () => {
    const { frontmatter } = parsePost(withFrontmatter(MINIMAL))

    expect(frontmatter.tags).toEqual([])
    expect(frontmatter.draft).toBe(false)
  })

  it('parses inline lists, booleans, and numbers', () => {
    const { frontmatter } = parsePost(
      withFrontmatter([
        ...MINIMAL,
        'tags: [gguf, llama.cpp, gpu]',
        'draft: true',
        'series: A series',
        'part: 2',
      ]),
    )

    expect(frontmatter.tags).toEqual(['gguf', 'llama.cpp', 'gpu'])
    expect(frontmatter.draft).toBe(true)
    expect(frontmatter.series).toBe('A series')
    expect(frontmatter.part).toBe(2)
  })

  it('keeps colons inside values', () => {
    const { frontmatter } = parsePost(
      withFrontmatter(['title: Quantization: a problem', ...MINIMAL.slice(1)]),
    )

    expect(frontmatter.title).toBe('Quantization: a problem')
  })

  it('strips matching surrounding quotes', () => {
    const { frontmatter } = parsePost(
      withFrontmatter(['title: "A quoted title"', ...MINIMAL.slice(1)]),
    )

    expect(frontmatter.title).toBe('A quoted title')
  })

  it('treats an empty list as no tags', () => {
    const { frontmatter } = parsePost(withFrontmatter([...MINIMAL, 'tags: []']))

    expect(frontmatter.tags).toEqual([])
  })

  it('rejects a file with no frontmatter block', () => {
    expect(() => parsePost('# Just a heading\n')).toThrow(/no frontmatter block/)
  })

  it('rejects a missing title', () => {
    expect(() => parsePost(withFrontmatter(MINIMAL.slice(1)))).toThrow(/"title"/)
  })

  it('rejects an empty description', () => {
    expect(() =>
      parsePost(withFrontmatter(['title: A title', 'description:   ', 'date: 2026-08-01'])),
    ).toThrow(/"description"/)
  })

  it('rejects a non-ISO date', () => {
    expect(() =>
      parsePost(
        withFrontmatter(['title: A title', 'description: A description', 'date: Aug 2026']),
      ),
    ).toThrow(/YYYY-MM-DD/)
  })

  it('rejects a series with no part number', () => {
    expect(() => parsePost(withFrontmatter([...MINIMAL, 'series: A series']))).toThrow(/"part"/)
  })

  it('names the offending file in errors', () => {
    expect(() => parsePost('no frontmatter', 'src/content/blog/broken.md')).toThrow(
      /src\/content\/blog\/broken\.md/,
    )
  })
})
