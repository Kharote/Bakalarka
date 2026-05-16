<template>
  <div class="modal-overlay">
    <div class="modal-container">
      <div class="modal-header">
        <div class="modal-title-section">
          <div>
            <h2 class="modal-title">Create New Project</h2>
            <p class="modal-subtitle">Set up your project with all the details needed to get started</p>
          </div>
        </div>
        <button class="modal-close" @click="closeModal" type="button">
          <i class="pi pi-times"></i>
        </button>
      </div>

      <form @submit.prevent="handleSubmit" class="modal-form">
        <div class="form-section">
          <div class="form-row">
            <div class="form-group full-width">
              <label class="form-label">
                Project Name <span class="required">*</span>
              </label>
              <input
                v-model="formData.name"
                type="text"
                class="form-input"
                placeholder="Enter a descriptive project name"
                required
              />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group full-width">
              <label class="form-label">
                Description <span class="required">*</span>
              </label>
              <textarea
                v-model="formData.description"
                class="form-textarea"
                placeholder="Describe what this project is about, its goals, and key objectives"
                required
                rows="4"
              ></textarea>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">
                Start Date <span class="required">*</span>
              </label>
              <input
                v-model="formData.startDate"
                type="date"
                class="form-input"
                required
              />
            </div>
            <div class="form-group">
              <label class="form-label">
                End Date <span class="required">*</span>
              </label>
              <input
                v-model="formData.endDate"
                type="date"
                class="form-input"
                required
              />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">
                Priority <span class="required">*</span>
              </label>
              <div class="select-wrapper">
                <select v-model="formData.priority" class="form-select" required>
                  <option value="low">🟢 Low Priority</option>
                  <option value="medium" selected>🟡 Medium Priority</option>
                  <option value="high">🟠 High Priority</option>
                  <option value="critical">🔴 Critical Priority</option>
                </select>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Status</label>
              <div class="select-wrapper">
                <select v-model="formData.status" class="form-select">
                  <option value="planning" selected>📋 Planning</option>
                  <option value="active">🚀 Active</option>
                  <option value="on-hold">⏸️ On Hold</option>
                </select>
              </div>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Budget (USD)</label>
              <div class="input-with-icon">
                <span class="input-icon">$</span>
                <input
                  v-model="formData.budget"
                  type="number"
                  class="form-input with-icon"
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">
                Language/Locale <span class="required">*</span>
              </label>
              <div class="select-wrapper">
                <select v-model="formData.locale" class="form-select" required>
                  <option value="en">🇬🇧 English</option>
                  <option value="sk">🇸🇰 Slovenčina</option>
                </select>
              </div>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group full-width">
              <label class="form-label">Tags</label>
              <input
                v-model="tagsInput"
                type="text"
                class="form-input"
                placeholder="web, mobile, frontend (comma separated)"
                @input="updateTags"
              />
            </div>
          </div>

          <div v-if="formData.tags.length > 0" class="tags-preview">
            <div class="tag-list">
              <span
                v-for="(tag, index) in formData.tags"
                :key="index"
                class="tag"
              >
                {{ tag }}
                <button
                  type="button"
                  @click="removeTag(index)"
                  class="tag-remove"
                >
                  ×
                </button>
              </span>
            </div>
          </div>

          <!-- Team Assignment Section -->
          <div class="form-section-header">
            <h3>Team Assignment</h3>
            <p>Select work teams or individual members. AI will pick the best-fit people from the pool.</p>
          </div>

          <!-- Work Team Selection -->
          <div class="form-group full-width">
            <label class="form-label">Work Teams <span class="optional-label">(select teams to add their members to the pool)</span></label>
            <div class="team-selection" v-if="availableTeams.length > 0">
              <div 
                v-for="team in availableTeams" 
                :key="team.id"
                class="work-team-card"
                :class="{ selected: selectedTeamIds.includes(team.id) }"
                @click="toggleTeam(team.id)"
              >
                <div class="work-team-info">
                  <div class="work-team-header">
                    <h4>{{ team.name }}</h4>
                    <span class="team-member-badge">{{ team.members?.length || 0 }} members</span>
                  </div>
                  <p class="work-team-desc">{{ team.description || 'No description' }}</p>
                  <div class="work-team-leader">
                    <i class="pi pi-crown"></i>
                    <span>{{ team.teamLeader?.name }}</span>
                  </div>
                  <div class="work-team-members-preview" v-if="team.members?.length > 0">
                    <span 
                      v-for="member in team.members.slice(0, 4)" 
                      :key="member.id"
                      class="member-chip"
                    >
                      {{ member.user?.name?.split(' ')[0] }}
                      <template v-if="member.user?.subRoles?.length > 0">
                        ({{ formatSubRole(member.user.subRoles[0]) }})
                      </template>
                    </span>
                    <span v-if="team.members.length > 4" class="member-chip more">
                      +{{ team.members.length - 4 }} more
                    </span>
                  </div>
                </div>
                <div class="member-checkbox">
                  <i class="pi pi-check" v-if="selectedTeamIds.includes(team.id)"></i>
                </div>
              </div>
            </div>
            <p v-else class="no-teams-note">No work teams available. You can create teams from the Teams page.</p>
          </div>

          <div class="form-row">
            <div class="form-group full-width">
              <label class="form-label">Project Manager <span class="required">*</span></label>
              <div class="select-wrapper">
                <select v-model="formData.projectManagerId" class="form-select" required>
                  <option value="">Select Project Manager</option>
                  <option 
                    v-for="pm in availableManagers" 
                    :key="pm.id" 
                    :value="pm.id"
                  >
                    {{ pm.name }} ({{ pm.email }})
                  </option>
                </select>
              </div>
            </div>
          </div>

          <div class="form-group full-width">
            <label class="form-label">Additional Individual Members <span class="optional-label">(add people not in selected teams)</span></label>
            <div class="team-selection">
              <div 
                v-for="user in availableUsers" 
                :key="user.id"
                class="team-member-card"
                :class="{ selected: selectedMembers.includes(user.id) }"
                @click="toggleMember(user.id)"
              >
                <div class="member-info">
                  <div class="member-avatar">
                    <img v-if="user.profilePicture" 
                         :src="user.profilePicture" 
                         :alt="user.name"
                         @error="$event.target.style.display = 'none'" />
                    <i v-else class="pi pi-user"></i>
                  </div>
                  <div class="member-details">
                    <h4>{{ user.name }}</h4>
                    <p>{{ user.position || 'No position' }}</p>
                    <div class="member-roles" v-if="user.subRoles && user.subRoles.length > 0">
                      <span 
                        v-for="role in user.subRoles" 
                        :key="role"
                        class="role-tag"
                      >
                        {{ formatSubRole(role) }}
                      </span>
                    </div>
                  </div>
                </div>
                <div class="member-checkbox">
                  <i class="pi pi-check" v-if="selectedMembers.includes(user.id)"></i>
                </div>
              </div>
            </div>
          </div>

          <!-- AI Planning Options -->
          <div class="form-section-header">
            <h3>AI-Powered Project Planning</h3>
            <p>Let AI help generate tasks, risks, and timeline for your project</p>
          </div>

          <!-- Model Selection -->
          <div class="form-group">
            <label class="form-label">AI Model Selection</label>
            <div class="model-selector">
              <select 
                v-model="formData.selectedModel" 
                class="form-select"
                :disabled="loadingModels || modelRestricted"
              >
                <option v-if="loadingModels" disabled value="">Loading models...</option>
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
              <span>Model is set by the system administrator and cannot be changed.</span>
            </div>
            <div v-if="selectedModelInfo" class="model-info">
              <p class="model-description">{{ selectedModelInfo.description }}</p>
              <div class="model-limits">
                <span class="limit-badge">Input: {{ formatTokenLimit(selectedModelInfo.inputTokenLimit) }}</span>
                <span class="limit-badge">Output: {{ formatTokenLimit(selectedModelInfo.outputTokenLimit) }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-actions">
          <button type="button" class="btn btn-secondary" @click="closeModal">
            <i class="pi pi-times"></i>
            Cancel
          </button>
          <button 
            v-if="!showAIReview" 
            type="submit" 
            class="btn btn-primary" 
            :disabled="isLoading"
          >
            <i class="pi" :class="isLoading ? 'pi-spin pi-spinner' : 'pi-search'"></i>
            {{ isLoading ? 'Generating...' : 'Generate AI Suggestions' }}
          </button>
          <button 
            v-if="showAIReview" 
            type="button" 
            class="btn btn-primary" 
            :disabled="isCreating"
            @click="createFinalProject"
          >
            <i class="pi" :class="isCreating ? 'pi-spin pi-spinner' : 'pi-check'"></i>
            {{ isCreating ? 'Creating...' : 'Create Project' }}
          </button>
        </div>
      </form>

      <!-- AI Review Section -->
      <div v-if="showAIReview" class="ai-review-section">
        <div class="review-header">
          <h3>🤖 AI Project Analysis - Review & Approve</h3>
          <p>Review the AI suggestions below. You can edit, approve, or reject each recommendation.</p>
        </div>

        <!-- AI Tasks Review -->
        <div v-if="aiSuggestions.tasks" class="review-category">
          <div class="category-header">
            <h4>📋 Recommended Tasks</h4>
            <div class="category-actions">
              <button 
                type="button" 
                class="btn btn-sm btn-outline"
                @click="approveAllTasks"
              >
                ✓ Approve All
              </button>
              <button 
                type="button" 
                class="btn btn-sm btn-outline"
                @click="rejectAllTasks"
              >
                ✗ Reject All
              </button>
            </div>
          </div>
          
          <div class="tasks-review">
            <div 
              v-for="(task, index) in aiSuggestions.tasks" 
              :key="index"
              class="task-review-card"
              :class="{ 
                approved: task.approved, 
                rejected: task.rejected,
                editing: task.editing
              }"
            >
              <div class="task-header">
                <div class="task-title">
                  <input 
                    v-if="task.editing"
                    v-model="task.name"
                    class="edit-input"
                    placeholder="Task name"
                  />
                  <h5 v-else>{{ task.name }}</h5>
                </div>
                <div class="task-actions">
                  <button 
                    v-if="!task.editing"
                    type="button" 
                    class="btn-icon"
                    @click="editTask(index)"
                  >
                    <i class="pi pi-pencil"></i>
                  </button>
                  <button 
                    v-if="task.editing"
                    type="button" 
                    class="btn-icon success"
                    @click="saveTask(index)"
                  >
                    <i class="pi pi-check"></i>
                  </button>
                  <button 
                    type="button" 
                    class="btn-icon"
                    :class="task.approved ? 'danger' : 'success'"
                    @click="toggleTaskApproval(index)"
                  >
                    <i class="pi" :class="task.approved ? 'pi-times' : 'pi-check'"></i>
                  </button>
                </div>
              </div>
              
              <div class="task-details">
                <div class="task-description">
                  <textarea 
                    v-if="task.editing"
                    v-model="task.description"
                    class="edit-textarea"
                    placeholder="Task description"
                  ></textarea>
                  <p v-else>{{ task.description }}</p>
                </div>
                
                <div class="task-meta">
                  <span class="task-role" v-if="!task.editing">
                    👨‍💻 {{ task.assignedRole }}
                  </span>
                  <select v-if="task.editing" v-model="task.assignedRole" class="edit-select">
                    <option value="Frontend Developer">Frontend Developer</option>
                    <option value="Backend Developer">Backend Developer</option>
                    <option value="Fullstack Developer">Fullstack Developer</option>
                    <option value="DevOps">DevOps</option>
                    <option value="Project Manager">Project Manager</option>
                  </select>
                  
                  <span class="task-hours">
                    ⏱️ {{ task.estimatedHours }}h
                  </span>
                  <span class="task-priority" :class="`priority-${task.priority?.toLowerCase()}`">
                    {{ task.priority }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- AI Risks Review -->
        <div v-if="aiSuggestions.risks" class="review-category">
          <div class="category-header">
            <h4>⚠️ Identified Risks</h4>
            <div class="category-actions">
              <button 
                type="button" 
                class="btn btn-sm btn-outline"
                @click="approveAllRisks"
              >
                ✓ Approve All
              </button>
            </div>
          </div>
          
          <div class="risks-review">
            <div 
              v-for="(risk, index) in aiSuggestions.risks" 
              :key="index"
              class="risk-review-card"
              :class="{ approved: risk.approved, editing: risk.editing }"
            >
              <div class="risk-header">
                <div class="risk-title">
                  <input 
                    v-if="risk.editing"
                    v-model="risk.title"
                    class="edit-input"
                    placeholder="Risk title"
                  />
                  <h5 v-else>{{ risk.title }}</h5>
                </div>
                <div class="risk-actions">
                  <button 
                    v-if="!risk.editing"
                    type="button" 
                    class="btn-icon"
                    @click="editRisk(index)"
                  >
                    <i class="pi pi-pencil"></i>
                  </button>
                  <button 
                    v-if="risk.editing"
                    type="button" 
                    class="btn-icon success"
                    @click="saveRisk(index)"
                  >
                    <i class="pi pi-check"></i>
                  </button>
                  <button 
                    type="button" 
                    class="btn-icon"
                    :class="risk.approved ? 'danger' : 'success'"
                    @click="toggleRiskApproval(index)"
                  >
                    <i class="pi" :class="risk.approved ? 'pi-times' : 'pi-check'"></i>
                  </button>
                </div>
              </div>
              
              <div class="risk-details">
                <textarea 
                  v-if="risk.editing"
                  v-model="risk.description"
                  class="edit-textarea"
                  placeholder="Risk description"
                ></textarea>
                <p v-else>{{ risk.description }}</p>
                
                <div class="risk-meta">
                  <span class="risk-severity" :class="`severity-${risk.severity?.toLowerCase()}`">
                    {{ risk.severity }}
                  </span>
                  <span class="risk-probability">
                    Probability: {{ risk.probability }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Gantt Chart Review -->
        <div v-if="aiSuggestions.ganttChart" class="review-category">
          <div class="category-header">
            <h4>📊 Gantt Chart</h4>
          </div>
          
          <div class="gantt-review">
            <pre class="gantt-chart">{{ aiSuggestions.ganttChart }}</pre>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { useProjectStore } from '@/stores/project'
import { useRouter } from 'vue-router'
import { userAPI, adminAPI, workTeamAPI } from '@/services/api'
import { useToast } from 'primevue/usetoast'
import { hideImage } from '@/utils/imageUtils'

const emit = defineEmits(['close', 'created'])

const projectStore = useProjectStore()
const router = useRouter()
const toast = useToast()
const isLoading = ref(false)
const isCreating = ref(false)
const showAIReview = ref(false)
const editTimeline = ref(false)
const tagsInput = ref('')
const availableUsers = ref([])
const availableManagers = ref([])
const selectedMembers = ref([])
const selectedTeamIds = ref([])
const availableTeams = ref([])
const aiSuggestions = ref({})
const availableModels = ref([])
const loadingModels = ref(false)
const modelRestricted = ref(false)

const closeModal = () => {
  emit('close')
}

const formData = reactive({
  name: '',
  description: '',
  startDate: '',
  endDate: '',
  priority: 'medium',
  status: 'planning',
  budget: 0,
  tags: [],
  locale: 'en',
  projectManagerId: '',
  teamMembers: [],
  generateTasks: true,
  generateRisks: true,
  generateGantt: true,
  createTeamsSpace: true,
  selectedModel: 'gemini-1.5-pro'
})

const updateTags = () => {
  const tags = tagsInput.value
    .split(',')
    .map(tag => tag.trim())
    .filter(tag => tag.length > 0)
  formData.tags = [...new Set(tags)] // Remove duplicates
}

const removeTag = (index) => {
  formData.tags.splice(index, 1)
  tagsInput.value = formData.tags.join(', ')
}

const toggleMember = (userId) => {
  const index = selectedMembers.value.indexOf(userId)
  if (index > -1) {
    selectedMembers.value.splice(index, 1)
  } else {
    selectedMembers.value.push(userId)
  }
}

const toggleTeam = (teamId) => {
  const index = selectedTeamIds.value.indexOf(teamId)
  if (index > -1) {
    selectedTeamIds.value.splice(index, 1)
  } else {
    selectedTeamIds.value.push(teamId)
  }
}

const formatSubRole = (subRole) => {
  const roleLabels = {
    'frontend_developer': 'Frontend',
    'backend_developer': 'Backend',
    'fullstack_developer': 'Fullstack',
    'devops': 'DevOps'
  }
  return roleLabels[subRole] || subRole
}

const loadUsers = async () => {
  try {
    const response = await userAPI.getAllUsers({})
    if (response.data.success) {
      const users = response.data.users
      availableUsers.value = users.filter(u => u.role === 'user')
      availableManagers.value = users.filter(u => u.role === 'pm' || u.role === 'admin')
    }
  } catch (error) {
    console.error('Error loading users:', error)
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to load users',
      life: 3000
    })
  }
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
        formData.selectedModel = forcedModel
        return
      }
    } catch (e) {
      console.warn('Could not check model restriction:', e)
    }
    modelRestricted.value = false

    const response = await projectStore.getAvailableAIModels()
    if (response.success) {
      availableModels.value = response.data.models
      console.log('Available AI models:', availableModels.value)
      
      // Set default model if not already set
      if (!formData.selectedModel && availableModels.value.length > 0) {
        formData.selectedModel = availableModels.value[0].name
      }
    }
  } catch (error) {
    console.error('Error loading AI models:', error)
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to load AI models',
      life: 3000
    })
    
    // Fallback models if API fails
    availableModels.value = [
      {
        name: 'gemini-1.5-pro',
        displayName: 'Gemini 1.5 Pro',
        description: 'Most capable model for complex reasoning tasks',
        inputTokenLimit: 1048576,
        outputTokenLimit: 8192
      },
      {
        name: 'gemini-1.5-flash',
        displayName: 'Gemini 1.5 Flash',
        description: 'Fast and efficient model for lighter tasks',
        inputTokenLimit: 1048576,
        outputTokenLimit: 8192
      }
    ]
  } finally {
    loadingModels.value = false
  }
}

const selectedModelInfo = computed(() => {
  return availableModels.value.find(model => model.name === formData.selectedModel)
})

const formatTokenLimit = (limit) => {
  if (limit >= 1000000) {
    return (limit / 1000000).toFixed(1) + 'M tokens'
  } else if (limit >= 1000) {
    return (limit / 1000).toFixed(0) + 'K tokens'
  }
  return limit + ' tokens'
}

// AI Review Functions
const editTask = (index) => {
  aiSuggestions.value.tasks[index].editing = true
}

const saveTask = (index) => {
  aiSuggestions.value.tasks[index].editing = false
}

const toggleTaskApproval = (index) => {
  aiSuggestions.value.tasks[index].approved = !aiSuggestions.value.tasks[index].approved
  aiSuggestions.value.tasks[index].rejected = false
}

const approveAllTasks = () => {
  aiSuggestions.value.tasks.forEach(task => {
    task.approved = true
    task.rejected = false
  })
}

const rejectAllTasks = () => {
  aiSuggestions.value.tasks.forEach(task => {
    task.approved = false
    task.rejected = true
  })
}

const editRisk = (index) => {
  aiSuggestions.value.risks[index].editing = true
}

const saveRisk = (index) => {
  aiSuggestions.value.risks[index].editing = false
}

const toggleRiskApproval = (index) => {
  aiSuggestions.value.risks[index].approved = !aiSuggestions.value.risks[index].approved
}

const approveAllRisks = () => {
  aiSuggestions.value.risks.forEach(risk => {
    risk.approved = true
  })
}

// Create final project with approved suggestions
const createFinalProject = async () => {
  isCreating.value = true
  
  try {
    // Filter only approved suggestions
    const approvedTasks = aiSuggestions.value.tasks?.filter(t => t.approved) || []
    const approvedRisks = aiSuggestions.value.risks?.filter(r => r.approved) || []
    
    const finalProjectData = {
      ...formData,
      teamMembers: selectedMembers.value,
      aiAnalysis: {
        tasks: approvedTasks,
        risks: approvedRisks,
        timeline: aiSuggestions.value.timeline,
        ganttChart: aiSuggestions.value.ganttChart
      },
      // Override AI generation flags since we already have the data
      generateTasks: false,
      generateRisks: false,
      generateGantt: false
    }
    
    const result = await projectStore.createProjectWithWorkflow(finalProjectData)
    
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: `Project created with ${approvedTasks.length} approved tasks and ${approvedRisks.length} risks!`,
      life: 5000
    })
    
    emit('created')
    emit('close')
  } catch (error) {
    console.error('Error creating final project:', error)
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.response?.data?.message || 'Failed to create project. Please try again.',
      life: 3000
    })
  } finally {
    isCreating.value = false
  }
}

const handleSubmit = async () => {
  if (new Date(formData.startDate) >= new Date(formData.endDate)) {
    toast.add({
      severity: 'error',
      summary: 'Validation Error',
      detail: 'End date must be after start date',
      life: 3000
    })
    return
  }

  if (selectedMembers.value.length === 0 && selectedTeamIds.value.length === 0) {
    toast.add({
      severity: 'error',
      summary: 'Validation Error', 
      detail: 'Please select at least one work team or individual team member',
      life: 3000
    })
    return
  }

  isLoading.value = true

  try {
    // Check if AI suggestions are requested
    const hasAIOptions = formData.generateTasks || formData.generateRisks || formData.generateGantt;
    
    // Create project with appropriate status
    const projectData = {
      ...formData,
      projectManagerId: formData.projectManagerId,
      teamMembers: selectedMembers.value.map(id => ({ id })),
      selectedTeamIds: selectedTeamIds.value,
      aiStatus: hasAIOptions ? 'generating' : null, // Add AI status
      aiOptions: hasAIOptions ? {
        generateTasks: formData.generateTasks,
        generateRisks: formData.generateRisks,
        generateGantt: formData.generateGantt,
        selectedModel: formData.selectedModel
      } : null
    }

    // Create the project first
    const projectResponse = await projectStore.createProject(projectData)
    const createdProject = projectResponse.data.project

    toast.add({
      severity: 'success',
      summary: 'Project Created',
      detail: hasAIOptions 
        ? `Project "${formData.name}" created. AI analysis is starting...`
        : `Project "${formData.name}" created successfully!`,
      life: 5000
    })

    // Close form and emit events
    emit('created')
    emit('close')

    // If AI options are enabled, start AI generation in background
    if (hasAIOptions && createdProject) {
      // Start AI generation in background for the created project
      generateAIForProject(createdProject.id, projectData)
    }

  } catch (error) {
    console.error('Error creating project:', error)
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.response?.data?.message || 'Failed to create project. Please try again.',
      life: 3000
    })
  } finally {
    isLoading.value = false
  }
}

// Generate AI suggestions for an existing project
const generateAIForProject = async (projectId, projectData) => {
  try {
    console.log(`Starting AI generation for project ${projectId}`)
    
    const aiRequestData = {
      ...projectData,
      projectId, // Include project ID
      projectManagerId: projectData.projectManagerId || formData.projectManagerId, // Ensure PM is included
      teamMembers: selectedMembers.value.map(id => ({ id })),
      selectedTeamIds: selectedTeamIds.value
    }
    
    console.log('AI Request Data:', aiRequestData) // Debug log
    
    // Call AI generation endpoint
    const aiResponse = await projectStore.generateAISuggestions(aiRequestData)
    
    // Store suggestions in localStorage for the AI view to retrieve
    if (aiResponse.data.suggestionId) {
      const suggestionData = {
        id: aiResponse.data.suggestionId,
        projectId,
        projectData,
        analysis: aiResponse.data.analysis,
        createdAt: new Date().toISOString()
      }
      localStorage.setItem(`ai_suggestions_${aiResponse.data.suggestionId}`, JSON.stringify(suggestionData))
    }
    
    console.log(`AI generation completed for project ${projectId}`)
    
  } catch (error) {
    console.error('Error generating AI suggestions:', error)
    // Update project status to indicate AI failed
    try {
      await projectStore.updateProjectAIStatus(projectId, 'failed')
    } catch (updateError) {
      console.error('Failed to update project AI status:', updateError)
    }
  }
}

const loadTeams = async () => {
  try {
    const response = await workTeamAPI.getTeams({})
    if (response.data.success) {
      availableTeams.value = response.data.teams
    }
  } catch (error) {
    console.error('Error loading work teams:', error)
  }
}

onMounted(() => {
  loadUsers()
  loadAIModels()
  loadTeams()
})
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.75);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 20px;
}

.modal-container {
  background: var(--color-bg-primary);
  border-radius: 12px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  width: 100%;
  min-width: 700px;
  max-width: 700px;
  max-height: 80vh;
  overflow-y: auto;
}

.modal-header {
  padding: 24px 24px 16px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  border-bottom: 1px solid var(--color-border);
}

.modal-title-section {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.modal-icon {
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 18px;
  flex-shrink: 0;
}

.modal-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0 0 4px 0;
}

.modal-subtitle {
  color: var(--color-text-secondary);
  font-size: 14px;
  margin: 0;
  line-height: 1.4;
}

.modal-close {
  background: var(--color-bg-secondary);
  border: none;
  border-radius: 6px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--color-text-secondary);
  transition: all 0.2s;
}

.modal-close:hover {
  background: #fee2e2;
  color: #ef4444;
}

.modal-form {
  padding: 1rem 24px 24px;
}

.form-section {
  display: flex;
  flex-direction: column;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-group.full-width {
  grid-column: 1 / -1;
}

.form-label {
  font-weight: 500;
  font-size: 14px;
  color: var(--color-text-primary);
  margin-bottom: 6px;
}

.required {
  color: #ef4444;
}

.form-input,
.form-select,
.form-textarea {
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  font-size: 14px;
  color: var(--color-text-primary);
  background: var(--color-bg-primary);
  transition: border-color 0.2s;
}

.form-input:focus,
.form-select:focus,
.form-textarea:focus {
  outline: none;
  border-color: #4f46e5;
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
}

.form-textarea {
  min-height: 80px;
  resize: vertical;
  line-height: 1.5;
}

.select-wrapper {
  position: relative;
  width: 100%;
}

.select-wrapper select {
  width: 100%;
}

.input-with-icon {
  position: relative;
}

.input-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--color-text-secondary);
  font-weight: 500;
}

.form-input.with-icon {
  padding-left: 32px;
}

.tags-preview {
  margin-top: -8px;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag {
  background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
  color: white;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 4px;
}

.tag-remove {
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
  padding: 0;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}

.tag-remove:hover {
  background: rgba(255, 255, 255, 0.2);
}

.form-section-header {
  margin: 32px 0 16px 0;
  padding: 24px 0 16px 0;
  border-top: 1px solid var(--color-border);
}

.form-section-header h3 {
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0 0 4px 0;
}

.form-section-header p {
  color: var(--color-text-secondary);
  font-size: 14px;
  margin: 0;
}

.team-selection {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 12px;
  max-height: 300px;
  overflow-y: auto;
  padding: 16px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-bg-secondary);
}

.team-member-card {
  background: var(--color-bg-primary);
  border: 2px solid var(--color-border);
  border-radius: 8px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.team-member-card:hover {
  border-color: #4f46e5;
  transform: translateY(-1px);
}

.team-member-card.selected {
  border-color: #4f46e5;
  background: rgba(79, 70, 229, 0.08);
}

.member-info {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  flex: 1;
}

.member-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg-tertiary, #f3f4f6);
  flex-shrink: 0;
}

.member-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.member-avatar i {
  color: var(--color-text-secondary, #9ca3af);
  font-size: 18px;
}

.member-details {
  min-width: 0;
  overflow: hidden;
}

.member-details h4 {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0 0 2px 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.member-details p {
  font-size: 12px;
  color: var(--color-text-secondary);
  margin: 0 0 6px 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.member-roles {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.role-tag {
  background: #4f46e5;
  color: white;
  padding: 2px 6px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 500;
}

.member-checkbox {
  width: 20px;
  height: 20px;
  border: 2px solid var(--color-border);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 12px;
}

.team-member-card.selected .member-checkbox {
  background: #4f46e5;
  border-color: #4f46e5;
}

/* Work Team Card Styles */
.work-team-card {
  background: var(--color-bg-primary);
  border: 2px solid var(--color-border);
  border-radius: 10px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.work-team-card:hover {
  border-color: #7c3aed;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(124, 58, 237, 0.1);
}

.work-team-card.selected {
  border-color: #7c3aed;
  background: rgba(124, 58, 237, 0.08);
}

.work-team-card.selected .member-checkbox {
  background: #7c3aed;
  border-color: #7c3aed;
}

.work-team-info {
  flex: 1;
  min-width: 0;
}

.work-team-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.work-team-header h4 {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0;
}

.team-member-badge {
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 10px;
  background: rgba(124, 58, 237, 0.1);
  color: #7c3aed;
  font-weight: 500;
}

.work-team-desc {
  font-size: 12px;
  color: var(--color-text-secondary);
  margin: 0 0 6px 0;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.work-team-leader {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: var(--color-text-secondary);
  margin-bottom: 6px;
}

.work-team-leader i {
  color: #f59e0b;
  font-size: 10px;
}

.work-team-members-preview {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.member-chip {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 8px;
  background: var(--color-bg-secondary);
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border);
}

.member-chip.more {
  background: rgba(124, 58, 237, 0.05);
  color: #7c3aed;
}

.optional-label {
  font-weight: 400;
  font-size: 12px;
  color: var(--color-text-secondary);
}

.no-teams-note {
  font-size: 13px;
  color: var(--color-text-secondary);
  font-style: italic;
  padding: 8px 0;
}

.form-checkbox-wrapper {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  padding: 12px;
  border-radius: 6px;
  transition: all 0.2s;
}

.form-checkbox-wrapper:hover {
  background: var(--color-bg-secondary);
}

.form-checkbox {
  display: none;
}

.checkbox-custom {
  width: 18px;
  height: 18px;
  border: 2px solid var(--color-border);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.form-checkbox:checked + .checkbox-custom {
  background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
  border-color: #4f46e5;
}

.form-checkbox:checked + .checkbox-custom:after {
  content: '✓';
  color: white;
  font-size: 12px;
  font-weight: bold;
}

.checkbox-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-primary);
}

.modal-actions {
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid var(--color-border);
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.btn {
  padding: 10px 20px;
  border-radius: 6px;
  font-weight: 500;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 100px;
  justify-content: center;
}

.btn-secondary {
  background: var(--color-bg-secondary);
  color: var(--color-text-secondary);
}

.btn-secondary:hover {
  background: var(--color-border);
  color: var(--color-text-primary);
}

.btn-primary {
  background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

/* AI Review Section Styles */
.ai-review-section {
  border-top: 2px solid var(--color-border);
  margin-top: 2rem;
  padding-top: 2rem;
}

.review-header {
  margin-bottom: 2rem;
  text-align: center;
}

.review-header h3 {
  color: #4f46e5;
  font-size: 1.5rem;
  margin-bottom: 0.5rem;
  font-weight: 600;
}

.review-header p {
  color: var(--color-text-secondary);
  font-size: 0.95rem;
}

.review-category {
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: var(--color-bg-secondary);
  border-radius: 16px;
  border: 1px solid var(--color-border);
}

.category-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.category-header h4 {
  color: var(--color-text-primary);
  font-size: 1.2rem;
  font-weight: 600;
  margin: 0;
}

.category-actions {
  display: flex;
  gap: 0.5rem;
}

.btn-sm {
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  border-radius: 8px;
}

.btn-outline {
  background: transparent;
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  transition: all 0.2s ease;
}

.btn-outline:hover {
  background: var(--color-bg-secondary);
  border-color: var(--color-border);
  color: var(--color-text-primary);
}

/* Task Review Cards */
.tasks-review, .risks-review {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.task-review-card, .risk-review-card {
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 1.25rem;
  transition: all 0.2s ease;
}

.task-review-card.approved, .risk-review-card.approved {
  border-color: #10b981;
  background: #f0fdf4;
}

.task-review-card.rejected {
  border-color: #ef4444;
  background: #fef2f2;
}

.task-review-card.editing, .risk-review-card.editing {
  border-color: #f59e0b;
  background: #fffbeb;
}

.task-header, .risk-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
}

.task-title h5, .risk-title h5 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--color-text-primary);
}

.task-actions, .risk-actions {
  display: flex;
  gap: 0.5rem;
}

.btn-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid var(--color-border);
  background: var(--color-bg-primary);
  color: var(--color-text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-icon:hover {
  background: var(--color-bg-secondary);
  border-color: var(--color-border);
}

.btn-icon.success {
  border-color: #10b981;
  color: #10b981;
}

.btn-icon.success:hover {
  background: #ecfdf5;
}

.btn-icon.danger {
  border-color: #ef4444;
  color: #ef4444;
}

.btn-icon.danger:hover {
  background: #fef2f2;
}

.edit-input {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  font-size: 1.1rem;
  font-weight: 600;
}

.edit-textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  font-size: 0.95rem;
  resize: vertical;
  min-height: 80px;
}

.edit-select {
  padding: 0.5rem;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  font-size: 0.85rem;
}

.task-details, .risk-details {
  margin-top: 1rem;
}

.task-description p, .risk-details p {
  margin: 0 0 1rem 0;
  color: var(--color-text-secondary);
  line-height: 1.6;
}

.task-meta, .risk-meta {
  display: flex;
  gap: 1rem;
  align-items: center;
  flex-wrap: wrap;
}

.task-role, .task-hours, .task-priority, .risk-severity, .risk-probability {
  background: #f3f4f6;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 500;
}

.task-role {
  background: #ddd6fe;
  color: #7c3aed;
}

.task-hours {
  background: #dbeafe;
  color: #2563eb;
}

.priority-high, .severity-high {
  background: #fecaca;
  color: #dc2626;
}

.priority-medium, .severity-medium {
  background: #fed7aa;
  color: #ea580c;
}

.priority-low, .severity-low {
  background: #bbf7d0;
  color: #059669;
}

/* Timeline Review */
.timeline-review {
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 1.5rem;
}

.timeline-edit {
  width: 100%;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 1rem;
  font-family: inherit;
  resize: vertical;
}

.timeline-content {
  white-space: pre-wrap;
  line-height: 1.6;
  color: var(--color-text-secondary);
}

/* Gantt Chart Review */
.gantt-review {
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 1.5rem;
}

.gantt-chart {
  background: var(--color-bg-secondary);
  padding: 1rem;
  border-radius: 8px;
  overflow-x: auto;
  font-family: 'Courier New', monospace;
  font-size: 0.85rem;
  color: var(--color-text-primary);
  white-space: pre;
  border: 1px solid var(--color-border);
}

@media (max-width: 768px) {
  .modal-overlay {
    padding: 1rem;
  }
  
  .modal-container {
    max-width: 100%;
    border-radius: 16px;
  }
  
  .modal-header {
    padding: 1.5rem 1.5rem 0;
  }
  
  .modal-form {
    padding: 0 1.5rem 1.5rem;
  }
  
  .form-row {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
  
  .modal-actions {
    flex-direction: column;
  }
  
  .btn {
    width: 100%;
  }
}

.model-selector {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.model-selector .form-select {
  flex: 1;
  padding: 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  font-size: 1rem;
  background: var(--color-bg-primary);
  color: var(--color-text-primary);
  transition: all 0.2s ease;
}

.form-select:focus {
  outline: none;
  border-color: #4f46e5;
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
}

.form-select:disabled {
  background-color: var(--color-bg-secondary);
  color: var(--color-text-secondary);
  cursor: not-allowed;
}

.btn-refresh {
  padding: 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-bg-primary);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
}

.btn-refresh:hover:not(:disabled) {
  background: var(--color-bg-secondary);
  color: var(--color-text-primary);
  border-color: var(--color-border);
}

.btn-refresh:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.model-info {
  margin-top: 0.75rem;
  padding: 1rem;
  background: var(--color-bg-secondary);
  border-radius: 8px;
  border: 1px solid var(--color-border);
}

.model-restricted-notice {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 0.5rem;
  padding: 10px 14px;
  background: linear-gradient(135deg, #fef3c7 0%, #fefce8 100%);
  border: 1px solid #fbbf24;
  border-radius: 8px;
  color: #92400e;
  font-size: 0.825rem;
  font-weight: 500;
}

.model-restricted-notice i {
  font-size: 0.9rem;
  color: #d97706;
}

.model-description {
  margin: 0 0 0.5rem 0;
  color: var(--color-text-secondary);
  font-size: 0.875rem;
  line-height: 1.5;
}

.model-limits {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.limit-badge {
  padding: 0.25rem 0.5rem;
  background: #e0e7ff;
  color: #3730a3;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
}
</style>