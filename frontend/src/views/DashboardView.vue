<template>
  <div class="view-container dashboard-view">
    <!-- Standardized Header -->
    <div class="view-header">
      <div class="header-content">
        <h1>{{ t('dashboard.title') }}</h1>
        <p>{{ t('dashboard.subtitle') }}</p>
      </div>
    </div>
    
    <div class="stats-grid">
      <StatCard
        v-for="stat in statistics" 
        :key="stat.label"
        :label="stat.label"
        :value="stat.value"
        :icon-class="stat.icon"
        :color="stat.color"
      />
    </div>
    
    <div class="dashboard-grid">
      <!-- My Tasks -->
      <div class="dashboard-card">
        <div class="dashboard-card-header">
          <h2><i class="pi pi-check-square"></i> {{ t('dashboard.myTasks') }}</h2>
          <span class="card-count">{{ myTasks.length }}</span>
        </div>
        <div class="dashboard-card-body">
          <div v-if="taskStore.loading" class="card-loading">
            <i class="pi pi-spin pi-spinner"></i>
          </div>
          <div v-else-if="myTasks.length === 0" class="card-empty">
            <i class="pi pi-inbox"></i>
            <p>{{ t('dashboard.noTasks') }}</p>
          </div>
          <div v-else class="task-list">
            <div 
              v-for="task in myTasks" 
              :key="task.id" 
              class="task-row"
              @click="$router.push(`/tasks`)"
            >
              <div class="task-main">
                <span class="task-title">{{ task.title }}</span>
                <span class="task-date">{{ formatDate(task.dueDate) }}</span>
              </div>
              <div class="task-badges">
                <span class="mini-badge" :class="`status-${task.status}`">{{ formatStatus(task.status) }}</span>
                <span class="mini-badge" :class="`priority-${task.priority}`">{{ task.priority }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Recent Projects -->
      <div class="dashboard-card">
        <div class="dashboard-card-header">
          <h2><i class="pi pi-folder"></i> {{ t('dashboard.recentProjects') }}</h2>
          <span class="card-count">{{ recentProjects.length }}</span>
        </div>
        <div class="dashboard-card-body">
          <div v-if="projectStore.loading" class="card-loading">
            <i class="pi pi-spin pi-spinner"></i>
          </div>
          <div v-else-if="recentProjects.length === 0" class="card-empty">
            <i class="pi pi-folder-open"></i>
            <p>{{ t('dashboard.noProjects') }}</p>
          </div>
          <div v-else class="project-list">
            <div 
              v-for="project in recentProjects" 
              :key="project.id" 
              class="project-row"
              @click="$router.push(`/projects/${project.id}`)"
            >
              <div class="project-main">
                <span class="project-name">{{ project.name }}</span>
                <span class="mini-badge" :class="`status-${project.status}`">{{ formatStatus(project.status) }}</span>
              </div>
              <div class="project-progress">
                <div class="progress-bar-track">
                  <div 
                    class="progress-bar-fill" 
                    :style="{ width: (project.progress || 0) + '%' }"
                    :class="progressClass(project.progress)"
                  ></div>
                </div>
                <span class="progress-text">{{ project.progress || 0 }}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useProjectStore } from '@/stores/project'
import { useTaskStore } from '@/stores/task'
import { useAuthStore } from '@/stores/auth'
import { useLocale } from '@/composables/useLocale'
import StatCard from '@/components/dashboard/StatCard.vue'
import { format } from 'date-fns'

const projectStore = useProjectStore()
const taskStore = useTaskStore()
const authStore = useAuthStore()
const { t } = useLocale()

const statistics = computed(() => [
  { label: t('dashboard.totalProjects'), value: projectStore.projects.length, icon: 'pi pi-folder', color: '#3B82F6' },
  { label: t('dashboard.activeTasks'), value: taskStore.myTasks.filter(t => t.status === 'in-progress').length, icon: 'pi pi-check-square', color: '#10B981' },
  { label: t('dashboard.completed'), value: taskStore.myTasks.filter(t => t.status === 'completed').length, icon: 'pi pi-check-circle', color: '#8B5CF6' },
  { label: t('dashboard.overdue'), value: taskStore.myTasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'completed').length, icon: 'pi pi-exclamation-triangle', color: '#EF4444' }
])

const myTasks = computed(() => taskStore.myTasks.slice(0, 6))
const recentProjects = computed(() => projectStore.projects.slice(0, 6))

onMounted(async () => {
  await Promise.all([
    projectStore.fetchProjects(),
    taskStore.fetchMyTasks()
  ])
})

const formatDate = (date) => {
  return date ? format(new Date(date), 'MMM dd, yyyy') : '—'
}

const formatStatus = (status) => {
  if (!status) return '—'
  return status.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

const progressClass = (progress) => {
  const p = progress || 0
  if (p >= 100) return 'complete'
  if (p >= 60) return 'good'
  if (p >= 30) return 'medium'
  return 'low'
}
</script>

<style scoped>
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 24px;
  margin-bottom: 24px;
}

/* Dashboard grid */
.dashboard-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

/* Card */
.dashboard-card {
  background: var(--color-bg-primary, #ffffff);
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

.dashboard-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid var(--color-border, #e5e7eb);
}

.dashboard-card-header h2 {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0;
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--color-text-primary, #111827);
}

.dashboard-card-header h2 i {
  font-size: 1rem;
  color: var(--color-text-secondary, #6b7280);
}

.card-count {
  background: var(--color-bg-tertiary, #f3f4f6);
  color: var(--color-text-secondary, #6b7280);
  font-size: 0.8rem;
  font-weight: 600;
  padding: 2px 10px;
  border-radius: 12px;
}

.dashboard-card-body {
  padding: 0;
}

/* Loading / Empty */
.card-loading, .card-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  color: var(--color-text-secondary, #9ca3af);
  gap: 12px;
}

.card-loading i, .card-empty i {
  font-size: 2rem;
  opacity: 0.5;
}

.card-empty p {
  margin: 0;
  font-size: 0.9rem;
}

/* Task rows */
.task-list, .project-list {
  display: flex;
  flex-direction: column;
}

.task-row, .project-row {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 14px 24px;
  border-bottom: 1px solid var(--color-border-light, #f3f4f6);
  cursor: pointer;
  transition: background 0.15s;
}

.task-row:last-child, .project-row:last-child {
  border-bottom: none;
}

.task-row:hover, .project-row:hover {
  background: var(--color-bg-secondary, #f9fafb);
}

.task-main {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.task-title {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-text-primary, #111827);
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-date {
  font-size: 0.78rem;
  color: var(--color-text-secondary, #9ca3af);
  flex-shrink: 0;
}

.task-badges {
  display: flex;
  gap: 6px;
}

/* Mini badges */
.mini-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 10px;
  border-radius: 6px;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: capitalize;
  letter-spacing: 0.02em;
}

/* Status colors */
.mini-badge.status-todo { background: #fef3c7; color: #92400e; }
.mini-badge.status-in-progress { background: #dbeafe; color: #1e40af; }
.mini-badge.status-completed { background: #d1fae5; color: #065f46; }
.mini-badge.status-blocked { background: #fee2e2; color: #991b1b; }
.mini-badge.status-on-hold { background: #fef3c7; color: #92400e; }
.mini-badge.status-cancelled { background: #f3f4f6; color: #6b7280; }
.mini-badge.status-planning { background: #e0e7ff; color: #3730a3; }
.mini-badge.status-active { background: #d1fae5; color: #065f46; }

/* Priority colors */
.mini-badge.priority-critical { background: #fee2e2; color: #991b1b; }
.mini-badge.priority-high { background: #ffedd5; color: #9a3412; }
.mini-badge.priority-medium { background: #fef3c7; color: #92400e; }
.mini-badge.priority-low { background: #d1fae5; color: #065f46; }

/* Project rows */
.project-main {
  display: flex;
  align-items: center;
  gap: 10px;
}

.project-name {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-text-primary, #111827);
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.project-progress {
  display: flex;
  align-items: center;
  gap: 10px;
}

.progress-bar-track {
  flex: 1;
  height: 6px;
  border-radius: 6px;
  background: var(--color-bg-tertiary, #e5e7eb);
  overflow: hidden;
  min-width: 80px;
}

.progress-bar-fill {
  height: 100%;
  border-radius: 6px;
  transition: width 0.4s ease;
}

.progress-bar-fill.low { background: #ef4444; }
.progress-bar-fill.medium { background: #f59e0b; }
.progress-bar-fill.good { background: #3b82f6; }
.progress-bar-fill.complete { background: #10b981; }

.progress-text {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--color-text-secondary, #6b7280);
  min-width: 32px;
  text-align: right;
}

/* Responsive */
@media (max-width: 1024px) {
  .dashboard-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
  }
  
  .task-row, .project-row {
    padding: 12px 16px;
  }
}
</style>