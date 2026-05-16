import axios from 'axios'
import { useAuthStore } from '@/stores/auth'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:9801/api',
  headers: {
    'Content-Type': 'application/json'
  }
})

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    
    // Prevent caching for data that should be fresh
    if (config.url?.includes('/projects') || config.url?.includes('/notifications')) {
      config.headers['Cache-Control'] = 'no-cache'
      config.headers['Pragma'] = 'no-cache'
      config.headers['Expires'] = '0'
    }
    
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Avoid infinite loops by checking current location
      if (window.location.pathname !== '/login') {
        console.log('401 error, redirecting to login')
        const authStore = useAuthStore()
        authStore.logout()
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api

// Profile API functions
export const profileAPI = {
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (data) => api.put('/auth/profile', data),
  getStats: () => api.get('/auth/profile/stats'),
  refreshPhoto: () => api.post('/auth/profile/refresh-photo')
}

// Settings API functions
export const settingsAPI = {
  getSettings: () => api.get('/auth/settings'),
  updateSettings: (data) => api.put('/auth/settings', data),
  updateSetting: (key, value) => api.patch('/auth/settings', { key, value }),
  updateLocale: (locale) => api.patch('/auth/locale', { locale })
}

// Notifications API functions
export const notificationAPI = {
  getNotifications: (params) => api.get('/notifications', { params }),
  markAsRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllAsRead: () => api.patch('/notifications/mark-all-read'),
  deleteNotification: (id) => api.delete(`/notifications/${id}`),
  clearAllNotifications: () => api.delete('/notifications')
}

// Users API functions
export const userAPI = {
  getAllUsers: (params) => api.get('/users', { params }),
  getUserById: (id) => api.get(`/users/${id}`),
  updateUser: (id, data) => api.put(`/users/${id}`, data),
  updateUserRole: (id, roleData) => api.patch(`/users/${id}/role`, roleData),
  getUsersForProject: (projectId) => api.get(`/users/project/${projectId}`)
}

// Project API functions
export const projectAPI = {
  getProjects: () => api.get('/projects'),
  createProject: (data) => api.post('/projects', data),
  updateProject: (id, data) => api.put(`/projects/${id}`, data),
  deleteProject: (id) => api.delete(`/projects/${id}`),
  getProject: (id) => api.get(`/projects/${id}`),
  getAISuggestions: (suggestionId) => api.get(`/projects/ai-suggestions/${suggestionId}`),
  updateAISuggestions: (suggestionId, data) => api.put(`/projects/ai-suggestions/${suggestionId}`, data),
  applyAISuggestions: (projectId, suggestions) => api.post(`/projects/${projectId}/apply-ai-suggestions`, suggestions)
}

// Task API functions  
export const taskAPI = {
  getTasks: () => api.get('/tasks'),
  createTask: (data) => api.post('/tasks', data),
  updateTask: (id, data) => api.put(`/tasks/${id}`, data),
  deleteTask: (id) => api.delete(`/tasks/${id}`)
}

// Admin System Settings API functions
export const adminAPI = {
  // System settings
  getSettings: () => api.get('/admin/settings'),
  getSetting: (key) => api.get(`/admin/settings/${key}`),
  updateSetting: (key, value) => api.put(`/admin/settings/${key}`, { value }),
  updateMultipleSettings: (settings) => api.put('/admin/settings/batch', { settings }),

  // Model restriction (public, auth only - not admin-only)
  getModelRestriction: () => api.get('/admin/model-restriction'),

  // AI Prompts
  getPrompts: () => api.get('/admin/prompts'),
  updatePrompt: (locale, promptName, content) => api.put(`/admin/prompts/${locale}/${promptName}`, { content }),
  createPrompt: (locale, promptName, content) => api.post(`/admin/prompts/${locale}/${promptName}`, { content }),
  deletePrompt: (locale, promptName) => api.delete(`/admin/prompts/${locale}/${promptName}`)
}

// Work Team management API functions
export const workTeamAPI = {
  getTeams: (params) => api.get('/work-teams', { params }),
  getMyTeams: () => api.get('/work-teams/my-teams'),
  getTeamById: (teamId) => api.get(`/work-teams/${teamId}`),
  createTeam: (data) => api.post('/work-teams', data),
  updateTeam: (teamId, data) => api.put(`/work-teams/${teamId}`, data),
  deleteTeam: (teamId) => api.delete(`/work-teams/${teamId}`),
  getTeamMembers: (teamId) => api.get(`/work-teams/${teamId}/members`),
  addTeamMember: (teamId, userId) => api.post(`/work-teams/${teamId}/members`, { userId }),
  removeTeamMember: (teamId, userId) => api.delete(`/work-teams/${teamId}/members/${userId}`),
  transferLeadership: (teamId, newLeaderId) => api.post(`/work-teams/${teamId}/transfer-leadership`, { newLeaderId })
}
