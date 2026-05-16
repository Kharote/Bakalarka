import { createApp } from 'vue'
import { createPinia } from 'pinia'
import PrimeVue from 'primevue/config'
import ToastService from 'primevue/toastservice'
import ConfirmationService from 'primevue/confirmationservice'
import Tooltip from 'primevue/tooltip'

import App from './App.vue'
import router from './router'

// PrimeVue styles (theme will be loaded dynamically)
import 'primevue/resources/primevue.min.css'
import 'primeicons/primeicons.css'
import './assets/main.css'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.use(PrimeVue)
app.use(ToastService)
app.use(ConfirmationService)

app.directive('tooltip', Tooltip)

// Initialize auth state before mounting
import { useAuthStore } from '@/stores/auth'
import { useLocale } from '@/composables/useLocale'
import { useTheme } from '@/composables/useTheme'

const initApp = async () => {
  const authStore = useAuthStore()
  const { setLocale } = useLocale()
  const { loadTheme, setupAutoThemeListener } = useTheme()
  
  // Initialize theme from localStorage
  loadTheme()
  setupAutoThemeListener()
  
  // Initialize locale from localStorage
  const savedLocale = localStorage.getItem('locale') || 'en'
  setLocale(savedLocale)
  
  // Check if user is already authenticated (from localStorage token)
  if (authStore.token) {
    try {
      await authStore.checkAuth()
    } catch (error) {
      console.log('Auth initialization failed:', error)
      // Clear invalid token
      authStore.logout()
    }
  }
  
  app.mount('#app')
}

initApp()
