import api from './api'

export const aiService = {
  async generateProjectPlan(projectData) {
    const response = await api.post('/ai/project-plan', projectData)
    return response.data
  },

  async suggestTasks(projectId) {
    const response = await api.post(`/ai/suggest-tasks/${projectId}`)
    return response.data
  },

  async analyzeRisks(projectId) {
    const response = await api.post(`/ai/analyze-risks/${projectId}`)
    return response.data
  },

  async optimizeResources(projectId) {
    const response = await api.post(`/ai/optimize-resources/${projectId}`)
    return response.data
  },

  async predictTimeline(projectId) {
    const response = await api.post(`/ai/predict-timeline/${projectId}`)
    return response.data
  },

  async generateTaskDescription(taskData) {
    const response = await api.post('/ai/generate-task-description', taskData)
    return response.data
  }
}
