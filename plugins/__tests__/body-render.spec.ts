import { describe, expect, it } from 'vitest'
import { createApp, h } from 'vue'
import {
  injectBody,
  renderBlogIndexBody,
  renderDocumentBody,
  renderHomeBody,
  renderPageBody,
  renderPostBody,
  renderPricingBody,
  renderSiteNav,
  type HeroCopy,
  type NavLink,
} from '../body-render'
import type { BlogPost } from '../blog-render'
import type { HomeSection } from '../../src/content/home'
import type { PricingPlan } from '../../src/content/pricing'

/** Stand-in for dist/index.html: one empty mount point, hashed assets. */
const SHELL = [
  '<!DOCTYPE html>',
  '<html lang="en">',
  '  <head>',
  '    <title>Koleslaw — AI Prompt Enhancement</title>',
  '    <script type="module" crossorigin src="/assets/index-DHOcSlju.js"></script>',
  '  </head>',
  '  <body>',
  '    <div id="app"></div>',
  '  </body>',
  '</html>',
  '',
].join('\n')

/** A real title: straight quotes and a decimal that must survive intact. */
const REAL_TITLE = 'My "4-bit" quant was 6.2 bits per weight'

const NAV: NavLink[] = [
  { href: '/', label: 'Home' },
  { href: '/blog', label: 'Blog' },
  { href: '/pricing', label: 'Pricing' },
]

function post(overrides: Partial<BlogPost> = {}): BlogPost {
  return {
    slug: 'quantization',
    title: REAL_TITLE,
    description: 'What happens when a hidden dimension is not divisible by 256.',
    date: '2026-07-29',
    tags: [],
    draft: false,
    ...overrides,
  }
}

function hero(overrides: Partial<HeroCopy> = {}): HeroCopy {
  return {
    headline: ['Stop Re-prompting.', 'Start Kolewoofing.'],
    subtitle: 'Better input, better output — it is not rocket science.',
    cta: {
      label: 'Get the Chrome extension',
      href: 'https://chromewebstore.google.com/detail/koleslaw',
      note: 'Enhance in place on ChatGPT, Claude, and Gemini.',
    },
    ...overrides,
  }
}

/** Two sections: one with an intro and a linked item, one bare. */
const SECTIONS: readonly HomeSection[] = [
  {
    id: 'how',
    heading: 'How it works',
    intro: 'Paste a draft & get back a prompt.',
    items: [
      { title: 'Expand', text: 'A short prompt gets the specifics.' },
      {
        title: 'Chrome extension',
        text: 'A floating button on ChatGPT, Claude, and Gemini.',
        link: { href: 'https://chromewebstore.google.com/detail/koleslaw', label: 'Get it' },
      },
    ],
  },
  {
    id: 'faq',
    heading: 'Questions',
    items: [{ title: 'Is it free?', text: 'The playground is.', link: { href: '/pricing', label: 'Pricing' } }],
  },
]

/** Three plans, one of them emphasising a number and one of them priced in words. */
const PLANS: readonly PricingPlan[] = [
  {
    name: 'Free',
    price: '$0',
    period: '/month',
    amount: '0',
    features: [{ text: '50 enhances/day per API key' }, { text: '60 requests/min' }],
  },
  {
    name: 'Pro',
    price: '$10',
    period: '/month',
    amount: '10.00',
    featured: true,
    features: [{ lead: '500', text: ' enhances/day per API key' }, { text: 'Priority support' }],
  },
  {
    name: 'Teams',
    price: "Let's talk",
    features: [{ text: 'SSO & admin controls' }],
  },
]

const TAGLINE = 'Start free. Upgrade when you outgrow the limits.'
const NOTE = 'The playground stays free for everyone — 10 enhances/day, no account needed.'

function pricing(plans: readonly PricingPlan[] = PLANS): string {
  return renderPricingBody({ heading: 'Pricing', tagline: TAGLINE, plans, note: NOTE })
}

function parse(html: string): Document {
  return new DOMParser().parseFromString(html, 'text/html')
}

function texts(html: string, selector: string): string[] {
  return [...parse(html).querySelectorAll(selector)].map((node) => node.textContent?.trim() ?? '')
}

/** One of every body, so the whole-output rules are asserted against all of them. */
const BODIES: [string, string][] = [
  ['home', renderHomeBody(hero(), SECTIONS)],
  ['page', renderPageBody({ heading: 'Pricing', description: 'Pay for what you enhance.' })],
  ['pricing', pricing()],
  ['document', renderDocumentBody('Privacy Policy', '<p>We keep prompts for 30 days.</p>')],
  ['blog index', renderBlogIndexBody([post(), post({ slug: 'other', date: '2026-06-01' })])],
  [
    'post',
    renderPostBody({
      post: post(),
      html: '<p>The article.</p>',
      others: [post({ slug: 'other', date: '2026-06-01' })],
    }),
  ],
]

const FRAGMENTS: [string, string][] = [...BODIES, ['site nav', renderSiteNav(NAV)]]

describe('injectBody', () => {
  it('fills the empty mount point and leaves the rest of the shell alone', () => {
    const html = injectBody(SHELL, '<main>baked</main>')

    expect(html).toContain('<div id="app"><main>baked</main></div>')
    expect(html).toContain('<script type="module" crossorigin src="/assets/index-DHOcSlju.js">')
    expect(html).toContain('<title>Koleslaw — AI Prompt Enhancement</title>')
    expect(html.startsWith('<!DOCTYPE html>')).toBe(true)
  })

  it('tolerates whitespace inside the mount point', () => {
    const shell = SHELL.replace('<div id="app"></div>', '<div id="app">\n    </div>')

    expect(injectBody(shell, '<main>baked</main>')).toContain(
      '<div id="app"><main>baked</main></div>',
    )
  })

  it('throws when the shell has no empty mount point', () => {
    const shell = SHELL.replace('<div id="app"></div>', '<div id="root"></div>')

    expect(() => injectBody(shell, '<main>baked</main>')).toThrow(/found 0/)
  })

  it('throws rather than bake into a mount point that is already filled', () => {
    const shell = SHELL.replace('<div id="app"></div>', '<div id="app">already here</div>')

    expect(() => injectBody(shell, '<main>baked</main>')).toThrow(/<div id="app"><\/div>/)
  })

  it('throws when the shell has more than one mount point', () => {
    const shell = SHELL.replace(
      '<div id="app"></div>',
      '<div id="app"></div>\n    <div id="app"></div>',
    )

    expect(() => injectBody(shell, '<main>baked</main>')).toThrow(/found 2/)
  })
})

describe('renderPostBody', () => {
  it('renders the article a crawler needs: date, title, body, way back', () => {
    const html = renderPostBody({ post: post(), html: '<p>The article.</p>', others: [] })
    const doc = parse(html)

    expect(doc.querySelectorAll('h1')).toHaveLength(1)
    expect(doc.querySelector('h1')?.textContent).toBe(REAL_TITLE)
    expect(doc.querySelector('article time')?.getAttribute('datetime')).toBe('2026-07-29')
    expect(doc.querySelector('article time')?.textContent).toBe('29 July 2026')
    expect(doc.querySelector('.prose')?.innerHTML).toBe('<p>The article.</p>')
    expect(doc.querySelector('a[href="/blog"]')).not.toBeNull()
  })

  it('prints a declared update beside the publish date, each in its own time', () => {
    const html = renderPostBody({ post: post({ updated: '2026-08-17' }), html: '', others: [] })
    const times = [...parse(html).querySelectorAll('article time')]

    expect(times.map((node) => node.getAttribute('datetime'))).toEqual(['2026-07-29', '2026-08-17'])
    expect(times[0]?.parentElement?.textContent).toBe('29 July 2026 · Updated 17 August 2026')
  })

  it('prints the publish date alone when the post declares no update', () => {
    const html = renderPostBody({ post: post(), html: '', others: [] })
    const times = [...parse(html).querySelectorAll('article time')]

    expect(times).toHaveLength(1)
    expect(times[0]?.parentElement?.textContent).toBe('29 July 2026')
  })

  it('escapes the title rather than trusting it', () => {
    const html = renderPostBody({ post: post(), html: '', others: [] })

    expect(html).toContain('<h1>My &quot;4-bit&quot; quant was 6.2 bits per weight</h1>')
    expect(parse(html).querySelector('h1')?.textContent).toBe(REAL_TITLE)
  })

  it('neutralises a hostile title', () => {
    const hostile = '<script>alert(1)</script>'
    const html = renderPostBody({ post: post({ title: hostile }), html: '', others: [] })

    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
    expect(parse(html).querySelector('script')).toBeNull()
  })

  it('prints the same series line the app does: position and total', () => {
    const html = renderPostBody({
      post: post({ series: 'Quantization', part: 2 }),
      html: '',
      others: [
        post({ slug: 'first', series: 'Quantization', part: 1 }),
        post({ slug: 'third', series: 'Quantization', part: 3 }),
        post({ slug: 'elsewhere', series: 'Spot GPUs', part: 1 }),
        post({ slug: 'standalone' }),
      ],
    })

    expect(html).toContain('Quantization · Part 2 of 3')
  })

  it('counts neither drafts nor the post twice towards the series total', () => {
    const current = post({ series: 'Quantization', part: 1 })
    const html = renderPostBody({
      post: current,
      html: '',
      others: [current, post({ slug: 'unwritten', series: 'Quantization', part: 2, draft: true })],
    })

    expect(html).toContain('Quantization · Part 1 of 1')
  })

  it('omits the series line for a standalone post', () => {
    expect(renderPostBody({ post: post(), html: '', others: [] })).not.toContain('Part')
  })

  it('links the other posts, newest first, as root-relative URLs', () => {
    const html = renderPostBody({
      post: post(),
      html: '',
      others: [
        post({ slug: 'older', title: 'Older', date: '2026-01-01' }),
        post({ slug: 'newer', title: 'Newer', date: '2026-08-01' }),
      ],
    })
    const links = [...parse(html).querySelectorAll('nav a')]

    expect(links.map((link) => link.getAttribute('href'))).toEqual(['/blog/newer', '/blog/older'])
    expect(links.map((link) => link.textContent)).toEqual(['Newer', 'Older'])
  })

  it('never lists a draft or the post itself', () => {
    const html = renderPostBody({
      post: post(),
      html: '',
      others: [post(), post({ slug: 'wip', title: 'Work in progress', draft: true })],
    })

    expect(html).not.toContain('/blog/wip')
    expect(html).not.toContain('Work in progress')
    expect(html).not.toContain('/blog/quantization')
  })

  it('omits the more-posts nav when there is nowhere to go', () => {
    const html = renderPostBody({ post: post(), html: '', others: [] })

    expect(html).not.toContain('More posts')
    expect(parse(html).querySelector('nav')).toBeNull()
  })
})

describe('renderBlogIndexBody', () => {
  it('heads the page with the blog title, description and feed link', () => {
    const doc = parse(renderBlogIndexBody([post()]))

    expect(doc.querySelectorAll('h1')).toHaveLength(1)
    expect(doc.querySelector('h1')?.textContent).toBe('The Koleslaw Blog')
    expect(doc.body.textContent).toContain('Notes from running a fine-tuned 30B model')
    expect(doc.querySelector('a[href="/rss.xml"]')).not.toBeNull()
  })

  it('lists one linked article per published post, newest first', () => {
    const html = renderBlogIndexBody([
      post({ slug: 'older', title: 'Older', date: '2026-01-01' }),
      post({ slug: 'newer', title: 'Newer', date: '2026-08-01', description: 'The newer one.' }),
    ])
    const doc = parse(html)

    expect(doc.querySelectorAll('article')).toHaveLength(2)
    expect(texts(html, 'article h2 a')).toEqual(['Newer', 'Older'])
    expect([...doc.querySelectorAll('article h2 a')].map((a) => a.getAttribute('href'))).toEqual([
      '/blog/newer',
      '/blog/older',
    ])
    expect(doc.querySelector('article time')?.getAttribute('datetime')).toBe('2026-08-01')
    expect(doc.querySelector('article time')?.textContent).toBe('1 August 2026')
    expect(doc.body.textContent).toContain('The newer one.')
  })

  it('excludes drafts', () => {
    const html = renderBlogIndexBody([post(), post({ slug: 'wip', draft: true })])

    expect(parse(html).querySelectorAll('article')).toHaveLength(1)
    expect(html).not.toContain('wip')
  })

  it('stays well formed with no posts at all', () => {
    const doc = parse(renderBlogIndexBody([]))

    expect(doc.querySelectorAll('h1')).toHaveLength(1)
    expect(doc.querySelectorAll('article')).toHaveLength(0)
  })
})

describe('renderHomeBody', () => {
  it('joins the headline lines into one heading', () => {
    const doc = parse(renderHomeBody(hero()))

    expect(doc.querySelectorAll('h1')).toHaveLength(1)
    expect(doc.querySelector('h1')?.innerHTML).toBe('Stop Re-prompting.<br>Start Kolewoofing.')
  })

  it('renders the call to action as a real link with its note', () => {
    const html = renderHomeBody(hero())
    const doc = parse(html)

    expect(doc.body.textContent).toContain('Better input, better output')
    expect(doc.querySelector('a')?.getAttribute('href')).toBe(
      'https://chromewebstore.google.com/detail/koleslaw',
    )
    expect(doc.querySelector('a')?.textContent).toBe('Get the Chrome extension')
    expect(doc.body.textContent).toContain('Enhance in place on ChatGPT, Claude, and Gemini.')
  })

  it('omits the note when the call to action has none', () => {
    const html = renderHomeBody(hero({ cta: { label: 'Sign up', href: '/signup' } }))

    expect(html).toContain('<a href="/signup">Sign up</a>')
    expect(html).not.toContain('Enhance in place')
  })

  it('omits the call to action entirely when there is none', () => {
    const html = renderHomeBody(hero({ cta: undefined }))

    expect(parse(html).querySelector('a')).toBeNull()
  })

  it('is the hero alone when there are no sections', () => {
    const doc = parse(renderHomeBody(hero()))

    expect(doc.querySelectorAll('section')).toHaveLength(0)
    expect(doc.querySelectorAll('h2')).toHaveLength(0)
  })

  it('follows the hero with one section per entry, headed and anchored by id', () => {
    const doc = parse(renderHomeBody(hero(), SECTIONS))
    const sections = [...doc.querySelectorAll('main > section')]

    expect(sections.map((section) => section.id)).toEqual(['how', 'faq'])
    expect(sections.map((section) => section.querySelector('h2')?.textContent)).toEqual([
      'How it works',
      'Questions',
    ])
    // The hero's h1 comes before every section.
    expect(doc.querySelector('main')?.firstElementChild?.tagName).toBe('H1')
  })

  it('renders the intro as the first paragraph, and none where there is none', () => {
    const doc = parse(renderHomeBody(hero(), SECTIONS))

    expect(doc.querySelector('#how h2 + p')?.textContent).toBe('Paste a draft & get back a prompt.')
    expect(doc.querySelector('#faq h2 + p')).toBeNull()
    expect(doc.querySelector('#faq h2 + h3')?.textContent).toBe('Is it free?')
  })

  it('renders each item as an h3 and a paragraph, with the link inside the paragraph', () => {
    const doc = parse(renderHomeBody(hero(), SECTIONS))

    expect(texts(renderHomeBody(hero(), SECTIONS), '#how h3')).toEqual(['Expand', 'Chrome extension'])
    expect(doc.querySelector('#how h3 + p')?.textContent).toBe('A short prompt gets the specifics.')

    const paragraphs = [...doc.querySelectorAll('#how p')]
    const linked = paragraphs[paragraphs.length - 1]
    expect(linked?.textContent).toBe('A floating button on ChatGPT, Claude, and Gemini. Get it')
    expect(linked?.querySelector('a')?.getAttribute('href')).toBe(
      'https://chromewebstore.google.com/detail/koleslaw',
    )
    expect(doc.querySelector('#faq a')?.getAttribute('href')).toBe('/pricing')
  })

  it('escapes section copy like everything else', () => {
    const html = renderHomeBody(hero(), [
      {
        id: 'x',
        heading: 'Q & A <b>',
        items: [{ title: '"Quoted"', text: '<script>alert(1)</script>' }],
      },
    ])

    expect(html).not.toContain('<script>')
    expect(html).toContain('Q &amp; A &lt;b&gt;')
    expect(parse(html).querySelector('h3')?.textContent).toBe('"Quoted"')
  })
})

describe('renderPageBody', () => {
  it('renders the heading and its description', () => {
    const doc = parse(renderPageBody({ heading: 'Pricing', description: 'Pay per enhance.' }))

    expect(doc.querySelectorAll('h1')).toHaveLength(1)
    expect(doc.querySelector('h1')?.textContent).toBe('Pricing')
    expect(doc.querySelector('p')?.textContent).toBe('Pay per enhance.')
  })
})

describe('renderPricingBody', () => {
  it('heads the page once and opens with the tagline', () => {
    const doc = parse(pricing())

    expect(doc.querySelectorAll('h1')).toHaveLength(1)
    expect(doc.querySelector('h1')?.textContent).toBe('Pricing')
    expect(doc.querySelector('p')?.textContent).toBe(TAGLINE)
  })

  it('gives every plan a section, named and priced', () => {
    const html = pricing()

    expect(texts(html, 'section h2')).toEqual(['Free', 'Pro', 'Teams'])
    expect(texts(html, 'section > p')).toEqual(['$0/month', '$10/month', "Let's talk"])
  })

  it('lists the features as plain text, lead-in and all', () => {
    const html = pricing()

    expect(texts(html, 'section li')).toEqual([
      '50 enhances/day per API key',
      '60 requests/min',
      '500 enhances/day per API key',
      'Priority support',
      'SSO & admin controls',
    ])
    // The card's <strong> is styling the app does; the baked line is one string.
    expect(parse(html).querySelector('li strong')).toBeNull()
  })

  it('closes with the note under the plans', () => {
    const paragraphs = texts(pricing(), 'main > p')

    expect(paragraphs[paragraphs.length - 1]).toBe(NOTE)
  })

  it('escapes every string it is handed', () => {
    const html = pricing([
      {
        name: 'Rogue & Co',
        price: '<script>alert(1)</script>',
        features: [{ lead: '5 > 3', text: ' & rising' }],
      },
    ])

    expect(html).toContain('<h2>Rogue &amp; Co</h2>')
    expect(html).not.toContain('<script>')
    expect(parse(html).querySelector('script')).toBeNull()
    expect(texts(html, 'section li')).toEqual(['5 > 3 & rising'])
  })
})

describe('renderDocumentBody', () => {
  it('renders the heading and the pre-rendered markdown', () => {
    const doc = parse(renderDocumentBody('Privacy Policy', '<h2>Data</h2><p>Kept 30 days.</p>'))

    expect(doc.querySelector('h1')?.textContent).toBe('Privacy Policy')
    expect(doc.querySelector('.prose')?.innerHTML).toBe('<h2>Data</h2><p>Kept 30 days.</p>')
  })

  it('escapes the heading but not the markdown', () => {
    const html = renderDocumentBody('Terms & Conditions', '<p>a &amp; b</p>')

    expect(html).toContain('<h1>Terms &amp; Conditions</h1>')
    expect(html).toContain('<p>a &amp; b</p>')
  })
})

describe('renderSiteNav', () => {
  it('lists every link as a plain anchor in a labelled nav', () => {
    const html = renderSiteNav(NAV)
    const doc = parse(html)

    expect(doc.querySelector('nav')?.getAttribute('aria-label')).toBe('Site')
    expect([...doc.querySelectorAll('ul > li > a')].map((a) => a.getAttribute('href'))).toEqual([
      '/',
      '/blog',
      '/pricing',
    ])
    expect(texts(html, 'nav a')).toEqual(['Home', 'Blog', 'Pricing'])
  })

  it('escapes labels and hrefs', () => {
    const html = renderSiteNav([{ href: '/x?a=1&b=2', label: 'A & B' }])

    expect(html).toContain('href="/x?a=1&amp;b=2"')
    expect(html).toContain('>A &amp; B<')
  })
})

describe('every rendered fragment', () => {
  it.each(FRAGMENTS)('%s is visible, not hidden text', (_name, html) => {
    // Baked text a crawler can read but a reader cannot is spam, and gets a site
    // penalised. The body is meant to flash and then be replaced by the app.
    for (const pattern of [
      /display\s*:\s*none/i,
      /visibility\s*:\s*hidden/i,
      /opacity\s*:\s*0/i,
      /<[^>]+\shidden[\s=>]/i,
      /<noscript/i,
      /position\s*:\s*(absolute|fixed)/i,
      /(width|height|font-size)\s*:\s*0/i,
      /text-indent/i,
      /-\d{3,}px/,
    ]) {
      expect(html).not.toMatch(pattern)
    }
  })

  it.each(FRAGMENTS)('%s carries no script', (_name, html) => {
    expect(html).not.toMatch(/<script/i)
    expect(parse(html).querySelector('script')).toBeNull()
  })

  it.each(FRAGMENTS)('%s keeps internal links root-relative', (_name, html) => {
    expect(html).not.toContain('https://koleslaw.ai')
    expect(html).not.toMatch(/href="(?!\/|https:\/\/chromewebstore)/)
  })

  it.each(BODIES)('%s has exactly one h1 inside one wrapper', (_name, html) => {
    const doc = parse(html)

    expect(doc.querySelectorAll('h1')).toHaveLength(1)
    expect(doc.querySelectorAll('main.prerendered')).toHaveLength(1)
    expect(doc.body.children).toHaveLength(1)
  })
})

describe('the baked body and the booting app', () => {
  /**
   * The premise of the whole approach: mount() empties its container, so baked
   * markup is content for crawlers and nothing more. If Vue ever kept it, every
   * page would render twice and this test is the alarm.
   */
  it('is discarded the moment the app mounts', () => {
    const mount = document.createElement('div')
    mount.id = 'app'
    mount.innerHTML = renderPostBody({
      post: post(),
      html: '<p>The article.</p>',
      others: [],
    })
    document.body.appendChild(mount)

    expect(mount.textContent).toContain(REAL_TITLE)

    createApp({ render: () => h('p', 'live') }).mount(mount)

    expect(mount.innerHTML).toBe('<p>live</p>')
    expect(mount.textContent).not.toContain(REAL_TITLE)
    expect(mount.querySelector('h1')).toBeNull()
  })
})
