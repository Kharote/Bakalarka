<template>
  <div class="view-container ai-chat-view" :class="{ 'chat-active': selectedProject }">
    <!-- Project Selector (shown when no project selected) -->
    <div v-if="!selectedProject" class="chat-project-selector">
      <!-- Header -->
      <div class="view-header">
        <div class="header-content">
          <h1>{{ t('aiChat.title') }}</h1>
          <p>{{ filteredProjects.length }} {{ t('aiChat.subtitle') }}</p>
        </div>
      </div>

      <div class="view-content">
        <!-- Search / Filter bar -->
        <div class="filters-card">
          <div class="filters-row">
            <div class="search-field">
              <input 
                v-model="projectSearch" 
                type="text" 
                :placeholder="t('aiChat.searchProjects')"
                class="search-input"
              />
              <i class="pi pi-search search-icon"></i>
            </div>
          </div>
        </div>

        <div v-if="loadingProjects" class="selector-loading">
          <i class="pi pi-spin pi-spinner"></i>
          <span>{{ t('common.loading') }}</span>
        </div>

        <div v-else-if="filteredProjects.length === 0" class="selector-empty">
          <i class="pi pi-folder-open"></i>
          <p>{{ t('aiChat.noProjects') }}</p>
        </div>

        <!-- Projects Grid (same as ProjectsView) -->
        <div v-else class="projects-grid">
          <div 
            v-for="project in filteredProjects" 
            :key="project.id"
            class="project-card"
            @click="selectProject(project)"
          >
            <div class="project-header">
              <div class="project-info">
                <h3 class="project-name">{{ project.name }}</h3>
                <p class="project-description">{{ project.description || t('aiChat.noDescription') }}</p>
              </div>
              <div class="card-chat-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2C6.477 2 2 5.813 2 10.5c0 2.613 1.395 4.95 3.572 6.536-.18 1.46-.89 2.744-1.524 3.637a.75.75 0 00.64 1.139c2.082-.066 4.07-.893 5.522-1.94.575.084 1.169.128 1.79.128 5.523 0 10-3.813 10-8.5S17.523 2 12 2z" fill="currentColor"/>
                  <circle cx="8.5" cy="10.5" r="1" fill="white"/>
                  <circle cx="12" cy="10.5" r="1" fill="white"/>
                  <circle cx="15.5" cy="10.5" r="1" fill="white"/>
                </svg>
              </div>
            </div>

            <div class="project-status">
              <div class="status-info">
                <span class="status-badge" :class="`status-${project.status}`">{{ formatStatus(project.status) }}</span>
                <span class="priority-badge" :class="`priority-${project.priority}`">{{ formatPriority(project.priority) }}</span>
              </div>
            </div>

            <div class="project-progress">
              <div class="progress-header">
                <span class="progress-label">{{ t('aiChat.progress') }}</span>
                <span class="progress-value">{{ project.progress || 0 }}%</span>
              </div>
              <div class="progress-bar">
                <div class="progress-fill" :style="{ width: `${project.progress || 0}%` }"></div>
              </div>
            </div>

            <div class="project-footer">
              <div class="project-dates" v-if="project.endDate">
                <span class="date-label">{{ t('aiChat.due') }}:</span>
                <span class="date-value">{{ formatDate(project.endDate) }}</span>
              </div>
              <div class="chat-history-hint" v-if="project.hasHistory">
                <i class="pi pi-comments"></i>
                <span>{{ t('aiChat.hasHistory') }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Chat Interface (shown after selecting project) -->
    <div v-else class="chat-container">
      <!-- Chat Header -->
      <div class="chat-header">
        <button class="back-btn" @click="deselectProject" :title="t('common.back')">
          <i class="pi pi-arrow-left"></i>
        </button>
        <div class="chat-header-info">
          <h2>{{ selectedProject.name }}</h2>
          <div class="chat-header-meta">
            <span class="mini-badge" :class="`status-${selectedProject.status}`">{{ selectedProject.status }}</span>
            <span class="mini-badge" :class="`priority-${selectedProject.priority}`">{{ selectedProject.priority }}</span>
            <span class="progress-text">{{ selectedProject.progress }}%</span>
          </div>
        </div>
        <button class="clear-btn" @click="clearChat" :title="t('aiChat.clearChat')">
          <i class="pi pi-trash"></i>
        </button>
      </div>

      <!-- Chat Messages -->
      <div class="chat-messages" ref="messagesContainer">
        <!-- Welcome message -->
        <div v-if="messages.length === 0" class="chat-welcome">
          <div class="welcome-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L14.09 8.26L20 9.27L15.55 13.97L16.91 20L12 16.9L7.09 20L8.45 13.97L4 9.27L9.91 8.26L12 2Z" fill="white"/>
            </svg>
          </div>
          <h3>{{ t('aiChat.welcomeTitle') }}</h3>
          <p>{{ welcomeMessage }}</p>
          <div class="suggested-questions">
            <button 
              v-for="(q, i) in suggestedQuestions" 
              :key="i"
              class="suggested-question"
              @click="sendSuggestedQuestion(q)"
            >
              <i class="pi pi-arrow-right"></i>
              {{ q }}
            </button>
          </div>
        </div>

        <!-- Message list -->
        <div v-for="(msg, index) in messages" :key="index" class="chat-message" :class="msg.role">
          <div class="message-avatar">
            <svg v-if="msg.role === 'assistant'" class="ai-avatar-svg" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L14.09 8.26L20 9.27L15.55 13.97L16.91 20L12 16.9L7.09 20L8.45 13.97L4 9.27L9.91 8.26L12 2Z" fill="white"/>
            </svg>
            <i v-else class="pi pi-user"></i>
          </div>
          <div class="message-content">
            <div class="message-sender">{{ msg.role === 'assistant' ? 'AI Assistant' : t('aiChat.you') }}</div>
            <div class="message-text" v-html="formatMessage(msg.content)"></div>
            <div class="message-time">{{ formatTime(msg.timestamp) }}</div>
          </div>
        </div>

        <!-- Typing indicator -->
        <div v-if="isTyping" class="chat-message assistant">
          <div class="message-avatar">
            <svg class="ai-avatar-svg" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L14.09 8.26L20 9.27L15.55 13.97L16.91 20L12 16.9L7.09 20L8.45 13.97L4 9.27L9.91 8.26L12 2Z" fill="white"/>
            </svg>
          </div>
          <div class="message-content">
            <div class="message-sender">AI Assistant</div>
            <div class="typing-indicator">
              <span></span><span></span><span></span>
            </div>
          </div>
        </div>
      </div>

      <!-- Chat Input -->
      <div class="chat-input-area">
        <div class="chat-input-wrapper">
          <textarea 
            ref="chatInput"
            v-model="inputMessage" 
            :placeholder="t('aiChat.inputPlaceholder')"
            @keydown.enter.exact="handleEnter"
            rows="1"
            :disabled="isTyping"
          ></textarea>
          <button 
            class="send-btn" 
            @click="sendMessage" 
            :disabled="!inputMessage.trim() || isTyping"
          >
            <i class="pi pi-send"></i>
          </button>
        </div>
        <p class="input-hint">{{ t('aiChat.inputHint') }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, watch, onMounted } from 'vue'
import { useLocale } from '@/composables/useLocale'
import api from '@/services/api'

const { t } = useLocale()

// State
const loadingProjects = ref(false)
const loadingHistory = ref(false)
const projects = ref([])
const projectSearch = ref('')
const selectedProject = ref(null)
const messages = ref([])
const inputMessage = ref('')
const isTyping = ref(false)
const messagesContainer = ref(null)
const chatInput = ref(null)

// Computed
const filteredProjects = computed(() => {
  if (!projectSearch.value) return projects.value
  const search = projectSearch.value.toLowerCase()
  return projects.value.filter(p => 
    p.name.toLowerCase().includes(search) ||
    (p.description && p.description.toLowerCase().includes(search))
  )
})

const suggestedQuestions = computed(() => [
  t('aiChat.suggestion1'),
  t('aiChat.suggestion2'),
  t('aiChat.suggestion3'),
  t('aiChat.suggestion4')
])

const welcomeMessage = computed(() => {
  return t('aiChat.welcomeMessage').replace('{projectName}', selectedProject.value?.name || '')
})

// Methods
const loadProjects = async () => {
  loadingProjects.value = true
  try {
    const response = await api.get('/ai/chat/projects')
    projects.value = response.data.projects || []
  } catch (error) {
    console.error('Failed to load projects:', error)
    projects.value = []
  } finally {
    loadingProjects.value = false
  }
}

const selectProject = async (project) => {
  selectedProject.value = project
  // Load chat history from database
  loadingHistory.value = true
  try {
    const response = await api.get(`/ai/chat/history/${project.id}`)
    messages.value = (response.data.messages || []).map(m => ({
      ...m,
      timestamp: new Date(m.timestamp)
    }))
  } catch (error) {
    console.error('Failed to load chat history:', error)
    messages.value = []
  } finally {
    loadingHistory.value = false
  }
  nextTick(() => {
    chatInput.value?.focus()
    scrollToBottom()
  })
}

const deselectProject = () => {
  selectedProject.value = null
  messages.value = []
  inputMessage.value = ''
}

const clearChat = async () => {
  messages.value = []
  if (selectedProject.value) {
    try {
      await api.delete(`/ai/chat/history/${selectedProject.value.id}`)
    } catch (error) {
      console.error('Failed to clear chat history:', error)
    }
  }
}

const handleEnter = (e) => {
  if (!e.shiftKey) {
    e.preventDefault()
    sendMessage()
  }
}

const sendSuggestedQuestion = (question) => {
  inputMessage.value = question
  sendMessage()
}

const sendMessage = async () => {
  const text = inputMessage.value.trim()
  if (!text || isTyping.value) return

  // Add user message
  messages.value.push({
    role: 'user',
    content: text,
    timestamp: new Date()
  })
  inputMessage.value = ''
  isTyping.value = true
  scrollToBottom()

  try {
    const response = await api.post('/ai/chat', {
      projectId: selectedProject.value.id,
      message: text
    })

    messages.value.push({
      role: 'assistant',
      content: response.data.message,
      timestamp: new Date()
    })
  } catch (error) {
    console.error('AI Chat error:', error)
    messages.value.push({
      role: 'assistant',
      content: t('aiChat.errorMessage'),
      timestamp: new Date()
    })
  } finally {
    isTyping.value = false
    scrollToBottom()
  }
}

const scrollToBottom = () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

const formatMessage = (text) => {
  if (!text) return ''
  // Basic markdown-like formatting
  return text
    .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br>')
}

const formatTime = (timestamp) => {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const formatStatus = (status) => {
  return status?.charAt(0).toUpperCase() + status?.slice(1).replace('-', ' ') || 'Unknown'
}

const formatPriority = (priority) => {
  return priority?.charAt(0).toUpperCase() + priority?.slice(1) || 'Medium'
}

const formatDate = (date) => {
  if (!date) return '-'
  return new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

// Auto-resize textarea
watch(inputMessage, () => {
  nextTick(() => {
    if (chatInput.value) {
      chatInput.value.style.height = 'auto'
      chatInput.value.style.height = Math.min(chatInput.value.scrollHeight, 150) + 'px'
    }
  })
})

onMounted(() => {
  loadProjects()
})
</script>

<style scoped>
.ai-chat-view {
  display: flex;
  flex-direction: column;
  padding: 0 !important;
}

/* When chat is open, lock to viewport so messages scroll inside */
/* 64px header + 2rem padding top + 2rem padding bottom from .main-content */
.ai-chat-view.chat-active {
  height: calc(100vh - 64px - 4rem);
  overflow: hidden;
}

/* ========== Project Selector (matches ProjectsView — normal page scroll) ========== */
.chat-project-selector {
  padding: 2rem;
}

.chat-project-selector .view-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
}

.chat-project-selector .header-content h1 {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--color-text-primary, #111827);
  margin: 0 0 0.25rem 0;
}

.chat-project-selector .header-content p {
  color: var(--color-text-secondary, #6b7280);
  font-size: 0.9375rem;
  margin: 0;
}

.filters-card {
  background: var(--color-bg-primary, #fff);
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: 12px;
  padding: 1rem 1.25rem;
  margin-bottom: 1.5rem;
}

.filters-row {
  display: flex;
  gap: 0.75rem;
}

.search-field {
  position: relative;
  flex: 1;
}

.search-field .search-input {
  width: 100%;
  padding: 0.75rem 1rem 0.75rem 2.5rem;
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: 10px;
  font-size: 0.9375rem;
  background: var(--color-bg-secondary, #f9fafb);
  color: var(--color-text-primary, #111827);
  transition: border-color 0.2s, box-shadow 0.2s;
  box-sizing: border-box;
}

.search-field .search-input:focus {
  outline: none;
  border-color: #7c3aed;
  box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.1);
}

.search-field .search-icon {
  position: absolute;
  left: 0.875rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--color-text-secondary, #9ca3af);
  font-size: 0.875rem;
}

.selector-loading, .selector-empty {
  text-align: center;
  padding: 3rem 1rem;
  color: var(--color-text-secondary, #9ca3af);
}

.selector-loading i, .selector-empty i {
  font-size: 2rem;
  margin-bottom: 0.75rem;
  display: block;
}

/* ========== Project Cards (matching ProjectCard.vue) ========== */
.project-card {
  background: var(--color-bg-primary, white);
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: 12px;
  padding: 1.5rem;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
}

.project-card:hover {
  border-color: #7c3aed;
  box-shadow: 0 4px 12px rgba(124, 58, 237, 0.08);
  transform: translateY(-2px);
}

.project-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
}

.project-info {
  flex: 1;
  padding-right: 1rem;
  min-width: 0;
}

.project-name {
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--color-text-primary, #111827);
  margin: 0 0 0.5rem 0;
  line-height: 1.4;
}

.project-description {
  font-size: 0.875rem;
  color: var(--color-text-secondary, #6b7280);
  margin: 0;
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-chat-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: linear-gradient(135deg, #7c3aed, #a855f7);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: #fff;
  transition: transform 0.2s;
}

.project-card:hover .card-chat-icon {
  transform: scale(1.1);
}

.project-status {
  margin-bottom: 1rem;
}

.status-info {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.status-badge, .priority-badge {
  font-size: 0.75rem;
  font-weight: 500;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  text-transform: capitalize;
}

.status-planning { background: #fef3c7; color: #92400e; }
.status-active { background: #d1fae5; color: #065f46; }
.status-on-hold { background: #fde68a; color: #92400e; }
.status-completed { background: #d1fae5; color: #065f46; }
.status-cancelled { background: #fecaca; color: #991b1b; }
.priority-low { background: #d1fae5; color: #065f46; }
.priority-medium { background: #dbeafe; color: #1e40af; }
.priority-high { background: #fed7aa; color: #c2410c; }
.priority-critical { background: #fecaca; color: #991b1b; }

.project-progress {
  margin-bottom: 1rem;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.progress-label {
  font-size: 0.8125rem;
  color: var(--color-text-secondary, #6b7280);
  font-weight: 500;
}

.progress-value {
  font-size: 0.8125rem;
  color: var(--color-text-primary, #111827);
  font-weight: 600;
}

.progress-bar {
  width: 100%;
  height: 6px;
  background: var(--color-bg-tertiary, #e5e7eb);
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
  transition: width 0.3s ease;
  border-radius: 3px;
}

.project-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.project-dates {
  display: flex;
  align-items: center;
  gap: 0.375rem;
}

.date-label {
  font-size: 0.8125rem;
  color: var(--color-text-secondary, #9ca3af);
  font-weight: 500;
}

.date-value {
  font-size: 0.8125rem;
  color: var(--color-text-secondary, #6b7280);
  font-weight: 600;
}

.chat-history-hint {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.75rem;
  color: #7c3aed;
  font-weight: 500;
}

.chat-history-hint i {
  font-size: 0.75rem;
}

/* ========== Chat Container ========== */
.chat-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

/* ========== Chat Header ========== */
.chat-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid var(--color-border, #e5e7eb);
  background: var(--color-bg-primary, #fff);
  flex-shrink: 0;
}

.back-btn, .clear-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 8px;
  background: var(--color-bg-tertiary, #f3f4f6);
  color: var(--color-text-secondary, #6b7280);
  cursor: pointer;
  transition: all 0.2s;
}

.back-btn:hover, .clear-btn:hover {
  background: var(--color-bg-hover, #e5e7eb);
  color: var(--color-text-primary, #111827);
}

.clear-btn {
  margin-left: auto;
}

.chat-header-info h2 {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text-primary, #111827);
  margin: 0;
}

.chat-header-meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.25rem;
}

/* ========== Chat Messages ========== */
.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.chat-welcome {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  flex: 1;
  padding: 1.5rem;
  min-height: 0;
}

.welcome-icon {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  background: linear-gradient(135deg, #7c3aed, #a855f7);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1rem;
  flex-shrink: 0;
}

.chat-welcome h3 {
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--color-text-primary, #111827);
  margin: 0 0 0.375rem 0;
}

.chat-welcome p {
  color: var(--color-text-secondary, #6b7280);
  font-size: 0.9rem;
  margin: 0 0 1.25rem 0;
  max-width: 480px;
}

.suggested-questions {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  width: 100%;
  max-width: 480px;
}

.suggested-question {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1.125rem;
  background: var(--color-bg-primary, #fff);
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: 12px;
  cursor: pointer;
  font-size: 0.8125rem;
  color: var(--color-text-primary, #111827);
  text-align: left;
  transition: all 0.2s;
}

.suggested-question:hover {
  border-color: #7c3aed;
  background: rgba(124, 58, 237, 0.04);
}

.suggested-question i {
  color: #7c3aed;
  font-size: 0.75rem;
  flex-shrink: 0;
}

/* ========== Messages ========== */
.chat-message {
  display: flex;
  gap: 0.75rem;
  max-width: 85%;
}

.chat-message.user {
  align-self: flex-end;
  flex-direction: row-reverse;
}

.message-avatar {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 0.875rem;
}

.chat-message.assistant .message-avatar {
  background: linear-gradient(135deg, #7c3aed, #a855f7);
  color: #fff;
}

.ai-avatar-svg {
  display: block;
}

.chat-message.user .message-avatar {
  background: var(--color-bg-tertiary, #e5e7eb);
  color: var(--color-text-secondary, #6b7280);
}

.message-content {
  display: flex;
  flex-direction: column;
}

.message-sender {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text-secondary, #6b7280);
  margin-bottom: 0.25rem;
}

.chat-message.user .message-sender {
  text-align: right;
}

.message-text {
  padding: 0.875rem 1.25rem;
  border-radius: 16px;
  font-size: 0.9375rem;
  line-height: 1.6;
  word-break: break-word;
}

.chat-message.assistant .message-text {
  background: var(--color-bg-secondary, #f9fafb);
  color: var(--color-text-primary, #111827);
  border-top-left-radius: 4px;
}

.chat-message.user .message-text {
  background: linear-gradient(135deg, #7c3aed, #8b5cf6);
  color: #fff;
  border-top-right-radius: 4px;
}

.message-text :deep(pre) {
  background: var(--color-bg-primary, #1e1e2e);
  padding: 0.75rem 1rem;
  border-radius: 8px;
  overflow-x: auto;
  margin: 0.5rem 0;
}

.message-text :deep(code) {
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-size: 0.85em;
}

.message-text :deep(pre code) {
  background: none;
  padding: 0;
}

.message-text :deep(code:not(pre code)) {
  background: rgba(0, 0, 0, 0.06);
  padding: 0.15em 0.4em;
  border-radius: 4px;
}

.message-time {
  font-size: 0.7rem;
  color: var(--color-text-secondary, #9ca3af);
  margin-top: 0.25rem;
}

.chat-message.user .message-time {
  text-align: right;
}

/* ========== Typing Indicator ========== */
.typing-indicator {
  display: flex;
  gap: 4px;
  padding: 1rem 1.25rem;
  background: var(--color-bg-secondary, #f9fafb);
  border-radius: 16px;
  border-top-left-radius: 4px;
}

.typing-indicator span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #9ca3af;
  animation: typing 1.4s infinite;
}

.typing-indicator span:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-indicator span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typing {
  0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
  30% { transform: translateY(-6px); opacity: 1; }
}

/* ========== Chat Input ========== */
.chat-input-area {
  padding: 0.75rem 1.5rem 1rem;
  border-top: 1px solid var(--color-border, #e5e7eb);
  background: var(--color-bg-primary, #fff);
  flex-shrink: 0;
}

.chat-input-wrapper {
  display: flex;
  align-items: flex-end;
  gap: 0.75rem;
  background: var(--color-bg-secondary, #f9fafb);
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: 16px;
  padding: 0.5rem 0.5rem 0.5rem 1.25rem;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.chat-input-wrapper:focus-within {
  border-color: #7c3aed;
  box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.1);
}

.chat-input-wrapper textarea {
  flex: 1;
  border: none;
  background: transparent;
  resize: none;
  font-size: 0.9375rem;
  line-height: 1.5;
  color: var(--color-text-primary, #111827);
  padding: 0.5rem 0;
  max-height: 150px;
  font-family: inherit;
}

.chat-input-wrapper textarea:focus {
  outline: none;
}

.chat-input-wrapper textarea::placeholder {
  color: var(--color-text-secondary, #9ca3af);
}

.send-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 12px;
  background: linear-gradient(135deg, #7c3aed, #8b5cf6);
  color: #fff;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}

.send-btn:hover:not(:disabled) {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(124, 58, 237, 0.3);
}

.send-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.input-hint {
  font-size: 0.75rem;
  color: var(--color-text-secondary, #9ca3af);
  text-align: center;
  margin: 0.5rem 0 0 0;
}

/* ========== Mini badges (chat header) ========== */
.mini-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.125rem 0.5rem;
  border-radius: 6px;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: capitalize;
}

.chat-header-meta .status-planning { background: #dbeafe; color: #1e40af; }
.chat-header-meta .status-active { background: #dcfce7; color: #166534; }
.chat-header-meta .status-on-hold { background: #fef3c7; color: #92400e; }
.chat-header-meta .status-completed { background: #d1fae5; color: #065f46; }
.chat-header-meta .status-cancelled { background: #fee2e2; color: #991b1b; }

.chat-header-meta .priority-low { background: #dcfce7; color: #166534; }
.chat-header-meta .priority-medium { background: #fef3c7; color: #92400e; }
.chat-header-meta .priority-high { background: #fed7aa; color: #9a3412; }
.chat-header-meta .priority-critical { background: #fee2e2; color: #991b1b; }

.progress-text {
  font-size: 0.75rem;
  font-weight: 600;
  color: #7c3aed;
}

/* ========== Responsive ========== */
@media (max-width: 1024px) {
  .ai-chat-view.chat-active {
    height: calc(100vh - 64px - 3rem);
  }
}

@media (max-width: 768px) {
  .ai-chat-view.chat-active {
    height: calc(100vh - 64px - 2rem);
  }

  .chat-project-selector {
    padding: 1rem;
  }

  .chat-messages {
    padding: 1rem;
  }

  .chat-message {
    max-width: 95%;
  }

  .chat-input-area {
    padding: 0.75rem 1rem;
  }

  .suggested-questions {
    max-width: 100%;
  }

  .chat-header {
    padding: 0.75rem 1rem;
  }
}

@media (max-width: 480px) {
  .ai-chat-view.chat-active {
    height: calc(100vh - 64px - 1.5rem);
  }
}
</style>
