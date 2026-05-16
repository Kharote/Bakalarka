import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/services/api'

export const useProjectStore = defineStore('project', () => {
  const projects = ref([])
  const currentProject = ref(null)
  const loading = ref(false)
  const error = ref(null)

  const fetchProjects = async (filters = {}) => {
    try {
      loading.value = true
      const response = await api.get('/projects', { params: filters })
      projects.value = response.data.projects
    } catch (err) {
      error.value = err.response?.data?.error || 'Failed to fetch projects'
    } finally {
      loading.value = false
    }
  }

  const fetchProjectById = async (id) => {
    try {
      loading.value = true
      const response = await api.get(`/projects/${id}`)
      currentProject.value = response.data.project
      return response.data.project
    } catch (err) {
      error.value = err.response?.data?.error || 'Failed to fetch project'
    } finally {
      loading.value = false
    }
  }

  const createProject = async (projectData) => {
    try {
      loading.value = true
      const response = await api.post('/projects', projectData)
      projects.value.unshift(response.data.project)
      return response // Return full response instead of just project
    } catch (err) {
      error.value = err.response?.data?.error || 'Failed to create project'
      throw err
    } finally {
      loading.value = false
    }
  }

  const updateProjectAIStatus = async (projectId, status, suggestionId = null) => {
    try {
      const response = await api.patch(`/projects/${projectId}/ai-status`, { 
        aiStatus: status,
        aiSuggestionId: suggestionId 
      })
      
      // Update local project if it exists in the list
      const projectIndex = projects.value.findIndex(p => p.id === projectId)
      if (projectIndex !== -1) {
        projects.value[projectIndex] = { 
          ...projects.value[projectIndex], 
          aiStatus: status,
          aiSuggestionId: suggestionId 
        }
      }
      
      return response
    } catch (err) {
      console.error('Failed to update project AI status:', err)
      throw err
    }
  }

  const createProjectWithWorkflow = async (projectData) => {
    try {
      loading.value = true
      const response = await api.post('/projects/create-with-workflow', projectData)
      projects.value.unshift(response.data.project)
      return response.data
    } catch (err) {
      error.value = err.response?.data?.error || 'Failed to create project with workflow'
      throw err
    } finally {
      loading.value = false
    }
  }

  const generateAISuggestions = async (projectData) => {
    try {
      loading.value = true
      const response = await api.post('/projects/generate-ai-suggestions', projectData)
      return response.data
    } catch (err) {
      error.value = err.response?.data?.error || 'Failed to generate AI suggestions'
      throw err
    } finally {
      loading.value = false
    }
  }

  const getAvailableAIModels = async () => {
    try {
      const response = await api.get('/projects/ai-models')
      return response.data
    } catch (err) {
      error.value = err.response?.data?.error || 'Failed to fetch AI models'
      throw err
    }
  }

  const updateProject = async (id, projectData) => {
    try {
      loading.value = true
      const response = await api.put(`/projects/${id}`, projectData)
      const index = projects.value.findIndex(p => p.id === id || p._id === id)
      if (index !== -1) {
        projects.value[index] = response.data.project
      }
      if (currentProject.value?.id === id) {
        currentProject.value = response.data.project
      }
      return response.data.project
    } catch (err) {
      error.value = err.response?.data?.error || 'Failed to update project'
      throw err
    } finally {
      loading.value = false
    }
  }

  const updateProjectStatus = async (id, status) => {
    try {
      const response = await api.patch(`/projects/${id}/status`, { status })
      const index = projects.value.findIndex(p => p.id === id)
      if (index !== -1) {
        projects.value[index] = response.data.project
      }
      if (currentProject.value?.id === id) {
        currentProject.value = response.data.project
      }
      return response.data.project
    } catch (err) {
      error.value = err.response?.data?.error || 'Failed to update project status'
      throw err
    }
  }

  const deleteProject = async (id) => {
    try {
      loading.value = true
      await api.delete(`/projects/${id}`)
      
      // Remove project from local state immediately
      const index = projects.value.findIndex(p => p.id === id)
      if (index !== -1) {
        projects.value.splice(index, 1)
      }
      
      // Refresh projects list to ensure sync
      await fetchProjects()
    } catch (err) {
      error.value = err.response?.data?.error || 'Failed to delete project'
      throw err
    } finally {
      loading.value = false
    }
  }

  const getProjectStatistics = async (id) => {
    try {
      const response = await api.get(`/projects/${id}/statistics`)
      return response.data.statistics
    } catch (err) {
      error.value = err.response?.data?.error || 'Failed to fetch statistics'
    }
  }

  const retryAIAnalysis = async (projectId, options = {}) => {
    try {
      // Don't set global loading state - this is a background operation
      
      // Find the project to get its data for retry
      const project = projects.value.find(p => p.id === projectId)
      if (!project) {
        throw new Error('Project not found')
      }

      // Merge provided options with defaults
      const {
        selectedModel = 'gemini-2.5-flash',
        locale = project.locale || 'en',
        generateTasks = true,
        generateRisks = true,
        generateGantt = true
      } = options

      // Reset AI status to generating first
      await updateProjectAIStatus(projectId, 'generating')
      
      // Retry AI analysis with existing project data
      // Extract team member IDs from members array
      const teamMemberIds = project.members?.map(m => ({ id: m.userId || m.user?.id || m.id })).filter(m => m.id) || []
      
      const projectData = {
        projectId: project.id,
        name: project.name,
        description: project.description,
        startDate: project.startDate,
        endDate: project.endDate,
        priority: project.priority,
        budget: project.budget,
        tags: project.tags,
        teamMembers: teamMemberIds,
        generateTasks,
        generateRisks, 
        generateGantt,
        selectedModel,
        locale
      }
      
      // Call the AI generation endpoint without its own loading state
      const response = await api.post('/projects/generate-ai-suggestions', projectData)
      
      // Refresh projects list to show updated status
      await fetchProjects()
      
      return response.data
      
    } catch (err) {
      console.error('Error retrying AI analysis:', err)
      error.value = err.response?.data?.error || 'Failed to retry AI analysis'
      
      // Reset status to failed on error
      try {
        await updateProjectAIStatus(projectId, 'failed')
      } catch (statusErr) {
        console.error('Failed to update status to failed:', statusErr)
      }
      
      throw err
    }
  }

  return {
    projects,
    currentProject,
    loading,
    error,
    fetchProjects,
    fetchProjectById,
    createProject,
    updateProjectAIStatus,
    createProjectWithWorkflow,
    generateAISuggestions,
    getAvailableAIModels,
    updateProject,
    updateProjectStatus,
    deleteProject,
    getProjectStatistics,
    retryAIAnalysis
  }
})
