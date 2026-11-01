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
