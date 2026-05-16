<template>
  <div class="view-container projects-view">
    <!-- Header Section -->
    <div class="view-header">
      <div class="header-content">
        <h1>{{ t('projects.title') }}</h1>
        <p>{{ filteredProjects.length }} {{ t('projects.projectsTotal') }}</p>
      </div>
      <div class="header-actions">
        <Button 
          v-if="canCreateProjects"
          icon="pi pi-plus" 
          :label="t('projects.newProject')" 
          @click="showCreateDialog = true"
          class="btn-primary"
        />
      </div>
    </div>

    <!-- Filters Section -->
    <div class="view-content">
      <div class="filters-card">
        <div class="filters-row">
          <div class="search-field">
            <InputText
              v-model="searchQuery"
              :placeholder="t('common.search') + ' projects...'"
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
              :placeholder="t('projects.status')"
              showClear
            />
          </div>
          <div class="filter-group">
            <Dropdown
              v-model="filterPriority"
              :options="priorityOptions"
              optionLabel="label"
              optionValue="value"
              :placeholder="t('projects.priority')"
              showClear
            />
          </div>
        </div>
      </div>

    <!-- Projects Grid -->
      <LoadingState 
        v-if="projectStore.loading" 
        :text="t('common.loading')"
      />

      <EmptyState 
        v-else-if="filteredProjects.length === 0 && !searchQuery && !filterStatus && !filterPriority"
        :title="t('projects.noProjects')"
        :subtitle="t('projects.createFirst')"
        icon-class="pi pi-folder-open"
      >
        <template #action>
          <Button 
            v-if="canCreateProjects"
            icon="pi pi-plus" 
            :label="t('projects.createFirst')" 
            @click="showCreateDialog = true"
            class="btn-primary empty-btn"
          />
          <p v-else class="no-permission-text">
            Only Project Managers and Administrators can create projects.
          </p>
        </template>
      </EmptyState>

      <EmptyState 
        v-else-if="filteredProjects.length === 0"
        :title="'No projects found'"
        :subtitle="'Try adjusting your search or filters'"
        icon-class="pi pi-filter-slash"
      />

      <div v-else class="projects-grid">
        <ProjectCard
          v-for="project in filteredProjects" 
          :key="project.id"
          :project="project"
          :show-menu="activeMenu === project.id"
          @click="viewProject"
          @menu-toggle="toggleMenu"
          @edit="editProject"
          @delete="confirmDelete"
          @ai-retry="retryAI"
        />
      </div>
    </div>

    <!-- Create Project Dialog -->
    <!-- Create Project Modal -->
    <ProjectForm 
      v-if="showCreateDialog"
      @close="showCreateDialog = false"
      @created="handleProjectCreated" 
    />

    <!-- AI Retry Settings Dialog -->
    <AIRetrySettingsDialog
      v-if="showRetryDialog && retryProject"
      :project="retryProject"
      @close="closeRetryDialog"
      @retry="handleRetryWithSettings"
    />

    <!-- Overlay for menu -->
    <div 
      v-if="activeMenu" 
      class="menu-overlay" 
      @click="activeMenu = null"
    ></div>

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
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useProjectStore } from '@/stores/project'
import { useAuthStore } from '@/stores/auth'
import { useLocale } from '@/composables/useLocale'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import Dropdown from 'primevue/dropdown'
import InputText from 'primevue/inputtext'
import ProjectForm from '@/components/ProjectForm.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import LoadingState from '@/components/ui/LoadingState.vue'
import ProjectCard from '@/components/project/ProjectCard.vue'
import AIRetrySettingsDialog from '@/components/project/AIRetrySettingsDialog.vue'
import { format } from 'date-fns'

const router = useRouter()
const projectStore = useProjectStore()
const authStore = useAuthStore()
const { t } = useLocale()
const toast = useToast()
const confirm = useConfirm()

const showCreateDialog = ref(false)
const showRetryDialog = ref(false)
const showEditDialog = ref(false)
const saving = ref(false)
const retryProject = ref(null)
const activeMenu = ref(null)
const searchQuery = ref('')
const filterStatus = ref(null)
const filterPriority = ref(null)
const editTagsInput = ref('')
const editForm = ref({
  id: null,
  name: '',
  description: '',
  startDate: '',
  endDate: '',
  priority: 'medium',
  budget: 0,
  tags: []
})

const statusOptions = computed(() => [
  { label: 'All Status', value: null },
  { label: 'Planning', value: 'planning' },
  { label: 'Active', value: 'active' },
  { label: 'On Hold', value: 'on-hold' },
  { label: 'Completed', value: 'completed' },
  { label: 'Cancelled', value: 'cancelled' }
])

const priorityOptions = computed(() => [
  { label: 'All Priorities', value: null },
  { label: 'Low', value: 'low' },
  { label: 'Medium', value: 'medium' },
  { label: 'High', value: 'high' },
  { label: 'Critical', value: 'critical' }
])

const filteredProjects = computed(() => {
  let projects = projectStore.projects || []
  
  // Filter by search query
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    projects = projects.filter(project => 
      project.name?.toLowerCase().includes(query) ||
      project.description?.toLowerCase().includes(query)
    )
  }
  
  // Filter by status
  if (filterStatus.value) {
    projects = projects.filter(project => project.status === filterStatus.value)
  }
  
  // Filter by priority
  if (filterPriority.value) {
    projects = projects.filter(project => project.priority === filterPriority.value)
  }
  
  return projects
})

const canCreateProjects = computed(() => {
  const role = authStore.user?.role
  return role === 'pm' || role === 'admin'
})

onMounted(() => {
  projectStore.fetchProjects()
  document.addEventListener('click', handleClickOutside)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
})

const handleClickOutside = () => {
  activeMenu.value = null
}

const toggleMenu = (projectId, event) => {
  event.stopPropagation()
  activeMenu.value = activeMenu.value === projectId ? null : projectId
}

const viewProject = (project) => {
  // Handle different project states
  if (project.aiStatus === 'generating') {
    // Show toast message for generating projects
    toast.add({
      severity: 'info',
      summary: 'AI Processing',
      detail: 'AI is currently analyzing this project. Please wait...',
      life: 4000
    })
    return
  } else if (project.aiStatus === 'waiting_approval' && project.aiSuggestionId) {
    // Navigate to AI suggestions view for approval
    router.push(`/ai-suggestions/${project.aiSuggestionId}`)
    return
  } else if (project.aiStatus === 'failed') {
    // Open retry settings dialog so user can adjust settings and retry
    openRetryDialog(project)
    return
  }
  
  // Navigate to normal project detail view
  router.push(`/projects/${project.id}`)
}

const handleProjectCreated = () => {
  showCreateDialog.value = false
  // Refresh projects list
  projectStore.fetchProjects()
}

const editProject = (project) => {
  activeMenu.value = null
  
  if (project.aiStatus === 'generating') {
    toast.add({
      severity: 'info',
      summary: 'Cannot Edit Project',
      detail: 'This project cannot be edited while AI analysis is in progress. Please wait for the analysis to complete.',
      life: 5000
    })
    return
  }
  
  editForm.value = {
    id: project.id,
    name: project.name || '',
    description: project.description || '',
    startDate: formatDateForInput(project.startDate),
    endDate: formatDateForInput(project.endDate),
    priority: project.priority || 'medium',
    budget: project.budget || 0,
    tags: project.tags ? [...project.tags] : []
  }
  editTagsInput.value = (project.tags || []).join(', ')
  showEditDialog.value = true
}

const formatDateForInput = (dateString) => {
  if (!dateString) return ''
  try {
    return format(new Date(dateString), 'yyyy-MM-dd')
  } catch {
    return ''
  }
}

const removeEditTag = (index) => {
  editForm.value.tags.splice(index, 1)
  editTagsInput.value = editForm.value.tags.join(', ')
}

const saveProject = async () => {
  editForm.value.tags = editTagsInput.value
    .split(',')
    .map(t => t.trim())
    .filter(t => t.length > 0)

  saving.value = true
  try {
    const { id, ...data } = editForm.value
    await projectStore.updateProject(id, data)
    showEditDialog.value = false
    await projectStore.fetchProjects()
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

const confirmDelete = (project) => {
  activeMenu.value = null
  
  if (project.aiStatus === 'generating') {
    toast.add({
      severity: 'warn',
      summary: 'Cannot Delete Project',
      detail: 'This project cannot be deleted while AI analysis is in progress. Please wait for the analysis to complete or let it fail before attempting deletion.',
      life: 6000
    })
    return
  }
  
  confirm.require({
    message: `Are you sure you want to delete "${project.name}"?`,
    header: 'Delete Project',
    icon: 'pi pi-exclamation-triangle',
    acceptClass: 'p-button-danger',
    accept: () => deleteProject(project)
  })
}

const deleteProject = async (project) => {
  try {
    await projectStore.deleteProject(project.id)
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Project deleted successfully',
      life: 3000
    })
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to delete project',
      life: 3000
    })
  }
}
const openRetryDialog = (project) => {
  retryProject.value = project
  showRetryDialog.value = true
  activeMenu.value = null
}

const closeRetryDialog = () => {
  showRetryDialog.value = false
  retryProject.value = null
}

const retryAI = (project) => {
  // Open retry settings dialog instead of immediately retrying
  openRetryDialog(project)
}

const handleRetryWithSettings = (retrySettings) => {
  const project = retryProject.value

  if (typeof projectStore.retryAIAnalysis !== 'function') {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Retry not available', life: 4000 })
    return
  }

  // Close immediately and inform — generation runs in background
  closeRetryDialog()
  toast.add({
    severity: 'info',
    summary: 'AI Analysis Started',
    detail: `Generating AI analysis for "${project?.name}" in ${retrySettings.locale === 'sk' ? 'Slovak' : 'English'}. You'll be notified when ready.`,
    life: 6000
  })

  projectStore.retryAIAnalysis(retrySettings.projectId, {
    selectedModel: retrySettings.selectedModel,
    locale: retrySettings.locale,
    generateTasks: retrySettings.generateTasks,
    generateRisks: retrySettings.generateRisks,
    generateGantt: retrySettings.generateGantt
  }).catch(error => {
    console.error('Retry AI error:', error)
    toast.add({
      severity: 'error',
      summary: 'AI Analysis Failed',
      detail: error.response?.data?.message || error.message || 'Failed to retry AI analysis',
      life: 6000
    })
  })
}
const handleCreateProject = async (projectData) => {
  try {
    await projectStore.createProject(projectData)
    showCreateDialog.value = false
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Project created successfully',
      life: 3000
    })
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to create project',
      life: 3000
    })
  }
}

const formatStatus = (status) => {
  const statusMap = {
    planning: 'Planning',
    active: 'Active', 
    'on-hold': 'On Hold',
    completed: 'Completed',
    cancelled: 'Cancelled'
  }
  return statusMap[status] || status
}

const formatPriority = (priority) => {
  const priorityMap = {
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    critical: 'Critical'
  }
  return priorityMap[priority] || priority
}

const formatDate = (dateString) => {
  if (!dateString) return 'No deadline'
  try {
    return format(new Date(dateString), 'MMM dd, yyyy')
  } catch (error) {
    return 'Invalid date'
  }
}

const getInitials = (name) => {
  if (!name) return 'U'
  return name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2)
}
</script>

<style scoped>
.filters-card {
  background: var(--color-bg-primary);
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
  margin-bottom: 24px;
  border: 1px solid var(--color-border);
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
  color: var(--color-text-tertiary);
  font-size: 16px;
  pointer-events: none;
}

.filter-group {
  min-width: 200px;
}

.menu-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 999;
}

.no-permission-text {
  text-align: center;
  color: var(--color-text-secondary);
  font-style: italic;
  margin-top: 16px;
}

/* Edit Project Dialog */
.edit-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
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
  padding: 10px 12px;
  border: 1px solid var(--color-border, #d1d5db);
  border-radius: 8px;
  font-size: 0.9rem;
  background: var(--color-bg-primary, #ffffff);
  color: var(--color-text-primary, #374151);
  transition: border-color 0.15s;
  width: 100%;
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
  padding: 4px 10px;
  background: #f0f0ff;
  color: #6366f1;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 500;
}

.edit-tag-remove {
  background: none;
  border: none;
  color: #6366f1;
  cursor: pointer;
  font-size: 1rem;
  line-height: 1;
  padding: 0 2px;
}
</style>
