import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/services/api'

export const useTaskStore = defineStore('task', () => {
  const tasks = ref([])
  const currentTask = ref(null)
  const myTasks = ref([])
  const loading = ref(false)
  const error = ref(null)

  const fetchTasks = async (filters = {}) => {
    try {
      loading.value = true
      const response = await api.get('/tasks', { params: filters })
      tasks.value = response.data.tasks
    } catch (err) {
      error.value = err.response?.data?.error || 'Failed to fetch tasks'
    } finally {
      loading.value = false
    }
  }

  const fetchMyTasks = async (filters = {}) => {
    try {
      loading.value = true
      const response = await api.get('/tasks/my-tasks', { params: filters })
      myTasks.value = response.data.tasks
    } catch (err) {
      error.value = err.response?.data?.error || 'Failed to fetch tasks'
    } finally {
      loading.value = false
    }
  }

  const fetchTasksByProject = async (projectId) => {
    try {
      loading.value = true
      const response = await api.get(`/tasks/project/${projectId}`)
      tasks.value = response.data.tasks
    } catch (err) {
      error.value = err.response?.data?.error || 'Failed to fetch tasks'
    } finally {
      loading.value = false
    }
  }

  const fetchTaskById = async (id) => {
    try {
      loading.value = true
      const response = await api.get(`/tasks/${id}`)
      currentTask.value = response.data.task
      return response.data.task
    } catch (err) {
      error.value = err.response?.data?.error || 'Failed to fetch task'
    } finally {
      loading.value = false
    }
  }

  const createTask = async (taskData) => {
    try {
      loading.value = true
      const response = await api.post('/tasks', taskData)
      tasks.value.unshift(response.data.task)
      return response.data.task
    } catch (err) {
      error.value = err.response?.data?.error || 'Failed to create task'
      throw err
    } finally {
      loading.value = false
    }
  }

  const updateTask = async (id, taskData) => {
    try {
      loading.value = true
      const response = await api.put(`/tasks/${id}`, taskData)
      const index = tasks.value.findIndex(t => t._id === id)
      if (index !== -1) {
        tasks.value[index] = response.data.task
      }
      return response.data.task
    } catch (err) {
      error.value = err.response?.data?.error || 'Failed to update task'
      throw err
    } finally {
      loading.value = false
    }
  }

  const updateTaskStatus = async (id, status) => {
    try {
      loading.value = true
      const response = await api.put(`/tasks/${id}/status`, { status })
      const index = tasks.value.findIndex(t => t._id === id)
      if (index !== -1) {
        tasks.value[index].status = status
      }
      return response.data.task
    } catch (err) {
      error.value = err.response?.data?.error || 'Failed to update status'
      throw err
    } finally {
      loading.value = false
    }
  }

  const deleteTask = async (id) => {
    try {
      loading.value = true
      await api.delete(`/tasks/${id}`)
      tasks.value = tasks.value.filter(t => t._id !== id)
    } catch (err) {
      error.value = err.response?.data?.error || 'Failed to delete task'
      throw err
    } finally {
      loading.value = false
    }
  }

  const addComment = async (taskId, text) => {
    try {
      const response = await api.post(`/tasks/${taskId}/comments`, { text })
      return response.data.task
    } catch (err) {
      error.value = err.response?.data?.error || 'Failed to add comment'
      throw err
    }
  }

  const syncFromPlanner = async () => {
    try {
      const response = await api.post('/tasks/sync-planner')
      // Refresh my tasks after sync
      await fetchMyTasks()
      return response.data
    } catch (err) {
      error.value = err.response?.data?.error || 'Failed to sync from Planner'
      throw err
    }
  }

  return {
    tasks,
    currentTask,
    myTasks,
    loading,
    error,
    fetchTasks,
    fetchMyTasks,
    fetchTasksByProject,
    fetchTaskById,
    createTask,
    updateTask,
    updateTaskStatus,
    deleteTask,
    addComment,
    syncFromPlanner
  }
})
