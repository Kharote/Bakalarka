<template>
  <div class="auth-callback">
    <div v-if="loading" class="auth-loading">
      <ProgressSpinner />
      <p>{{ loadingMessage }}</p>
    </div>
    
    <div v-if="error" class="auth-error">
      <i class="pi pi-exclamation-triangle"></i>
      <h3>Authentication Failed</h3>
      <p>{{ error }}</p>
      <Button label="Try Again" @click="goToLogin" class="p-button-outlined" />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import ProgressSpinner from 'primevue/progressspinner'
import Button from 'primevue/button'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const loading = ref(true)
const error = ref(null)
const loadingMessage = ref('Authenticating...')

const goToLogin = () => {
  router.push('/login')
}

const handleAuthCallback = async () => {
  try {
    console.log('🔄 Starting auth callback handling...');
    console.log('🔍 URL query params:', route.query);
    
    const token = route.query.token
    const errorParam = route.query.error
    
    // Check for OAuth errors first
    if (errorParam) {
      console.error('❌ OAuth error received:', errorParam);
      throw new Error(`Authentication failed: ${decodeURIComponent(errorParam)}`)
    }
    
    // Handle token from URL
    if (token) {
      console.log('✅ Token found in URL, setting up session...');
      loadingMessage.value = 'Setting up your session...'
      
      // Store token in localStorage AND auth store
      localStorage.setItem('token', token)
      authStore.setToken(token)
      
      // Fetch user data to complete authentication
      loadingMessage.value = 'Loading your profile...'
      await authStore.getCurrentUser()
      
      // Success - redirect to home page
      loadingMessage.value = 'Authentication complete!'
      console.log('🚀 Redirecting to dashboard...')
      
      // Immediate redirect to dashboard
      await router.push('/')
      console.log('✅ Navigation to dashboard completed')
      
    } else {
      console.log('❌ No token found in URL');
      throw new Error('No authentication token received. Please try logging in again.')
    }
    
  } catch (err) {
    console.error('❌ Auth callback error:', err);
    error.value = err.message
    loading.value = false
  }
}

onMounted(() => {
  handleAuthCallback()
})
</script>

<style scoped>
.auth-callback {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.auth-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  background: white;
  padding: 3rem 2rem;
  border-radius: 12px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  text-align: center;
}

.auth-loading p {
  color: #666;
  font-size: 1.1rem;
  margin: 0;
}

.auth-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  background: white;
  padding: 3rem 2rem;
  border-radius: 12px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  text-align: center;
  max-width: 400px;
}

.auth-error i {
  font-size: 3rem;
  color: #dc3545;
}

.auth-error h3 {
  color: #333;
  margin: 0;
  font-size: 1.5rem;
}

.auth-error p {
  color: #666;
  margin: 0;
  line-height: 1.5;
}
</style>
