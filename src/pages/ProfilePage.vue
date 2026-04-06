<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'
import { ApiError } from '@/api/client'
import BaseButton from '@/components/BaseButton.vue'
import BaseCard from '@/components/BaseCard.vue'
import BaseModal from '@/components/BaseModal.vue'

const auth = useAuthStore()
const router = useRouter()

// --- Profile editing ---
const editName = ref(auth.user?.name ?? '')
const saving = ref(false)
const saveSuccess = ref(false)
const saveError = ref('')

async function handleSave() {
  const trimmed = editName.value.trim()
  if (!trimmed || trimmed === auth.user?.name) return
  saving.value = true
  saveError.value = ''
  saveSuccess.value = false
  try {
    await auth.updateProfile(trimmed)
    saveSuccess.value = true
    setTimeout(() => (saveSuccess.value = false), 3000)
  } catch (e) {
    saveError.value = e instanceof ApiError ? e.message : 'Failed to update profile.'
  } finally {
    saving.value = false
  }
}

const nameChanged = computed(() => editName.value.trim() !== (auth.user?.name ?? ''))

// --- Data export ---
const exporting = ref(false)

async function handleExport() {
  exporting.value = true
  try {
    const data = await auth.exportData()
    const json = JSON.stringify(data, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `koleslaw-data-export-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  } finally {
    exporting.value = false
  }
}

// --- Account deletion ---
const showDeleteModal = ref(false)
const deleteConfirmation = ref('')
const deleting = ref(false)
const deleteError = ref('')

const deleteConfirmationValid = computed(
  () => deleteConfirmation.value === auth.user?.email,
)

async function handleDelete() {
  if (!deleteConfirmationValid.value) return
  deleting.value = true
  deleteError.value = ''
  try {
    await auth.deleteAccount(deleteConfirmation.value)
    router.push('/login')
  } catch (e) {
    deleteError.value = e instanceof ApiError ? e.message : 'Failed to delete account.'
  } finally {
    deleting.value = false
  }
}

function openDeleteModal() {
  deleteConfirmation.value = ''
  deleteError.value = ''
  showDeleteModal.value = true
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function providerLabel(provider: string) {
  const labels: Record<string, string> = {
    github: 'GitHub',
    google: 'Google',
    facebook: 'Facebook',
    instagram: 'Instagram',
    local: 'Email & Password',
  }
  return labels[provider] ?? provider
}
</script>

<template>
  <div class="profile-page">
    <h1>Profile Settings</h1>

    <!-- Profile info card -->
    <BaseCard title="Profile Information">
      <form class="profile-form" @submit.prevent="handleSave">
        <div class="form-group">
          <label class="form-label" for="profile-email">Email</label>
          <input
            id="profile-email"
            class="form-input form-input--readonly"
            :value="auth.user?.email"
            readonly
            disabled
          />
          <p class="form-hint">
            Your email is linked to your {{ providerLabel(auth.user?.oauth_provider ?? '') }}
            account and cannot be changed.
          </p>
        </div>

        <div class="form-group">
          <label class="form-label" for="profile-name">Display Name</label>
          <input
            id="profile-name"
            v-model="editName"
            class="form-input"
            placeholder="Your name"
            maxlength="255"
          />
        </div>

        <div class="form-group">
          <label class="form-label">Sign-in Method</label>
          <p class="form-value">{{ providerLabel(auth.user?.oauth_provider ?? '') }}</p>
        </div>

        <div class="form-group">
          <label class="form-label">Member Since</label>
          <p class="form-value">{{ formatDate(auth.user?.created_at ?? '') }}</p>
        </div>

        <p v-if="saveError" class="form-error">{{ saveError }}</p>
        <p v-if="saveSuccess" class="form-success">Profile updated successfully.</p>

        <div class="form-actions">
          <BaseButton :disabled="!nameChanged || saving || !editName.trim()" type="submit">
            {{ saving ? 'Saving...' : 'Save Changes' }}
          </BaseButton>
        </div>
      </form>
    </BaseCard>

    <!-- Data export card -->
    <BaseCard title="Your Data">
      <p class="card-description">
        Download a copy of all personal data we store about you, including your profile information,
        API key metadata, and usage history. The export is a JSON file. Sensitive fields such as
        password hashes and internal identifiers are excluded.
      </p>
      <div class="form-actions">
        <BaseButton variant="secondary" :disabled="exporting" @click="handleExport">
          {{ exporting ? 'Preparing export...' : 'Download My Data' }}
        </BaseButton>
      </div>
    </BaseCard>

    <!-- Danger zone -->
    <BaseCard>
      <template #header>
        <h3 class="danger-title">Danger Zone</h3>
      </template>
      <div class="danger-content">
        <div class="danger-info">
          <p class="danger-heading">Delete Account</p>
          <p class="danger-description">
            Permanently delete your account and all associated data including API keys and usage
            history. This action is <strong>irreversible</strong> and cannot be undone.
          </p>
        </div>
        <BaseButton variant="danger" @click="openDeleteModal">Delete Account</BaseButton>
      </div>
    </BaseCard>

    <!-- Delete confirmation modal -->
    <BaseModal v-if="showDeleteModal" @close="showDeleteModal = false">
      <template #header>
        <h3>Delete Your Account</h3>
      </template>

      <div class="delete-modal-body">
        <p class="delete-warning">
          This will <strong>permanently delete</strong> your account and all associated data:
        </p>
        <ul class="delete-list">
          <li>Your profile information</li>
          <li>All API keys (active keys will immediately stop working)</li>
          <li>All usage history and logs</li>
        </ul>
        <p class="delete-warning">
          This action <strong>cannot be undone</strong>. There is no way to recover your account or
          data after deletion.
        </p>

        <div class="form-group">
          <label class="form-label" for="delete-confirm">
            To confirm, type your email address:
            <strong>{{ auth.user?.email }}</strong>
          </label>
          <input
            id="delete-confirm"
            v-model="deleteConfirmation"
            class="form-input"
            :placeholder="auth.user?.email"
            autocomplete="off"
            spellcheck="false"
          />
        </div>

        <p v-if="deleteError" class="form-error">{{ deleteError }}</p>
      </div>

      <template #footer>
        <BaseButton variant="secondary" @click="showDeleteModal = false">Cancel</BaseButton>
        <BaseButton
          variant="danger"
          :disabled="!deleteConfirmationValid || deleting"
          @click="handleDelete"
        >
          {{ deleting ? 'Deleting...' : 'Permanently Delete Account' }}
        </BaseButton>
      </template>
    </BaseModal>
  </div>
</template>

<style scoped>
.profile-page {
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.profile-page h1 {
  font-family: var(--font-heading);
  font-size: 1.75rem;
  font-weight: 900;
  color: var(--color-heading);
}

.profile-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.form-label {
  display: block;
  font-size: 0.875rem;
  font-weight: 600;
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

.form-input--readonly {
  background: var(--color-background-mute);
  color: var(--color-text);
  cursor: not-allowed;
  opacity: 0.7;
}

.form-hint {
  font-size: 0.8125rem;
  color: var(--color-text);
  opacity: 0.7;
  margin-top: 0.125rem;
}

.form-value {
  font-size: 0.875rem;
  color: var(--color-text);
}

.form-error {
  font-size: 0.875rem;
  color: var(--color-danger);
}

.form-success {
  font-size: 0.875rem;
  color: var(--color-success);
}

.form-actions {
  padding-top: 0.5rem;
}

.card-description {
  font-size: 0.875rem;
  color: var(--color-text);
  line-height: 1.6;
  margin-bottom: 1rem;
}

/* Danger zone */
.danger-title {
  font-family: var(--font-heading);
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-danger);
}

.danger-content {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1.5rem;
}

.danger-info {
  flex: 1;
}

.danger-heading {
  font-size: 0.9375rem;
  font-weight: 700;
  color: var(--color-heading);
  margin-bottom: 0.25rem;
}

.danger-description {
  font-size: 0.875rem;
  color: var(--color-text);
  line-height: 1.5;
}

/* Delete modal */
.delete-modal-body {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.delete-warning {
  font-size: 0.875rem;
  color: var(--color-text);
  line-height: 1.5;
}

.delete-list {
  font-size: 0.875rem;
  color: var(--color-text);
  padding-left: 1.25rem;
  margin: 0;
}

.delete-list li {
  margin-bottom: 0.25rem;
}

@media (max-width: 640px) {
  .danger-content {
    flex-direction: column;
    gap: 1rem;
  }
}
</style>
