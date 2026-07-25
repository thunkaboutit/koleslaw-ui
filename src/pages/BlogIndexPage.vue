<script setup lang="ts">
import BlogPostCard from '@/components/BlogPostCard.vue'
import { useSeo } from '@/composables/useSeo'
import { allPosts } from '@/content/posts'
import { BLOG_DESCRIPTION, BLOG_TITLE, SITE_URL } from '@/config/site'

useSeo({
  title: `${BLOG_TITLE} — koleslaw.ai`,
  description: BLOG_DESCRIPTION,
  canonical: `${SITE_URL}/blog`,
})
</script>

<template>
  <div class="blog-index">
    <header class="blog-index__header">
      <h1>{{ BLOG_TITLE }}</h1>
      <p class="blog-index__tagline">{{ BLOG_DESCRIPTION }}</p>
      <a class="blog-index__feed" href="/rss.xml">RSS</a>
    </header>

    <div v-if="allPosts.length" class="blog-index__list">
      <BlogPostCard v-for="post in allPosts" :key="post.slug" :post="post" />
    </div>

    <p v-else class="blog-index__empty">No posts yet. Check back shortly.</p>
  </div>
</template>

<style scoped>
.blog-index {
  width: 100%;
  max-width: 760px;
  margin: 0 auto;
  padding: 2rem;
}

.blog-index__header {
  margin-bottom: 1rem;
}

.blog-index__header h1 {
  font-family: var(--font-heading);
  font-size: 2rem;
  font-weight: 900;
  color: var(--color-heading);
}

.blog-index__tagline {
  margin: 0.5rem 0 0;
  max-width: 58ch;
  color: var(--wl-warm-gray);
  line-height: 1.7;
}

.blog-index__feed {
  display: inline-block;
  margin-top: 0.75rem;
  font-family: var(--font-mono);
  font-size: 0.75rem;
  letter-spacing: 0.05em;
  color: var(--wl-warm-gray);
  text-decoration-color: var(--wl-gold);
}

.blog-index__empty {
  padding: 3rem 0;
  color: var(--wl-warm-gray);
}

@media (max-width: 600px) {
  .blog-index {
    padding: 1rem;
  }
}
</style>
