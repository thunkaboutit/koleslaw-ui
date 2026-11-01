import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import AppNavbar from '../AppNavbar.vue'
import type { UserInfo } from '@/api/types'
import { useAuthStore } from '@/stores/auth'
import { useSessionStore } from '@/stores/session'
import { ev, SID, stubServer } from '@/stores/__tests__/sessionServer'

/* New Chat in the navbar ends the session (model sessions PRD, BDD 8). */

const Blank = { template: '<div />' }

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: ['/', '/chat', '/dashboard', '/keys', '/pricing', '/blog', '/profile'].map((path) => ({
      path,
      component: Blank,
    })),
  })
}

describe('AppNavbar New Chat', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    useAuthStore().user = { id: 'u1', name: 'cp' } as UserInfo
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('deletes the session once and resets the playground', async () => {
    const server = stubServer()
    server.reply(ev.session(), ev.text('Which stack?'), ev.turn('question', 1, 2))
    const session = useSessionStore()
    session.draft = 'make an app'
    await session.send()
    const router = makeRouter()
    await router.push('/chat')
    const wrapper = mount(AppNavbar, {
      global: { plugins: [router], provide: { forceRemount: () => {} } },
    })

    const link = wrapper.findAll('a').find((a) => a.text() === 'New Chat')
    await link?.trigger('click')
    await flushPromises()

    expect(server.deletes()).toHaveLength(1)
    expect(server.deletes()[0]?.headers['X-Session-Id']).toBe(SID)
    expect(session.status).toBe('idle')
    expect(session.turns).toEqual([])
  })
})

describe('AppNavbar New Chat for anonymous visitors', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  async function mountAt(path: string) {
    const router = makeRouter()
    await router.push(path)
    const wrapper = mount(AppNavbar, {
      global: { plugins: [router], provide: { forceRemount: () => {} } },
    })
    return { router, wrapper }
  }

  const newChatLinks = (wrapper: Awaited<ReturnType<typeof mountAt>>['wrapper']) =>
    wrapper.findAll('a').filter((a) => a.text() === 'New Chat')

  it('hides New Chat before anything is sent', async () => {
    const { wrapper } = await mountAt('/')
    expect(newChatLinks(wrapper)).toHaveLength(0)
  })

  it.fails(
    'shows New Chat once a prompt is sent and resets the playground on the home page',
    async () => {
      const server = stubServer()
      server.reply(ev.session(), ev.text('Which stack?'), ev.turn('question', 1, 2))
      const session = useSessionStore()
      session.draft = 'make an app'
      await session.send()
      const { router, wrapper } = await mountAt('/')

      const link = newChatLinks(wrapper)[0]
      expect(link?.attributes('href')).toBe('/')
      await link?.trigger('click')
      await flushPromises()

      expect(server.deletes()).toHaveLength(1)
      expect(session.status).toBe('idle')
      expect(router.currentRoute.value.path).toBe('/')
    },
  )

  it.fails('shows New Chat in the mobile menu once a prompt is sent', async () => {
    const server = stubServer()
    server.reply(ev.session(), ev.text('Which stack?'), ev.turn('question', 1, 2))
    const session = useSessionStore()
    session.draft = 'make an app'
    await session.send()
    const { wrapper } = await mountAt('/')

    await wrapper.find('.navbar__burger').trigger('click')
    expect(
      wrapper.findAll('.navbar__mobile-link').filter((a) => a.text() === 'New Chat'),
    ).toHaveLength(1)
  })
})
