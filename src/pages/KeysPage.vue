<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useKeysStore } from '@/stores/keys'
import BaseButton from '@/components/BaseButton.vue'
import BaseCard from '@/components/BaseCard.vue'
import BaseModal from '@/components/BaseModal.vue'
import KeyRow from '@/components/KeyRow.vue'

const keys = useKeysStore()

onMounted(() => keys.fetchKeys())

const showCreateModal = ref(false)
const newKeyName = ref('')
const creating = ref(false)

const revokeTarget = ref<string | null>(null)

async function handleCreate() {
  if (!newKeyName.value.trim()) return
  creating.value = true
  try {
    await keys.createKey(newKeyName.value.trim())
    newKeyName.value = ''
    showCreateModal.value = false
  } finally {
    creating.value = false
  }
}

async function confirmRevoke() {
  if (!revokeTarget.value) return
  await keys.revokeKey(revokeTarget.value)
  revokeTarget.value = null
}

const copied = ref(false)
async function copyKey() {
  if (!keys.newlyCreatedKey) return
  await navigator.clipboard.writeText(keys.newlyCreatedKey.key)
  copied.value = true
  setTimeout(() => (copied.value = false), 2000)
}
</script>

<template>
  <div class="keys-page">
    <div class="page-header">
      <h1>API Keys</h1>
      <BaseButton @click="showCreateModal = true">Create Key</BaseButton>
    </div>

    <p v-if="keys.error" class="error">{{ keys.error }}</p>

    <!-- Newly created key banner -->
    <div v-if="keys.newlyCreatedKey" class="new-key-banner">
      <p class="new-key-banner__label">
        Your new API key. Copy it now — you won't see it again.
      </p>
      <div class="new-key-banner__row">
        <code class="new-key-banner__key">{{ keys.newlyCreatedKey.key }}</code>
        <BaseButton variant="secondary" @click="copyKey">
          {{ copied ? 'Copied!' : 'Copy' }}
        </BaseButton>
      </div>
      <button class="new-key-banner__dismiss" @click="keys.clearNewKey">Dismiss</button>
    </div>

    <div v-if="keys.loading && !keys.keys.length" class="loading">Loading keys...</div>

    <BaseCard v-else-if="keys.keys.length">
      <div class="table-wrap">
        <table class="keys-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Key</th>
              <th>Created</th>
              <th>Last Used</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <KeyRow
              v-for="k in keys.keys"
              :key="k.id"
              :key-info="k"
              @revoke="revokeTarget = $event"
            />
          </tbody>
        </table>
      </div>
    </BaseCard>

    <div v-else class="empty">
      <p>No API keys yet.</p>
      <BaseButton @click="showCreateModal = true">Create your first key</BaseButton>
    </div>

    <!-- Create modal -->
    <BaseModal v-if="showCreateModal" @close="showCreateModal = false">
      <template #header>
        <h3>Create API Key</h3>
      </template>
      <form @submit.prevent="handleCreate">
        <label class="form-label" for="key-name">Key name</label>
        <input
          id="key-name"
          v-model="newKeyName"
          class="form-input"
          placeholder="e.g. Production, Development"
          autofocus
        />
      </form>
      <template #footer>
        <BaseButton variant="secondary" @click="showCreateModal = false">Cancel</BaseButton>
        <BaseButton :disabled="!newKeyName.trim() || creating" @click="handleCreate">
          {{ creating ? 'Creating...' : 'Create' }}
        </BaseButton>
      </template>
    </BaseModal>

    <!-- Revoke confirmation modal -->
    <BaseModal v-if="revokeTarget" @close="revokeTarget = null">
      <template #header>
        <h3>Revoke API Key</h3>
      </template>
      <p>Are you sure you want to revoke this key? This action cannot be undone. Any applications using this key will stop working.</p>
      <template #footer>
        <BaseButton variant="secondary" @click="revokeTarget = null">Cancel</BaseButton>
        <BaseButton variant="danger" @click="confirmRevoke">Revoke</BaseButton>
      </template>
    </BaseModal>
  </div>
</template>

<style scoped>
.keys-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
}

.page-header h1 {
  font-family: var(--font-heading);
  font-size: 1.75rem;
  font-weight: 900;
  color: var(--color-heading);
}

.new-key-banner {
  background: var(--color-success-bg);
  border: 1px solid var(--color-success);
  border-radius: var(--radius-lg);
  padding: 1rem 1.25rem;
  margin-bottom: 1.5rem;
}

.new-key-banner__label {
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: var(--color-heading);
}

.new-key-banner__row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}

.new-key-banner__key {
  font-family: var(--font-mono);
  font-size: 0.8125rem;
  background: var(--color-background);
  padding: 0.5rem 0.75rem;
  border-radius: var(--radius);
  overflow-x: auto;
  flex: 1;
  word-break: break-all;
}

.new-key-banner__dismiss {
  background: none;
  border: none;
  font-family: var(--font-body);
  font-size: 0.8125rem;
  color: var(--color-text);
  cursor: pointer;
  text-decoration: underline;
}

.table-wrap {
  overflow-x: auto;
  margin: -1.25rem;
}

.keys-table {
  width: 100%;
  border-collapse: collapse;
}

.keys-table th {
  text-align: left;
  padding: 0.75rem 1rem;
  font-family: var(--font-body);
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text);
  border-bottom: 1px solid var(--color-border);
}

.form-label {
  display: block;
  font-size: 0.875rem;
  font-weight: 600;
  margin-bottom: 0.375rem;
  color: var(--color-heading);
}

.form-input {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--color-border-hover);
  border-radius: var(--radius);
  background: var(--color-background);
  color: var(--color-text);
  font-family: var(--font-body);
  font-size: 0.875rem;
}

.form-input:focus {
  outline: 2px solid var(--color-primary);
  outline-offset: -1px;
}

.loading,
.empty,
.error {
  text-align: center;
  padding: 3rem 1rem;
}

.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  color: var(--color-text);
  opacity: 0.7;
}

.error {
  color: var(--color-danger);
}
</style>
