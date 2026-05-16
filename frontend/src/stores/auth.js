import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/services/api'
import websocketService from '@/services/websocketService'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const token = ref(null)
  const loading = ref(false)
  const error = ref(null)
  const initialized = ref(false)

  const isAuthenticated = computed(() => {
    return !!token.value && !!user.value
  })

  // Clear all auth data
  const clearAuth = () => {
    token.value = null
    user.value = null
    localStorage.removeItem('token')
    delete api.defaults.headers.common['Authorization']
    websocketService.disconnect()
  }

  // Initialize auth store
  const initializeAuth = async () => {
    if (initialized.value) {
      console.log('Auth already initialized, skipping...')
      return
    }
    
    console.log('Initializing auth store...')
    const storedToken = localStorage.getItem('token')
    
    if (storedToken) {
      console.log('Found stored token, validating...')
      token.value = storedToken
      api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`
      
      try {
        await getCurrentUser()
        console.log('Auth initialization successful')
      } catch (err) {
        console.log('Stored token invalid, clearing auth')
        clearAuth()
      }
    } else {
      console.log('No stored token found')
    }
    
    initialized.value = true
  }

  const setToken = (newToken) => {
    token.value = newToken
    if (newToken) {
      localStorage.setItem('token', newToken)
      api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`
    } else {
      clearAuth()
    }
  }

  const getCurrentUser = async () => {
    if (!token.value) {
      throw new Error('No token available')
    }
    
    try {
      loading.value = true
      const response = await api.get('/auth/me')
      user.value = response.data.user
      
      // Connect WebSocket after successful auth
      websocketService.connect(token.value)
      
      return user.value
    } catch (err) {
      console.error('Failed to fetch current user:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  const logout = () => {
    console.log('Logging out...')
    clearAuth()
  }

  const login = async ({ email, password }) => {
    try {
      loading.value = true
      error.value = null
      const response = await api.post('/auth/login', { email, password })
      const { token: newToken, user: newUser } = response.data
      setToken(newToken)
      user.value = newUser
      websocketService.connect(newToken)
      return true
    } catch (err) {
      error.value = err.response?.data?.error || err.response?.data?.message || 'Invalid email or password'
      return false
    } finally {
      loading.value = false
    }
  }

  const loginWithMicrosoft = async () => {
    try {
      loading.value = true
      error.value = null
      
      const response = await api.get('/auth/microsoft')
      
      if (response.data.success && response.data.authUrl) {
        // Redirect to Microsoft login
        window.location.href = response.data.authUrl
      } else {
        throw new Error('Failed to get Microsoft auth URL')
      }
    } catch (err) {
      console.error('Microsoft login failed:', err)
      error.value = err.response?.data?.message || err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const linkTeamsAccount = async () => {
    try {
      loading.value = true
      error.value = null
      
      // Get MS Teams auth URL
      const response = await api.get('/auth/link-teams')
      
      if (response.data.success && response.data.authUrl) {
        // Store a flag to know we're linking Teams
        sessionStorage.setItem('linkingTeams', 'true')
        
        // Redirect to Microsoft login (will redirect back to /auth/teams-callback)
        window.location.href = response.data.authUrl
      } else {
        throw new Error('Failed to get MS Teams auth URL')
      }
    } catch (err) {
      console.error('MS Teams linking failed:', err)
      error.value = err.response?.data?.message || err.message
      loading.value = false
      throw err
    }
  }

  return {
    user,
    token,
    loading,
    error,
    initialized,
    isAuthenticated,
    initializeAuth,
    setToken,
    getCurrentUser,
    logout,
    login,
    loginWithMicrosoft,
    linkTeamsAccount
  }
})
