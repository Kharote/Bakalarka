/**
 * Composable for auto-logout after inactivity.
 * Listens for user activity events and logs out after the configured timeout.
 */
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'

const ACTIVITY_EVENTS = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click']
const STORAGE_KEY = 'autoLogout_lastActivity'
const CHECK_INTERVAL = 30_000 // check every 30s

// Shared state across components
let initialized = false
let timer = null
let listeners = []

export function useAutoLogout() {
  const authStore = useAuthStore()
  const router = useRouter()
  const timeoutMinutes = ref(parseInt(localStorage.getItem('sessionTimeout') || '60', 10))
  const remaining = ref(timeoutMinutes.value * 60)

  function getTimeoutMs() {
    return timeoutMinutes.value * 60 * 1000
  }

  function recordActivity() {
    const now = Date.now()
    localStorage.setItem(STORAGE_KEY, String(now))
  }

  function getLastActivity() {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? parseInt(stored, 10) : Date.now()
  }

  function doLogout() {
    cleanup()
    console.log('⏰ Auto-logout: session timed out due to inactivity')
    authStore.logout()
    router.push('/login')
  }

  function checkInactivity() {
    if (!authStore.isAuthenticated) return

    const elapsed = Date.now() - getLastActivity()
    const timeout = getTimeoutMs()
    remaining.value = Math.max(0, Math.round((timeout - elapsed) / 1000))

    if (elapsed >= timeout) {
      doLogout()
    }
  }

  function onActivity() {
    recordActivity()
    remaining.value = timeoutMinutes.value * 60
  }

  function setTimeoutMinutes(minutes) {
    timeoutMinutes.value = minutes
    localStorage.setItem('sessionTimeout', String(minutes))
    recordActivity() // reset timer on change
  }

  function setup() {
    if (initialized) return
    initialized = true

    recordActivity()

    // Listen for user activity
    ACTIVITY_EVENTS.forEach(evt => {
      const handler = () => onActivity()
      document.addEventListener(evt, handler, { passive: true })
      listeners.push({ evt, handler })
    })

    // Listen for activity in other tabs
    const storageHandler = (e) => {
      if (e.key === STORAGE_KEY) {
        remaining.value = timeoutMinutes.value * 60
      }
    }
    window.addEventListener('storage', storageHandler)
    listeners.push({ evt: 'storage', handler: storageHandler, target: window })

    // Periodic check 
    timer = setInterval(checkInactivity, CHECK_INTERVAL)
  }

  function cleanup() {
    initialized = false
    if (timer) {
      clearInterval(timer)
      timer = null
    }
    listeners.forEach(({ evt, handler, target }) => {
      ;(target || document).removeEventListener(evt, handler)
    })
    listeners = []
  }

  return {
    timeoutMinutes,
    remaining,
    setup,
    cleanup,
    setTimeoutMinutes
  }
}
