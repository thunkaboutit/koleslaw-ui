<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { formatPostDate, type BlogPost } from '@/content/posts'

defineProps<{ post: BlogPost }>()
</script>

<template>
  <article class="post-card">
    <div class="post-card__meta">
      <time :datetime="post.date">{{ formatPostDate(post.date) }}</time>
      <span v-if="post.series" class="post-card__series">
        {{ post.series }} · Part {{ post.part }}
      </span>
      <span v-if="post.draft" class="post-card__draft">Draft</span>
    </div>

    <h2 class="post-card__title">
      <RouterLink :to="`/blog/${post.slug}`">{{ post.title }}</RouterLink>
    </h2>

    <p class="post-card__description">{{ post.description }}</p>

    <ul v-if="post.tags.length" class="post-card__tags">
      <li v-for="tag in post.tags" :key="tag">{{ tag }}</li>
    </ul>
  </article>
</template>

<style scoped>
.post-card {
  padding: 1.5rem 0;
  border-bottom: 1px solid var(--color-border);
}

.post-card__meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.75rem;
  font-size: 0.8125rem;
  color: var(--wl-warm-gray);
}

.post-card__series {
  font-weight: 600;
  color: var(--wl-olive);
}

.post-card__draft {
  padding: 0.1rem 0.5rem;
  border-radius: 3px;
  background: var(--color-danger-bg);
  color: var(--color-danger);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-size: 0.6875rem;
}

.post-card__title {
  margin: 0.5rem 0;
  font-family: var(--font-heading);
  font-size: 1.375rem;
  font-weight: 700;
  line-height: 1.3;
}

.post-card__title a {
  color: var(--color-heading);
  text-decoration: none;
}

.post-card__title a:hover {
  text-decoration: underline;
  text-decoration-color: var(--wl-gold);
  text-underline-offset: 3px;
}

.post-card__description {
  margin: 0;
  line-height: 1.7;
}

.post-card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin: 0.75rem 0 0;
  padding: 0;
  list-style: none;
}

.post-card__tags li {
  padding: 0.15rem 0.5rem;
  border: 1px solid var(--color-border);
  border-radius: 3px;
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: var(--wl-warm-gray);
}
</style>
