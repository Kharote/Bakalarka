<template>
  <div class="view-container settings-view">
    <div class="view-header">
      <div class="header-content">
        <h1>{{ t('settings.title') }}</h1>
        <p>{{ t('settings.subtitle') }}</p>
      </div>
    </div>

    <div class="view-content">
      <!-- Appearance Settings -->
      <div class="settings-section">
        <div class="section-header">
          <h3>{{ t('settings.appearance') }}</h3>
          <p>{{ t('settings.appearanceDesc') }}</p>
        </div>

        <div class="settings-grid">
          <div class="setting-item">
            <div class="setting-info">
              <label>{{ t('settings.theme') }}</label>
              <span class="setting-description">{{ t('settings.themeDesc') }}</span>
            </div>
            <Dropdown 
              v-model="settings.theme"
              :options="themeOptions"
              optionLabel="label"
              optionValue="value"
              class="setting-control"
              @change="updateSetting('theme', $event.value)"
            />
          </div>

          <div class="setting-item">
            <div class="setting-info">
              <label>{{ t('settings.language') }}</label>
              <span class="setting-description">{{ t('settings.languageDesc') }}</span>
            </div>
            <Dropdown 
              v-model="userLocale"
              :options="availableLocales"
              optionLabel="name"
              optionValue="code"
              class="setting-control"
              @change="updateLocale"
            >
              <template #value="slotProps">
                <div v-if="slotProps.value" class="locale-option">
                  <span>{{ getLocaleFlag(slotProps.value) }}</span>
                  <span>{{ getLocaleName(slotProps.value) }}</span>
                </div>
              </template>
              <template #option="slotProps">
                <div class="locale-option">
                  <span>{{ slotProps.option.flag }}</span>
                  <span>{{ slotProps.option.name }}</span>
                </div>
              </template>
            </Dropdown>
          </div>
        </div>
      </div>

      <!-- Security Settings -->
      <div class="settings-section">
        <div class="section-header">
          <h3>{{ t('settings.security') }}</h3>
          <p>{{ t('settings.securityDesc') }}</p>
        </div>

        <div class="settings-grid">
          <div class="setting-item">
            <div class="setting-info">
              <label>{{ t('settings.sessionTimeout') }}</label>
              <span class="setting-description">{{ t('settings.sessionTimeoutDesc') }}</span>
            </div>
            <Dropdown 
              v-model="settings.sessionTimeout"
              :options="timeoutOptions"
              optionLabel="label"
              optionValue="value"
              class="setting-control"
              @change="updateSessionTimeout($event.value)"
            />
          </div>
        </div>
      </div>

      <!-- Notifications Info -->
      <div class="settings-section">
        <div class="section-header">
          <h3>{{ t('settings.notifications') }}</h3>
          <p>{{ t('settings.notificationsDesc') }}</p>
        </div>

        <div class="settings-grid">
          <div class="setting-item">
            <div class="setting-info">
              <label>{{ t('settings.pushNotifications') }}</label>
              <span class="setting-description">{{ t('settings.pushNotificationsDesc') }}</span>
            </div>
            <Checkbox 
              v-model="settings.pushNotifications"
              :binary="true"
              class="setting-control"
              @update:modelValue="onPushNotificationsChange"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useToast } from 'primevue/usetoast'
import { settingsAPI } from '@/services/api'
import { useLocale } from '@/composables/useLocale'
import { useTheme } from '@/composables/useTheme'
import { useAutoLogout } from '@/composables/useAutoLogout'
import Dropdown from 'primevue/dropdown'
import Checkbox from 'primevue/checkbox'

const toast = useToast()
const { locale, setLocale, availableLocales, t } = useLocale()
const { currentTheme, applyTheme } = useTheme()
const { setTimeoutMinutes } = useAutoLogout()
const userLocale = ref('en')

const isSaving = ref(false)
const loading = ref(true)

const settings = reactive({
  // Appearance
  theme: 'light',
  language: 'en',
  
  // Notifications
  pushNotifications: false,
  
  // Security
  sessionTimeout: 60
})

const themeOptions = computed(() => [
  { label: t('settings.themes.light'), value: 'light' },
  { label: t('settings.themes.dark'), value: 'dark' },
  { label: t('settings.themes.auto'), value: 'auto' }
])

const timeoutOptions = computed(() => [
  { label: t('settings.timeouts.15'), value: 15 },
  { label: t('settings.timeouts.30'), value: 30 },
  { label: t('settings.timeouts.60'), value: 60 },
  { label: t('settings.timeouts.120'), value: 120 }
])

const loadSettings = async () => {
  try {
    loading.value = true
    const response = await settingsAPI.getSettings()
    
    // Update reactive settings object
    if (response.data.settings) {
      settings.theme = response.data.settings.theme || 'light'
      settings.pushNotifications = response.data.settings.pushNotifications || false
      settings.sessionTimeout = response.data.settings.sessionTimeout || 60
    }
    
    // Load user locale
    if (response.data.user?.locale) {
      userLocale.value = response.data.user.locale
      setLocale(response.data.user.locale)
    }
    
    // Load theme from localStorage or use default
    const savedTheme = localStorage.getItem('theme') || 'light'
    settings.theme = savedTheme

    // Sync session timeout to auto-logout
    setTimeoutMinutes(settings.sessionTimeout)
    
  } catch (error) {
    console.error('Error loading settings:', error)
  } finally {
    loading.value = false
  }
}

const updateLocale = async (event) => {
  const newLocale = event.value
  isSaving.value = true
  
  try {
    await settingsAPI.updateLocale(newLocale)
    userLocale.value = newLocale
    setLocale(newLocale)
    
    toast.add({
      severity: 'success',
      summary: t('common.success'),
      detail: t('settings.messages.localeUpdated'),
      life: 2000
    })
  } catch (error) {
    console.error('Error updating locale:', error)
    toast.add({
      severity: 'error',
      summary: t('common.error'),
      detail: t('settings.messages.error'),
      life: 3000
    })
  } finally {
    isSaving.value = false
  }
}

const getLocaleFlag = (code) => {
  const loc = availableLocales.find(l => l.code === code)
  return loc?.flag || '🌐'
}

const getLocaleName = (code) => {
  const loc = availableLocales.find(l => l.code === code)
  return loc?.name || code
}

const onPushNotificationsChange = (newValue) => {
  settings.pushNotifications = newValue
  updateSetting('pushNotifications', newValue)
}

const updateSessionTimeout = (value) => {
  settings.sessionTimeout = value
  setTimeoutMinutes(value)
  updateSetting('sessionTimeout', value)
}

const updateSetting = async (key, value) => {
  // Apply theme immediately if it's being changed
  if (key === 'theme') {
    applyTheme(value)
  }
  
  isSaving.value = true
  try {
    await settingsAPI.updateSetting(key, value)
    
    toast.add({
      severity: 'success',
      summary: t('common.success'),
      detail: t('settings.messages.settingsSaved'),
      life: 2000
    })
  } catch (error) {
    console.error('Error updating setting:', error)
    toast.add({
      severity: 'error',
      summary: t('common.error'),
      detail: t('settings.messages.error'),
      life: 3000
    })
  } finally {
    isSaving.value = false
  }
}

onMounted(async () => {
  await loadSettings()
})
</script>

<style scoped>
.page-header {
  background: white;
  border-radius: 16px;
  padding: 32px;
  margin-bottom: 24px;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.page-title {
  font-size: 2rem;
  font-weight: 800;
  color: #111827;
  margin: 0 0 8px 0;
  background: linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.page-subtitle {
  color: #6b7280;
  font-size: 1.125rem;
  margin: 0;
}

.view-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.settings-section {
  background: white;
  border-radius: 16px;
  padding: 32px;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
}

.section-header {
  margin-bottom: 32px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e5e7eb;
}

.section-header h3 {
  margin: 0 0 8px 0;
  font-size: 1.375rem;
  font-weight: 700;
  color: #111827;
  line-height: 1.3;
}

.section-header p {
  margin: 0;
  color: #6b7280;
  font-size: 0.9375rem;
  line-height: 1.5;
}

.settings-grid {
  display: grid;
  gap: 24px;
}

.setting-item {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 24px;
  padding: 20px 24px;
  background: var(--color-bg-secondary, #f8fafc);
  border-radius: 12px;
  transition: all 0.2s ease;
  border: 1px solid var(--color-border, #e2e8f0);
}

.setting-item:hover {
  background: var(--color-bg-tertiary, #f1f5f9);
  border-color: var(--gray-400, #cbd5e1);
}

.setting-item.full-width {
  grid-template-columns: 1fr;
  gap: 16px;
}

.setting-item.full-width .setting-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.setting-item.danger-zone {
  background: var(--danger-50, #fef2f2);
  border: 1px solid var(--danger-200, #fecaca);
}

.setting-item.danger-zone:hover {
  background: var(--danger-100, #fee2e2);
  border-color: var(--danger-300, #fca5a5);
}

.setting-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  text-align: left;
}

.setting-control {
  flex-shrink: 0;
  min-width: 140px;
  justify-self: end;
}

.setting-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.setting-info label {
  font-weight: 600;
  color: var(--color-text-primary, #111827);
  font-size: 1rem;
  margin-bottom: 4px;
  display: block;
}

.setting-description {
  color: var(--color-text-secondary, #6b7280);
  font-size: 0.875rem;
  line-height: 1.4;
}

.setting-control {
  flex-shrink: 0;
  min-width: 140px;
}

:deep(.p-checkbox) {
  width: 20px !important;
  height: 20px !important;
}

:deep(.p-checkbox .p-checkbox-box) {
  border: 2px solid #d1d5db !important;
  background: white !important;
  width: 20px !important;
  height: 20px !important;
  border-radius: 4px !important;
  transition: all 0.2s ease !important;
}

:deep(.p-checkbox .p-checkbox-box:hover) {
  border-color: #7c3aed !important;
}

:deep(.p-checkbox .p-checkbox-box.p-highlight) {
  border-color: #7c3aed !important;
  background: #7c3aed !important;
}

:deep(.p-checkbox .p-checkbox-box .p-checkbox-icon) {
  color: white !important;
  font-size: 12px !important;
}

:deep(.p-checkbox-checked .p-checkbox-box) {
  background: #7c3aed !important;
  border-color: #7c3aed !important;
}

:deep(.p-checkbox-checked .p-checkbox-box .p-checkbox-icon) {
  color: white !important;
  font-size: 12px !important;
}

:deep(.p-checkbox .p-checkbox-icon) {
  font-size: 12px !important;
  color: white !important;
}

/* Additional fallback rules for checked state */
:deep(.p-checkbox[aria-checked="true"] .p-checkbox-box) {
  background: #7c3aed !important;
  border-color: #7c3aed !important;
}

:deep(.p-checkbox input:checked + .p-checkbox-box) {
  background: #7c3aed !important;
  border-color: #7c3aed !important;
}

:deep(.p-checkbox:not(.p-checkbox-disabled):hover .p-checkbox-box) {
  border-color: #7c3aed !important;
}

:deep(.p-inputswitch) {
  position: relative !important;
  display: inline-block !important;
  width: 38px !important;
  height: 22px !important;
}

:deep(.p-inputswitch .p-inputswitch-slider) {
  position: absolute !important;
  cursor: pointer !important;
  top: 0 !important;
  left: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
  background-color: #cbd5e1 !important;
  transition: 0.3s !important;
  border-radius: 22px !important;
  border: none !important;
}

:deep(.p-inputswitch .p-inputswitch-slider:before) {
  position: absolute !important;
  content: "" !important;
  height: 18px !important;
  width: 18px !important;
  left: 2px !important;
  bottom: 2px !important;
  background-color: white !important;
  transition: 0.3s !important;
  border-radius: 50% !important;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2) !important;
}

:deep(.p-inputswitch.p-inputswitch-checked .p-inputswitch-slider) {
  background-color: #7c3aed !important;
}

:deep(.p-inputswitch.p-inputswitch-checked .p-inputswitch-slider:before) {
  transform: translateX(16px) !important;
}

:deep(.p-inputswitch:focus .p-inputswitch-slider) {
  box-shadow: 0 0 0 2px rgba(124, 58, 237, 0.2) !important;
}

:deep(.p-inputnumber) {
  width: 60px !important;
}

:deep(.p-inputnumber-input) {
  text-align: center !important;
  padding: 6px 8px !important;
  border-radius: 6px !important;
  border: 1px solid #d1d5db !important;
  font-size: 13px !important;
  height: 32px !important;
}

:deep(.p-inputnumber-input:focus) {
  border-color: #7c3aed;
  box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.1);
}

.status-badge {
  padding: 4px 12px;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.status-badge.enabled {
  background: #dcfce7;
  color: #166534;
}

.status-badge.disabled {
  background: #fee2e2;
  color: #991b1b;
}

.settings-actions {
  background: white;
  border-radius: 16px;
  padding: 24px 32px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
  border: 2px solid #e5e7eb;
}

.save-status {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #6b7280;
  font-size: 0.875rem;
}

.save-status i.pi-check {
  color: #10b981;
}

.action-buttons {
  display: flex;
  gap: 12px;
}

@media (max-width: 768px) {
  .settings-view {
    padding: 0 16px;
  }
  
  .page-header,
  .settings-section {
    padding: 24px;
  }
  
  .setting-item {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  
  .setting-item.full-width .setting-actions {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }
}

/* Button Icon Spacing */
:deep(.p-button .p-button-icon) {
  margin-right: 10px !important;
}

:deep(.p-button .p-button-icon:last-child) {
  margin-right: 0 !important;
  margin-left: 10px !important;
}

/* Locale Option Styling */
.locale-option {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.locale-option span:first-child {
  font-size: 1.2rem;
}

:deep(.p-button.p-button-icon-only .p-button-icon) {
  margin: 0 !important;
}

:deep(.btn-primary) {
  background: linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%) !important;
  border: none !important;
  color: white !important;
  font-weight: 600 !important;
  padding: 12px 20px !important;
  border-radius: 8px !important;
  transition: all 0.2s ease !important;
}

:deep(.btn-primary:hover) {
  transform: translateY(-1px) !important;
  box-shadow: 0 8px 25px -5px rgba(124, 58, 237, 0.4) !important;
}

:deep(.btn-secondary) {
  background: #f3f4f6 !important;
  border: 1px solid #d1d5db !important;
  color: #374151 !important;
  font-weight: 600 !important;
  padding: 12px 20px !important;
  border-radius: 8px !important;
  transition: all 0.2s ease !important;
}

:deep(.btn-secondary:hover) {
  background: #e5e7eb !important;
  border-color: #9ca3af !important;
}

:deep(.btn-outline) {
  background: transparent !important;
  border: 1px solid #d1d5db !important;
  color: #374151 !important;
  font-weight: 600 !important;
  padding: 12px 20px !important;
  border-radius: 8px !important;
  transition: all 0.2s ease !important;
}

:deep(.btn-outline:hover) {
  background: #f9fafb !important;
  border-color: #6b7280 !important;
}

:deep(.btn-danger) {
  background: #dc2626 !important;
  border: none !important;
  color: white !important;
  font-weight: 600 !important;
  padding: 12px 20px !important;
  border-radius: 8px !important;
  transition: all 0.2s ease !important;
}

:deep(.btn-danger:hover) {
  background: #b91c1c !important;
  transform: translateY(-1px) !important;
}
</style>