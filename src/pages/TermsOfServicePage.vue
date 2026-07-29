<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useMarkdown } from '@/composables/useMarkdown'
import termsRaw from '@/assets/policies/terms.md?raw'

const { renderMarkdown } = useMarkdown()

const renderedHtml = ref('')
const contentEl = ref<HTMLElement | null>(null)
const generating = ref(false)
const pdfError = ref(false)

onMounted(() => {
  renderedHtml.value = renderMarkdown(termsRaw)
})

async function downloadPdf() {
  if (!contentEl.value) return

  generating.value = true
  pdfError.value = false

  try {
    const html2pdf = (await import('html2pdf.js')).default
    await html2pdf()
      .set({
        margin: [12, 12, 12, 12],
        filename: 'Koleslaw-Terms-of-Service.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      })
      .from(contentEl.value)
      .save()
  } catch {
    pdfError.value = true
  } finally {
    generating.value = false
  }
}
</script>

<template>
  <div class="policy-page">
    <div class="policy-header">
      <h1>Terms of Service</h1>
      <button
        class="download-btn"
        aria-label="Download Terms of Service as PDF"
        :disabled="generating"
        @click="downloadPdf"
      >
        <span v-if="generating" class="spinner" aria-hidden="true" />
        {{ generating ? 'Generating PDF…' : 'Download as PDF' }}
      </button>
    </div>

    <p v-if="pdfError" class="pdf-error">
      PDF generation failed.
      <a href="javascript:void(0)" role="button" @click="downloadPdf"> Try again </a>
      or use your browser's Print &rarr; Save as PDF.
    </p>

    <div ref="contentEl" class="policy-content prose" v-html="renderedHtml" />
  </div>
</template>

<style scoped>
.policy-page {
  width: 100%;
  max-width: 860px;
  margin: 0 auto;
  padding: 2rem;
}

.policy-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 2rem;
}

.policy-header h1 {
  font-family: var(--font-heading);
  font-size: 1.75rem;
  font-weight: 900;
  color: var(--color-heading);
}

.download-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1.25rem;
  border: none;
  border-radius: var(--radius);
  background: var(--color-primary);
  color: var(--wl-white);
  font-family: var(--font-body);
  font-size: 0.875rem;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.2s;
}

.download-btn:hover:not(:disabled) {
  background: var(--color-primary-hover);
}

.download-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.spinner {
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: var(--wl-white);
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.pdf-error {
  margin-bottom: 1.5rem;
  padding: 0.75rem 1rem;
  background: var(--color-danger-bg);
  color: var(--color-danger);
  border-radius: var(--radius);
  font-size: 0.875rem;
}

.pdf-error a {
  color: var(--color-danger);
  font-weight: 700;
}

/* Long-form typography lives in src/assets/prose.css, shared with the blog. */

@media (max-width: 600px) {
  .policy-page {
    padding: 1rem;
  }

  .policy-header {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
