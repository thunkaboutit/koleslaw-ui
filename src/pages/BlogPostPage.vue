<script setup lang="ts">
import { computed, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { useMarkdown } from '@/composables/useMarkdown'
import { useSeo } from '@/composables/useSeo'
import { chronologicalNav, findPost, formatPostDate, seriesNav } from '@/content/posts'
import { BLOG_TITLE, SITE_URL, postUrl } from '@/config/site'

const route = useRoute()
const { renderMarkdown } = useMarkdown()

const slug = computed(() => String(route.params['slug'] ?? ''))
const post = computed(() => findPost(slug.value))
const rendered = computed(() => (post.value ? renderMarkdown(post.value.body) : ''))
const series = computed(() => (post.value ? seriesNav(post.value) : null))
// Only consulted when the series nav has nothing to show, so a standalone post
// still offers somewhere to go rather than dead-ending.
const chronological = computed(() => (post.value ? chronologicalNav(post.value) : null))

useSeo(() => {
  const current = post.value

  if (current === undefined) {
    return {
      title: `Post not found — ${BLOG_TITLE}`,
      description: 'That post does not exist.',
      canonical: `${SITE_URL}/blog`,
    }
  }

  return {
    title: `${current.title} — ${BLOG_TITLE}`,
    description: current.description,
    canonical: postUrl(current.slug),
    type: 'article',
    publishedTime: current.date,
    ...(current.ogImage === undefined ? {} : { image: current.ogImage }),
  }
})

// Moving between posts should start at the top, not wherever the last one ended.
watch(slug, () => window.scrollTo({ top: 0 }))
</script>

<template>
  <div class="post-page">
    <template v-if="post">
      <nav class="post-page__breadcrumb">
        <RouterLink to="/blog">← All posts</RouterLink>
      </nav>

      <header class="post-page__header">
        <div class="post-page__meta">
          <time :datetime="post.date">{{ formatPostDate(post.date) }}</time>
          <span v-if="post.draft" class="post-page__draft">Draft</span>
        </div>

        <h1>{{ post.title }}</h1>

        <p v-if="series" class="post-page__series">
          {{ series.name }} · Part {{ series.position }} of {{ series.parts.length }}
        </p>
      </header>

      <div class="prose" v-html="rendered" />

      <nav v-if="series && (series.previous || series.next)" class="post-page__series-nav">
        <RouterLink
          v-if="series.previous"
          class="post-page__series-link"
          :to="`/blog/${series.previous.slug}`"
        >
          <span class="post-page__series-label">Previous</span>
          {{ series.previous.title }}
        </RouterLink>
        <span v-else />

        <RouterLink
          v-if="series.next"
          class="post-page__series-link post-page__series-link--next"
          :to="`/blog/${series.next.slug}`"
        >
          <span class="post-page__series-label">Next</span>
          {{ series.next.title }}
        </RouterLink>
      </nav>

      <nav v-else-if="chronological" class="post-page__series-nav">
        <RouterLink
          v-if="chronological.previous"
          class="post-page__series-link"
          :to="`/blog/${chronological.previous.slug}`"
        >
          <span class="post-page__series-label">Older</span>
          {{ chronological.previous.title }}
        </RouterLink>
        <span v-else />

        <RouterLink
          v-if="chronological.next"
          class="post-page__series-link post-page__series-link--next"
          :to="`/blog/${chronological.next.slug}`"
        >
          <span class="post-page__series-label">Newer</span>
          {{ chronological.next.title }}
        </RouterLink>
      </nav>
    </template>

    <div v-else class="post-page__missing">
      <h1>Post not found</h1>
      <p>
        No post lives at that address.
        <RouterLink to="/blog">Browse everything we have written.</RouterLink>
      </p>
    </div>
  </div>
</template>

<style scoped>
.post-page {
  width: 100%;
  max-width: 720px;
  margin: 0 auto;
  padding: 2rem;
}

.post-page__breadcrumb {
  margin-bottom: 1.5rem;
  font-size: 0.875rem;
}

.post-page__breadcrumb a {
  color: var(--wl-warm-gray);
  text-decoration: none;
}

.post-page__breadcrumb a:hover {
  color: var(--color-heading);
}

.post-page__header {
  margin-bottom: 2rem;
}

.post-page__meta {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.8125rem;
  color: var(--wl-warm-gray);
}

.post-page__draft {
  padding: 0.1rem 0.5rem;
  border-radius: 3px;
  background: var(--color-danger-bg);
  color: var(--color-danger);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-size: 0.6875rem;
}

.post-page__header h1 {
  margin: 0.5rem 0 0;
  font-family: var(--font-heading);
  font-size: 2.25rem;
  font-weight: 900;
  line-height: 1.2;
  color: var(--color-heading);
}

.post-page__series {
  margin: 0.75rem 0 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--wl-olive);
}

.post-page__series-nav {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-top: 3rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--color-border);
}

.post-page__series-link {
  display: block;
  padding: 0.875rem 1rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  background: var(--color-card);
  color: var(--color-heading);
  font-weight: 600;
  line-height: 1.4;
  text-decoration: none;
  transition: border-color 0.2s;
}

.post-page__series-link:hover {
  border-color: var(--color-border-hover);
}

.post-page__series-link--next {
  text-align: right;
}

.post-page__series-label {
  display: block;
  margin-bottom: 0.25rem;
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  font-weight: 400;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--wl-warm-gray);
}

.post-page__missing {
  padding: 3rem 0;
}

.post-page__missing h1 {
  font-family: var(--font-heading);
  font-size: 1.75rem;
  font-weight: 900;
  color: var(--color-heading);
  margin-bottom: 0.75rem;
}

@media (max-width: 600px) {
  .post-page {
    padding: 1rem;
  }

  .post-page__header h1 {
    font-size: 1.75rem;
  }

  .post-page__series-nav {
    grid-template-columns: 1fr;
  }

  .post-page__series-link--next {
    text-align: left;
  }
}
</style>
