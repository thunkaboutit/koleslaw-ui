import { afterEach, describe, expect, it } from 'vitest'
import { enableAutoUnmount, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import router from '@/router'
import NotFoundPage from '../NotFoundPage.vue'

// The page writes to the shared document head, so a wrapper left mounted would
// leak its tag into the next test.
enableAutoUnmount(afterEach)

function robots(): HTMLMetaElement | null {
  return document.head.querySelector<HTMLMetaElement>('meta[name="robots"]')
}

async function mountNotFound() {
  const testRouter = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      { path: '/blog', component: { template: '<div />' } },
      { path: '/:pathMatch(.*)*', component: NotFoundPage },
    ],
  })

  await testRouter.push('/gone')
  await testRouter.isReady()

  return mount(NotFoundPage, { global: { plugins: [testRouter] } })
}

describe('NotFoundPage', () => {
  it('says what happened and offers a way out', async () => {
    const wrapper = await mountNotFound()

    expect(wrapper.get('h1').text()).toBe('Page not found')
    expect(wrapper.findAll('a').map((link) => link.attributes('href'))).toEqual(['/', '/blog'])
  })

  it('keeps itself out of the index while it is on screen', async () => {
    const wrapper = await mountNotFound()

    expect(robots()?.content).toBe('noindex')

    wrapper.unmount()

    expect(robots()).toBeNull()
  })
})

describe('the not-found route', () => {
  it('catches URLs no page claims', () => {
    expect(router.resolve('/definitely-not-a-page').name).toBe('not-found')
  })

  it('leaves real routes alone', () => {
    expect(router.resolve('/pricing').name).toBe('pricing')
  })
})
