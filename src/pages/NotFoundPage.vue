<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import { RouterLink } from 'vue-router'

/**
 * nginx already answers an unknown URL with a real 404 status (see
 * nginx.conf.template), which is what a crawler acts on. The robots tag covers
 * the other way in: an in-app navigation to a dead link gets no new response at
 * all, so the status of whatever page the visitor arrived on is the only one a
 * renderer sees. It is removed on unmount so it cannot follow the visitor to a
 * page that does want indexing.
 */
let robots: HTMLMetaElement | null = null

onMounted(() => {
  robots = document.createElement('meta')
  robots.name = 'robots'
  robots.content = 'noindex'
  document.head.appendChild(robots)
})

onBeforeUnmount(() => {
  robots?.remove()
  robots = null
})
</script>

<template>
  <div class="not-found">
    <h1>Page not found</h1>
    <p>
      No page lives at that address.
      <RouterLink to="/">Start from the home page</RouterLink> or
      <RouterLink to="/blog">read the blog</RouterLink>.
    </p>
  </div>
</template>

<style scoped>
.not-found {
  width: 100%;
  max-width: 720px;
  margin: 0 auto;
  padding: 3rem 2rem;
}

.not-found h1 {
  font-family: var(--font-heading);
  font-size: 1.75rem;
  font-weight: 900;
  color: var(--color-heading);
  margin-bottom: 0.75rem;
}

@media (max-width: 600px) {
  .not-found {
    padding: 2rem 1rem;
  }
}
</style>
