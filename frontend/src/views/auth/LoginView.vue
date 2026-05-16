<template>
  <div class="login-container">
    <div class="login-card">
      <div class="login-header">
        <div class="logo-container">
          <i class="pi pi-box" style="font-size: 3rem; color: var(--primary);"></i>
        </div>
        <h1>AI Project Management</h1>
        <p class="subtitle">
          {{ localAuthEnabled ? 'Sign in to continue' : 'Sign in with your Microsoft account to continue' }}
        </p>
      </div>
      
      <div class="login-content">
        <!-- Local email/password form (only when VITE_ENABLE_LOCAL_AUTH=true) -->
        <template v-if="localAuthEnabled">
          <div class="local-form">
            <div class="field">
              <label for="email">Email</label>
              <InputText
                id="email"
                v-model="email"
                type="email"
                placeholder="your@email.com"
                class="w-full"
                @keyup.enter="handleLogin"
              />
            </div>
            <div class="field">
              <label for="password">Password</label>
              <Password
                id="password"
                v-model="password"
                placeholder="Password"
                :feedback="false"
                toggleMask
                class="w-full"
                inputClass="w-full"
                @keyup.enter="handleLogin"
              />
            </div>
            <Button
              label="Sign in"
              icon="pi pi-sign-in"
              class="login-button"
              :loading="authStore.loading"
              @click="handleLogin"
            />
          </div>

          <Divider align="center">
            <span class="divider-text">or</span>
          </Divider>
        </template>

        <Button 
          label="Sign in with Microsoft" 
          icon="pi pi-microsoft"
          class="sso-button"
          :loading="authStore.loading"
          @click="handleMicrosoftLogin"
        />
        
        <div v-if="authStore.error" class="error-message">
          <i class="pi pi-exclamation-triangle"></i>
          <span>{{ authStore.error }}</span>
        </div>
        
        <div class="info-text">
          <i class="pi pi-info-circle"></i>
          <span>This app uses Microsoft Azure AD for authentication</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import { useAuthStore } from '@/stores/auth'
import InputText from 'primevue/inputtext'
import Password from 'primevue/password'
import Button from 'primevue/button'
import Divider from 'primevue/divider'

const router = useRouter()
const toast = useToast()
const authStore = useAuthStore()

const localAuthEnabled = import.meta.env.VITE_ENABLE_LOCAL_AUTH === 'true'

const email = ref('')
const password = ref('')

const handleLogin = async () => {
  const success = await authStore.login({
    email: email.value,
    password: password.value
  })
  
  if (success) {
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Login successful',
      life: 3000
    })
    router.push('/')
  } else {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: authStore.error || 'Login failed',
      life: 3000
    })
  }
}

const handleMicrosoftLogin = async () => {
  try {
    await authStore.loginWithMicrosoft()
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Authentication Error',
      detail: authStore.error || 'Failed to initiate Microsoft login. Please check if Azure AD is configured.',
      life: 5000
    })
  }
}
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #6366F1 0%, #8B5CF6 50%, #EC4899 100%);
  padding: 1.5rem;
}

.login-card {
  background: white;
  border-radius: 1.5rem;
  padding: 3rem 2.5rem;
  max-width: 440px;
  width: 100%;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  animation: slideUp 0.4s ease-out;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.login-header {
  text-align: center;
  margin-bottom: 2.5rem;
}

.logo-container {
  display: flex;
  justify-content: center;
  margin-bottom: 1.5rem;
}

.login-header h1 {
  font-size: 1.875rem;
  font-weight: 800;
  color: var(--gray-900);
  margin-bottom: 0.5rem;
  letter-spacing: -0.02em;
}

.subtitle {
  font-size: 0.9375rem;
  color: var(--gray-600);
  line-height: 1.5;
  margin: 0;
}

.login-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.sso-button {
  width: 100%;
  padding: 0.875rem 1.5rem;
  font-size: 1rem;
  font-weight: 600;
  border-radius: 0.75rem;
  background: #00A4EF !important;
  border: none !important;
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(0, 164, 239, 0.3);
}

.sso-button:hover:not(:disabled) {
  background: #0078D4 !important;
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(0, 164, 239, 0.4);
}

.sso-button:active {
  transform: translateY(0);
}

.error-message {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  background: #FEE2E2;
  border: 1px solid #FCA5A5;
  border-radius: 0.75rem;
  color: #991B1B;
  font-size: 0.875rem;
  animation: shake 0.4s ease;
}

.error-message i {
  font-size: 1.25rem;
  color: #DC2626;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-5px); }
  75% { transform: translateX(5px); }
}

.info-text {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  justify-content: center;
  font-size: 0.8125rem;
  color: var(--gray-500);
  padding: 1rem;
  background: var(--gray-50);
  border-radius: 0.5rem;
}

.info-text i {
  font-size: 1rem;
  color: var(--primary);
}

.local-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.field label {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--gray-700);
}

.login-button {
  width: 100%;
  padding: 0.875rem 1.5rem;
  font-size: 1rem;
  font-weight: 600;
  border-radius: 0.75rem;
  transition: all 0.2s ease;
}

.divider-text {
  font-size: 0.8125rem;
  color: var(--gray-400);
  padding: 0 0.5rem;
}

@media (max-width: 480px) {
  .login-card {
    padding: 2rem 1.5rem;
  }
  
  .login-header h1 {
    font-size: 1.5rem;
  }
  
  .subtitle {
    font-size: 0.875rem;
  }
}
</style>
