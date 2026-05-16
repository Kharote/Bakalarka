import api from './api'

export const teamsService = {
  // Create Microsoft Teams workspace for project
  async createProjectTeam(projectData) {
    const response = await api.post('/teams/create-team', projectData)
    return response.data
  },

  // Create project-specific channels
  async createProjectChannels(teamId, projectData) {
    const response = await api.post(`/teams/${teamId}/channels`, projectData)
    return response.data
  },

  // Send AI-generated content to Teams
  async sendAIContentToTeams(teamId, channelId, content) {
    const response = await api.post(`/teams/${teamId}/channels/${channelId}/messages`, { content })
    return response.data
  },

  // Original methods
  async createChannel(projectId, teamId) {
    const response = await api.post(`/teams/channel/${projectId}`, { teamId })
    return response.data
  },

  async sendMessage(projectId, message) {
    const response = await api.post(`/teams/message/${projectId}`, { message })
    return response.data
  },

  async createTeamsTask(taskId, planId) {
    const response = await api.post('/teams/task', { taskId, planId })
    return response.data
  },

  async syncTask(taskId) {
    const response = await api.post(`/teams/sync-task/${taskId}`)
    return response.data
  },

  async getTeamsChannels() {
    const response = await api.get('/teams/channels')
    return response.data
  }
}
