<script setup lang="ts">
import { ref } from 'vue'
import EnhancePanel from '@/components/EnhancePanel.vue'

const isSubmitting = ref(false)
</script>

<template>
  <main class="chat-page">
    <div class="chat-page__container" :class="{ 'chat-page__container--expanded': isSubmitting }">
      <EnhancePanel @update:submitting="isSubmitting = $event" />
    </div>
  </main>
</template>

<style scoped>
.chat-page {
  flex: 1;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 3rem 2rem;
}

.chat-page__container {
  width: 100%;
  max-width: 1400px;
  display: flex;
  flex-direction: column;
}

.chat-page__container--expanded {
  flex: 1;
}

@media (max-width: 768px) {
  .chat-page {
    padding: 2rem 1rem;
  }
}
</style>
