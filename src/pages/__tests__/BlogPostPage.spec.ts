import { describe, expect, it, vi } from 'vitest'
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
  // navigation has to step through it.
  const posts = actual.buildPosts(
    Object.fromEntries([
      source('oldest', '2026-08-01'),
      source('part-one', '2026-08-04', 'series: A series\npart: 1\n'),
      source('part-two', '2026-08-05', 'series: A series\npart: 2\n'),
      source('middle', '2026-08-08'),
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
