<template>
  <div class="ai-suggestions-view">
    <!-- Page Header -->
    <div class="view-header">
      <div class="header-content">
        <div class="header-top-row">
          <button class="back-btn" @click="goBack">
            <i class="pi pi-arrow-left"></i>
            <span>{{ t('aiSuggestions.backToProjects') }}</span>
          </button>
        </div>
        <h1>{{ t('aiSuggestions.title') }}</h1>
        <p v-if="project">{{ project.name }}</p>
        <div v-if="project" class="header-badges">
          <span v-if="project.status" class="badge status-badge" :class="`status-${project.status}`">
            {{ project.status }}
          </span>
          <span v-if="project.priority" class="badge priority-badge" :class="`priority-${project.priority}`">
            {{ project.priority }}
          </span>
          <span v-if="project.aiStatus" class="badge ai-badge" :class="`ai-${project.aiStatus}`">
            <i class="pi pi-sparkles"></i>
            {{ project.aiStatus }}
          </span>
        </div>
      </div>
      <div class="header-actions">
        <Button 
          v-if="suggestions"
          icon="pi pi-file-pdf" 
          :label="t('aiSuggestions.exportPdf')" 
          outlined
          @click="handleExportPdf"
          class="btn-outline"
        />
        <Button 
          v-if="suggestions && project && project.id && project.aiStatus !== 'approved'"
          icon="pi pi-rocket" 
          :label="t('aiSuggestions.applyAll')" 
          @click="applyAllSuggestions"
          :loading="isApplying"
          :disabled="isApplying"
          class="btn-primary"
        />
      </div>
    </div>

    <div class="suggestions-container">
      <!-- Loading State -->
      <LoadingState 
        v-if="isLoading" 
        :message="t('aiSuggestions.analyzing')"
        :show-progress="true"
      />

      <!-- Error State -->
      <ErrorState 
        v-else-if="error"
        :title="t('aiSuggestions.errorLoading')"
        :description="error"
      >
        <Button :label="t('common.retry')" @click="fetchSuggestions" />
      </ErrorState>

      <!-- AI Suggestions Content -->
      <div v-else-if="suggestions" class="suggestions-content">
        <!-- Summary Cards -->
        <div class="summary-section" v-if="suggestions.summary">
          <h2>{{ t('aiSuggestions.summary') }}</h2>
          <div class="summary-cards">
            <div class="stat-card">
              <div class="stat-icon" style="background: #dbeafe; color: #2563eb;">
                <i class="pi pi-clock"></i>
              </div>
              <div class="stat-content">
                <div class="stat-value">{{ suggestions.summary.totalHours || 0 }}</div>
                <div class="stat-label">Total Estimated Hours</div>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-icon" style="background: #d1fae5; color: #059669;">
                <i class="pi pi-dollar"></i>
              </div>
              <div class="stat-content">
                <div class="stat-value">{{ suggestions.summary.budgetUtilization || '0%' }}</div>
                <div class="stat-label">Budget Utilization</div>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-icon" style="background: #e9d5ff; color: #9333ea;">
                <i class="pi pi-users"></i>
              </div>
              <div class="stat-content">
                <div class="stat-value">{{ Object.keys(suggestions.summary.teamUtilization || {}).length }}</div>
                <div class="stat-label">Team Members</div>
              </div>
            </div>
          </div>

          <!-- Team Utilization -->
          <div v-if="suggestions.summary.teamUtilization" class="team-utilization">
            <h3>Team Member Workload</h3>
            <div class="utilization-cards">
              <div 
                v-for="(hours, member) in suggestions.summary.teamUtilization" 
                :key="member"
                class="utilization-card"
              >
                <div class="member-avatar">
                  <img v-if="getTeamMemberAvatar(member)" 
                       :src="getTeamMemberAvatar(member)" 
                       :alt="member"
                       @error="$event.target.style.display = 'none'" />
                  <i v-else class="pi pi-user"></i>
                </div>
                <div class="member-info">
                  <div class="member-name">{{ formatAssigneeName(member) }}</div>
                  <div class="member-email" v-if="formatAssigneeEmail(member)">{{ formatAssigneeEmail(member) }}</div>
                  <div class="member-hours">{{ parseHours(hours) }} Hours</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Generated Tasks -->
        <div class="tasks-section" v-if="suggestions.tasks && suggestions.tasks.length > 0">
          <div class="section-header">
            <h2>Generated Tasks</h2>
            <div class="task-stats">
              <span class="task-count">{{ suggestions.tasks.length }} tasks</span>
            </div>
          </div>

          <div class="tasks-grid">
            <div 
              v-for="(task, index) in suggestions.tasks" 
              :key="index"
              class="task-card"
            >
              <div class="task-card-actions">
                <Button 
                  icon="pi pi-pencil" 
                  class="p-button-text p-button-sm"
                  @click="editTask(index)"
                  v-tooltip.top="'Edit Task'"
                />
                <Button 
                  icon="pi pi-trash" 
                  class="p-button-text p-button-sm p-button-danger"
                  @click="deleteTask(index)"
                  v-tooltip.top="'Delete Task'"
                />
              </div>

              <div class="task-header">
                <div class="task-priority" :class="task.priority?.toLowerCase()">
                  {{ task.priority }}
                </div>
                <div class="task-phase">{{ task.phase }}</div>
              </div>
              
              <h3 class="task-name">{{ task.name }}</h3>
              <p class="task-description">{{ task.description }}</p>
              
              <div class="task-details">
                <div class="task-detail task-detail--assignee" v-tooltip.top="task.assignedTo">
                  <i class="pi pi-user"></i>
                  <span class="assignee-name">{{ formatAssigneeName(task.assignedTo) }}</span>
                  <span v-if="formatAssigneeEmail(task.assignedTo)" class="assignee-email">
                    ({{ formatAssigneeEmail(task.assignedTo) }})
                  </span>
                </div>
                <div class="task-detail">
                  <i class="pi pi-briefcase"></i>
                  <span>{{ task.assignedRole }}</span>
                </div>
                <div class="task-detail">
                  <i class="pi pi-clock"></i>
                  <span>{{ task.estimatedHours }}h</span>
                </div>
                <div class="task-detail" v-if="task.dueDate">
                  <i class="pi pi-calendar"></i>
                  <span>{{ formatDate(task.dueDate) }}</span>
                </div>
              </div>

              <div v-if="task.dependencies && task.dependencies.length > 0" class="task-dependencies">
                <strong>Dependencies:</strong>
                <ul>
                  <li v-for="dep in task.dependencies" :key="dep">{{ dep }}</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <!-- Risk Analysis -->
        <div class="risks-section" v-if="suggestions.risks && suggestions.risks.length > 0">
          <h2>Risk Analysis</h2>
          <div class="risks-grid">
            <div 
              v-for="(risk, index) in suggestions.risks" 
              :key="index"
              class="risk-card"
              :class="risk.severity?.toLowerCase()"
            >
              <div class="risk-card-actions">
                <Button 
                  icon="pi pi-trash" 
                  class="p-button-text p-button-sm p-button-danger"
                  @click="deleteRisk(index)"
                  v-tooltip.top="'Delete Risk'"
                />
              </div>

              <div class="risk-header">
                <div class="risk-severity">{{ risk.severity }}</div>
                <div class="risk-probability">{{ risk.probability }} probability</div>
              </div>
              <h3 class="risk-title">{{ risk.title }}</h3>
              <p class="risk-description">{{ risk.description }}</p>
              <div class="risk-mitigation">
                <strong>Mitigation:</strong> {{ risk.mitigation }}
              </div>
            </div>
          </div>
        </div>

        <!-- Timeline -->
        <div class="timeline-section" v-if="renderedTimeline">
          <h2>Project Timeline</h2>
          <div class="timeline-content markdown-body" v-html="renderedTimeline"></div>
        </div>

        <!-- Gantt Chart -->
        <div class="gantt-section" v-if="suggestions.ganttChart">
          <h2>Gantt Chart</h2>
          <div v-if="suggestions.ganttChart.imagePath" class="gantt-chart-image">
            <img 
              :src="getGanttChartUrl(suggestions.ganttChart.imagePath)" 
              alt="Project Gantt Chart"
              @error="handleImageError"
            />
            <div class="gantt-legend">
              <span class="gantt-legend-item">
                <span class="gantt-legend-color" style="background:#3b82f6"></span> Planning
              </span>
              <span class="gantt-legend-item">
                <span class="gantt-legend-color" style="background:#10b981"></span> Development
              </span>
              <span class="gantt-legend-item">
                <span class="gantt-legend-color" style="background:#f59e0b"></span> Testing
              </span>
              <span class="gantt-legend-item">
                <span class="gantt-legend-color" style="background:#8b5cf6"></span> Deployment
              </span>
              <span class="gantt-legend-item">
                <span class="gantt-legend-color" style="background:#dc2626; border-radius:50%"></span> Milestone
              </span>
            </div>
          </div>
          <pre v-else class="gantt-chart">{{ suggestions.ganttChart }}</pre>
        </div>
      </div>

      <!-- Empty State -->
      <EmptyState 
        v-else
        title="No Suggestions Available"
        description="AI suggestions could not be generated for this project."
        icon="pi pi-lightbulb"
      >
        <Button label="Generate Again" @click="fetchSuggestions" />
      </EmptyState>
    </div>

    <!-- Edit Task Dialog -->
    <Dialog 
      v-model:visible="showEditDialog" 
      modal 
      header="Edit Task" 
      :style="{ width: '600px' }"
      :dismissableMask="true"
    >
      <div class="edit-task-form" v-if="editingTask">
        <div class="form-field">
          <label>Task Name *</label>
          <InputText v-model="editingTask.name" placeholder="Enter task name" />
        </div>

        <div class="form-field">
          <label>Description *</label>
          <Textarea v-model="editingTask.description" rows="4" placeholder="Enter task description" />
        </div>

        <div class="form-row">
          <div class="form-field">
            <label>Assigned To *</label>
            <InputText v-model="editingTask.assignedTo" placeholder="Team member name" />
          </div>

          <div class="form-field">
            <label>Role</label>
            <InputText v-model="editingTask.assignedRole" placeholder="Role" />
          </div>
        </div>

        <div class="form-row">
          <div class="form-field">
            <label>Estimated Hours *</label>
            <InputNumber v-model="editingTask.estimatedHours" :min="1" :max="500" />
          </div>

          <div class="form-field">
            <label>Priority</label>
            <Dropdown 
              v-model="editingTask.priority" 
              :options="priorityOptions" 
              placeholder="Select priority"
            />
          </div>
        </div>

        <div class="form-row">
          <div class="form-field">
            <label>Phase</label>
            <Dropdown 
              v-model="editingTask.phase" 
              :options="phaseOptions" 
              placeholder="Select phase"
            />
          </div>

          <div class="form-field">
            <label>Due Date</label>
            <Calendar v-model="editingTask.dueDate" dateFormat="yy-mm-dd" />
          </div>
        </div>
      </div>

      <template #footer>
        <Button label="Cancel" icon="pi pi-times" @click="showEditDialog = false" class="btn-outline" />
        <Button label="Save Changes" icon="pi pi-check" @click="saveTaskEdit" class="btn-primary" />
      </template>
    </Dialog>
  </div>
</template>

<script>
import { ref, onMounted, computed } from 'vue';
import { marked } from 'marked';
import { useRoute, useRouter } from 'vue-router';
import { useLocale } from '@/composables/useLocale';
import { useToast } from 'primevue/usetoast';
import { useConfirm } from 'primevue/useconfirm';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import InputNumber from 'primevue/inputnumber';
import Textarea from 'primevue/textarea';
import Dropdown from 'primevue/dropdown';
import Calendar from 'primevue/calendar';
import LoadingState from '@/components/ui/LoadingState.vue';
import EmptyState from '@/components/ui/EmptyState.vue';
import ErrorState from '@/components/ui/ErrorState.vue';
import StatCard from '@/components/ui/StatCard.vue';
import { projectAPI } from '@/services/api';
import { exportAISuggestionsPdf } from '@/composables/useProjectPdfExport';

export default {
  name: 'AIProjectSuggestionsView',
  components: {
    Button,
    Dialog,
    InputText,
    InputNumber,
    Textarea,
    Dropdown,
    Calendar,
    LoadingState,
    EmptyState,
    ErrorState,
    StatCard
  },
  setup() {
    const route = useRoute();
    const router = useRouter();
    const { t } = useLocale();
    const toast = useToast();
    const confirm = useConfirm();
    
    const isLoading = ref(false);
    const isApplying = ref(false);
    const error = ref(null);
    const suggestions = ref(null);
    const project = ref(null);
    const teamMembers = ref([]);
    const showEditDialog = ref(false);
    const editingTask = ref(null);
    const editingIndex = ref(null);

    const priorityOptions = ['High', 'Medium', 'Low'];
    const phaseOptions = ['Planning', 'Development', 'Testing', 'Deployment'];

    const projectId = computed(() => route.params.projectId);
    const suggestionId = computed(() => route.params.suggestionId);

    const fetchSuggestions = async () => {
      try {
        isLoading.value = true;
        error.value = null;

        console.log('📥 Fetching suggestions for ID:', suggestionId.value);

        let suggestionData = null;

        // If we have a suggestionId from route, fetch from API
        if (suggestionId.value) {
          const response = await projectAPI.getAISuggestions(suggestionId.value);
          console.log('📦 API Response:', response);
          
          if (response && response.data) {
            suggestionData = response.data.data || response.data;
            console.log('📊 Suggestion data:', suggestionData);
            
            suggestions.value = suggestionData.analysis;
            project.value = {
              id: suggestionData.projectId,
              name: suggestionData.projectName
            };
            
            console.log('✅ Suggestions loaded:', suggestions.value);
          }
        }

        // Also fetch full project details if available
        if (projectId.value) {
          const projectData = await projectAPI.getProject(projectId.value);
          project.value = projectData;
          
          // Extract team members for avatar display
          if (projectData.members) {
            teamMembers.value = projectData.members.map(m => m.user || m).filter(u => u);
          }
        } else if (suggestionData && suggestionData.projectId) {
          // Try to fetch project data using projectId from suggestions
          try {
            const projectData = await projectAPI.getProject(suggestionData.projectId);
            if (projectData.members) {
              teamMembers.value = projectData.members.map(m => m.user || m).filter(u => u);
            }
          } catch (err) {
            console.log('Could not fetch team members:', err);
          }
        }

      } catch (err) {
        console.error('❌ Error fetching AI suggestions:', err);
        error.value = 'Failed to load AI suggestions. Please try again.';
        toast.add({
          severity: 'error',
          summary: 'Error',
          detail: err.response?.data?.error || 'Failed to load AI suggestions',
          life: 5000
        });
      } finally {
        isLoading.value = false;
      }
    };

    const applyAllSuggestions = async () => {
      console.log('🚀 Starting applyAllSuggestions...');
      console.log('Suggestions:', suggestions.value);
      console.log('Project:', project.value);
      
      if (!suggestions.value || !project.value || !project.value.id) {
        console.error('Missing suggestions or project data');
        toast.add({
          severity: 'warn',
          summary: 'Warning',
          detail: 'Missing project data. Please try again.',
          life: 3000
        });
        return;
      }

      try {
        isApplying.value = true;
        console.log('Applying suggestions to project:', project.value.id);

        // Apply tasks to the project with mandatory Teams integration
        if (suggestions.value.tasks && suggestions.value.tasks.length > 0) {
          console.log('Sending API request with tasks:', suggestions.value.tasks.length);
          const response = await projectAPI.applyAISuggestions(project.value.id, {
            tasks: suggestions.value.tasks,
            risks: suggestions.value.risks,
            timeline: suggestions.value.timeline,
            suggestionId: suggestionId.value
          });

          toast.add({
            severity: 'success',
            summary: 'Success',
            detail: `Applied ${response.data.tasksCreated} AI-generated tasks to project`,
            life: 5000
          });

          // Show Teams integration result
          if (response.data.teamsIntegration) {
            toast.add({
              severity: 'success',
              summary: 'Teams Space Created',
              detail: 'Microsoft Teams workspace created with AI content shared',
              life: 5000
            });
          }

          // Navigate to project detail
          router.push(`/projects/${project.value.id}`);
        }

      } catch (err) {
        console.error('Error applying suggestions:', err);
        toast.add({
          severity: 'error',
          summary: 'Error',
          detail: err.response?.data?.message || 'Failed to apply AI suggestions. Please try again.',
          life: 5000
        });
      } finally {
        isApplying.value = false;
      }
    };

    const goBack = () => {
      if (project.value && project.value.id) {
        router.push(`/projects/${project.value.id}`);
      } else {
        router.push('/projects');
      }
    };

    const formatDate = (dateString) => {
      if (!dateString) return '';
      return new Date(dateString).toLocaleDateString();
    };

    const renderedTimeline = computed(() => {
      const t = suggestions.value?.timeline;
      if (!t || (Array.isArray(t) && t.length === 0)) return '';
      const text = Array.isArray(t) ? t.join('\n') : String(t);
      return marked.parse(text);
    });

    const formatAssigneeName = (assignedTo) => {
      if (!assignedTo) return '';
      // Extract name from "Name (email@...)" format
      const match = assignedTo.match(/^([^(]+)\s*\(/);
      if (match) return match[1].trim();
      // If it looks like an email, return it as-is
      if (assignedTo.includes('@')) return assignedTo;
      return assignedTo;
    };

    const formatAssigneeEmail = (assignedTo) => {
      if (!assignedTo) return '';
      const match = assignedTo.match(/\(([^)]+)\)/);
      if (!match) return '';
      const raw = match[1];
      // Convert external UPN format: kanikmartin_gmail.com#EXT#@... -> kanikmartin@gmail.com
      if (raw.includes('#EXT#')) {
        return raw.split('#EXT#')[0].replace(/_/g, '@');
      }
      return raw;
    };

    const editTask = (index) => {
      editingIndex.value = index;
      editingTask.value = { ...suggestions.value.tasks[index] };
      
      // Convert date string to Date object for calendar
      if (editingTask.value.dueDate) {
        editingTask.value.dueDate = new Date(editingTask.value.dueDate);
      }
      
      showEditDialog.value = true;
    };

    const saveTaskEdit = async () => {
      if (!editingTask.value.name || !editingTask.value.description) {
        toast.add({
          severity: 'warn',
          summary: 'Validation Error',
          detail: 'Task name and description are required',
          life: 3000
        });
        return;
      }

      // Update the task in the array
      suggestions.value.tasks[editingIndex.value] = {
        ...editingTask.value,
        dueDate: editingTask.value.dueDate ? 
          editingTask.value.dueDate.toISOString().split('T')[0] : 
          null
      };

      // Recalculate summary
      if (suggestions.value.summary) {
        const totalHours = suggestions.value.tasks.reduce((sum, task) => 
          sum + (task.estimatedHours || 0), 0);
        suggestions.value.summary.totalHours = totalHours;

        // Recalculate team utilization
        const teamUtil = {};
        suggestions.value.tasks.forEach(task => {
          const assignee = task.assignedTo || 'Unassigned';
          if (!teamUtil[assignee]) teamUtil[assignee] = 0;
          teamUtil[assignee] += task.estimatedHours || 0;
        });
        suggestions.value.summary.teamUtilization = teamUtil;
      }

      // Save changes to backend
      try {
        await projectAPI.updateAISuggestions(suggestionId.value, {
          analysis: suggestions.value
        });

        toast.add({
          severity: 'success',
          summary: 'Task Updated',
          detail: 'Task has been updated and saved successfully',
          life: 3000
        });
      } catch (err) {
        console.error('Failed to save task update:', err);
        toast.add({
          severity: 'error',
          summary: 'Save Failed',
          detail: 'Task was updated locally but could not be saved',
          life: 3000
        });
      }

      showEditDialog.value = false;
    };

    const deleteTask = (index) => {
      confirm.require({
        message: `Are you sure you want to delete "${suggestions.value.tasks[index].name}"?`,
        header: 'Delete Task',
        icon: 'pi pi-exclamation-triangle',
        acceptClass: 'p-button-danger',
        accept: async () => {
          suggestions.value.tasks.splice(index, 1);

          // Recalculate summary
          if (suggestions.value.summary) {
            const totalHours = suggestions.value.tasks.reduce((sum, task) => 
              sum + (task.estimatedHours || 0), 0);
            suggestions.value.summary.totalHours = totalHours;

            // Recalculate team utilization
            const teamUtil = {};
            suggestions.value.tasks.forEach(task => {
              const assignee = task.assignedTo || 'Unassigned';
              if (!teamUtil[assignee]) teamUtil[assignee] = 0;
              teamUtil[assignee] += task.estimatedHours || 0;
            });
            suggestions.value.summary.teamUtilization = teamUtil;
          }

          // Save changes to backend
          try {
            await projectAPI.updateAISuggestions(suggestionId.value, {
              analysis: suggestions.value
            });

            toast.add({
              severity: 'success',
              summary: 'Task Deleted',
              detail: 'Task has been removed and saved',
              life: 3000
            });
          } catch (err) {
            console.error('Failed to save task deletion:', err);
            toast.add({
              severity: 'error',
              summary: 'Save Failed',
              detail: 'Task was deleted locally but could not be saved',
              life: 3000
            });
          }
        }
      });
    };

    const getTeamMemberAvatar = (memberName) => {
      const member = teamMembers.value.find(m => m.name === memberName);
      return member?.profilePicture || null;
    };

    const parseHours = (hours) => {
      // Handle both numeric and string formats like "7.5 hours" or "7.5"
      if (typeof hours === 'number') {
        return hours.toFixed(1);
      }
      if (typeof hours === 'string') {
        const match = hours.match(/[\d.]+/);
        if (match) {
          return parseFloat(match[0]).toFixed(1);
        }
      }
      return '0.0';
    };

    const getGanttChartUrl = (imagePath) => {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:9801';
      return `${baseUrl}${imagePath}`;
    };

    const handleImageError = (event) => {
      console.error('Failed to load Gantt chart image');
      toast.add({
        severity: 'warn',
        summary: 'Image Load Failed',
        detail: 'Could not load Gantt chart image',
        life: 3000
      });
    };

    const deleteRisk = (index) => {
      confirm.require({
        message: `Are you sure you want to delete this risk: "${suggestions.value.risks[index].title}"?`,
        header: 'Delete Risk',
        icon: 'pi pi-exclamation-triangle',
        acceptClass: 'p-button-danger',
        accept: async () => {
          suggestions.value.risks.splice(index, 1);

          // Save changes to backend
          try {
            await projectAPI.updateAISuggestions(suggestionId.value, {
              analysis: suggestions.value
            });

            toast.add({
              severity: 'success',
              summary: 'Risk Deleted',
              detail: 'Risk has been removed and saved',
              life: 3000
            });
          } catch (err) {
            console.error('Failed to save risk deletion:', err);
            toast.add({
              severity: 'error',
              summary: 'Save Failed',
              detail: 'Risk was deleted locally but could not be saved',
              life: 3000
            });
          }
        }
      });
    };

    onMounted(() => {
      fetchSuggestions();
    });

    const handleExportPdf = async () => {
      if (suggestions.value) {
        await exportAISuggestionsPdf(project.value, suggestions.value);
      }
    };

    return {
      t,
      isLoading,
      isApplying,
      error,
      suggestions,
      project,
      showEditDialog,
      editingTask,
      priorityOptions,
      phaseOptions,
      fetchSuggestions,
      applyAllSuggestions,
      goBack,
      formatDate,
      renderedTimeline,
      formatAssigneeName,
      formatAssigneeEmail,
      editTask,
      saveTaskEdit,
      deleteTask,
      deleteRisk,
      getTeamMemberAvatar,
      parseHours,
      getGanttChartUrl,
      handleImageError,
      handleExportPdf
    };
  }
};
</script>

<style scoped>
.ai-suggestions-view {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0;
}

/* Header - reused from ProjectDetailView */
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

.suggestions-container {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.suggestions-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.summary-section,
.tasks-section,
.risks-section,
.timeline-section,
.gantt-section {
  background: var(--color-bg-primary);
  border-radius: 16px;
  padding: 32px;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
  border: 1px solid var(--color-border);
}

.summary-section h2,
.tasks-section h2,
.risks-section h2,
.timeline-section h2,
.gantt-section h2 {
  color: var(--color-text-primary);
  margin: 0 0 1.5rem 0;
  font-size: 1.5rem;
  font-weight: 600;
}

.summary-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.stat-card {
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 1.5rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  transition: all 0.2s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border-color: #e0e7ff;
}

.stat-icon {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  flex-shrink: 0;
}

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--color-text-primary);
  line-height: 1;
  margin-bottom: 0.25rem;
}

.stat-label {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  font-weight: 500;
}

.team-utilization h3 {
  color: var(--color-text-primary);
  margin-bottom: 1rem;
  font-size: 1.2rem;
}

.utilization-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
}

.utilization-card {
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 1.25rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  transition: all 0.2s ease;
  min-width: 0;
  overflow: hidden;
}

.utilization-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border-color: #4f46e5;
}

.member-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
}

.member-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.member-avatar i {
  color: white;
  font-size: 1.25rem;
}

.member-info {
  flex: 1;
  text-align: left;
  min-width: 0;
  overflow: hidden;
}

.member-name {
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: 0.25rem;
  font-size: 0.95rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.member-email {
  color: var(--color-text-secondary);
  font-size: 0.8rem;
  margin-bottom: 0.25rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.member-hours {
  color: #4f46e5;
  font-size: 1.1rem;
  font-weight: 700;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.section-header h2 {
  margin: 0;
}

.task-stats {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.task-count {
  background: var(--color-primary-light);
  color: var(--color-primary);
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 0.9rem;
  font-weight: 500;
}

.tasks-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 1.5rem;
}

.task-card {
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 1.5rem;
  padding-top: 3rem;
  transition: all 0.2s ease;
  position: relative;
}

.task-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border-color: #4f46e5;
}

.task-card-actions {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  display: flex;
  gap: 0.25rem;
  opacity: 0;
  transition: opacity 0.2s ease;
  z-index: 10;
  background: var(--color-bg-secondary);
  padding: 0.25rem;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.task-card:hover .task-card-actions {
  opacity: 1;
}

.task-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.task-priority {
  padding: 0.3rem 0.8rem;
  border-radius: 16px;
  font-size: 0.8rem;
  font-weight: 500;
  text-transform: uppercase;
}

.task-priority.high {
  background: var(--color-error-light);
  color: var(--color-error);
}

.task-priority.medium {
  background: var(--color-warning-light);
  color: var(--color-warning);
}

.task-priority.low {
  background: var(--color-success-light);
  color: var(--color-success);
}

.task-phase {
  background: var(--color-bg-tertiary);
  color: var(--color-text-secondary);
  padding: 0.3rem 0.8rem;
  border-radius: 16px;
  font-size: 0.8rem;
}

.task-name {
  color: var(--color-text-primary);
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 0.8rem;
}

.task-description {
  color: var(--color-text-secondary);
  line-height: 1.5;
  margin-bottom: 1rem;
}

.task-details {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.8rem;
}

.task-detail {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--color-text-secondary);
  font-size: 0.9rem;
  min-width: 0;
}

.task-detail--assignee {
  grid-column: 1 / -1;
  flex-wrap: nowrap;
  overflow: hidden;
}

.assignee-name {
  font-weight: 500;
  color: var(--color-text-primary);
  white-space: nowrap;
  flex-shrink: 0;
}

.assignee-email {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
  color: var(--color-text-secondary);
  font-size: 0.8rem;
}

.task-detail i {
  width: 16px;
  flex-shrink: 0;
  color: var(--color-primary);
}

.task-dependencies {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--color-border);
  font-size: 0.9rem;
}

.task-dependencies ul {
  margin: 0.5rem 0 0 1rem;
  color: var(--color-text-secondary);
}

.risks-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
}

.risk-card {
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 1.5rem;
  padding-top: 3rem;
  border-left: 4px solid var(--color-border);
  position: relative;
  transition: all 0.2s ease;
}

.risk-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.risk-card-actions {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  display: flex;
  gap: 0.25rem;
  opacity: 0;
  transition: opacity 0.2s ease;
  z-index: 10;
  background: var(--color-bg-secondary);
  padding: 0.25rem;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.risk-card:hover .risk-card-actions {
  opacity: 1;
}

.risk-card.high {
  border-left-color: var(--color-error);
}

.risk-card.medium {
  border-left-color: var(--color-warning);
}

.risk-card.low {
  border-left-color: var(--color-success);
}

.risk-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.risk-severity {
  padding: 0.3rem 0.8rem;
  border-radius: 16px;
  font-size: 0.8rem;
  font-weight: 500;
  text-transform: uppercase;
  background: var(--color-bg-tertiary);
  color: var(--color-text-secondary);
}

.risk-probability {
  color: var(--color-text-secondary);
  font-size: 0.9rem;
}

.risk-title {
  color: var(--color-text-primary);
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 0.8rem;
}

.risk-description {
  color: var(--color-text-secondary);
  line-height: 1.5;
  margin-bottom: 1rem;
}

.risk-mitigation {
  color: var(--color-text-secondary);
  font-size: 0.9rem;
  line-height: 1.4;
}

.risk-mitigation strong {
  color: var(--color-text-primary);
}

.timeline-content {
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 2rem;
  font-size: 0.92rem;
  line-height: 1.7;
  color: var(--color-text-primary);
  overflow-x: auto;
}

.timeline-content :deep(h1),
.timeline-content :deep(h2),
.timeline-content :deep(h3),
.timeline-content :deep(h4) {
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 1.2em 0 0.4em;
  line-height: 1.3;
}

.timeline-content :deep(h1) { font-size: 1.3rem; }
.timeline-content :deep(h2) { font-size: 1.15rem; }
.timeline-content :deep(h3) { font-size: 1rem; }
.timeline-content :deep(h4) { font-size: 0.95rem; }

.timeline-content :deep(strong) {
  font-weight: 700;
  color: var(--color-text-primary);
}

.timeline-content :deep(em) {
  font-style: italic;
}

.timeline-content :deep(p) {
  margin: 0.5em 0;
}

.timeline-content :deep(ul),
.timeline-content :deep(ol) {
  margin: 0.4em 0 0.4em 1.4em;
  padding: 0;
}

.timeline-content :deep(li) {
  margin: 0.2em 0;
}

.timeline-content :deep(hr) {
  border: none;
  border-top: 1px solid var(--color-border);
  margin: 1em 0;
}

.timeline-content :deep(code) {
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  padding: 0.15em 0.4em;
  font-family: 'Courier New', monospace;
  font-size: 0.85em;
}

.gantt-chart {
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 2rem;
  font-family: 'Courier New', monospace;
  font-size: 0.9rem;
  line-height: 1.4;
  overflow-x: auto;
  white-space: pre-wrap;
  color: var(--color-text-primary);
}

.gantt-chart-image {
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 1rem;
  overflow-x: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
}

.gantt-chart-image img {
  max-width: 100%;
  height: auto;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.gantt-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  justify-content: center;
  padding: 0.5rem 1rem;
  background: var(--color-bg-primary, #fff);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  font-size: 0.85rem;
  color: var(--color-text-primary);
}

.gantt-legend-item {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.gantt-legend-color {
  display: inline-block;
  width: 14px;
  height: 14px;
  border-radius: 3px;
  flex-shrink: 0;
}

/* Edit Task Form Styles */
.edit-task-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding: 0.5rem 0;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-field label {
  font-weight: 600;
  color: var(--color-text-primary);
  font-size: 0.9rem;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.form-field :deep(.p-inputtext),
.form-field :deep(.p-inputnumber-input),
.form-field :deep(.p-dropdown),
.form-field :deep(.p-calendar),
.form-field :deep(.p-inputtextarea) {
  width: 100%;
}

@media (max-width: 768px) {
  .suggestions-container {
    padding: 1rem;
  }
  
  .tasks-grid,
  .risks-grid {
    grid-template-columns: 1fr;
  }
  
  .summary-cards {
    grid-template-columns: 1fr;
  }
  
  .task-details {
    grid-template-columns: 1fr;
  }
  
  .section-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
}

@media (max-width: 1200px) {
  .header-actions {
    flex-wrap: wrap;
    gap: 8px;
  }
}
</style>