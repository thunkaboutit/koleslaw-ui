import { describe, it, expect } from 'vitest'
import {
  blogNode,
  blogPostingNode,
  breadcrumbNode,
  organizationNode,
  renderJsonLd,
  softwareApplicationNode,
  websiteNode,
  BLOG_ID,
  ORGANIZATION_ID,
  WEBSITE_ID,
  type JsonLdNode,
} from '../json-ld'
import type { BlogPost } from '../blog-render'
import { PRICING_PLANS, featureText } from '../../src/content/pricing'

function post(overrides: Partial<BlogPost> = {}): BlogPost {
  return {
    slug: 'quantization',
    title: 'A post about quantization',
    description: 'What happens when a hidden dimension is not divisible by 256.',
    date: '2026-08-01',
    tags: [],
    draft: false,
    ...overrides,
  }
}

function count(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1
}

/** The parsed graph, read back the way a crawler reads it: as parsed HTML. */
function graphOf(html: string): Record<string, unknown> {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const scripts = doc.querySelectorAll('script[type="application/ld+json"]')
  expect(scripts).toHaveLength(1)
  return JSON.parse(scripts[0]?.textContent ?? '')
}

/**
 * Every `{ '@id': ... }` pointer in a node, at any depth. A lone '@id' is a
 * reference to another node; an '@id' alongside other keys is a node declaring
 * its own identity, so only the former counts.
 */
function references(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(references)
  if (typeof value !== 'object' || value === null) return []

  const entries = Object.entries(value)
  const [first] = entries
  if (entries.length === 1 && first !== undefined && first[0] === '@id') return [String(first[1])]

  return entries.flatMap(([, child]) => references(child))
}

describe('organizationNode', () => {
  it('identifies Thunk About It and its profiles', () => {
    const node = organizationNode()

    expect(node['@type']).toBe('Organization')
    expect(node['@id']).toBe(ORGANIZATION_ID)
    expect(node['name']).toBe('Thunk About It')
    expect(node['url']).toBe('https://thunkabout.it')
    expect(node['sameAs']).toEqual([
      'https://github.com/thunkaboutit',
      'https://huggingface.co/thunkaboutit',
    ])
  })

  /** The mark the company's own site shows, from the company's own origin. */
  it('shows the company mark as its logo, served from the company site', () => {
    expect(organizationNode()['logo']).toBe('https://thunkabout.it/favicon.svg')
  })

  it('claims nothing it cannot back up', () => {
    const node = organizationNode()

    expect(node).not.toHaveProperty('address')
    expect(node).not.toHaveProperty('founder')
    expect(node).not.toHaveProperty('employee')
  })
})

describe('websiteNode', () => {
  it('names the site and hands publishing to the organization', () => {
    const node = websiteNode()

    expect(node['@type']).toBe('WebSite')
    expect(node['@id']).toBe(WEBSITE_ID)
    expect(node['name']).toBe('Koleslaw')
    expect(node['url']).toBe('https://koleslaw.ai/')
    expect(node['inLanguage']).toBe('en')
    expect(node['publisher']).toEqual({ '@id': ORGANIZATION_ID })
  })

  it('advertises no search box, because there is none', () => {
    expect(websiteNode()).not.toHaveProperty('potentialAction')
  })
})

describe('softwareApplicationNode', () => {
  it('describes the app with the injected description', () => {
    const node = softwareApplicationNode('Rewrites a prompt before you send it.')

    expect(node['@type']).toBe('SoftwareApplication')
    expect(node['name']).toBe('Koleslaw')
    expect(node['url']).toBe('https://koleslaw.ai/')
    expect(node['description']).toBe('Rewrites a prompt before you send it.')
    expect(node['applicationCategory']).toBe('UtilitiesApplication')
    expect(node['operatingSystem']).toBe('Web')
    expect(node['installUrl']).toContain('chromewebstore.google.com')
    expect(node['publisher']).toEqual({ '@id': ORGANIZATION_ID })
  })

  function offers(): JsonLdNode[] {
    return softwareApplicationNode('anything')['offers'] as JsonLdNode[]
  }

  it('offers the free and pro tiers, priced as the plans price them', () => {
    expect(offers().map((offer) => offer['@type'])).toEqual(['Offer', 'Offer'])
    expect(offers().map((offer) => offer['name'])).toEqual(['Free', 'Pro'])
    expect(offers().map((offer) => offer['price'])).toEqual(['0', '10.00'])
    expect(offers().map((offer) => offer['priceCurrency'])).toEqual(['USD', 'USD'])
  })

  it('describes an offer with the features of its plan, in one readable line', () => {
    const pro = offers().find((offer) => offer['name'] === 'Pro')
    const plan = PRICING_PLANS.find((candidate) => candidate.name === 'Pro')

    expect(String(pro?.['description']).split('; ')).toEqual(plan?.features.map(featureText))
  })

  /** An Offer with no price reads as free, which Teams is not. */
  it('leaves out the plan that quotes no price', () => {
    expect(offers().map((offer) => offer['name'])).not.toContain('Teams')
    expect(offers()).toHaveLength(PRICING_PLANS.filter((plan) => plan.amount).length)
  })

  it('reports no ratings or reviews, because none exist', () => {
    const node = softwareApplicationNode('anything')

    expect(node).not.toHaveProperty('aggregateRating')
    expect(node).not.toHaveProperty('review')
  })
})

describe('blogNode', () => {
  it('names the blog and hands publishing to the organization', () => {
    const node = blogNode([])

    expect(node['@type']).toBe('Blog')
    expect(node['@id']).toBe(BLOG_ID)
    expect(node['name']).toBe('The Koleslaw Blog')
    expect(node['description']).toContain('fine-tuned 30B model')
    expect(node['url']).toBe('https://koleslaw.ai/blog')
    expect(node['inLanguage']).toBe('en')
    expect(node['publisher']).toEqual({ '@id': ORGANIZATION_ID })
  })

  /** `blogPost: []` would claim the blog is empty; no key claims nothing. */
  it('lists no posts at all rather than an empty list', () => {
    expect(blogNode([])).not.toHaveProperty('blogPost')
  })

  it('lists one stub per post, newest first', () => {
    const node = blogNode([
      post({ slug: 'older', date: '2026-01-01' }),
      post({ slug: 'newer', date: '2026-03-01', title: 'Newer' }),
    ])

    expect(node['blogPost']).toEqual([
      {
        '@type': 'BlogPosting',
        headline: 'Newer',
        url: 'https://koleslaw.ai/blog/newer',
        datePublished: '2026-03-01',
      },
      {
        '@type': 'BlogPosting',
        headline: 'A post about quantization',
        url: 'https://koleslaw.ai/blog/older',
        datePublished: '2026-01-01',
      },
    ])
  })

  it('excludes drafts', () => {
    const node = blogNode([post({ slug: 'live' }), post({ slug: 'wip', draft: true })])

    expect(JSON.stringify(node)).not.toContain('wip')
    expect(node['blogPost']).toHaveLength(1)
  })
})

describe('blogPostingNode', () => {
  it('describes the post and ties it back to the blog', () => {
    const node = blogPostingNode(post(), undefined)

    expect(node['@type']).toBe('BlogPosting')
    expect(node['headline']).toBe('A post about quantization')
    expect(node['description']).toBe(
      'What happens when a hidden dimension is not divisible by 256.',
    )
    expect(node['datePublished']).toBe('2026-08-01')
    expect(node['url']).toBe('https://koleslaw.ai/blog/quantization')
    expect(node['mainEntityOfPage']).toBe('https://koleslaw.ai/blog/quantization')
    expect(node['inLanguage']).toBe('en')
    expect(node['isPartOf']).toEqual({ '@id': BLOG_ID })
  })

  it('credits the organization, never a person', () => {
    const node = blogPostingNode(post(), undefined)

    expect(node['author']).toEqual({ '@id': ORGANIZATION_ID })
    expect(node['publisher']).toEqual({ '@id': ORGANIZATION_ID })
    expect(JSON.stringify(node)).not.toContain('Person')
  })

  it('omits dateModified when the post declares no update', () => {
    expect(blogPostingNode(post(), undefined)).not.toHaveProperty('dateModified')
  })

  it('publishes the declared update as dateModified', () => {
    const node = blogPostingNode(post({ updated: '2026-08-17' }), undefined)

    expect(node['dateModified']).toBe('2026-08-17')
    expect(node['datePublished']).toBe('2026-08-01')
  })

  it('joins tags into keywords', () => {
    const node = blogPostingNode(post({ tags: ['quantization', 'gguf'] }), undefined)

    expect(node['keywords']).toBe('quantization, gguf')
  })

  it('omits keywords when the post has no tags', () => {
    expect(blogPostingNode(post({ tags: [] }), undefined)).not.toHaveProperty('keywords')
  })

  it('omits the image key when there is no card art', () => {
    expect(blogPostingNode(post(), undefined)).not.toHaveProperty('image')
  })

  it('carries the image when card art exists', () => {
    const node = blogPostingNode(post(), 'https://koleslaw.ai/og/default.png')

    expect(node['image']).toBe('https://koleslaw.ai/og/default.png')
  })
})

describe('breadcrumbNode', () => {
  it('numbers the trail from one, in order', () => {
    const node = breadcrumbNode([
      { name: 'Home', url: 'https://koleslaw.ai/' },
      { name: 'Blog', url: 'https://koleslaw.ai/blog' },
      { name: 'A post about quantization', url: 'https://koleslaw.ai/blog/quantization' },
    ])

    expect(node['@type']).toBe('BreadcrumbList')
    expect(node['itemListElement']).toEqual([
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://koleslaw.ai/' },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: 'https://koleslaw.ai/blog' },
      {
        '@type': 'ListItem',
        position: 3,
        name: 'A post about quantization',
        item: 'https://koleslaw.ai/blog/quantization',
      },
    ])
  })
})

describe('the graph', () => {
  it('resolves every cross-reference to a node some builder declares', () => {
    const nodes = [
      organizationNode(),
      websiteNode(),
      softwareApplicationNode('Rewrites a prompt before you send it.'),
      blogNode([post()]),
      blogPostingNode(post(), undefined),
      breadcrumbNode([{ name: 'Home', url: 'https://koleslaw.ai/' }]),
    ]
    const declared = new Set([ORGANIZATION_ID, WEBSITE_ID, BLOG_ID])
    const pointers = references(nodes)

    expect(pointers.length).toBeGreaterThan(0)
    for (const pointer of pointers) {
      expect(declared).toContain(pointer)
    }
  })
})

describe('renderJsonLd', () => {
  it('emits one script block that round-trips the nodes', () => {
    const nodes: JsonLdNode[] = [organizationNode(), websiteNode()]
    const html = renderJsonLd(nodes)
    const graph = graphOf(html)

    expect(count(html, '<script')).toBe(1)
    expect(count(html, '</script>')).toBe(1)
    expect(graph['@context']).toBe('https://schema.org')
    expect(graph['@graph']).toEqual(nodes)
  })

  it('leaves no @context inside the graph', () => {
    const html = renderJsonLd([organizationNode(), blogNode([post()])])

    expect(count(html, '@context')).toBe(1)
  })

  it('returns nothing at all for an empty list', () => {
    expect(renderJsonLd([])).toBe('')
  })

  it('indents to sit beside the other head tags', () => {
    const lines = renderJsonLd([organizationNode()]).split('\n')

    expect(lines[0]).toBe('    <script type="application/ld+json">')
    expect(lines[lines.length - 1]).toBe('    </script>')
  })

  it('cannot be closed by a hostile post title', () => {
    const hostile = 'Bobby </script><script>alert(1)</script><!-- oops'
    const html = renderJsonLd([blogPostingNode(post({ title: hostile }), undefined)])

    expect(html).not.toContain('<script>alert(1)')
    expect(count(html, '<script')).toBe(1)
    expect(count(html, '</script>')).toBe(1)

    const graph = graphOf(html) as { '@graph': JsonLdNode[] }
    expect(graph['@graph'][0]?.['headline']).toBe(hostile)
  })

  it('round-trips a real title with quotes and digits', () => {
    const title = 'My "4-bit" quant was 6.2 bits per weight'
    const html = renderJsonLd([blogPostingNode(post({ title }), undefined)])

    const graph = graphOf(html) as { '@graph': JsonLdNode[] }
    expect(graph['@graph'][0]?.['headline']).toBe(title)
  })

  it('leaves no raw angle bracket or ampersand in the payload', () => {
    const html = renderJsonLd([blogPostingNode(post({ title: 'Tags & <angles>' }), undefined)])
    const payload = html.split('\n').slice(1, -1).join('\n')

    expect(payload).not.toMatch(/[<>&]/)
    const graph = graphOf(html) as { '@graph': JsonLdNode[] }
    expect(graph['@graph'][0]?.['headline']).toBe('Tags & <angles>')
  })
})
