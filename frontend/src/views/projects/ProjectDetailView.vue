<template>
  <div class="view-container project-detail-view">
    <!-- Loading -->
    <LoadingState v-if="loading" :text="t('common.loading')" />

    <!-- Error -->
    <EmptyState
      v-else-if="!project"
      title="Project not found"
      subtitle="The project you're looking for doesn't exist or you don't have access"
      icon-class="pi pi-exclamation-triangle"
    >
      <template #action>
        <Button
          icon="pi pi-arrow-left"
          :label="t('projectDetail.backToProjects')"
          @click="router.push('/projects')"
          class="btn-primary"
        />
      </template>
    </EmptyState>

    <template v-else>
      <!-- Header -->
      <div class="view-header">
        <div class="header-content">
          <div class="header-top-row">
            <button class="back-btn" @click="router.push('/projects')">
              <i class="pi pi-arrow-left"></i>
              <span>{{ t('projects.title') }}</span>
            </button>
          </div>
          <h1>{{ project.name }}</h1>
          <div class="header-badges">
            <span v-if="!canManageProject" class="badge status-badge" :class="`status-${project.status}`">
              {{ formatProjectStatus(project.status) }}
            </span>
            <Dropdown
              v-if="canManageProject"
              :modelValue="project.status"
              :options="statusOptions"
              optionLabel="label"
              optionValue="value"
              @update:modelValue="changeProjectStatus"
              class="status-dropdown"
              :class="`status-${project.status}`"
            />
            <span class="badge priority-badge" :class="`priority-${project.priority}`">
              {{ formatProjectPriority(project.priority) }}
            </span>
            <span
              v-if="project.aiStatus"
              class="badge ai-badge"
              :class="`ai-${project.aiStatus}`"
            >
              <i :class="aiStatusIcon"></i>
              {{ formatAIStatus(project.aiStatus) }}
            </span>
          </div>
        </div>
        <div class="header-actions">
          <Button
            v-if="project.teamsWebUrl"
            icon="pi pi-microsoft"
            :label="t('projectDetail.openInTeams')"
            @click="openTeams"
            class="btn-outline"
          />
          <Button
            v-if="project.aiSuggestionId && project.aiStatus === 'approved'"
            icon="pi pi-sparkles"
            :label="t('projectDetail.viewAISuggestions')"
            @click="router.push(`/ai-suggestions/${project.aiSuggestionId}`)"
            class="btn-outline"
          />
          <Button
            icon="pi pi-refresh"
            :label="t('tasks.syncPlanner')"
            :loading="syncing"
            @click="syncProjectPlanner"
            class="btn-outline"
            v-if="project.plannerPlanId"
          />
          <Button
            v-if="canManageProject"
            icon="pi pi-pencil"
            :label="t('projectDetail.editProject')"
            @click="openEditDialog"
            class="btn-outline"
          />
          <Button
            icon="pi pi-file-pdf"
            :label="t('projectDetail.exportPdf')"
            @click="handleExportPdf"
            class="btn-outline"
          />
        </div>
      </div>

      <div class="view-content">
        <!-- Stats Row -->
        <div class="stats-row">
          <div class="stat-card">
            <div class="stat-icon tasks-icon">
              <i class="pi pi-list"></i>
            </div>
            <div class="stat-info">
              <span class="stat-value">{{ projectTasks.length }}</span>
              <span class="stat-label">{{ t('projectDetail.totalTasks') }}</span>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon completed-icon">
              <i class="pi pi-check-circle"></i>
            </div>
            <div class="stat-info">
              <span class="stat-value">{{ completedTasks }}</span>
              <span class="stat-label">{{ t('tasks.statusCompleted') }}</span>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon progress-icon">
              <i class="pi pi-chart-line"></i>
            </div>
            <div class="stat-info">
              <span class="stat-value">{{ project.progress || 0 }}%</span>
              <span class="stat-label">{{ t('projectDetail.progress') }}</span>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon members-icon">
              <i class="pi pi-users"></i>
            </div>
            <div class="stat-info">
              <span class="stat-value">{{ members.length }}</span>
              <span class="stat-label">{{ t('projectDetail.teamMembers') }}</span>
            </div>
          </div>
        </div>

        <!-- Completion Banner -->
        <div v-if="showCompletionBanner" class="completion-banner">
          <div class="banner-content">
            <div class="banner-icon">
              <i class="pi pi-check-circle"></i>
            </div>
            <div class="banner-text">
              <h4>{{ t('projectDetail.readyForCompletion') }}</h4>
              <p>{{ t('projectDetail.readyForCompletionDesc') }}</p>
            </div>
          </div>
          <Button
            icon="pi pi-check"
            :label="t('projectDetail.markCompleted')"
            @click="changeProjectStatus('completed')"
            class="btn-outline btn-complete"
          />
        </div>

        <!-- Main Content Grid -->
        <div class="detail-grid">
          <!-- Left Column: Project Info -->
          <div class="detail-column">
            <!-- Description Card -->
            <div class="detail-card">
              <div class="card-header">
                <i class="pi pi-align-left"></i>
                <h3>{{ t('projects.description') }}</h3>
              </div>
              <div class="card-body">
                <p class="description-text">{{ project.description }}</p>
              </div>
            </div>

            <!-- Project Info Card -->
            <div class="detail-card">
              <div class="card-header">
                <i class="pi pi-info-circle"></i>
                <h3>{{ t('projectDetail.projectInfo') }}</h3>
              </div>
              <div class="card-body">
                <div class="info-grid">
                  <div class="info-item">
                    <span class="info-label">
                      <i class="pi pi-calendar"></i>
                      {{ t('projects.startDate') }}
                    </span>
                    <span class="info-value">{{ formatDate(project.startDate) }}</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">
                      <i class="pi pi-calendar-times"></i>
                      {{ t('projects.endDate') }}
                    </span>
                    <span class="info-value" :class="{ 'overdue': isProjectOverdue }">
                      {{ formatDate(project.endDate) }}
                    </span>
                  </div>
                  <div class="info-item" v-if="project.budget">
                    <span class="info-label">
                      <i class="pi pi-dollar"></i>
                      {{ t('projects.budget') }}
                    </span>
                    <span class="info-value">{{ formatBudget(project.budget) }}</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">
                      <i class="pi pi-chart-bar"></i>
                      {{ t('projectDetail.progress') }}
                    </span>
                    <div class="progress-bar-wrapper">
                      <div class="progress-bar">
                        <div
                          class="progress-fill"
                          :style="{ width: (project.progress || 0) + '%' }"
                          :class="progressClass"
                        ></div>
                      </div>
                      <span class="progress-text">{{ project.progress || 0 }}%</span>
                    </div>
                  </div>
                </div>

                <!-- Tags -->
                <div class="tags-section" v-if="project.tags && project.tags.length > 0">
                  <span class="info-label">
                    <i class="pi pi-tag"></i>
                    {{ t('projects.tags') }}
                  </span>
                  <div class="tags-list">
                    <span v-for="tag in project.tags" :key="tag" class="tag-chip">
                      {{ tag }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Right Column: Team & Quick Info -->
          <div class="detail-column side-column">
            <!-- Team Members Card -->
            <div class="detail-card">
              <div class="card-header">
                <i class="pi pi-users"></i>
                <h3>{{ t('projectDetail.teamMembers') }}</h3>
                <span class="member-count">{{ members.length }}</span>
              </div>
              <div class="card-body">
                <div class="members-list" v-if="members.length > 0">
                  <!-- Owner -->
                  <div class="member-item" v-if="project.owner">
                    <div class="member-avatar owner-avatar">
                      <img
                        v-if="project.owner.profilePicture"
                        :src="project.owner.profilePicture"
                        :alt="project.owner.name"
                      />
                      <span v-else>{{ getInitials(project.owner.name) }}</span>
                    </div>
                    <div class="member-info">
                      <span class="member-name">{{ project.owner.name }}</span>
                      <span class="member-role owner-label">{{ t('projectDetail.projectRoles.owner') }}</span>
                    </div>
                  </div>

                  <!-- Members -->
                  <div
                    v-for="member in projectMembers"
                    :key="member.id"
                    class="member-item"
                  >
                    <div class="member-avatar">
                      <img
                        v-if="member.user?.profilePicture"
                        :src="member.user.profilePicture"
                        :alt="member.user?.name"
                      />
                      <span v-else>{{ getInitials(member.user?.name) }}</span>
                    </div>
                    <div class="member-info">
                      <span class="member-name">{{ member.user?.name || 'Unknown' }}</span>
                      <span class="member-role">{{ t('projectDetail.projectRoles.' + (member.role || 'member')) }}</span>
                    </div>
                  </div>
                </div>
                <div v-else class="no-members">
                  <i class="pi pi-user-plus"></i>
                  <span>{{ t('projectDetail.noMembers') }}</span>
                </div>
              </div>
            </div>

            <!-- Timeline Card -->
            <div class="detail-card timeline-card">
              <div class="card-header">
                <i class="pi pi-clock"></i>
                <h3>{{ t('projectDetail.timeline') }}</h3>
              </div>
              <div class="card-body">
                <div class="timeline-info">
                  <div class="timeline-item">
                    <div class="timeline-dot start"></div>
                    <div class="timeline-text">
                      <span class="timeline-label">{{ t('projects.startDate') }}</span>
                      <span class="timeline-date">{{ formatDate(project.startDate) }}</span>
                    </div>
                  </div>
                  <div class="timeline-connector"></div>
                  <div class="timeline-item">
                    <div class="timeline-dot end" :class="{ 'overdue-dot': isProjectOverdue }"></div>
                    <div class="timeline-text">
                      <span class="timeline-label">{{ t('projects.endDate') }}</span>
                      <span class="timeline-date" :class="{ 'overdue': isProjectOverdue }">
                        {{ formatDate(project.endDate) }}
                      </span>
                    </div>
                  </div>
                </div>
                <div class="days-remaining" v-if="daysInfo">
                  <i :class="daysInfo.icon"></i>
                  <span :class="daysInfo.class">{{ daysInfo.text }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Tasks Section -->
        <div class="tasks-section">
          <div class="section-header">
            <div class="section-title">
              <i class="pi pi-check-square"></i>
              <h2>{{ t('projectDetail.projectTasks') }}</h2>
              <span class="section-count">{{ projectTasks.length }}</span>
            </div>
          </div>

          <LoadingState v-if="tasksLoading" :text="t('common.loading')" />

          <EmptyState
            v-else-if="projectTasks.length === 0"
            :title="t('projectDetail.noTasks')"
            :subtitle="t('projectDetail.noTasksDesc')"
            icon-class="pi pi-check-square"
          />

          <div v-else class="tasks-list-section">
            <div
              v-for="task in sortedTasks"
              :key="task.id"
              class="task-row"
              :class="{ 'task-completed': task.status === 'completed' }"
            >
              <div class="task-status-indicator" :class="`status-${task.status}`"></div>

              <div class="task-main">
                <div class="task-title-row">
                  <h4 class="task-title">{{ task.title }}</h4>
                  <span
                    v-if="task.teamsTaskId"
                    class="planner-badge"
                    v-tooltip.top="t('tasks.linkedToPlanner')"
                  >
                    <i class="pi pi-microsoft"></i>
                  </span>
                </div>
                <p class="task-description" v-if="task.description">
                  {{ truncate(task.description, 100) }}
                </p>
              </div>

              <div class="task-assignee" v-if="task.assignedTo">
                <div class="mini-avatar">
                  <img
                    v-if="task.assignedTo.profilePicture"
                    :src="task.assignedTo.profilePicture"
                    :alt="task.assignedTo.name"
                  />
                  <span v-else>{{ getInitials(task.assignedTo.name) }}</span>
                </div>
                <span class="assignee-name">{{ task.assignedTo.name }}</span>
              </div>

              <div class="task-meta">
                <span class="task-badge priority" :class="`priority-${task.priority}`">
                  {{ formatTaskPriority(task.priority) }}
                </span>
                <span class="task-badge status" :class="`status-${task.status}`">
                  {{ formatTaskStatus(task.status) }}
                </span>
              </div>

              <div class="task-details-col">
                <div class="task-detail" v-if="task.estimatedHours">
                  <i class="pi pi-clock"></i>
                  <span>{{ task.estimatedHours }}h</span>
                </div>
                <div class="task-detail" v-if="task.dueDate">
                  <i class="pi pi-calendar"></i>
                  <span :class="{ 'overdue': isTaskOverdue(task) }">
                    {{ formatDate(task.dueDate) }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Edit Project Dialog -->
    <Dialog
      v-model:visible="showEditDialog"
      :header="t('projectDetail.editProject')"
      :modal="true"
      :closable="true"
      :style="{ width: '560px' }"
      class="edit-project-dialog"
    >
      <form @submit.prevent="saveProject" class="edit-form">
        <div class="edit-form-group">
          <label class="edit-label">{{ t('projects.name') }} <span class="required">*</span></label>
          <input v-model="editForm.name" type="text" class="edit-input" required />
        </div>

        <div class="edit-form-group">
          <label class="edit-label">{{ t('projects.description') }} <span class="required">*</span></label>
          <textarea v-model="editForm.description" class="edit-textarea" rows="4" required></textarea>
        </div>

        <div class="edit-form-row">
          <div class="edit-form-group">
            <label class="edit-label">{{ t('projects.startDate') }}</label>
            <input v-model="editForm.startDate" type="date" class="edit-input" />
          </div>
          <div class="edit-form-group">
            <label class="edit-label">{{ t('projects.endDate') }}</label>
            <input v-model="editForm.endDate" type="date" class="edit-input" />
          </div>
        </div>

        <div class="edit-form-row">
          <div class="edit-form-group">
            <label class="edit-label">{{ t('projects.priority') }}</label>
            <select v-model="editForm.priority" class="edit-select">
              <option value="low">{{ t('priority.low') }}</option>
              <option value="medium">{{ t('priority.medium') }}</option>
              <option value="high">{{ t('priority.high') }}</option>
              <option value="critical">{{ t('priority.critical') }}</option>
            </select>
          </div>
          <div class="edit-form-group">
            <label class="edit-label">{{ t('projects.budget') }}</label>
            <input v-model="editForm.budget" type="number" class="edit-input" min="0" step="0.01" />
          </div>
        </div>

        <div class="edit-form-group">
          <label class="edit-label">{{ t('projects.tags') }}</label>
          <input
            v-model="editTagsInput"
            type="text"
            class="edit-input"
            :placeholder="t('projectDetail.tagsPlaceholder')"
          />
          <div class="edit-tags-preview" v-if="editForm.tags.length > 0">
            <span v-for="(tag, i) in editForm.tags" :key="i" class="edit-tag">
              {{ tag }}
              <button type="button" class="edit-tag-remove" @click="removeEditTag(i)">&times;</button>
            </span>
          </div>
        </div>
      </form>

      <template #footer>
          <Button
            :label="t('common.cancel')"
            icon="pi pi-times"
            @click="showEditDialog = false"
            class="btn-outline"
          />
          <Button
            :label="t('projectDetail.saveChanges')"
            icon="pi pi-check"
            @click="saveProject"
            :loading="saving"
            class="btn-primary"
          />
      </template>
    </Dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useProjectStore } from '@/stores/project'
import { useTaskStore } from '@/stores/task'
import { useLocale } from '@/composables/useLocale'
import { useToast } from 'primevue/usetoast'
import { format, differenceInDays, isPast } from 'date-fns'
import Button from 'primevue/button'
import Dropdown from 'primevue/dropdown'
import Dialog from 'primevue/dialog'
import LoadingState from '@/components/ui/LoadingState.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import { useAuthStore } from '@/stores/auth'
import { useConfirm } from 'primevue/useconfirm'
import { exportProjectDetailPdf } from '@/composables/useProjectPdfExport'

const router = useRouter()
const route = useRoute()
const projectStore = useProjectStore()
const taskStore = useTaskStore()
const authStore = useAuthStore()
const { t } = useLocale()
const toast = useToast()
const confirm = useConfirm()

const loading = ref(true)
const tasksLoading = ref(false)
const syncing = ref(false)
const saving = ref(false)
const project = ref(null)
const showEditDialog = ref(false)
const editTagsInput = ref('')
const editForm = ref({
  name: '',
  description: '',
  startDate: '',
  endDate: '',
  priority: 'medium',
  budget: 0,
  tags: []
})

const projectTasks = computed(() => taskStore.tasks || [])
const completedTasks = computed(() => projectTasks.value.filter(t => t.status === 'completed').length)

const members = computed(() => {
  const list = []
  if (project.value?.owner) list.push(project.value.owner)
  if (project.value?.members) {
    project.value.members.forEach(m => {
      if (m.user && m.user.id !== project.value?.owner?.id) {
        list.push(m.user)
      }
    })
  }
  return list
})

const projectMembers = computed(() => {
  if (!project.value?.members) return []
  return project.value.members.filter(m => m.user?.id !== project.value?.owner?.id)
})

const isProjectOverdue = computed(() => {
  if (!project.value?.endDate || project.value?.status === 'completed') return false
  return isPast(new Date(project.value.endDate))
})

const daysInfo = computed(() => {
  if (!project.value?.endDate) return null
  const end = new Date(project.value.endDate)
  const now = new Date()
  const days = differenceInDays(end, now)

  if (project.value.status === 'completed') {
    return { text: t('projectDetail.projectCompleted'), icon: 'pi pi-check-circle', class: 'text-success' }
  }
  if (days < 0) {
    return { text: `${Math.abs(days)} ${t('projectDetail.daysOverdue')}`, icon: 'pi pi-exclamation-triangle', class: 'text-danger' }
  }
  if (days === 0) {
    return { text: t('projectDetail.dueToday'), icon: 'pi pi-clock', class: 'text-warning' }
  }
  return { text: `${days} ${t('projectDetail.daysRemaining')}`, icon: 'pi pi-clock', class: 'text-muted' }
})

const progressClass = computed(() => {
  const p = project.value?.progress || 0
  if (p >= 75) return 'progress-high'
  if (p >= 40) return 'progress-mid'
  return 'progress-low'
})

const aiStatusIcon = computed(() => {
  const map = {
    'generating': 'pi pi-spin pi-spinner',
    'waiting_approval': 'pi pi-clock',
    'approved': 'pi pi-check',
    'failed': 'pi pi-times'
  }
  return map[project.value?.aiStatus] || 'pi pi-sparkles'
})

const sortedTasks = computed(() => {
  const statusOrder = { 'blocked': 0, 'in-progress': 1, 'review': 2, 'todo': 3, 'completed': 4 }
  return [...projectTasks.value].sort((a, b) =>
    (statusOrder[a.status] || 3) - (statusOrder[b.status] || 3)
  )
})

const canManageProject = computed(() => {
  const role = authStore.user?.role
  return role === 'pm' || role === 'admin' || project.value?.ownerId === authStore.user?.id
})

const statusOptions = computed(() => [
  { label: t('status.planning'), value: 'planning' },
  { label: t('status.active'), value: 'active' },
  { label: t('status.onHold'), value: 'on-hold' },
  { label: t('status.completed'), value: 'completed' },
  { label: t('status.cancelled'), value: 'cancelled' }
])

const showCompletionBanner = computed(() => {
  return (project.value?.progress || 0) >= 100 && project.value?.status !== 'completed' && canManageProject.value
})

// Formatters
const formatDate = (dateString) => {
  if (!dateString) return '—'
  try {
    return format(new Date(dateString), 'MMM dd, yyyy')
  } catch {
    return 'Invalid date'
  }
}

const formatBudget = (amount) => {
  if (!amount) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR' }).format(amount)
}

const formatProjectStatus = (status) => {
  const map = {
    'planning': t('status.planning'),
    'active': t('status.active'),
    'on-hold': t('status.onHold'),
    'completed': t('status.completed'),
    'cancelled': t('status.cancelled')
  }
  return map[status] || status
}

const formatProjectPriority = (priority) => {
  const map = {
    'low': t('priority.low'),
    'medium': t('priority.medium'),
    'high': t('priority.high'),
    'critical': t('priority.critical')
  }
  return map[priority] || priority
}

const formatAIStatus = (status) => {
  const map = {
    'generating': t('projectDetail.aiGenerating'),
    'waiting_approval': t('projectDetail.aiWaiting'),
    'approved': t('projectDetail.aiApproved'),
    'failed': t('projectDetail.aiFailed')
  }
  return map[status] || status
}

const formatTaskStatus = (status) => {
  const map = {
    'todo': t('tasks.statusTodo'),
    'in-progress': t('tasks.statusInProgress'),
    'review': t('tasks.statusReview'),
    'completed': t('tasks.statusCompleted'),
    'blocked': t('tasks.statusBlocked')
  }
  return map[status] || status
}

const formatTaskPriority = (priority) => {
  return priority?.charAt(0).toUpperCase() + priority?.slice(1) || 'Medium'
}

const isTaskOverdue = (task) => {
  if (!task.dueDate || task.status === 'completed') return false
  return new Date(task.dueDate) < new Date()
}

const truncate = (text, length) => {
  if (!text) return ''
  return text.length > length ? text.substring(0, length) + '...' : text
}

const getInitials = (name) => {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)
}

const openTeams = () => {
  if (project.value?.teamsWebUrl) {
    window.open(project.value.teamsWebUrl, '_blank')
  }
}

const formatDateForInput = (dateString) => {
  if (!dateString) return ''
  try {
    return format(new Date(dateString), 'yyyy-MM-dd')
  } catch {
    return ''
  }
}

const openEditDialog = () => {
  const p = project.value
  editForm.value = {
    name: p.name || '',
    description: p.description || '',
    startDate: formatDateForInput(p.startDate),
    endDate: formatDateForInput(p.endDate),
    priority: p.priority || 'medium',
    budget: p.budget || 0,
    tags: p.tags ? [...p.tags] : []
  }
  editTagsInput.value = (p.tags || []).join(', ')
  showEditDialog.value = true
}

const removeEditTag = (index) => {
  editForm.value.tags.splice(index, 1)
  editTagsInput.value = editForm.value.tags.join(', ')
}

const saveProject = async () => {
  // Parse tags from input
  editForm.value.tags = editTagsInput.value
    .split(',')
    .map(t => t.trim())
    .filter(t => t.length > 0)

  saving.value = true
  try {
    const updated = await projectStore.updateProject(project.value.id, editForm.value)
    project.value = updated
    showEditDialog.value = false
    toast.add({
      severity: 'success',
      summary: t('projectDetail.projectUpdated'),
      life: 3000
    })
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: err.response?.data?.error || 'Failed to update project',
      life: 5000
    })
  } finally {
    saving.value = false
  }
}

const changeProjectStatus = async (newStatus) => {
  if (newStatus === 'completed') {
    confirm.require({
      header: t('projectDetail.confirmComplete'),
      message: t('projectDetail.confirmCompleteDesc'),
      icon: 'pi pi-check-circle',
      acceptLabel: t('projectDetail.markCompleted'),
      rejectLabel: t('common.cancel'),
      accept: () => doStatusUpdate('completed')
    })
  } else {
    await doStatusUpdate(newStatus)
  }
}

const doStatusUpdate = async (newStatus) => {
  try {
    const updated = await projectStore.updateProjectStatus(project.value.id, newStatus)
    project.value = updated
    toast.add({
      severity: 'success',
      summary: t('projectDetail.statusUpdated'),
      detail: formatProjectStatus(newStatus),
      life: 3000
    })
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: err.response?.data?.error || 'Failed to update status',
      life: 5000
    })
  }
}

const syncProjectPlanner = async () => {
  syncing.value = true
  try {
    const response = await import('@/services/api').then(m =>
      m.default.post(`/tasks/project/${project.value.id}/sync-planner`)
    )
    // Refresh tasks
    await taskStore.fetchTasksByProject(project.value.id)
    // Refresh project for updated progress
    project.value = await projectStore.fetchProjectById(project.value.id)
    toast.add({
      severity: response.data.synced > 0 ? 'success' : 'info',
      summary: response.data.synced > 0 ? t('tasks.syncSuccess') : t('tasks.syncUpToDate'),
      detail: response.data.message,
      life: 4000
    })
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Sync Failed',
      detail: error.response?.data?.error || 'Failed to sync with Microsoft Planner',
      life: 5000
    })
  } finally {
    syncing.value = false
  }
}

const handleExportPdf = () => {
  if (project.value) {
    exportProjectDetailPdf(
      project.value,
      projectTasks.value,
      projectMembers.value
    )
  }
}

onMounted(async () => {
  const projectId = route.params.id
  try {
    loading.value = true
    project.value = await projectStore.fetchProjectById(projectId)

    if (project.value) {
      tasksLoading.value = true
      await taskStore.fetchTasksByProject(projectId)
      tasksLoading.value = false
    }
  } catch (err) {
    console.error('Failed to load project:', err)
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
/* Completion Banner */
.completion-banner {
  background: var(--color-bg-primary, #ffffff);
  border: 1px solid #6ee7b7;
  border-radius: 12px;
  padding: 20px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 24px;
  animation: slideDown 0.3s ease;
}

@keyframes slideDown {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

.banner-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.banner-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: #ecfdf5;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.banner-icon i {
  font-size: 1.4rem;
  color: #10b981;
}

.banner-text h4 {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text-primary, #1f2937);
  margin: 0 0 4px 0;
}

.banner-text p {
  font-size: 0.875rem;
  color: var(--color-text-secondary, #6b7280);
  margin: 0;
}

.btn-complete {
  border-color: #10b981 !important;
  color: #10b981 !important;
}

.btn-complete:hover {
  background: #ecfdf5 !important;
  border-color: #059669 !important;
  color: #059669 !important;
}

/* Status Dropdown in Header */
.status-dropdown {
  border-radius: 8px;
  font-size: 0.8rem;
  font-weight: 600;
}

.status-dropdown.status-planning :deep(.p-dropdown-label) {
  color: #6b7280;
}

.status-dropdown.status-active :deep(.p-dropdown-label) {
  color: #2563eb;
}

.status-dropdown.status-on-hold :deep(.p-dropdown-label) {
  color: #f59e0b;
}

.status-dropdown.status-completed :deep(.p-dropdown-label) {
  color: #10b981;
}

.status-dropdown.status-cancelled :deep(.p-dropdown-label) {
  color: #ef4444;
}

/* Edit Project Dialog */
.edit-form {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.edit-form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.edit-form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.edit-label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-text-primary, #374151);
}

.edit-label .required {
  color: #ef4444;
}

.edit-input,
.edit-textarea,
.edit-select {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid var(--color-border, #d1d5db);
  border-radius: 10px;
  font-size: 0.9rem;
  background: var(--color-bg-primary, #ffffff);
  color: var(--color-text-primary, #374151);
  transition: border-color 0.15s;
  font-family: inherit;
  box-sizing: border-box;
}

.edit-input:focus,
.edit-textarea:focus,
.edit-select:focus {
  outline: none;
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

.edit-textarea {
  resize: vertical;
  min-height: 80px;
}

.edit-select {
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236b7280' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  padding-right: 32px;
}

.edit-tags-preview {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 4px;
}

.edit-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: #f0f4ff;
  color: #6366f1;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 500;
}

.edit-tag-remove {
  border: none;
  background: none;
  color: #6366f1;
  cursor: pointer;
  font-size: 1rem;
  padding: 0;
  line-height: 1;
}

.edit-tag-remove:hover {
  color: #ef4444;
}

.btn-primary {
  background: #6366f1 !important;
  border-color: #6366f1 !important;
  color: white !important;
  border-radius: 10px !important;
  font-size: 0.85rem !important;
  font-weight: 500 !important;
}

.btn-primary:hover {
  background: #4f46e5 !important;
  border-color: #4f46e5 !important;
}

/* Stats Row */
.stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  background: var(--color-bg-primary, #ffffff);
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  flex-shrink: 0;
}

.stat-icon.tasks-icon { background: #f0f4ff; color: #6366f1; }
.stat-icon.completed-icon { background: #f0fdf4; color: #10b981; }
.stat-icon.progress-icon { background: #fff7ed; color: #f59e0b; }
.stat-icon.members-icon { background: #f0f9ff; color: #3b82f6; }

.stat-info {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-text-primary, #111827);
  line-height: 1;
}

.stat-label {
  font-size: 0.8rem;
  color: var(--color-text-secondary, #6b7280);
  margin-top: 4px;
}

/* Header */
.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: none;
  border: none;
  color: var(--color-text-secondary, #6b7280);
  font-size: 0.85rem;
  cursor: pointer;
  padding: 6px 12px;
  border-radius: 8px;
  transition: all 0.15s;
  margin-bottom: 8px;
}

.back-btn:hover {
  background: var(--color-bg-secondary, #f3f4f6);
  color: var(--color-primary, #6366f1);
}

.header-badges {
  display: flex;
  gap: 8px;
  margin-top: 8px;
  flex-wrap: wrap;
}

.badge {
  padding: 4px 12px;
  border-radius: 8px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

/* Status badges */
.status-badge.status-planning { background: #f0f4ff; color: #6366f1; }
.status-badge.status-active { background: #f0fdf4; color: #10b981; }
.status-badge.status-on-hold { background: #fff7ed; color: #d97706; }
.status-badge.status-completed { background: #f0fdf4; color: #059669; }
.status-badge.status-cancelled { background: #f3f4f6; color: #6b7280; }

/* Priority badges */
.priority-badge.priority-low { background: #f0fdf4; color: #16a34a; }
.priority-badge.priority-medium { background: #fff7ed; color: #d97706; }
.priority-badge.priority-high { background: #fef2f2; color: #dc2626; }
.priority-badge.priority-critical { background: #fef2f2; color: #991b1b; border: 1px solid #fecaca; }

/* AI Status badges */
.ai-badge.ai-generating { background: #f0f4ff; color: #6366f1; }
.ai-badge.ai-waiting_approval { background: #fff7ed; color: #d97706; }
.ai-badge.ai-approved { background: #f0fdf4; color: #10b981; }
.ai-badge.ai-failed { background: #fef2f2; color: #ef4444; }

/* Action buttons */
.btn-outline {
  background: var(--color-bg-primary, #ffffff) !important;
  border: 1px solid var(--color-border, #d1d5db) !important;
  color: var(--color-text-primary, #374151) !important;
  border-radius: 10px !important;
  font-size: 0.85rem !important;
  font-weight: 500 !important;
  transition: all 0.15s !important;
}

.btn-outline:hover {
  border-color: #6366f1 !important;
  color: #6366f1 !important;
  background: #f5f3ff !important;
}

/* Detail Grid */
.detail-grid {
  display: grid;
  grid-template-columns: 1fr 380px;
  gap: 24px;
  margin-bottom: 24px;
}

.detail-card {
  background: var(--color-bg-primary, #ffffff);
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.detail-column {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px 20px;
  background: var(--color-bg-secondary, #f9fafb);
  border-bottom: 1px solid var(--color-border, #e5e7eb);
}

.card-header i {
  color: var(--color-primary, #6366f1);
  font-size: 1rem;
}

.card-header h3 {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--color-text-primary, #111827);
  margin: 0;
  flex: 1;
}

.card-body {
  padding: 20px;
}

/* Description */
.description-text {
  color: var(--color-text-secondary, #374151);
  font-size: 0.9rem;
  line-height: 1.7;
  margin: 0;
  white-space: pre-wrap;
}

/* Info Grid */
.info-grid {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.info-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--color-border, #f3f4f6);
}

.info-item:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.info-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.82rem;
  color: var(--color-text-secondary, #6b7280);
  font-weight: 500;
}

.info-label i {
  font-size: 0.85rem;
  color: var(--color-text-tertiary, #9ca3af);
}

.info-value {
  font-size: 0.88rem;
  font-weight: 500;
  color: var(--color-text-primary, #111827);
}

/* Progress bar */
.progress-bar-wrapper {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  max-width: 200px;
}

.progress-bar {
  flex: 1;
  height: 8px;
  background: var(--color-bg-tertiary, #f3f4f6);
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.5s ease;
}

.progress-fill.progress-low { background: #ef4444; }
.progress-fill.progress-mid { background: #f59e0b; }
.progress-fill.progress-high { background: #10b981; }

.progress-text {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--color-text-primary, #111827);
  min-width: 36px;
  text-align: right;
}

/* Tags */
.tags-section {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--color-border, #f3f4f6);
}

.tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}

.tag-chip {
  background: var(--color-bg-secondary, #f3f4f6);
  border: 1px solid var(--color-border, #e5e7eb);
  color: var(--color-text-secondary, #374151);
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.78rem;
  font-weight: 500;
}

/* Team Members */
.member-count {
  background: var(--color-bg-primary, #ffffff);
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: 10px;
  padding: 2px 10px;
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--color-text-secondary, #6b7280);
}

.members-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.member-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 8px;
  border-radius: 10px;
  transition: background 0.1s;
}

.member-item:hover {
  background: var(--color-bg-secondary, #f9fafb);
}

.member-avatar {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 700;
  color: #4338ca;
  overflow: hidden;
  flex-shrink: 0;
}

.member-avatar.owner-avatar {
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  color: #92400e;
  border: 2px solid #f59e0b;
}

.member-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.member-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.member-name {
  font-size: 0.88rem;
  font-weight: 500;
  color: var(--color-text-primary, #111827);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.member-role {
  font-size: 0.75rem;
  color: var(--color-text-secondary, #6b7280);
}

.owner-label {
  color: #d97706;
  font-weight: 600;
}

.no-members {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 24px;
  color: var(--color-text-tertiary, #9ca3af);
  font-size: 0.85rem;
}

.no-members i {
  font-size: 1.5rem;
}

/* Timeline Card */
.timeline-info {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.timeline-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.timeline-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}

.timeline-dot.start { background: #10b981; }
.timeline-dot.end { background: #6366f1; }
.timeline-dot.overdue-dot { background: #ef4444; }

.timeline-connector {
  width: 2px;
  height: 20px;
  background: var(--color-border, #e5e7eb);
  margin-left: 5px;
}

.timeline-text {
  display: flex;
  flex-direction: column;
}

.timeline-label {
  font-size: 0.72rem;
  color: var(--color-text-tertiary, #9ca3af);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 600;
}

.timeline-date {
  font-size: 0.88rem;
  font-weight: 500;
  color: var(--color-text-primary, #111827);
}

.days-remaining {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid var(--color-border, #f3f4f6);
  font-size: 0.82rem;
  font-weight: 500;
}

.text-success { color: #10b981; }
.text-danger { color: #ef4444; }
.text-warning { color: #d97706; }
.text-muted { color: var(--color-text-secondary, #6b7280); }
.overdue { color: #dc2626 !important; font-weight: 600; }

/* Tasks Section */
.tasks-section {
  margin-top: 0;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 10px;
}

.section-title i {
  color: var(--color-primary, #6366f1);
  font-size: 1.1rem;
}

.section-title h2 {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--color-text-primary, #111827);
  margin: 0;
}

.section-count {
  background: var(--color-bg-secondary, #f3f4f6);
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: 10px;
  padding: 2px 10px;
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--color-text-secondary, #6b7280);
}

.tasks-list-section {
  background: var(--color-bg-primary, #ffffff);
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

/* Task rows */
.task-row {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  border-bottom: 1px solid var(--color-border, #f3f4f6);
  transition: background 0.1s;
}

.task-row:last-child { border-bottom: none; }
.task-row:hover { background: var(--color-bg-secondary, #f9fafb); }
.task-row.task-completed { opacity: 0.6; }
.task-row.task-completed .task-title { text-decoration: line-through; }

.task-status-indicator {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.task-status-indicator.status-todo { background: #6366f1; }
.task-status-indicator.status-in-progress { background: #f59e0b; }
.task-status-indicator.status-review { background: #3b82f6; }
.task-status-indicator.status-completed { background: #10b981; }
.task-status-indicator.status-blocked { background: #ef4444; }

.task-main {
  flex: 1;
  min-width: 0;
}

.task-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.task-title {
  font-size: 0.92rem;
  font-weight: 500;
  color: var(--color-text-primary, #111827);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.planner-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 6px;
  background: #f0f4ff;
  color: #6366f1;
  font-size: 0.7rem;
  flex-shrink: 0;
  cursor: help;
}

.task-description {
  font-size: 0.8rem;
  color: var(--color-text-secondary, #6b7280);
  margin: 4px 0 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.task-assignee {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  max-width: 150px;
}

.mini-avatar {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.6rem;
  font-weight: 700;
  color: #4338ca;
  overflow: hidden;
  flex-shrink: 0;
}

.mini-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.assignee-name {
  font-size: 0.78rem;
  color: var(--color-text-secondary, #6b7280);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.task-meta {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.task-badge {
  padding: 4px 10px;
  border-radius: 8px;
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  white-space: nowrap;
}

.task-badge.priority.priority-low { background: #f0fdf4; color: #16a34a; }
.task-badge.priority.priority-medium { background: #fff7ed; color: #d97706; }
.task-badge.priority.priority-high { background: #fef2f2; color: #dc2626; }
.task-badge.priority.priority-critical { background: #fef2f2; color: #991b1b; border: 1px solid #fecaca; }

.task-badge.status.status-todo { background: #f0f4ff; color: #6366f1; }
.task-badge.status.status-in-progress { background: #fff7ed; color: #d97706; }
.task-badge.status.status-review { background: #f0f9ff; color: #3b82f6; }
.task-badge.status.status-completed { background: #f0fdf4; color: #10b981; }
.task-badge.status.status-blocked { background: #fef2f2; color: #ef4444; }

.task-details-col {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex-shrink: 0;
  min-width: 110px;
  align-items: flex-end;
}

.task-detail {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.78rem;
  color: var(--color-text-secondary, #6b7280);
}

.task-detail i {
  font-size: 0.75rem;
  color: var(--color-text-tertiary, #9ca3af);
}

/* Responsive */
@media (max-width: 1200px) {
  .header-actions {
    flex-wrap: wrap;
    gap: 8px;
  }
}

@media (max-width: 1024px) {
  .detail-grid {
    grid-template-columns: 1fr;
  }

  .side-column {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
  }
}

@media (max-width: 768px) {
  .stats-row {
    grid-template-columns: repeat(2, 1fr);
  }

  .side-column {
    grid-template-columns: 1fr;
  }

  .header-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .task-row {
    flex-wrap: wrap;
  }

  .task-assignee {
    display: none;
  }

  .task-meta {
    order: 3;
    width: 100%;
    margin-top: 8px;
  }

  .task-details-col {
    order: 4;
    flex-direction: row;
    width: 100%;
    align-items: center;
    justify-content: flex-start;
    gap: 16px;
  }
}
</style>
