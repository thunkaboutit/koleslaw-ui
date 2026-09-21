import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import BlogPostPage from '../BlogPostPage.vue'

/**
 * The page reads whatever is in src/content/blog, which would tie these
 * assertions to real published content. Swapping the lookups for a fixed set of
 * posts keeps the ordering rules real (the *In functions are the originals)
 * while the collection stays synthetic.
 */
vi.mock('@/content/posts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/content/posts')>()

  const source = (slug: string, date: string, extra = ''): [string, string] => [
    `./blog/${slug}.md`,
    `---\ntitle: ${slug}\ndescription: About ${slug}\ndate: ${date}\n${extra}---\nBody of ${slug}.\n`,
  ]

  // Timeline, oldest first: oldest, part-one, part-two, middle, newest. The
  // series sits inside the run of standalone posts on purpose, so chronological
  // navigation has to step through it. `middle` is the one revised post: an
  // update must change what it says without moving it in the chronology.
  const posts = actual.buildPosts(
    Object.fromEntries([
      source('oldest', '2026-08-01'),
      source('part-one', '2026-08-04', 'series: A series\npart: 1\n'),
      source('part-two', '2026-08-05', 'series: A series\npart: 2\n'),
      source('middle', '2026-08-08', 'updated: 2026-08-17\n'),
      source('newest', '2026-08-15'),
    ]),
  )

  return {
    ...actual,
    allPosts: posts,
    findPost: (slug: string) => posts.find((entry) => entry.slug === slug),
    seriesNav: (post: import('@/content/posts').BlogPost) => actual.seriesNavIn(posts, post),
    chronologicalNav: (post: import('@/content/posts').BlogPost) =>
      actual.chronologicalNavIn(posts, post),
  }
})

async function mountPost(slug: string) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/blog', component: { template: '<div />' } },
      { path: '/blog/:slug', component: BlogPostPage },
    ],
  })

  await router.push(`/blog/${slug}`)
  await router.isReady()

  return mount(BlogPostPage, { global: { plugins: [router] } })
}

function links(wrapper: Awaited<ReturnType<typeof mountPost>>): string[] {
  return wrapper
    .findAll('.post-page__series-link')
    .map((link) => link.attributes('href') ?? '')
    .filter((href) => href !== '')
}

function dates(wrapper: Awaited<ReturnType<typeof mountPost>>): (string | undefined)[] {
  return wrapper.findAll('.post-page__meta time').map((node) => node.attributes('datetime'))
}

function headContent(key: string): string | null | undefined {
  return document.head.querySelector(`meta[property="${key}"]`)?.getAttribute('content')
}

// useSeo only clears its tags on unmount, and these mounts outlive their test.
beforeEach(() => {
  document.head.innerHTML = ''
})

describe('BlogPostPage dates', () => {
  it('prints a declared update beside the publish date, each in its own time', async () => {
    const wrapper = await mountPost('middle')

    expect(dates(wrapper)).toEqual(['2026-08-08', '2026-08-17'])
    expect(wrapper.find('.post-page__meta').text()).toBe('8 August 2026 · Updated 17 August 2026')
  })

  it('prints the publish date alone when the post declares no update', async () => {
    const wrapper = await mountPost('newest')

    expect(dates(wrapper)).toEqual(['2026-08-15'])
    expect(wrapper.find('.post-page__meta').text()).toBe('15 August 2026')
  })

  it('publishes the declared update as article:modified_time', async () => {
    await mountPost('middle')

    expect(headContent('article:published_time')).toBe('2026-08-08')
    expect(headContent('article:modified_time')).toBe('2026-08-17')
  })

  it('stamps no modified time for a post that declares no update', async () => {
    await mountPost('newest')

    expect(document.head.querySelector('meta[property="article:modified_time"]')).toBeNull()
  })
})

describe('BlogPostPage navigation', () => {
  it('offers both neighbours on a standalone post, series posts included', async () => {
    const wrapper = await mountPost('middle')

    expect(wrapper.text()).toContain('Older')
    expect(wrapper.text()).toContain('Newer')
    expect(links(wrapper)).toEqual(['/blog/part-two', '/blog/newest'])
  })

  it('drops the newer link on the most recent post', async () => {
    const wrapper = await mountPost('newest')

    expect(wrapper.text()).toContain('Older')
    expect(wrapper.text()).not.toContain('Newer')
    expect(links(wrapper)).toEqual(['/blog/middle'])
  })

  it('drops the older link on the first post', async () => {
    const wrapper = await mountPost('oldest')

    expect(wrapper.text()).not.toContain('Older')
    expect(wrapper.text()).toContain('Newer')
    expect(links(wrapper)).toEqual(['/blog/part-one'])
  })

  it('keeps series navigation for posts in a series', async () => {
    const wrapper = await mountPost('part-one')

    expect(wrapper.text()).toContain('A series · Part 1 of 2')
    expect(wrapper.text()).toContain('Next')
    expect(wrapper.text()).not.toContain('Older')
    expect(wrapper.text()).not.toContain('Newer')
    expect(links(wrapper)).toEqual(['/blog/part-two'])
  })

  it('renders the not-found state for an unknown slug', async () => {
    const wrapper = await mountPost('nope')

    expect(wrapper.text()).toContain('Post not found')
    expect(links(wrapper)).toEqual([])
  })
})
