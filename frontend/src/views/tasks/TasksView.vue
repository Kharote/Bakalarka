<template>
  <div class="view-container tasks-view">
    <!-- Header -->
    <div class="view-header">
      <div class="header-content">
        <h1>{{ t('tasks.title') }}</h1>
        <p>{{ myTasks.length }} {{ t('tasks.tasksAssigned') }}</p>
      </div>
      <div class="header-actions">
        <Button
          icon="pi pi-refresh"
          :label="t('tasks.syncPlanner')"
          :loading="syncing"
          @click="syncFromPlanner"
          class="btn-outline"
        />
      </div>
    </div>

    <div class="view-content">
      <!-- Stats Cards -->
      <div class="stats-row">
        <div class="stat-card">
          <div class="stat-icon todo">
            <i class="pi pi-list"></i>
          </div>
          <div class="stat-info">
            <span class="stat-value">{{ stats.todo }}</span>
            <span class="stat-label">{{ t('tasks.statusTodo') }}</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon in-progress">
            <i class="pi pi-spinner"></i>
          </div>
          <div class="stat-info">
            <span class="stat-value">{{ stats.inProgress }}</span>
            <span class="stat-label">{{ t('tasks.statusInProgress') }}</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon review">
            <i class="pi pi-eye"></i>
          </div>
          <div class="stat-info">
            <span class="stat-value">{{ stats.review }}</span>
            <span class="stat-label">{{ t('tasks.statusReview') }}</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon completed">
            <i class="pi pi-check-circle"></i>
          </div>
          <div class="stat-info">
            <span class="stat-value">{{ stats.completed }}</span>
            <span class="stat-label">{{ t('tasks.statusCompleted') }}</span>
          </div>
        </div>
      </div>

      <!-- Filters -->
      <div class="filters-card">
        <div class="filters-row">
          <div class="search-field">
            <InputText
              v-model="searchQuery"
              :placeholder="t('common.search') + ' tasks...'"
              class="w-full"
            />
            <i class="pi pi-search search-icon"></i>
          </div>
          <div class="filter-group">
            <Dropdown
              v-model="filterStatus"
              :options="statusOptions"
              optionLabel="label"
              optionValue="value"
              :placeholder="t('tasks.status')"
              showClear
            />
          </div>
          <div class="filter-group">
            <Dropdown
              v-model="filterPriority"
              :options="priorityOptions"
              optionLabel="label"
              optionValue="value"
              :placeholder="t('tasks.priority')"
              showClear
            />
          </div>
        </div>
      </div>

      <!-- Loading -->
      <LoadingState v-if="taskStore.loading" :text="t('common.loading')" />

      <!-- Empty -->
      <EmptyState
        v-else-if="filteredTasks.length === 0 && !searchQuery && !filterStatus && !filterPriority"
        :title="t('tasks.noTasks')"
        :subtitle="t('tasks.noTasksDesc')"
        icon-class="pi pi-check-square"
      />

      <EmptyState
        v-else-if="filteredTasks.length === 0"
        title="No tasks found"
        subtitle="Try adjusting your search or filters"
        icon-class="pi pi-filter-slash"
      />

      <!-- Tasks grouped by project -->
      <div v-else class="tasks-content">
        <div 
          v-for="(group, projectName) in groupedTasks" 
          :key="projectName"
          class="project-group"
        >
          <div class="group-header" @click="router.push(`/projects/${group.projectId}`)">
            <div class="group-title">
              <i class="pi pi-folder"></i>
              <h3>{{ projectName }}</h3>
              <span class="group-count">{{ group.tasks.length }}</span>
            </div>
            <i class="pi pi-chevron-right group-arrow"></i>
          </div>

          <div class="tasks-list">
            <div
              v-for="task in group.tasks"
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
                  {{ truncate(task.description, 120) }}
                </p>
              </div>

              <div class="task-meta">
                <span class="task-badge priority" :class="`priority-${task.priority}`">
                  {{ formatPriority(task.priority) }}
                </span>
                <span class="task-badge status" :class="`status-${task.status}`">
                  {{ formatStatus(task.status) }}
                </span>
              </div>

              <div class="task-details-col">
                <div class="task-detail" v-if="task.estimatedHours">
                  <i class="pi pi-clock"></i>
                  <span>{{ task.estimatedHours }}h</span>
                </div>
                <div class="task-detail" v-if="task.dueDate">
                  <i class="pi pi-calendar"></i>
                  <span :class="{ 'overdue': isOverdue(task) }">
                    {{ formatDate(task.dueDate) }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Planner info note -->
      <div class="planner-note" v-if="filteredTasks.length > 0">
        <i class="pi pi-info-circle"></i>
        <span>{{ t('tasks.plannerNote') }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useTaskStore } from '@/stores/task'
import { useLocale } from '@/composables/useLocale'
import { useToast } from 'primevue/usetoast'
import { format } from 'date-fns'
import Button from 'primevue/button'
import Dropdown from 'primevue/dropdown'
import InputText from 'primevue/inputtext'
import LoadingState from '@/components/ui/LoadingState.vue'
import EmptyState from '@/components/ui/EmptyState.vue'

const router = useRouter()
const taskStore = useTaskStore()
const { t } = useLocale()
const toast = useToast()

const searchQuery = ref('')
const filterStatus = ref(null)
const filterPriority = ref(null)
const syncing = ref(false)

const myTasks = computed(() => taskStore.myTasks || [])

const stats = computed(() => {
  const tasks = myTasks.value
  return {
    todo: tasks.filter(t => t.status === 'todo').length,
    inProgress: tasks.filter(t => t.status === 'in-progress').length,
    review: tasks.filter(t => t.status === 'review').length,
    completed: tasks.filter(t => t.status === 'completed').length,
    blocked: tasks.filter(t => t.status === 'blocked').length
  }
})

const statusOptions = computed(() => [
  { label: t('tasks.statusTodo'), value: 'todo' },
  { label: t('tasks.statusInProgress'), value: 'in-progress' },
  { label: t('tasks.statusReview'), value: 'review' },
  { label: t('tasks.statusCompleted'), value: 'completed' },
  { label: t('tasks.statusBlocked'), value: 'blocked' }
])

const priorityOptions = computed(() => [
  { label: t('priority.low'), value: 'low' },
  { label: t('priority.medium'), value: 'medium' },
  { label: t('priority.high'), value: 'high' },
  { label: t('priority.critical'), value: 'critical' }
])

const filteredTasks = computed(() => {
  let tasks = [...myTasks.value]

  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    tasks = tasks.filter(t =>
      t.title?.toLowerCase().includes(q) ||
      t.description?.toLowerCase().includes(q) ||
      t.project?.name?.toLowerCase().includes(q)
    )
  }

  if (filterStatus.value) {
    tasks = tasks.filter(t => t.status === filterStatus.value)
  }

  if (filterPriority.value) {
    tasks = tasks.filter(t => t.priority === filterPriority.value)
  }

  return tasks
})

const groupedTasks = computed(() => {
  const groups = {}
  for (const task of filteredTasks.value) {
    const projectName = task.project?.name || 'Unassigned'
    const projectId = task.project?.id || task.projectId
    if (!groups[projectName]) {
      groups[projectName] = { projectId, tasks: [] }
    }
    groups[projectName].tasks.push(task)
  }
  // Sort tasks within each group: active first, completed last
  const statusOrder = { 'blocked': 0, 'in-progress': 1, 'review': 2, 'todo': 3, 'completed': 4 }
  for (const group of Object.values(groups)) {
    group.tasks.sort((a, b) => (statusOrder[a.status] || 3) - (statusOrder[b.status] || 3))
  }
  return groups
})

const formatStatus = (status) => {
  const map = {
    'todo': t('tasks.statusTodo'),
    'in-progress': t('tasks.statusInProgress'),
    'review': t('tasks.statusReview'),
    'completed': t('tasks.statusCompleted'),
    'blocked': t('tasks.statusBlocked')
  }
  return map[status] || status
}

const formatPriority = (priority) => {
  return priority?.charAt(0).toUpperCase() + priority?.slice(1) || 'Medium'
}

const formatDate = (dateString) => {
  if (!dateString) return ''
  try {
    return format(new Date(dateString), 'MMM dd, yyyy')
  } catch {
    return 'Invalid date'
  }
}

const isOverdue = (task) => {
  if (!task.dueDate || task.status === 'completed') return false
  return new Date(task.dueDate) < new Date()
}

const truncate = (text, length) => {
  if (!text) return ''
  return text.length > length ? text.substring(0, length) + '...' : text
}

const syncFromPlanner = async () => {
  syncing.value = true
  try {
    const result = await taskStore.syncFromPlanner()
    toast.add({
      severity: result.synced > 0 ? 'success' : 'info',
      summary: result.synced > 0 ? t('tasks.syncSuccess') : t('tasks.syncUpToDate'),
      detail: result.message,
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

onMounted(() => {
  taskStore.fetchMyTasks()
})
</script>

<style scoped>
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

.stat-icon.todo {
  background: #f0f4ff;
  color: #6366f1;
}
.stat-icon.in-progress {
  background: #fff7ed;
  color: #f59e0b;
}
.stat-icon.review {
  background: #f0f9ff;
  color: #3b82f6;
}
.stat-icon.completed {
  background: #f0fdf4;
  color: #10b981;
}

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

/* Filters */
.filters-card {
  background: var(--color-bg-primary, #ffffff);
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  margin-bottom: 24px;
  border: 1px solid var(--color-border, #e5e7eb);
}

.filters-row {
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: 16px;
  align-items: center;
}

.search-field {
  position: relative;
  min-width: 280px;
}

.search-field :deep(.p-inputtext) {
  width: 100%;
  padding-right: 36px;
}

.search-icon {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--color-text-tertiary, #9ca3af);
  font-size: 16px;
  pointer-events: none;
}

.filter-group {
  min-width: 180px;
}

/* Project groups */
.tasks-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.project-group {
  background: var(--color-bg-primary, #ffffff);
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.group-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: var(--color-bg-secondary, #f9fafb);
  border-bottom: 1px solid var(--color-border, #e5e7eb);
  cursor: pointer;
  transition: background 0.15s;
}

.group-header:hover {
  background: var(--color-bg-tertiary, #f3f4f6);
}

.group-title {
  display: flex;
  align-items: center;
  gap: 10px;
}

.group-title i {
  color: var(--color-primary, #6366f1);
  font-size: 1rem;
}

.group-title h3 {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text-primary, #111827);
  margin: 0;
}

.group-count {
  background: var(--color-bg-primary, #ffffff);
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: 10px;
  padding: 2px 10px;
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--color-text-secondary, #6b7280);
}

.group-arrow {
  color: var(--color-text-tertiary, #9ca3af);
  font-size: 0.85rem;
}

/* Task rows */
.tasks-list {
  display: flex;
  flex-direction: column;
}

.task-row {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  border-bottom: 1px solid var(--color-border, #f3f4f6);
  transition: background 0.1s;
}

.task-row:last-child {
  border-bottom: none;
}

.task-row:hover {
  background: var(--color-bg-secondary, #f9fafb);
}

.task-row.task-completed {
  opacity: 0.6;
}

.task-row.task-completed .task-title {
  text-decoration: line-through;
}

/* Status indicator dot */
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

.overdue {
  color: #dc2626 !important;
  font-weight: 600;
}

/* Planner note */
.planner-note {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 20px;
  padding: 14px 18px;
  background: #f0f4ff;
  border: 1px solid #e0e7ff;
  border-radius: 10px;
  color: #4338ca;
  font-size: 0.82rem;
}

.planner-note i {
  font-size: 1rem;
  flex-shrink: 0;
}

/* Responsive */
@media (max-width: 768px) {
  .stats-row {
    grid-template-columns: repeat(2, 1fr);
  }

  .filters-row {
    grid-template-columns: 1fr;
  }

  .task-row {
    flex-wrap: wrap;
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
