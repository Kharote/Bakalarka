<template>
  <div class="retry-overlay" @click.self="$emit('close')">
    <div class="retry-dialog">
      <div class="retry-header">
        <div class="retry-title-section">
          <div class="retry-icon-wrapper">
            <i class="pi pi-refresh"></i>
          </div>
          <div>
            <h3 class="retry-title">{{ t('aiRetry.title') }}</h3>
            <p class="retry-subtitle">{{ t('aiRetry.subtitle') }}</p>
          </div>
        </div>
        <button class="retry-close" @click="$emit('close')" type="button">
          <i class="pi pi-times"></i>
        </button>
      </div>

      <div class="retry-body">
        <!-- Project Info -->
        <div class="project-info-card">
          <div class="info-label">{{ t('aiRetry.project') }}</div>
          <div class="info-value">{{ project?.name }}</div>
        </div>

        <!-- AI Model Selection -->
        <div class="setting-group">
          <label class="setting-label">
            <i class="pi pi-microchip"></i>
            {{ t('aiRetry.selectModel') }}
          </label>
          <div class="model-selector">
            <select 
              v-model="settings.selectedModel" 
              class="form-select"
              :disabled="loadingModels || modelRestricted"
            >
              <option v-if="loadingModels" disabled value="">{{ t('aiRetry.loadingModels') }}</option>
              <option 
                v-for="model in availableModels" 
                :key="model.name" 
                :value="model.name"
              >
                {{ model.displayName }}
              </option>
            </select>
            <button 
              type="button" 
              class="btn-refresh" 
              @click="loadAIModels" 
              :disabled="loadingModels || modelRestricted"
            >
              <i class="pi" :class="loadingModels ? 'pi-spin pi-spinner' : 'pi-refresh'"></i>
            </button>
          </div>
          <div v-if="modelRestricted" class="model-restricted-notice">
            <i class="pi pi-lock"></i>
            <span>{{ t('aiRetry.modelRestricted') }}</span>
          </div>
          <div v-if="selectedModelInfo" class="model-info">
            <p class="model-description">{{ selectedModelInfo.description }}</p>
            <div class="model-limits">
              <span class="limit-badge">Input: {{ formatTokenLimit(selectedModelInfo.inputTokenLimit) }}</span>
              <span class="limit-badge">Output: {{ formatTokenLimit(selectedModelInfo.outputTokenLimit) }}</span>
            </div>
          </div>
        </div>

        <!-- Language Selection -->
        <div class="setting-group">
          <label class="setting-label">
            <i class="pi pi-globe"></i>
            AI Prompt Language
          </label>
          <div class="model-selector">
            <select v-model="settings.locale" class="form-select">
              <option value="en">🇬🇧 English</option>
              <option value="sk">🇸🇰 Slovenčina</option>
            </select>
          </div>
        </div>

        <!-- Module Toggles -->
        <div class="setting-group">
          <label class="setting-label">
            <i class="pi pi-sliders-h"></i>
            {{ t('aiRetry.modules') }}
          </label>
          <div class="modules-list">
            <label class="module-toggle" :class="{ active: settings.generateTasks }">
              <input type="checkbox" v-model="settings.generateTasks" />
              <div class="module-content">
                <i class="pi pi-list"></i>
                <div class="module-text">
                  <span class="module-name">{{ t('aiRetry.generateTasks') }}</span>
                  <span class="module-desc">{{ t('aiRetry.generateTasksDesc') }}</span>
                </div>
              </div>
              <div class="toggle-switch">
                <div class="toggle-slider"></div>
              </div>
            </label>
            <label class="module-toggle" :class="{ active: settings.generateRisks }">
              <input type="checkbox" v-model="settings.generateRisks" />
              <div class="module-content">
                <i class="pi pi-exclamation-triangle"></i>
                <div class="module-text">
                  <span class="module-name">{{ t('aiRetry.generateRisks') }}</span>
                  <span class="module-desc">{{ t('aiRetry.generateRisksDesc') }}</span>
                </div>
              </div>
              <div class="toggle-switch">
                <div class="toggle-slider"></div>
              </div>
            </label>
            <label class="module-toggle" :class="{ active: settings.generateGantt }">
              <input type="checkbox" v-model="settings.generateGantt" />
              <div class="module-content">
                <i class="pi pi-chart-bar"></i>
                <div class="module-text">
                  <span class="module-name">{{ t('aiRetry.generateGantt') }}</span>
                  <span class="module-desc">{{ t('aiRetry.generateGanttDesc') }}</span>
                </div>
              </div>
              <div class="toggle-switch">
                <div class="toggle-slider"></div>
              </div>
            </label>
          </div>
        </div>

        <!-- Validation Warning -->
        <div v-if="!hasAnyModule" class="validation-warning">
          <i class="pi pi-info-circle"></i>
          {{ t('aiRetry.selectAtLeastOne') }}
        </div>
      </div>

      <div class="retry-actions">
        <button type="button" class="btn btn-secondary" @click="$emit('close')">
          <i class="pi pi-times"></i>
          {{ t('common.cancel') }}
        </button>
        <button 
          type="button" 
          class="btn btn-primary" 
          :disabled="!hasAnyModule || isRetrying"
          @click="handleRetry"
        >
          <i class="pi" :class="isRetrying ? 'pi-spin pi-spinner' : 'pi-refresh'"></i>
          {{ isRetrying ? t('aiRetry.retrying') : t('aiRetry.retryButton') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useProjectStore } from '@/stores/project'
import { useLocale } from '@/composables/useLocale'
import { adminAPI } from '@/services/api'

const props = defineProps({
  project: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['close', 'retry'])

const projectStore = useProjectStore()
const { t } = useLocale()

const isRetrying = ref(false)
const loadingModels = ref(false)
const availableModels = ref([])
const modelRestricted = ref(false)

const settings = reactive({
  selectedModel: '',
  locale: props.project?.locale || 'en',
  generateTasks: true,
  generateRisks: true,
  generateGantt: true
})

const hasAnyModule = computed(() => {
  return settings.generateTasks || settings.generateRisks || settings.generateGantt
})

const selectedModelInfo = computed(() => {
  return availableModels.value.find(model => model.name === settings.selectedModel)
})

const formatTokenLimit = (limit) => {
  if (!limit) return ''
  if (limit >= 1000000) {
    return (limit / 1000000).toFixed(1) + 'M tokens'
  } else if (limit >= 1000) {
    return (limit / 1000).toFixed(0) + 'K tokens'
  }
  return limit + ' tokens'
}

const loadAIModels = async () => {
  try {
    loadingModels.value = true

    // Check admin model restriction
    try {
      const restrictionRes = await adminAPI.getModelRestriction()
      if (restrictionRes.data?.success && restrictionRes.data?.data?.restricted) {
        modelRestricted.value = true
        const forcedModel = restrictionRes.data.data.model
        availableModels.value = [{
          name: forcedModel,
          displayName: forcedModel,
          description: 'Model enforced by system administrator'
        }]
        settings.selectedModel = forcedModel
        return
      }
    } catch (e) {
      console.warn('Could not check model restriction:', e)
    }
    modelRestricted.value = false

    const response = await projectStore.getAvailableAIModels()
    if (response.success) {
      availableModels.value = response.data.models
      // Keep current selection if still available, otherwise use first model
      if (availableModels.value.length > 0) {
        const currentExists = availableModels.value.find(m => m.name === settings.selectedModel)
        if (!currentExists) {
          settings.selectedModel = availableModels.value[0].name
        }
      }
    }
  } catch (error) {
    console.error('Error loading AI models:', error)
    // No fallback — show empty with an error state so user knows models couldn't be loaded
    availableModels.value = []
  } finally {
    loadingModels.value = false
  }
}

const handleRetry = () => {
  isRetrying.value = true
  emit('retry', {
    projectId: props.project.id,
    selectedModel: settings.selectedModel,
    locale: settings.locale,
    generateTasks: settings.generateTasks,
    generateRisks: settings.generateRisks,
    generateGantt: settings.generateGantt
  })
}

onMounted(() => {
  loadAIModels()
})
</script>

<style scoped>
.retry-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.retry-dialog {
  background: var(--color-bg-primary, #ffffff);
  border-radius: 16px;
  width: 520px;
  max-width: 95vw;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
  animation: slideUp 0.25s ease;
}

@keyframes slideUp {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

.retry-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 24px 24px 16px;
  border-bottom: 1px solid var(--color-border, #e5e7eb);
}

.retry-title-section {
  display: flex;
  align-items: center;
  gap: 14px;
}

.retry-icon-wrapper {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.2rem;
  flex-shrink: 0;
}

.retry-title {
  font-size: 1.15rem;
  font-weight: 600;
  color: var(--color-text-primary, #111827);
  margin: 0;
}

.retry-subtitle {
  font-size: 0.85rem;
  color: var(--color-text-secondary, #6b7280);
  margin: 4px 0 0;
}

.retry-close {
  background: none;
  border: none;
  color: var(--color-text-tertiary, #9ca3af);
  cursor: pointer;
  padding: 6px;
  border-radius: 8px;
  transition: all 0.15s;
  font-size: 1rem;
}

.retry-close:hover {
  background: var(--color-bg-secondary, #f3f4f6);
  color: var(--color-text-primary, #111827);
}

.retry-body {
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.project-info-card {
  background: var(--color-bg-secondary, #f9fafb);
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: 10px;
  padding: 12px 16px;
}

.info-label {
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-tertiary, #9ca3af);
  margin-bottom: 4px;
}

.info-value {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text-primary, #111827);
}

.setting-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.setting-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-text-primary, #111827);
}

.setting-label i {
  color: var(--color-text-secondary, #6b7280);
  font-size: 0.9rem;
}

.model-selector {
  display: flex;
  gap: 8px;
  align-items: center;
}

.model-selector .form-select {
  flex: 1;
  padding: 10px 14px;
  border: 1px solid var(--color-border, #d1d5db);
  border-radius: 10px;
  font-size: 0.9rem;
  background: var(--color-bg-primary, #ffffff);
  color: var(--color-text-primary, #111827);
  cursor: pointer;
  transition: border-color 0.15s;
  appearance: auto;
}

.model-selector .form-select:focus {
  outline: none;
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

.btn-refresh {
  width: 40px;
  height: 40px;
  border: 1px solid var(--color-border, #d1d5db);
  border-radius: 10px;
  background: var(--color-bg-primary, #ffffff);
  color: var(--color-text-secondary, #6b7280);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
  flex-shrink: 0;
}

.btn-refresh:hover:not(:disabled) {
  border-color: #6366f1;
  color: #6366f1;
  background: #f5f3ff;
}

.btn-refresh:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.model-info {
  background: var(--color-bg-secondary, #f9fafb);
  border-radius: 8px;
  padding: 10px 14px;
}

.model-restricted-notice {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  padding: 10px 14px;
  background: linear-gradient(135deg, #fef3c7 0%, #fefce8 100%);
  border: 1px solid #fbbf24;
  border-radius: 8px;
  color: #92400e;
  font-size: 0.8rem;
  font-weight: 500;
}

.model-restricted-notice i {
  font-size: 0.9rem;
  color: #d97706;
}

.model-description {
  font-size: 0.8rem;
  color: var(--color-text-secondary, #6b7280);
  margin: 0 0 8px;
}

.model-limits {
  display: flex;
  gap: 8px;
}

.limit-badge {
  font-size: 0.72rem;
  padding: 3px 8px;
  border-radius: 6px;
  background: var(--color-bg-primary, #ffffff);
  border: 1px solid var(--color-border, #e5e7eb);
  color: var(--color-text-secondary, #6b7280);
}

.modules-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.locale-selector {
  display: flex;
  gap: 10px;
}

.locale-option {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border: 2px solid var(--color-border, #e5e7eb);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.18s ease;
  background: var(--color-bg-secondary, #f9fafb);
}

.locale-option input[type="radio"] {
  display: none;
}

.locale-option.active {
  border-color: #3b82f6;
  background: #eff6ff;
}

.locale-flag {
  font-size: 1.3rem;
  line-height: 1;
}

.locale-name {
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--color-text-primary, #111827);
}

.locale-option:hover:not(.active) {
  border-color: #93c5fd;
  background: #f0f9ff;
}

.module-toggle {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
  background: var(--color-bg-primary, #ffffff);
  user-select: none;
}

.module-toggle:hover {
  border-color: #d1d5db;
  background: var(--color-bg-secondary, #f9fafb);
}

.module-toggle.active {
  border-color: #6366f1;
  background: #f5f3ff;
}

.module-toggle input[type="checkbox"] {
  display: none;
}

.module-content {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
}

.module-content > i {
  font-size: 1.1rem;
  color: var(--color-text-tertiary, #9ca3af);
  width: 24px;
  text-align: center;
}

.module-toggle.active .module-content > i {
  color: #6366f1;
}

.module-text {
  display: flex;
  flex-direction: column;
}

.module-name {
  font-size: 0.88rem;
  font-weight: 500;
  color: var(--color-text-primary, #111827);
}

.module-desc {
  font-size: 0.78rem;
  color: var(--color-text-secondary, #6b7280);
}

.toggle-switch {
  width: 40px;
  height: 22px;
  border-radius: 11px;
  background: #d1d5db;
  position: relative;
  transition: background 0.2s;
  flex-shrink: 0;
}

.module-toggle.active .toggle-switch {
  background: #6366f1;
}

.toggle-slider {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: white;
  position: absolute;
  top: 2px;
  left: 2px;
  transition: transform 0.2s;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
}

.module-toggle.active .toggle-slider {
  transform: translateX(18px);
}

.validation-warning {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: #fef3c7;
  border: 1px solid #fcd34d;
  border-radius: 8px;
  color: #92400e;
  font-size: 0.83rem;
}

.validation-warning i {
  color: #d97706;
}

.retry-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 16px 24px 24px;
  border-top: 1px solid var(--color-border, #e5e7eb);
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border-radius: 10px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: all 0.15s;
}

.btn-secondary {
  background: var(--color-bg-secondary, #f3f4f6);
  color: var(--color-text-secondary, #6b7280);
  border: 1px solid var(--color-border, #d1d5db);
}

.btn-secondary:hover {
  background: var(--color-bg-tertiary, #e5e7eb);
}

.btn-primary {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  color: white;
  box-shadow: 0 2px 8px rgba(245, 158, 11, 0.3);
}

.btn-primary:hover:not(:disabled) {
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.4);
  transform: translateY(-1px);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}
</style>

<!-- Unscoped: .dark-theme is on <html>, can't reach it from scoped styles -->
<style>
.dark-theme .retry-dialog {
  background: var(--color-bg-primary, #1e293b);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
}

.dark-theme .retry-header {
  border-color: var(--color-border, #334155);
}

.dark-theme .retry-title {
  color: var(--color-text-primary, #f1f5f9);
}

.dark-theme .retry-subtitle {
  color: var(--color-text-secondary, #94a3b8);
}

.dark-theme .retry-close {
  color: #64748b;
}

.dark-theme .retry-close:hover {
  background: var(--color-bg-tertiary, #334155);
  color: var(--color-text-primary, #f1f5f9);
}

.dark-theme .project-info-card {
  background: var(--color-bg-tertiary, #334155);
  border-color: var(--color-border, #475569);
}

.dark-theme .info-label {
  color: #64748b;
}

.dark-theme .info-value {
  color: var(--color-text-primary, #f1f5f9);
}

.dark-theme .setting-label {
  color: var(--color-text-primary, #f1f5f9);
}

.dark-theme .setting-label i {
  color: #94a3b8;
}

.dark-theme .model-selector .form-select {
  background: var(--color-bg-tertiary, #334155);
  border-color: #475569;
  color: var(--color-text-primary, #f1f5f9);
}

.dark-theme .model-selector .form-select:focus {
  border-color: #7c3aed;
  box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.2);
}

.dark-theme .btn-refresh {
  background: var(--color-bg-tertiary, #334155);
  border-color: #475569;
  color: #94a3b8;
}

.dark-theme .btn-refresh:hover:not(:disabled) {
  border-color: #7c3aed;
  color: #a78bfa;
  background: rgba(124, 58, 237, 0.1);
}

.dark-theme .model-info {
  background: var(--color-bg-tertiary, #334155);
}

.dark-theme .model-description {
  color: #94a3b8;
}

.dark-theme .limit-badge {
  background: var(--color-bg-secondary, #0f172a);
  border-color: #475569;
  color: #94a3b8;
}

.dark-theme .model-restricted-notice {
  background: rgba(217, 119, 6, 0.15);
  border-color: rgba(217, 119, 6, 0.4);
  color: #fbbf24;
}

.dark-theme .model-restricted-notice i {
  color: #fbbf24;
}

.dark-theme .module-toggle {
  background: var(--color-bg-tertiary, #334155);
  border-color: #475569;
}

.dark-theme .module-toggle:hover {
  border-color: #64748b;
  background: #3b4560;
}

.dark-theme .module-toggle.active {
  border-color: #7c3aed;
  background: rgba(124, 58, 237, 0.15);
}

.dark-theme .module-content > i {
  color: #64748b;
}

.dark-theme .module-toggle.active .module-content > i {
  color: #a78bfa;
}

.dark-theme .module-name {
  color: var(--color-text-primary, #f1f5f9);
}

.dark-theme .module-desc {
  color: #94a3b8;
}

.dark-theme .toggle-switch {
  background: #475569;
}

.dark-theme .module-toggle.active .toggle-switch {
  background: #7c3aed;
}

.dark-theme .toggle-slider {
  background: #e2e8f0;
}

.dark-theme .validation-warning {
  background: rgba(217, 119, 6, 0.12);
  border-color: rgba(251, 191, 36, 0.3);
  color: #fbbf24;
}

.dark-theme .validation-warning i {
  color: #fbbf24;
}

.dark-theme .retry-actions {
  border-color: var(--color-border, #334155);
}

.dark-theme .btn-secondary {
  background: var(--color-bg-tertiary, #334155);
  border-color: #475569;
  color: #94a3b8;
}

.dark-theme .btn-secondary:hover {
  background: #3b4560;
  color: var(--color-text-primary, #f1f5f9);
}

.dark-theme .locale-option {
  background: var(--color-bg-tertiary, #334155);
  border-color: #475569;
}

.dark-theme .locale-option.active {
  border-color: #3b82f6;
  background: rgba(59, 130, 246, 0.15);
}

.dark-theme .locale-name {
  color: var(--color-text-primary, #f1f5f9);
}
</style>
