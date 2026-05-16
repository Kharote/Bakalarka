<template>
  <div class="view-container admin-settings-view">
    <div class="view-header">
      <div class="header-content">
        <h1>{{ t('adminSettings.title') }}</h1>
        <p>{{ t('adminSettings.subtitle') }}</p>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading-container">
      <i class="pi pi-spin pi-spinner" style="font-size: 2rem;"></i>
      <p>{{ t('common.loading') }}</p>
    </div>

    <div v-else class="view-content">
      <!-- Tab Navigation -->
      <div class="tab-nav">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          class="tab-btn"
          :class="{ 'active': activeTab === tab.id }"
          @click="activeTab = tab.id"
        >
          <i :class="tab.icon"></i>
          <span>{{ tab.label }}</span>
        </button>
      </div>

      <!-- AI Settings Tab -->
      <div v-if="activeTab === 'ai'" class="tab-content">
        <!-- Provider Selection -->
        <div class="settings-section">
          <div class="section-header">
            <h3>{{ t('adminSettings.aiProvider') }}</h3>
            <p>{{ t('adminSettings.aiProviderDesc') }}</p>
          </div>

          <div class="provider-cards">
            <div
              class="provider-card"
              :class="{ active: aiSettings.provider === 'gemini' }"
              @click="aiSettings.provider = 'gemini'"
            >
              <div class="provider-card-header">
                <div class="provider-radio">
                  <span class="radio-dot" :class="{ checked: aiSettings.provider === 'gemini' }"></span>
                </div>
                <div class="provider-info">
                  <h4>Google Gemini</h4>
                  <span>Google's generative AI models</span>
                </div>
              </div>
            </div>

            <div
              class="provider-card"
              :class="{ active: aiSettings.provider === 'openwebui' }"
              @click="aiSettings.provider = 'openwebui'"
            >
              <div class="provider-card-header">
                <div class="provider-radio">
                  <span class="radio-dot" :class="{ checked: aiSettings.provider === 'openwebui' }"></span>
                </div>
                <div class="provider-info">
                  <h4>OpenWebUI</h4>
                  <span>Self-hosted open-source models</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Model Restriction -->
        <div class="settings-section">
          <div class="section-header">
            <h3>{{ t('adminSettings.modelRestriction') }}</h3>
            <p>{{ t('adminSettings.modelRestrictionDesc') }}</p>
          </div>

          <div class="settings-grid">
            <div class="setting-item">
              <div class="setting-info">
                <label>{{ t('adminSettings.restrictModel') }}</label>
                <span class="setting-description">{{ t('adminSettings.restrictModelDesc') }}</span>
              </div>
              <Checkbox v-model="aiSettings.modelRestricted" :binary="true" />
            </div>

            <div v-if="aiSettings.modelRestricted" class="setting-item">
              <div class="setting-info">
                <label>{{ t('adminSettings.enforcedModel') }}</label>
                <span class="setting-description">{{ t('adminSettings.enforcedModelDesc') }}</span>
              </div>
              <Dropdown
                v-if="aiSettings.provider === 'gemini'"
                v-model="aiSettings.restrictedModel"
                :options="geminiModelOptions"
                optionLabel="label"
                optionValue="value"
                class="provider-dropdown"
                :placeholder="t('adminSettings.selectModel')"
              />
              <InputText
                v-else
                v-model="aiSettings.restrictedModel"
                class="provider-input"
                placeholder="e.g. llama3.1:latest"
              />
            </div>

            <div v-if="!aiSettings.modelRestricted" class="restriction-info-box">
              <i class="pi pi-info-circle"></i>
              <span>{{ t('adminSettings.notLimitedInfo') }}</span>
            </div>
          </div>
        </div>

        <!-- Generation Parameters -->
        <div class="settings-section">
          <div class="section-header">
            <h3>{{ t('adminSettings.aiConfig') }}</h3>
            <p>{{ t('adminSettings.aiConfigDesc') }}</p>
          </div>

          <div class="settings-grid">
            <!-- Temperature -->
            <div class="setting-item">
              <div class="setting-info">
                <label>{{ t('adminSettings.temperature') }}</label>
                <span class="setting-description">{{ t('adminSettings.temperatureDesc') }}</span>
              </div>
              <div class="slider-control">
                <Slider v-model="aiSettings.temperature" :min="0" :max="1" :step="0.1" />
                <span class="slider-value">{{ aiSettings.temperature }}</span>
              </div>
            </div>

            <!-- Max Tokens -->
            <div class="setting-item">
              <div class="setting-info">
                <label>{{ t('adminSettings.maxTokens') }}</label>
                <span class="setting-description">{{ t('adminSettings.maxTokensDesc') }}</span>
              </div>
              <InputNumber
                v-model="aiSettings.maxTokens"
                :min="1024"
                :max="32768"
                :step="1024"
                class="setting-control"
              />
            </div>
          </div>

          <div class="section-actions">
            <Button
              :label="t('adminSettings.saveSettings')"
              icon="pi pi-save"
              class="btn-save"
              :loading="savingAI"
              @click="saveAISettings"
            />
          </div>
        </div>
      </div>

      <!-- AI Prompts Tab -->
      <div v-if="activeTab === 'prompts'" class="tab-content">
        <div class="settings-section">
          <div class="section-header">
            <h3>{{ t('adminSettings.promptTemplates') }}</h3>
            <p>{{ t('adminSettings.promptTemplatesDesc') }}</p>
          </div>

          <!-- Available Variables Reference -->
          <div class="variables-reference">
            <div class="variables-header" @click="showVariables = !showVariables">
              <div class="variables-title">
                <i class="pi pi-code"></i>
                <h4>{{ t('adminSettings.availableVariables') }}</h4>
              </div>
              <i :class="showVariables ? 'pi pi-chevron-up' : 'pi pi-chevron-down'" class="toggle-icon"></i>
            </div>
            <div v-if="showVariables" class="variables-body">
              <p class="variables-info">{{ t('adminSettings.variablesInfo') }}</p>
              <div class="variables-grid">
                <div v-for="group in variableGroups" :key="group.label" class="variable-group">
                  <h5>{{ group.label }}</h5>
                  <div class="variable-tags">
                    <span
                      v-for="v in group.vars"
                      :key="v.key"
                      class="variable-tag"
                      :title="v.desc"
                    >
                      <code v-text="formatVariable(v.key)"></code>
                      <span class="var-desc">{{ v.desc }}</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Locale selector for prompts -->
          <div class="prompt-controls">
            <Dropdown
              v-model="selectedPromptLocale"
              :options="promptLocaleOptions"
              optionLabel="label"
              optionValue="value"
              :placeholder="t('adminSettings.selectLocale')"
              class="locale-dropdown"
            />
          </div>

          <!-- Prompt editors -->
          <div v-if="prompts[selectedPromptLocale]" class="prompt-list">
            <div
              v-for="(content, name) in prompts[selectedPromptLocale]"
              :key="name"
              class="prompt-card"
              :class="{ 'system-prompt': isSystemPrompt(name) }"
            >
              <div class="prompt-header">
                <div class="prompt-title">
                  <i :class="isSystemPrompt(name) ? 'pi pi-lock' : 'pi pi-file-edit'"></i>
                  <h4>{{ formatPromptName(name) }}</h4>
                  <span class="prompt-badge">{{ name }}.txt</span>
                  <span v-if="isSystemPrompt(name)" class="system-badge">{{ t('adminSettings.systemPrompt') }}</span>
                </div>
                <div class="prompt-actions">
                  <Button
                    icon="pi pi-save"
                    :label="t('common.save')"
                    size="small"
                    class="btn-save-sm"
                    :loading="savingPrompt === `${selectedPromptLocale}:${name}`"
                    @click="savePrompt(selectedPromptLocale, name)"
                  />
                  <Button
                    v-if="!isSystemPrompt(name)"
                    icon="pi pi-trash"
                    severity="danger"
                    size="small"
                    class="btn-delete-sm"
                    outlined
                    @click="confirmDeletePrompt(selectedPromptLocale, name)"
                  />
                </div>
              </div>
              <Textarea
                v-model="prompts[selectedPromptLocale][name]"
                :rows="12"
                class="prompt-editor"
                :placeholder="t('adminSettings.promptPlaceholder')"
              />
            </div>
          </div>

          <div v-else class="empty-prompts">
            <i class="pi pi-info-circle"></i>
            <p>{{ t('adminSettings.noPrompts') }}</p>
          </div>

          <!-- Add new prompt -->
          <div class="add-prompt-section">
            <h4>{{ t('adminSettings.addPrompt') }}</h4>
            <div class="add-prompt-form">
              <InputText
                v-model="newPromptName"
                :placeholder="t('adminSettings.promptNamePlaceholder')"
                class="prompt-name-input"
              />
              <Textarea
                v-model="newPromptContent"
                :rows="6"
                :placeholder="t('adminSettings.newPromptPlaceholder')"
                class="prompt-content-input"
              />
              <Button
                :label="t('adminSettings.createPrompt')"
                icon="pi pi-plus"
                class="btn-save"
                :loading="creatingPrompt"
                :disabled="!newPromptName || !newPromptContent"
                @click="createNewPrompt"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- System Tab -->
      <div v-if="activeTab === 'system'" class="tab-content">
        <div class="settings-section">
          <div class="section-header">
            <h3>{{ t('adminSettings.systemConfig') }}</h3>
            <p>{{ t('adminSettings.systemConfigDesc') }}</p>
          </div>

          <div class="settings-grid">
            <!-- Maintenance Mode -->
            <div class="setting-item">
              <div class="setting-info">
                <label>{{ t('adminSettings.maintenanceMode') }}</label>
                <span class="setting-description">{{ t('adminSettings.maintenanceModeDesc') }}</span>
              </div>
              <Checkbox v-model="systemSettings.maintenanceMode" :binary="true" class="setting-control" />
            </div>

            <!-- Maintenance Message -->
            <div v-if="systemSettings.maintenanceMode" class="setting-item full-width">
              <div class="setting-info">
                <label>{{ t('adminSettings.maintenanceMessage') }}</label>
                <span class="setting-description">{{ t('adminSettings.maintenanceMessageDesc') }}</span>
              </div>
              <Textarea
                v-model="systemSettings.maintenanceMessage"
                :rows="3"
                class="maintenance-message-input"
              />
            </div>

            <!-- Max Projects Per User -->
            <div class="setting-item">
              <div class="setting-info">
                <label>{{ t('adminSettings.maxProjects') }}</label>
                <span class="setting-description">{{ t('adminSettings.maxProjectsDesc') }}</span>
                <span class="setting-description setting-hint">{{ t('adminSettings.maxProjectsUnlimited') }}</span>
              </div>
              <InputNumber
                v-model="systemSettings.maxProjectsPerUser"
                :min="0"
                :max="500"
                class="setting-control"
              />
            </div>

            <!-- Teams Notifications (system-wide) -->
            <div class="setting-item">
              <div class="setting-info">
                <label>{{ t('adminSettings.teamsNotifications') }}</label>
                <span class="setting-description">{{ t('adminSettings.teamsNotificationsDesc') }}</span>
              </div>
              <Checkbox v-model="systemSettings.teamsEnabled" :binary="true" class="setting-control" />
            </div>
          </div>

          <div class="section-actions">
            <Button
              :label="t('adminSettings.saveSettings')"
              icon="pi pi-save"
              class="btn-save"
              :loading="savingSystem"
              @click="saveSystemSettings"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Delete Prompt Confirmation Dialog -->
    <Dialog
      v-model:visible="showDeleteDialog"
      :header="t('adminSettings.confirmDeletePrompt')"
      :modal="true"
      :style="{ width: '400px' }"
    >
      <p>{{ t('adminSettings.confirmDeletePromptDesc') }}</p>
      <template #footer>
        <Button :label="t('common.cancel')" severity="secondary" @click="showDeleteDialog = false" />
        <Button :label="t('common.delete')" severity="danger" icon="pi pi-trash" @click="executeDeletePrompt" />
      </template>
    </Dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useToast } from 'primevue/usetoast'
import { useLocale } from '@/composables/useLocale'
import { adminAPI } from '@/services/api'
import Button from 'primevue/button'
import Dropdown from 'primevue/dropdown'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Checkbox from 'primevue/checkbox'
import Textarea from 'primevue/textarea'
import Slider from 'primevue/slider'
import Dialog from 'primevue/dialog'

const toast = useToast()
const { t } = useLocale()

// State
const loading = ref(true)
const activeTab = ref('ai')
const savingAI = ref(false)
const savingSystem = ref(false)
const savingPrompt = ref(null)
const creatingPrompt = ref(false)
const showDeleteDialog = ref(false)
const deleteTarget = ref(null)

// AI Settings
const aiSettings = reactive({
  provider: 'gemini',
  geminiModel: 'gemini-2.5-flash',
  openwebuiModel: 'llama3.1:latest',
  temperature: 0.7,
  maxTokens: 8192,
  modelRestricted: false,
  restrictedModel: null
})

// System Settings
const systemSettings = reactive({
  maintenanceMode: false,
  maintenanceMessage: 'System is under maintenance. Please try again later.',
  maxProjectsPerUser: 50,
  teamsEnabled: true
})

// Prompts
const prompts = reactive({})
const promptLocales = ref([])
const selectedPromptLocale = ref('en')
const newPromptName = ref('')
const newPromptContent = ref('')
const showVariables = ref(false)

// System (mandatory) prompts that cannot be deleted
const SYSTEM_PROMPTS = ['project-tasks', 'risk-analysis', 'timeline', 'gantt-chart', 'gantt-chart-json']

function isSystemPrompt(name) {
  return SYSTEM_PROMPTS.includes(name)
}

// Available template variables grouped by context
const variableGroups = computed(() => [
  {
    label: t('adminSettings.varGroupProject'),
    vars: [
      { key: 'projectName', desc: t('adminSettings.varProjectName') },
      { key: 'projectDescription', desc: t('adminSettings.varProjectDescription') },
      { key: 'startDate', desc: t('adminSettings.varStartDate') },
      { key: 'endDate', desc: t('adminSettings.varEndDate') },
      { key: 'duration', desc: t('adminSettings.varDuration') },
      { key: 'priority', desc: t('adminSettings.varPriority') },
      { key: 'budget', desc: t('adminSettings.varBudget') },
      { key: 'tags', desc: t('adminSettings.varTags') }
    ]
  },
  {
    label: t('adminSettings.varGroupTeam'),
    vars: [
      { key: 'teamDetails', desc: t('adminSettings.varTeamDetails') },
      { key: 'totalHours', desc: t('adminSettings.varTotalHours') },
      { key: 'budgetPerHour', desc: t('adminSettings.varBudgetPerHour') }
    ]
  },
  {
    label: t('adminSettings.varGroupPriority'),
    vars: [
      { key: 'priorityGuidelines', desc: t('adminSettings.varPriorityGuidelines') },
      { key: 'priorityTaskGuidance', desc: t('adminSettings.varPriorityTaskGuidance') }
    ]
  },
  {
    label: t('adminSettings.varGroupGantt'),
    vars: [
      { key: 'tasksInfo', desc: t('adminSettings.varTasksInfo') }
    ]
  }
])

// Tabs
const tabs = computed(() => [
  { id: 'ai', label: t('adminSettings.tabAI'), icon: 'pi pi-bolt' },
  { id: 'prompts', label: t('adminSettings.tabPrompts'), icon: 'pi pi-file-edit' },
  { id: 'system', label: t('adminSettings.tabSystem'), icon: 'pi pi-server' }
])

// Options
const geminiModelOptions = [
  { label: 'Gemini 2.5 Flash', value: 'gemini-2.5-flash' },
  { label: 'Gemini 2.5 Pro', value: 'gemini-2.5-pro' },
  { label: 'Gemini 2.0 Flash', value: 'gemini-2.0-flash' },
  { label: 'Gemini 1.5 Pro', value: 'gemini-1.5-pro' },
  { label: 'Gemini 1.5 Flash', value: 'gemini-1.5-flash' }
]

const promptLocaleOptions = computed(() =>
  promptLocales.value.map(l => ({
    label: l === 'en' ? '🇬🇧 English' : l === 'sk' ? '🇸🇰 Slovenčina' : l,
    value: l
  }))
)

// Load all data
onMounted(async () => {
  try {
    await Promise.all([loadSettings(), loadPrompts()])
  } catch (err) {
    console.error('Failed to load admin settings:', err)
    toast.add({
      severity: 'error',
      summary: t('common.error'),
      detail: t('adminSettings.loadError'),
      life: 5000
    })
  } finally {
    loading.value = false
  }
})

async function loadSettings() {
  const { data } = await adminAPI.getSettings()
  if (data.success && data.settings) {
    const s = data.settings

    // Map flat settings into reactive objects
    const findVal = (category, key) => {
      const items = s[category] || []
      const item = items.find(i => i.key === key)
      return item?.value
    }

    // AI
    const providerVal = findVal('ai', 'ai.provider')
    if (providerVal) aiSettings.provider = providerVal.provider

    const geminiVal = findVal('ai', 'ai.gemini.model')
    if (geminiVal) aiSettings.geminiModel = geminiVal.model

    const openwebuiVal = findVal('ai', 'ai.openwebui.model')
    if (openwebuiVal) aiSettings.openwebuiModel = openwebuiVal.model

    const tempVal = findVal('ai', 'ai.temperature')
    if (tempVal) aiSettings.temperature = tempVal.temperature

    const tokensVal = findVal('ai', 'ai.maxTokens')
    if (tokensVal) aiSettings.maxTokens = tokensVal.maxTokens

    const restrictionVal = findVal('ai', 'ai.modelRestriction')
    if (restrictionVal) {
      aiSettings.modelRestricted = restrictionVal.restricted || false
      aiSettings.restrictedModel = restrictionVal.model || null
    }

    // System
    const maintVal = findVal('system', 'system.maintenanceMode')
    if (maintVal) {
      systemSettings.maintenanceMode = maintVal.enabled
      systemSettings.maintenanceMessage = maintVal.message
    }

    const maxProjVal = findVal('system', 'system.maxProjectsPerUser')
    if (maxProjVal) systemSettings.maxProjectsPerUser = maxProjVal.limit

    // Notifications
    const teamsVal = findVal('notifications', 'notifications.teamsEnabled')
    if (teamsVal) systemSettings.teamsEnabled = teamsVal.enabled
  }
}

async function loadPrompts() {
  const { data } = await adminAPI.getPrompts()
  if (data.success) {
    promptLocales.value = data.locales || []
    // Populate reactive prompts
    for (const locale of data.locales) {
      prompts[locale] = data.prompts[locale] || {}
    }
    if (promptLocales.value.length > 0 && !promptLocales.value.includes(selectedPromptLocale.value)) {
      selectedPromptLocale.value = promptLocales.value[0]
    }
  }
}

async function saveAISettings() {
  savingAI.value = true
  try {
    await adminAPI.updateMultipleSettings([
      { key: 'ai.provider', value: { provider: aiSettings.provider } },
      { key: 'ai.gemini.model', value: { model: aiSettings.geminiModel } },
      { key: 'ai.openwebui.model', value: { model: aiSettings.openwebuiModel } },
      { key: 'ai.temperature', value: { temperature: aiSettings.temperature } },
      { key: 'ai.maxTokens', value: { maxTokens: aiSettings.maxTokens } },
      { key: 'ai.modelRestriction', value: { restricted: aiSettings.modelRestricted, model: aiSettings.modelRestricted ? aiSettings.restrictedModel : null } }
    ])
    toast.add({
      severity: 'success',
      summary: t('common.success'),
      detail: t('adminSettings.settingsSaved'),
      life: 3000
    })
  } catch (err) {
    console.error('Failed to save AI settings:', err)
    toast.add({
      severity: 'error',
      summary: t('common.error'),
      detail: t('adminSettings.saveError'),
      life: 5000
    })
  } finally {
    savingAI.value = false
  }
}

async function saveSystemSettings() {
  savingSystem.value = true
  try {
    await adminAPI.updateMultipleSettings([
      { key: 'system.maintenanceMode', value: { enabled: systemSettings.maintenanceMode, message: systemSettings.maintenanceMessage } },
      { key: 'system.maxProjectsPerUser', value: { limit: systemSettings.maxProjectsPerUser } },
      { key: 'notifications.teamsEnabled', value: { enabled: systemSettings.teamsEnabled } }
    ])
    toast.add({
      severity: 'success',
      summary: t('common.success'),
      detail: t('adminSettings.settingsSaved'),
      life: 3000
    })
  } catch (err) {
    console.error('Failed to save system settings:', err)
    toast.add({
      severity: 'error',
      summary: t('common.error'),
      detail: t('adminSettings.saveError'),
      life: 5000
    })
  } finally {
    savingSystem.value = false
  }
}

async function savePrompt(locale, name) {
  savingPrompt.value = `${locale}:${name}`
  try {
    await adminAPI.updatePrompt(locale, name, prompts[locale][name])
    toast.add({
      severity: 'success',
      summary: t('common.success'),
      detail: t('adminSettings.promptSaved'),
      life: 3000
    })
  } catch (err) {
    console.error('Failed to save prompt:', err)
    toast.add({
      severity: 'error',
      summary: t('common.error'),
      detail: t('adminSettings.promptSaveError'),
      life: 5000
    })
  } finally {
    savingPrompt.value = null
  }
}

async function createNewPrompt() {
  creatingPrompt.value = true
  try {
    const safeName = newPromptName.value.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    await adminAPI.createPrompt(selectedPromptLocale.value, safeName, newPromptContent.value)

    // Add to local state
    if (!prompts[selectedPromptLocale.value]) {
      prompts[selectedPromptLocale.value] = {}
    }
    prompts[selectedPromptLocale.value][safeName] = newPromptContent.value

    newPromptName.value = ''
    newPromptContent.value = ''

    toast.add({
      severity: 'success',
      summary: t('common.success'),
      detail: t('adminSettings.promptCreated'),
      life: 3000
    })
  } catch (err) {
    console.error('Failed to create prompt:', err)
    toast.add({
      severity: 'error',
      summary: t('common.error'),
      detail: err.response?.data?.error || t('adminSettings.promptCreateError'),
      life: 5000
    })
  } finally {
    creatingPrompt.value = false
  }
}

function confirmDeletePrompt(locale, name) {
  deleteTarget.value = { locale, name }
  showDeleteDialog.value = true
}

async function executeDeletePrompt() {
  if (!deleteTarget.value) return
  const { locale, name } = deleteTarget.value
  try {
    await adminAPI.deletePrompt(locale, name)
    delete prompts[locale][name]
    toast.add({
      severity: 'success',
      summary: t('common.success'),
      detail: t('adminSettings.promptDeleted'),
      life: 3000
    })
  } catch (err) {
    console.error('Failed to delete prompt:', err)
    toast.add({
      severity: 'error',
      summary: t('common.error'),
      detail: t('adminSettings.promptDeleteError'),
      life: 5000
    })
  } finally {
    showDeleteDialog.value = false
    deleteTarget.value = null
  }
}

function formatPromptName(name) {
  return name
    .replace(/-/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase())
}

function formatVariable(key) {
  return `{{${key}}}`
}
</script>

<style scoped>
.admin-settings-view {
  max-width: 1400px;
  margin: 0 auto;
}

/* ---- Header ---- */
.view-header {
  margin-bottom: 1.75rem;
}

.view-header h1 {
  margin: 0;
  font-size: 2rem;
  font-weight: 800;
  color: #111827;
}

.view-header p {
  margin: 0.25rem 0 0;
  color: #6b7280;
  font-size: 1rem;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 5rem;
  color: #6b7280;
  gap: 1rem;
}

/* ---- Tabs ---- */
.tab-nav {
  display: flex;
  gap: 0;
  margin-bottom: 1.75rem;
  border-bottom: 2px solid #e5e7eb;
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.875rem 1.5rem;
  border: none;
  background: none;
  color: #6b7280;
  font-size: 0.9375rem;
  font-weight: 600;
  cursor: pointer;
  border-bottom: 3px solid transparent;
  margin-bottom: -2px;
  transition: all 0.2s ease;
  border-radius: 8px 8px 0 0;
}

.tab-btn:hover {
  color: #7c3aed;
  background: rgba(124, 58, 237, 0.04);
}

.tab-btn.active {
  color: #7c3aed;
  border-bottom-color: #7c3aed;
  background: rgba(124, 58, 237, 0.06);
}

.tab-btn i {
  font-size: 1.05rem;
}

/* ---- Settings sections (cards) ---- */
.settings-section {
  background: white;
  border-radius: 16px;
  padding: 28px 32px;
  margin-bottom: 1.5rem;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
  border: 1px solid #e5e7eb;
}

.section-header {
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #e5e7eb;
}

.section-header h3 {
  margin: 0 0 6px 0;
  font-size: 1.3rem;
  font-weight: 700;
  color: #111827;
}

.section-header p {
  margin: 0;
  color: #6b7280;
  font-size: 0.9rem;
  line-height: 1.5;
}

/* ---- Provider cards (AI tab) ---- */
.provider-cards {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.provider-card {
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  padding: 1.25rem;
  cursor: pointer;
  transition: all 0.2s ease;
  background: #fafafa;
}

.provider-card:hover {
  border-color: #c4b5fd;
  background: #faf5ff;
}

.provider-card.active {
  border-color: #7c3aed;
  background: #f5f0ff;
  box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.12);
}

.provider-card-header {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
}

.provider-radio {
  margin-top: 2px;
  flex-shrink: 0;
}

.radio-dot {
  display: block;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 2px solid #d1d5db;
  background: white;
  position: relative;
  transition: all 0.2s ease;
}

.radio-dot.checked {
  border-color: #7c3aed;
  background: white;
}

.radio-dot.checked::after {
  content: '';
  position: absolute;
  top: 3px;
  left: 3px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #7c3aed;
}

.provider-info h4 {
  margin: 0 0 2px 0;
  font-size: 1rem;
  font-weight: 700;
  color: #111827;
}

.provider-info span {
  font-size: 0.825rem;
  color: #6b7280;
}

.provider-config {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #e5e7eb;
}

.provider-config label {
  display: block;
  font-size: 0.825rem;
  font-weight: 600;
  color: #374151;
  margin-bottom: 0.5rem;
}

.provider-dropdown,
.provider-input {
  width: 100% !important;
}

/* ---- Setting items (rows) ---- */
.settings-grid {
  display: grid;
  gap: 16px;
}

.setting-item {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 24px;
  padding: 18px 22px;
  background: #f8fafc;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  transition: all 0.2s ease;
}

.setting-item:hover {
  background: #f1f5f9;
  border-color: #cbd5e1;
}

.restriction-info-box {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 18px;
  background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%);
  border: 1px solid #86efac;
  border-radius: 10px;
  color: #166534;
  font-size: 0.875rem;
  font-weight: 500;
}

.restriction-info-box i {
  font-size: 1.1rem;
  color: #22c55e;
}

.setting-item.full-width {
  grid-template-columns: 1fr;
  gap: 12px;
}

.maintenance-message-input {
  width: 100% !important;
  font-size: 0.875rem;
  resize: vertical;
}

.setting-info {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.setting-info label {
  font-weight: 600;
  color: #111827;
  font-size: 0.9375rem;
}

.setting-description {
  color: #6b7280;
  font-size: 0.8125rem;
  line-height: 1.4;
}

.setting-hint {
  color: #4f46e5;
  font-style: italic;
  font-size: 0.75rem;
}

.setting-control {
  justify-self: end;
  flex-shrink: 0;
}

/* Slider */
.slider-control {
  display: flex;
  align-items: center;
  gap: 1rem;
  min-width: 220px;
  justify-self: end;
}

.slider-control :deep(.p-slider) {
  flex: 1;
}

.slider-value {
  font-weight: 700;
  font-size: 1rem;
  color: #7c3aed;
  min-width: 2rem;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

/* Section bottom actions */
.section-actions {
  margin-top: 1.75rem;
  padding-top: 1.25rem;
  border-top: 1px solid #e5e7eb;
  display: flex;
  justify-content: flex-end;
}

/* ---- Variables Reference Panel ---- */
.variables-reference {
  margin-bottom: 1.5rem;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  overflow: hidden;
  background: #fafbfc;
}

.variables-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  cursor: pointer;
  user-select: none;
  transition: background 0.15s;
}

.variables-header:hover {
  background: #f1f5f9;
}

.variables-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.variables-title i {
  color: #7c3aed;
  font-size: 1rem;
}

.variables-title h4 {
  margin: 0;
  font-size: 0.9375rem;
  font-weight: 600;
  color: #111827;
}

.toggle-icon {
  color: #6b7280;
  font-size: 0.85rem;
}

.variables-body {
  padding: 0 18px 18px;
  border-top: 1px solid #e2e8f0;
}

.variables-info {
  margin: 12px 0;
  color: #6b7280;
  font-size: 0.8125rem;
  line-height: 1.5;
}

.variables-grid {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.variable-group h5 {
  margin: 0 0 8px 0;
  font-size: 0.8125rem;
  font-weight: 700;
  color: #374151;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.variable-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.variable-tag {
  display: inline-flex;
  flex-direction: column;
  padding: 6px 10px;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 0.8rem;
  transition: all 0.15s;
}

.variable-tag:hover {
  border-color: #c4b5fd;
  background: #faf5ff;
}

.variable-tag code {
  font-family: 'Fira Code', 'Cascadia Code', 'Consolas', monospace;
  font-size: 0.75rem;
  font-weight: 600;
  color: #7c3aed;
}

.var-desc {
  font-size: 0.7rem;
  color: #6b7280;
  margin-top: 2px;
}

/* ---- System prompt styling ---- */
.system-prompt {
  border-color: #c4b5fd !important;
}

.system-prompt .prompt-header {
  background: #faf5ff !important;
}

.system-badge {
  font-size: 0.65rem;
  background: linear-gradient(135deg, #7c3aed, #5b21b6);
  color: white;
  padding: 2px 8px;
  border-radius: 20px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

/* ---- Prompt styles ---- */
.prompt-controls {
  margin-bottom: 1.5rem;
}

.locale-dropdown {
  min-width: 220px;
}

.prompt-list {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.prompt-card {
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  overflow: hidden;
  background: white;
  transition: border-color 0.2s;
}

.prompt-card:hover {
  border-color: #c4b5fd;
}

.prompt-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
}

.prompt-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.prompt-title i {
  color: #7c3aed;
  font-size: 1rem;
}

.prompt-title h4 {
  margin: 0;
  font-size: 0.9375rem;
  font-weight: 600;
  color: #111827;
}

.prompt-badge {
  font-size: 0.7rem;
  background: linear-gradient(135deg, #7c3aed, #5b21b6);
  color: white;
  padding: 2px 10px;
  border-radius: 20px;
  font-family: 'Fira Code', 'Cascadia Code', monospace;
  font-weight: 500;
}

.prompt-actions {
  display: flex;
  gap: 0.5rem;
}

.prompt-editor {
  width: 100%;
  font-family: 'Fira Code', 'Cascadia Code', 'Consolas', monospace;
  font-size: 0.825rem;
  line-height: 1.6;
  resize: vertical;
}

:deep(.prompt-editor.p-textarea) {
  border: none !important;
  border-radius: 0 !important;
  box-shadow: none !important;
  padding: 16px !important;
  background: #fcfcfd !important;
}

:deep(.prompt-editor.p-textarea:focus) {
  background: white !important;
}

.empty-prompts {
  text-align: center;
  padding: 3rem 2rem;
  color: #6b7280;
}

.empty-prompts i {
  font-size: 2.5rem;
  margin-bottom: 0.75rem;
  display: block;
  color: #d1d5db;
}

/* Add prompt */
.add-prompt-section {
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid #e5e7eb;
}

.add-prompt-section h4 {
  margin: 0 0 1rem;
  font-size: 1rem;
  font-weight: 700;
  color: #111827;
}

.add-prompt-form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.prompt-name-input {
  max-width: 400px;
}

.prompt-content-input {
  font-family: 'Fira Code', 'Cascadia Code', 'Consolas', monospace;
  font-size: 0.825rem;
}

/* ================================================
   PrimeVue Component Overrides (deep)
   ================================================ */

/* --- Buttons --- */
:deep(.btn-save) {
  background: linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%) !important;
  border: none !important;
  color: white !important;
  font-weight: 600 !important;
  padding: 10px 24px !important;
  border-radius: 10px !important;
  font-size: 0.9rem !important;
  transition: all 0.2s ease !important;
  box-shadow: 0 2px 8px rgba(124, 58, 237, 0.25) !important;
}

:deep(.btn-save:hover) {
  transform: translateY(-1px) !important;
  box-shadow: 0 6px 20px rgba(124, 58, 237, 0.35) !important;
}

:deep(.btn-save:active) {
  transform: translateY(0) !important;
}

:deep(.btn-save .p-button-icon) {
  margin-right: 8px !important;
}

:deep(.btn-save-sm) {
  background: linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%) !important;
  border: none !important;
  color: white !important;
  font-weight: 600 !important;
  padding: 6px 16px !important;
  border-radius: 8px !important;
  font-size: 0.8rem !important;
  transition: all 0.2s ease !important;
}

:deep(.btn-save-sm:hover) {
  box-shadow: 0 4px 12px rgba(124, 58, 237, 0.3) !important;
}

:deep(.btn-save-sm .p-button-icon) {
  margin-right: 6px !important;
  font-size: 0.8rem !important;
}

:deep(.btn-delete-sm) {
  border: 1px solid #fca5a5 !important;
  color: #dc2626 !important;
  background: transparent !important;
  padding: 6px 12px !important;
  border-radius: 8px !important;
  font-size: 0.8rem !important;
  transition: all 0.2s ease !important;
}

:deep(.btn-delete-sm:hover) {
  background: #fef2f2 !important;
  border-color: #ef4444 !important;
  color: #b91c1c !important;
}

:deep(.btn-delete-sm .p-button-icon) {
  margin-right: 0 !important;
  font-size: 0.85rem !important;
}

/* Dialog buttons */
:deep(.p-dialog-footer .p-button) {
  padding: 8px 20px !important;
  border-radius: 8px !important;
  font-weight: 600 !important;
  font-size: 0.875rem !important;
}

/* --- Checkbox --- */
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

/* Fallback selectors for checked state */
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

/* --- Dropdown --- */
:deep(.p-dropdown) {
  border: 1px solid #d1d5db !important;
  border-radius: 10px !important;
  background: white !important;
  transition: all 0.2s ease !important;
  min-width: 200px !important;
}

:deep(.p-dropdown:hover) {
  border-color: #a78bfa !important;
}

:deep(.p-dropdown.p-focus),
:deep(.p-dropdown:focus) {
  border-color: #7c3aed !important;
  box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.12) !important;
}

:deep(.p-dropdown .p-dropdown-label) {
  padding: 8px 12px !important;
  font-size: 0.875rem !important;
  color: #111827 !important;
}

:deep(.p-dropdown .p-dropdown-trigger) {
  color: #6b7280 !important;
  width: 2.5rem !important;
}

:deep(.p-dropdown-panel) {
  border-radius: 10px !important;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.12) !important;
  border: 1px solid #e5e7eb !important;
}

:deep(.p-dropdown-item) {
  padding: 8px 14px !important;
  font-size: 0.875rem !important;
  transition: background 0.15s !important;
}

:deep(.p-dropdown-item.p-highlight) {
  background: #f5f3ff !important;
  color: #7c3aed !important;
}

:deep(.p-dropdown-item:hover) {
  background: #f9fafb !important;
}

/* --- InputText --- */
:deep(.p-inputtext) {
  border: 1px solid #d1d5db !important;
  border-radius: 10px !important;
  padding: 9px 14px !important;
  font-size: 0.875rem !important;
  color: #111827 !important;
  transition: all 0.2s ease !important;
  background: white !important;
}

:deep(.p-inputtext:hover) {
  border-color: #a78bfa !important;
}

:deep(.p-inputtext:focus) {
  border-color: #7c3aed !important;
  box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.12) !important;
}

:deep(.p-inputtext:disabled) {
  background: #f3f4f6 !important;
  color: #9ca3af !important;
  cursor: not-allowed !important;
}

/* --- InputNumber --- */
:deep(.p-inputnumber) {
  width: auto !important;
}

:deep(.p-inputnumber .p-inputnumber-input) {
  border: 1px solid #d1d5db !important;
  border-radius: 10px !important;
  padding: 9px 14px !important;
  font-size: 0.875rem !important;
  text-align: center !important;
  width: 120px !important;
  color: #111827 !important;
  transition: all 0.2s ease !important;
}

:deep(.p-inputnumber .p-inputnumber-input:hover) {
  border-color: #a78bfa !important;
}

:deep(.p-inputnumber .p-inputnumber-input:focus) {
  border-color: #7c3aed !important;
  box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.12) !important;
}

/* --- Slider --- */
:deep(.p-slider) {
  background: #e2e8f0 !important;
  border: none !important;
  height: 6px !important;
  border-radius: 6px !important;
}

:deep(.p-slider .p-slider-range) {
  background: linear-gradient(90deg, #7c3aed, #a78bfa) !important;
  border-radius: 6px !important;
}

:deep(.p-slider .p-slider-handle) {
  width: 20px !important;
  height: 20px !important;
  background: white !important;
  border: 3px solid #7c3aed !important;
  border-radius: 50% !important;
  box-shadow: 0 2px 6px rgba(124, 58, 237, 0.25) !important;
  transition: all 0.2s ease !important;
  margin-top: -8px !important;
}

:deep(.p-slider .p-slider-handle:hover) {
  transform: scale(1.15);
  box-shadow: 0 3px 12px rgba(124, 58, 237, 0.35) !important;
}

:deep(.p-slider:not(.p-disabled):hover) {
  background: #cbd5e1 !important;
}

/* --- Textarea --- */
:deep(.p-textarea) {
  border: 1px solid #d1d5db !important;
  border-radius: 10px !important;
  padding: 12px 14px !important;
  font-size: 0.875rem !important;
  color: #111827 !important;
  transition: all 0.2s ease !important;
}

:deep(.p-textarea:hover) {
  border-color: #a78bfa !important;
}

:deep(.p-textarea:focus) {
  border-color: #7c3aed !important;
  box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.12) !important;
}

/* --- Dialog --- */
:deep(.p-dialog) {
  border-radius: 16px !important;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15) !important;
}

:deep(.p-dialog .p-dialog-header) {
  border-bottom: 1px solid #e5e7eb !important;
  padding: 18px 24px !important;
  font-weight: 700 !important;
}

:deep(.p-dialog .p-dialog-content) {
  padding: 24px !important;
}

:deep(.p-dialog .p-dialog-footer) {
  border-top: 1px solid #e5e7eb !important;
  padding: 14px 24px !important;
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

/* Button icon spacing */
:deep(.p-button .p-button-icon) {
  margin-right: 8px !important;
}

:deep(.p-button.p-button-icon-only .p-button-icon) {
  margin: 0 !important;
}

/* ---- Responsive ---- */
@media (max-width: 768px) {
  .admin-settings-view {
    max-width: 100%;
  }

  .settings-section {
    padding: 20px;
  }

  .provider-cards {
    grid-template-columns: 1fr;
  }

  .setting-item {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .setting-control,
  .slider-control {
    justify-self: start;
    width: 100%;
  }

  .slider-control {
    min-width: unset;
  }

  .tab-nav {
    overflow-x: auto;
  }

  .tab-btn {
    white-space: nowrap;
  }

  .prompt-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }
}

/* ---- Dark mode ---- */
.dark-theme .settings-section {
  background: var(--color-bg-primary, #1e293b);
  border-color: var(--color-border, #334155);
}

.dark-theme .setting-item {
  background: var(--color-bg-tertiary, #334155);
  border-color: var(--color-border, #475569);
}

.dark-theme .setting-item:hover {
  background: #3b4560;
  border-color: #5b6580;
}

.dark-theme .provider-card {
  background: var(--color-bg-tertiary, #334155);
  border-color: var(--color-border, #475569);
}

.dark-theme .provider-card:hover {
  background: #3b4560;
}

.dark-theme .provider-card.active {
  background: #2d2050;
  border-color: #7c3aed;
}

.dark-theme .section-header {
  border-color: var(--color-border, #475569);
}

.dark-theme .view-header h1 {
  color: var(--color-text-primary, #f1f5f9);
}

.dark-theme .view-header p {
  color: var(--color-text-secondary, #94a3b8);
}

.dark-theme .section-header h3,
.dark-theme .provider-info h4,
.dark-theme .setting-info label {
  color: var(--color-text-primary, #f1f5f9);
}

.dark-theme .section-header p,
.dark-theme .setting-description,
.dark-theme .provider-info span {
  color: var(--color-text-secondary, #94a3b8);
}

.dark-theme .prompt-card {
  border-color: var(--color-border, #475569);
  background: var(--color-bg-primary, #1e293b);
}

.dark-theme .prompt-header {
  background: var(--color-bg-tertiary, #334155);
  border-color: var(--color-border, #475569);
}

.dark-theme .prompt-title h4 {
  color: var(--color-text-primary, #f1f5f9);
}

.dark-theme .prompt-title i {
  color: #a78bfa;
}

.dark-theme .prompt-badge {
  background: linear-gradient(135deg, #6d28d9, #4c1d95);
}

.dark-theme .prompt-card:hover {
  border-color: #7c3aed;
}

/* Dark mode: System prompt */
.dark-theme .system-prompt {
  border-color: #6d28d9 !important;
}

.dark-theme .system-prompt .prompt-header {
  background: rgba(124, 58, 237, 0.15) !important;
}

/* Dark mode: Prompt editor content area — moved to unscoped style block */

/* Dark mode: Tabs */
.dark-theme .tab-nav {
  border-color: var(--color-border, #475569);
}

.dark-theme .tab-btn {
  color: var(--color-text-secondary, #94a3b8);
}

.dark-theme .tab-btn:hover {
  color: #a78bfa;
  background: rgba(124, 58, 237, 0.1);
}

.dark-theme .tab-btn.active {
  color: #a78bfa;
  background: rgba(124, 58, 237, 0.15);
}

/* Dark mode: Variables reference */
.dark-theme .variables-reference {
  background: var(--color-bg-tertiary, #334155);
  border-color: var(--color-border, #475569);
}

.dark-theme .variables-header:hover {
  background: #3b4560;
}

.dark-theme .variables-title h4 {
  color: var(--color-text-primary, #f1f5f9);
}

.dark-theme .variables-body {
  border-color: var(--color-border, #475569);
}

.dark-theme .variables-info {
  color: var(--color-text-secondary, #94a3b8);
}

.dark-theme .variable-group h5 {
  color: var(--color-text-secondary, #94a3b8);
}

.dark-theme .variable-tag {
  background: var(--color-bg-primary, #1e293b);
  border-color: var(--color-border, #475569);
}

.dark-theme .variable-tag:hover {
  border-color: #7c3aed;
  background: rgba(124, 58, 237, 0.1);
}

.dark-theme .var-desc {
  color: var(--color-text-tertiary, #64748b);
}

/* Dark mode: Radio dot */
.dark-theme .radio-dot {
  background: var(--color-bg-tertiary, #334155);
  border-color: #64748b;
}

.dark-theme .radio-dot.checked {
  border-color: #a78bfa;
  background: var(--color-bg-primary, #1e293b);
}

/* Dark mode: Provider config */
.dark-theme .provider-config {
  border-color: var(--color-border, #475569);
}

.dark-theme .provider-config label {
  color: var(--color-text-secondary, #94a3b8);
}

/* Dark mode: Add prompt section */
.dark-theme .add-prompt-section {
  border-color: var(--color-border, #475569);
}

.dark-theme .add-prompt-section h4 {
  color: var(--color-text-primary, #f1f5f9);
}

/* Dark mode: Section actions */
.dark-theme .section-actions {
  border-color: var(--color-border, #475569);
}

/* Dark mode: Restriction info box */
.dark-theme .restriction-info-box {
  background: rgba(34, 197, 94, 0.1);
  border-color: rgba(34, 197, 94, 0.3);
  color: #86efac;
}

/* Dark mode: Slider value */
.dark-theme .slider-value {
  color: #a78bfa;
}

/* Dark mode: Setting hint */
.dark-theme .setting-hint {
  color: #a78bfa;
}

/* Dark mode: Form helper */
.dark-theme .form-helper {
  color: var(--color-text-secondary, #94a3b8);
}

/* Dark mode: Empty prompts */
.dark-theme .empty-prompts {
  color: var(--color-text-secondary, #94a3b8);
}

.dark-theme .empty-prompts i {
  color: #64748b;
}

/* Dark mode PrimeVue overrides — see unscoped style block below */
</style>

<!-- Unscoped style block for dark-mode PrimeVue overrides.
     .dark-theme is on <html>, so scoped :deep() selectors can't reach it.
     We use .admin-settings-view to limit scope to this component. -->
<style>
.dark-theme .admin-settings-view .prompt-editor.p-textarea {
  background: var(--color-bg-primary, #1e293b) !important;
  color: var(--color-text-primary, #f1f5f9) !important;
  border-color: transparent !important;
}

.dark-theme .admin-settings-view .prompt-editor.p-textarea:focus {
  background: var(--color-bg-secondary, #0f172a) !important;
}

.dark-theme .admin-settings-view .p-inputtext {
  background: var(--color-bg-tertiary, #334155) !important;
  border-color: #475569 !important;
  color: var(--color-text-primary, #f1f5f9) !important;
}

.dark-theme .admin-settings-view .p-inputtext:hover {
  border-color: #7c3aed !important;
}

.dark-theme .admin-settings-view .p-inputtext:focus {
  border-color: #a78bfa !important;
  box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.2) !important;
}

.dark-theme .admin-settings-view .p-inputtext:disabled {
  background: var(--color-bg-secondary, #0f172a) !important;
  color: #64748b !important;
}

.dark-theme .admin-settings-view .p-inputnumber .p-inputnumber-input {
  background: var(--color-bg-tertiary, #334155) !important;
  border-color: #475569 !important;
  color: var(--color-text-primary, #f1f5f9) !important;
}

.dark-theme .admin-settings-view .p-inputnumber .p-inputnumber-input:hover {
  border-color: #7c3aed !important;
}

.dark-theme .admin-settings-view .p-inputnumber .p-inputnumber-input:focus {
  border-color: #a78bfa !important;
  box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.2) !important;
}

.dark-theme .admin-settings-view .p-dropdown {
  background: var(--color-bg-tertiary, #334155) !important;
  border-color: #475569 !important;
}

.dark-theme .admin-settings-view .p-dropdown:hover {
  border-color: #7c3aed !important;
}

.dark-theme .admin-settings-view .p-dropdown .p-dropdown-label {
  color: var(--color-text-primary, #f1f5f9) !important;
}

.dark-theme .admin-settings-view .p-dropdown .p-dropdown-trigger {
  color: #94a3b8 !important;
}

/* Dropdown panel is teleported outside the component tree */
.dark-theme .p-dropdown-panel {
  background: var(--color-bg-primary, #1e293b) !important;
  border-color: #475569 !important;
}

.dark-theme .p-dropdown-panel .p-dropdown-item {
  color: var(--color-text-primary, #f1f5f9) !important;
}

.dark-theme .p-dropdown-panel .p-dropdown-item:hover {
  background: var(--color-bg-tertiary, #334155) !important;
}

.dark-theme .p-dropdown-panel .p-dropdown-item.p-highlight {
  background: rgba(124, 58, 237, 0.2) !important;
  color: #a78bfa !important;
}

.dark-theme .admin-settings-view .p-textarea {
  background: var(--color-bg-tertiary, #334155) !important;
  border-color: #475569 !important;
  color: var(--color-text-primary, #f1f5f9) !important;
}

.dark-theme .admin-settings-view .p-textarea:hover {
  border-color: #7c3aed !important;
}

.dark-theme .admin-settings-view .p-textarea:focus {
  border-color: #a78bfa !important;
  box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.2) !important;
}

.dark-theme .admin-settings-view .p-checkbox .p-checkbox-box {
  background: var(--color-bg-tertiary, #334155) !important;
  border-color: #64748b !important;
}

.dark-theme .admin-settings-view .p-checkbox .p-checkbox-box:hover {
  border-color: #a78bfa !important;
}

.dark-theme .admin-settings-view .p-slider {
  background: #475569 !important;
}

.dark-theme .admin-settings-view .p-slider:not(.p-disabled):hover {
  background: #64748b !important;
}

.dark-theme .admin-settings-view .p-slider .p-slider-handle {
  background: var(--color-bg-primary, #1e293b) !important;
  border-color: #a78bfa !important;
}

.dark-theme .admin-settings-view .btn-delete-sm {
  border-color: #7f1d1d !important;
  color: #fca5a5 !important;
}

.dark-theme .admin-settings-view .btn-delete-sm:hover {
  background: rgba(220, 38, 38, 0.15) !important;
  border-color: #ef4444 !important;
  color: #fca5a5 !important;
}

.dark-theme .admin-settings-view .p-dialog {
  background: var(--color-bg-primary, #1e293b) !important;
}

.dark-theme .admin-settings-view .p-dialog .p-dialog-header {
  background: var(--color-bg-primary, #1e293b) !important;
  border-color: var(--color-border, #475569) !important;
  color: var(--color-text-primary, #f1f5f9) !important;
}

.dark-theme .admin-settings-view .p-dialog .p-dialog-content {
  background: var(--color-bg-primary, #1e293b) !important;
  color: var(--color-text-primary, #f1f5f9) !important;
}

.dark-theme .admin-settings-view .p-dialog .p-dialog-footer {
  background: var(--color-bg-primary, #1e293b) !important;
  border-color: var(--color-border, #475569) !important;
}
</style>
