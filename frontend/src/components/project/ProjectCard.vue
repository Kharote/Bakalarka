<template>
  <div 
    class="project-card" 
    :class="{
      'ai-generating': project.aiStatus === 'generating',
      'ai-waiting': project.aiStatus === 'waiting_approval',
      'ai-failed': project.aiStatus === 'failed'
    }"
    @click="$emit('click', project)"
  >
    <div class="project-header">
      <div class="project-info">
        <h3 class="project-name">{{ project.name }}</h3>
        <p class="project-description">{{ project.description || 'No description' }}</p>
      </div>
      <div class="project-menu" v-if="project.aiStatus !== 'generating'">
        <Button 
          icon="pi pi-ellipsis-v" 
          class="btn-menu"
          @click.stop="toggleMenu"
        />
        <Menu 
          ref="projectMenu" 
          :model="menuItems" 
          :popup="true" 
          class="project-dropdown-menu"
        />
      </div>
    </div>

    <div class="project-status">
      <div class="status-info">
        <span class="status-badge" :class="`status-${project.status}`">
          {{ formatStatus(project.status) }}
        </span>
        <span class="priority-badge" :class="`priority-${project.priority}`">
          {{ formatPriority(project.priority) }}
        </span>
        <!-- AI Status Badge -->
        <span 
          v-if="project.aiStatus" 
          class="ai-status-badge" 
          :class="`ai-${project.aiStatus}`"
          @click.stop="handleAIStatusClick"
        >
          <i :class="getAIStatusIcon(project.aiStatus)"></i>
          {{ formatAIStatus(project.aiStatus) }}
        </span>
      </div>
    </div>

    <div class="project-progress">
      <div class="progress-header">
        <span class="progress-label">Progress</span>
        <span class="progress-value">{{ project.progress || 0 }}%</span>
      </div>
      <div class="progress-bar">
        <div 
          class="progress-fill" 
          :style="{ width: `${project.progress || 0}%` }"
        ></div>
      </div>
    </div>

    <div class="project-footer">
      <div class="project-dates">
        <span class="date-label">Due:</span>
        <span class="date-value">{{ formatDate(project.endDate) }}</span>
      </div>
      <div class="project-team">
        <div class="team-avatars">
          <div 
            v-for="member in project.members?.slice(0, 3)" 
            :key="member.id"
            class="team-avatar"
          >
            <img 
              v-if="member.user?.profilePicture" 
              :src="member.user.profilePicture" 
              :alt="member.user?.name || member.name"
              @error="handleImageError"
            />
            <i v-else class="pi pi-user"></i>
          </div>
          <div v-if="project.members?.length > 3" class="team-more">
            +{{ project.members.length - 3 }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { format } from 'date-fns'
import { useRouter } from 'vue-router'
import { ref, computed } from 'vue'
import Button from 'primevue/button'
import Menu from 'primevue/menu'

const router = useRouter()
const projectMenu = ref()

const props = defineProps({
  project: {
    type: Object,
    required: true
  },
  showMenu: Boolean
})

const emit = defineEmits(['click', 'menu-toggle', 'edit', 'delete', 'ai-click', 'ai-retry'])

const menuItems = computed(() => {
  // Don't show menu for generating AI projects
  if (props.project.aiStatus === 'generating') {
    return []
  }
  
  const items = []
  
  // Show Retry AI instead of Edit for failed AI projects
  if (props.project.aiStatus === 'failed' || props.project.aiStatus === 'waiting_approval') {
    items.push({
      label: 'Retry AI Analysis',
      icon: 'pi pi-refresh',
      command: () => emit('ai-retry', props.project)
    })
  }

  items.push({
    label: 'Edit Project',
    icon: 'pi pi-pencil',
    command: () => emit('edit', props.project)
  })
  
  // For waiting_approval also allow viewing suggestions
  if (props.project.aiStatus === 'waiting_approval' && props.project.aiSuggestionId) {
    items.push({
      label: 'View AI Suggestions',
      icon: 'pi pi-eye',
      command: () => router.push(`/ai-suggestions/${props.project.aiSuggestionId}`)
    })
  }
  
  items.push(
    {
      separator: true
    },
    {
      label: 'Delete Project',
      icon: 'pi pi-trash',
      class: 'danger-menu-item',
      command: () => emit('delete', props.project)
    }
  )
  
  return items
})

const toggleMenu = (event) => {
  projectMenu.value.toggle(event)
}

const formatStatus = (status) => {
  return status?.charAt(0).toUpperCase() + status?.slice(1).replace('-', ' ') || 'Unknown'
}

const formatPriority = (priority) => {
  return priority?.charAt(0).toUpperCase() + priority?.slice(1) || 'Medium'
}

const formatAIStatus = (aiStatus) => {
  const statusMap = {
    generating: 'AI Generating...',
    waiting_approval: 'Waiting for Approval',
    approved: 'AI Approved',
    failed: 'AI Failed'
  }
  return statusMap[aiStatus] || aiStatus
}

const getAIStatusIcon = (aiStatus) => {
  const iconMap = {
    generating: 'pi pi-spin pi-spinner',
    waiting_approval: 'pi pi-clock',
    approved: 'pi pi-check-circle',
    failed: 'pi pi-exclamation-triangle'
  }
  return iconMap[aiStatus] || 'pi pi-info-circle'
}

const handleAIStatusClick = () => {
  if (props.project.aiStatus === 'waiting_approval' && props.project.aiSuggestionId) {
    // Navigate to AI suggestions view
    router.push(`/ai-suggestions/${props.project.aiSuggestionId}`)
  } else if (props.project.aiStatus === 'failed') {
    // Emit retry event to open retry settings dialog
    emit('ai-retry', props.project)
  }
}

const formatDate = (date) => {
  return date ? format(new Date(date), 'MMM dd, yyyy') : '-'
}

const getInitials = (name) => {
  return name
    ?.split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2) || '??'
}

const handleImageError = (event) => {
  // Hide the broken image and show fallback icon
  event.target.style.display = 'none'
  const parent = event.target.parentElement
  const fallbackIcon = parent.querySelector('.pi-user')
  if (fallbackIcon) {
    fallbackIcon.style.display = 'flex'
  }
}
</script>

<style scoped>
.project-card {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 2rem;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  min-height: 280px;
}

.project-card:hover {
  border-color: #d1d5db;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  transform: translateY(-2px);
}

/* AI State Styling */
.project-card.ai-generating {
  border-color: #3b82f6;
  background: linear-gradient(135deg, #ffffff 0%, #f8faff 100%);
  cursor: not-allowed;
}

.project-card.ai-generating:hover {
  transform: none;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.15);
}

.project-card.ai-waiting {
  border-color: #f59e0b;
  background: linear-gradient(135deg, #ffffff 0%, #fffaf0 100%);
  cursor: pointer;
}

.project-card.ai-waiting:hover {
  border-color: #d97706;
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.15);
}

.project-card.ai-failed {
  border-color: #ef4444;
  background: linear-gradient(135deg, #ffffff 0%, #fef2f2 100%);
}

.project-card.ai-failed:hover {
  border-color: #dc2626;
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.15);
}

.project-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
  position: relative;
}

.project-info {
  flex: 1;
  padding-right: 1rem;
}

.project-name {
  font-size: 1.25rem;
  font-weight: 700;
  color: #111827;
  margin: 0 0 0.75rem 0;
  line-height: 1.4;
}

.project-description {
  font-size: 0.9375rem;
  color: #6b7280;
  margin: 0;
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.project-menu {
  position: relative;
}

.btn-menu {
  width: 2rem !important;
  height: 2rem !important;
  padding: 0 !important;
  background: transparent !important;
  border: none !important;
  color: #6b7280 !important;
  border-radius: 6px !important;
}

.btn-menu:hover {
  background: #f3f4f6 !important;
  color: #374151 !important;
}



/* PrimeVue Menu Custom Styling - Same as profile dropdown */
.project-dropdown-menu {
  min-width: 200px !important;
  background: var(--color-bg-primary, white) !important;
  border-radius: 12px !important;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04) !important;
  border: 1px solid var(--color-border, transparent) !important;
  padding: 8px !important;
  margin-top: 8px !important;
  overflow: hidden !important;
}

.project-dropdown-menu :deep(.p-menu-list) {
  padding: 0 !important;
  margin: 0 !important;
}

.project-dropdown-menu :deep(.p-menuitem) {
  margin: 0 !important;
}

.project-dropdown-menu :deep(.p-menuitem-link) {
  padding: 12px 16px !important;
  border-radius: 8px !important;
  transition: all 0.2s ease !important;
  color: var(--color-text-primary, #374151) !important;
  font-weight: 500 !important;
  font-size: 14px !important;
  margin: 2px 4px !important;
  display: flex !important;
  align-items: center !important;
  text-decoration: none !important;
}

.project-dropdown-menu :deep(.p-menuitem-link:hover) {
  background: var(--color-bg-tertiary, #f8fafc) !important;
  color: var(--color-text-primary, #111827) !important;
}

.project-dropdown-menu :deep(.p-menuitem-link:focus) {
  background: var(--color-bg-tertiary, #f8fafc) !important;
  color: var(--color-text-primary, #111827) !important;
  box-shadow: none !important;
  outline: none !important;
}

.project-dropdown-menu :deep(.p-menuitem-icon) {
  color: var(--color-text-secondary, #6b7280) !important;
  margin-right: 12px !important;
  font-size: 16px !important;
  width: 16px !important;
  text-align: center !important;
}

.project-dropdown-menu :deep(.p-menuitem-text) {
  color: inherit !important;
  font-weight: inherit !important;
}

.project-dropdown-menu :deep(.p-menu-separator) {
  border-top: 1px solid var(--color-border, #e5e7eb) !important;
  margin: 8px 4px !important;
  height: 1px !important;
}

/* Danger menu item styling */
.project-dropdown-menu :deep(.danger-menu-item .p-menuitem-link) {
  color: #dc2626 !important;
}

.project-dropdown-menu :deep(.danger-menu-item .p-menuitem-link:hover) {
  background: #fef2f2 !important;
  color: #b91c1c !important;
}

.project-dropdown-menu :deep(.danger-menu-item .p-menuitem-icon) {
  color: #dc2626 !important;
}
</style>

<style>
/* Global styles for ProjectCard Menu - Unscoped to ensure proper targeting */
.project-dropdown-menu.p-menu {
  min-width: 200px !important;
  background: var(--color-bg-primary, white) !important;
  border-radius: 12px !important;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04) !important;
  border: 1px solid var(--color-border, transparent) !important;
  padding: 8px !important;
  margin-top: 8px !important;
  overflow: hidden !important;
}

.project-dropdown-menu .p-menu-list {
  padding: 0 !important;
  margin: 0 !important;
}

.project-dropdown-menu .p-menuitem {
  margin: 0 !important;
}

.project-dropdown-menu .p-menuitem-link {
  padding: 12px 16px !important;
  border-radius: 8px !important;
  transition: all 0.2s ease !important;
  color: var(--color-text-primary, #374151) !important;
  font-weight: 500 !important;
  font-size: 14px !important;
  margin: 2px 4px !important;
  display: flex !important;
  align-items: center !important;
  text-decoration: none !important;
}

.project-dropdown-menu .p-menuitem-link:hover {
  background: var(--color-bg-tertiary, #f8fafc) !important;
  color: var(--color-text-primary, #111827) !important;
}

.project-dropdown-menu .p-menuitem-link:focus {
  background: var(--color-bg-tertiary, #f8fafc) !important;
  color: var(--color-text-primary, #111827) !important;
  box-shadow: none !important;
  outline: none !important;
}

.project-dropdown-menu .p-menuitem-icon {
  color: #6b7280 !important;
  margin-right: 12px !important;
  font-size: 16px !important;
  width: 16px !important;
  text-align: center !important;
}

.project-dropdown-menu .p-menuitem-text {
  color: inherit !important;
  font-weight: inherit !important;
}

.project-dropdown-menu .p-menu-separator {
  border-top: 1px solid #e5e7eb !important;
  margin: 8px 4px !important;
  height: 1px !important;
}

/* Danger menu item styling */
.project-dropdown-menu .danger-menu-item .p-menuitem-link {
  color: #dc2626 !important;
}

.project-dropdown-menu .danger-menu-item .p-menuitem-link:hover {
  background: #fef2f2 !important;
  color: #b91c1c !important;
}

.project-dropdown-menu .danger-menu-item .p-menuitem-icon {
  color: #dc2626 !important;
}

/* Disabled menu item styling */
.project-dropdown-menu :deep(.disabled-menu-item .p-menuitem-link) {
  color: #9ca3af !important;
  cursor: not-allowed !important;
  opacity: 0.5 !important;
}

.project-dropdown-menu :deep(.disabled-menu-item .p-menuitem-link:hover) {
  background: transparent !important;
  color: #9ca3af !important;
}

.project-dropdown-menu :deep(.disabled-menu-item .p-menuitem-icon) {
  color: #9ca3af !important;
}

.project-dropdown-menu :deep(.disabled-menu-item.danger-menu-item .p-menuitem-link) {
  color: #9ca3af !important;
}

.project-dropdown-menu :deep(.disabled-menu-item.danger-menu-item .p-menuitem-link:hover) {
  background: transparent !important;
  color: #9ca3af !important;
}

.project-dropdown-menu :deep(.disabled-menu-item.danger-menu-item .p-menuitem-icon) {
  color: #9ca3af !important;
}

.project-status {
  margin-bottom: 1rem;
}

.status-info {
  display: flex;
  gap: 0.5rem;
}

.status-badge, .priority-badge {
  font-size: 0.75rem;
  font-weight: 500;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  text-transform: capitalize;
}

.status-planning {
  background: #fef3c7;
  color: #92400e;
}

.status-active {
  background: #d1fae5;
  color: #065f46;
}

.status-on-hold {
  background: #fde68a;
  color: #92400e;
}

.status-completed {
  background: #d1fae5;
  color: #065f46;
}

.status-cancelled {
  background: #fecaca;
  color: #991b1b;
}

.priority-low {
  background: #d1fae5;
  color: #065f46;
}

.priority-medium {
  background: #dbeafe;
  color: #1e40af;
}

.priority-high {
  background: #fed7aa;
  color: #c2410c;
}

.priority-critical {
  background: #fecaca;
  color: #991b1b;
}

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
  font-size: 0.875rem;
  color: #6b7280;
  font-weight: 500;
}

.progress-value {
  font-size: 0.875rem;
  color: #111827;
  font-weight: 600;
}

.progress-bar {
  width: 100%;
  height: 6px;
  background: #e5e7eb;
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
  transition: width 0.3s ease;
}

.project-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 0.5rem;
}

.project-dates {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.date-label {
  font-size: 0.8125rem;
  color: #9ca3af;
  font-weight: 500;
}

.date-value {
  font-size: 0.8125rem;
  color: #6b7280;
  font-weight: 600;
}

.team-avatars {
  display: flex;
  align-items: center;
}

.team-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 600;
  border: 2px solid white;
  margin-left: -8px;
  transition: transform 0.2s ease;
  position: relative;
  overflow: hidden;
}

.team-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
}

.team-avatar i {
  font-size: 0.8rem;
  color: white;
}

.team-avatar:first-child {
  margin-left: 0;
}

.team-avatar:hover {
  transform: translateY(-2px);
  z-index: 1;
}

.team-more {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #f3f4f6;
  color: #6b7280;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 600;
  border: 2px solid white;
  margin-left: -8px;
}

/* AI Status Badge Styles */
.ai-status-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.025em;
  cursor: pointer;
  transition: all 0.2s ease;
}

.ai-status-badge:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.ai-status-badge.ai-generating {
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  color: white;
  cursor: default;
}

.ai-status-badge.ai-generating:hover {
  transform: none;
  box-shadow: none;
}

.ai-status-badge.ai-waiting_approval {
  background: linear-gradient(135deg, #f59e0b, #d97706);
  color: white;
  cursor: pointer;
}

.ai-status-badge.ai-waiting_approval:hover {
  background: linear-gradient(135deg, #d97706, #b45309);
}

.ai-status-badge.ai-failed {
  background: linear-gradient(135deg, #ef4444, #dc2626);
  color: white;
  cursor: default;
}

.ai-status-badge.ai-failed:hover {
  transform: none;
  box-shadow: none;
}

.ai-status-badge.ai-approved {
  background: linear-gradient(135deg, #10b981, #059669);
  color: white;
  cursor: default;
  border: 2px solid rgba(16, 185, 129, 0.3);
}

.ai-status-badge.ai-approved:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(16, 185, 129, 0.2);
}

.ai-status-badge i {
  font-size: 0.75rem;
}

.ai-retry-inline-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 10px;
  font-size: 0.72rem;
  font-weight: 600;
  border: 1.5px solid #d97706;
  border-radius: 20px;
  background: #fff7ed;
  color: #d97706;
  cursor: pointer;
  transition: all 0.18s ease;
  white-space: nowrap;
}

.ai-retry-inline-btn:hover {
  background: #d97706;
  color: white;
  transform: translateY(-1px);
  box-shadow: 0 3px 8px rgba(217, 119, 6, 0.3);
}

.ai-retry-inline-btn i {
  font-size: 0.72rem;
}
</style>