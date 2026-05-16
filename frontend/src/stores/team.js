import { defineStore } from 'pinia'
import { ref } from 'vue'
import { workTeamAPI } from '@/services/api'

export const useTeamStore = defineStore('team', () => {
  const teams = ref([])
  const currentTeam = ref(null)
  const loading = ref(false)
  const error = ref(null)

  const fetchTeams = async (params = {}) => {
    loading.value = true
    error.value = null
    try {
      const response = await workTeamAPI.getTeams(params)
      teams.value = response.data.teams
      return response.data
    } catch (err) {
      error.value = err.response?.data?.message || 'Failed to fetch teams'
      throw err
    } finally {
      loading.value = false
    }
  }

  const fetchMyTeams = async () => {
    loading.value = true
    error.value = null
    try {
      const response = await workTeamAPI.getMyTeams()
      teams.value = response.data.teams
      return response.data
    } catch (err) {
      error.value = err.response?.data?.message || 'Failed to fetch my teams'
      throw err
    } finally {
      loading.value = false
    }
  }

  const fetchTeamById = async (teamId) => {
    loading.value = true
    error.value = null
    try {
      const response = await workTeamAPI.getTeamById(teamId)
      currentTeam.value = response.data.team
      return response.data
    } catch (err) {
      error.value = err.response?.data?.message || 'Failed to fetch team'
      throw err
    } finally {
      loading.value = false
    }
  }

  const createTeam = async (data) => {
    loading.value = true
    error.value = null
    try {
      const response = await workTeamAPI.createTeam(data)
      teams.value.push(response.data.team)
      return response.data
    } catch (err) {
      error.value = err.response?.data?.message || 'Failed to create team'
      throw err
    } finally {
      loading.value = false
    }
  }

  const updateTeam = async (teamId, data) => {
    loading.value = true
    error.value = null
    try {
      const response = await workTeamAPI.updateTeam(teamId, data)
      const index = teams.value.findIndex(t => t.id === teamId)
      if (index !== -1) teams.value[index] = response.data.team
      if (currentTeam.value?.id === teamId) currentTeam.value = response.data.team
      return response.data
    } catch (err) {
      error.value = err.response?.data?.message || 'Failed to update team'
      throw err
    } finally {
      loading.value = false
    }
  }

  const deleteTeam = async (teamId) => {
    loading.value = true
    error.value = null
    try {
      const response = await workTeamAPI.deleteTeam(teamId)
      teams.value = teams.value.filter(t => t.id !== teamId)
      if (currentTeam.value?.id === teamId) currentTeam.value = null
      return response.data
    } catch (err) {
      error.value = err.response?.data?.message || 'Failed to delete team'
      throw err
    } finally {
      loading.value = false
    }
  }

  const addTeamMember = async (teamId, userId) => {
    loading.value = true
    error.value = null
    try {
      const response = await workTeamAPI.addTeamMember(teamId, userId)
      const index = teams.value.findIndex(t => t.id === teamId)
      if (index !== -1) teams.value[index] = response.data.team
      if (currentTeam.value?.id === teamId) currentTeam.value = response.data.team
      return response.data
    } catch (err) {
      error.value = err.response?.data?.message || 'Failed to add team member'
      throw err
    } finally {
      loading.value = false
    }
  }

  const removeTeamMember = async (teamId, userId) => {
    loading.value = true
    error.value = null
    try {
      const response = await workTeamAPI.removeTeamMember(teamId, userId)
      const index = teams.value.findIndex(t => t.id === teamId)
      if (index !== -1) teams.value[index] = response.data.team
      if (currentTeam.value?.id === teamId) currentTeam.value = response.data.team
      return response.data
    } catch (err) {
      error.value = err.response?.data?.message || 'Failed to remove team member'
      throw err
    } finally {
      loading.value = false
    }
  }

  const transferLeadership = async (teamId, newLeaderId) => {
    loading.value = true
    error.value = null
    try {
      const response = await workTeamAPI.transferLeadership(teamId, newLeaderId)
      const index = teams.value.findIndex(t => t.id === teamId)
      if (index !== -1) teams.value[index] = response.data.team
      if (currentTeam.value?.id === teamId) currentTeam.value = response.data.team
      return response.data
    } catch (err) {
      error.value = err.response?.data?.message || 'Failed to transfer leadership'
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    teams,
    currentTeam,
    loading,
    error,
    fetchTeams,
    fetchMyTeams,
    fetchTeamById,
    createTeam,
    updateTeam,
    deleteTeam,
    addTeamMember,
    removeTeamMember,
    transferLeadership
  }
})
