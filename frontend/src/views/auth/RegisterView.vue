<template>
  <div class="register-view">
    <Card class="register-card">
      <template #header>
        <h1 class="text-center">Register</h1>
        <p class="text-center text-muted">Create a new account</p>
      </template>
      
      <template #content>
        <form @submit.prevent="handleRegister">
          <div class="field">
            <label for="name">Full Name</label>
            <InputText 
              id="name" 
              v-model="formData.name" 
              placeholder="Enter your full name"
              class="w-full"
              required
            />
          </div>
          
          <div class="field">
            <label for="email">Email</label>
            <InputText 
              id="email" 
              v-model="formData.email" 
              type="email"
              placeholder="Enter your email"
              class="w-full"
              required
            />
          </div>
          
          <div class="field">
            <label for="password">Password</label>
            <Password 
              id="password" 
              v-model="formData.password" 
              placeholder="Enter your password"
              toggleMask
              class="w-full"
              inputClass="w-full"
              required
            />
          </div>
          
          <div class="field">
            <label for="department">Department (Optional)</label>
            <InputText 
              id="department" 
              v-model="formData.department" 
              placeholder="Your department"
              class="w-full"
            />
          </div>
          
          <div class="field">
            <label for="position">Position (Optional)</label>
            <InputText 
              id="position" 
              v-model="formData.position" 
              placeholder="Your position"
              class="w-full"
            />
          </div>
          
          <Button 
            type="submit" 
            label="Register" 
            class="w-full"
            :loading="authStore.loading"
          />
        </form>
        
        <div class="text-center mt-3">
          <router-link to="/login" class="text-primary">
            Already have an account? Login
          </router-link>
        </div>
      </template>
    </Card>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import { useAuthStore } from '@/stores/auth'
import Card from 'primevue/card'
import InputText from 'primevue/inputtext'
import Password from 'primevue/password'
import Button from 'primevue/button'

const router = useRouter()
const toast = useToast()
const authStore = useAuthStore()

const formData = ref({
  name: '',
  email: '',
  password: '',
  department: '',
  position: ''
})

const handleRegister = async () => {
  const success = await authStore.register(formData.value)
  
  if (success) {
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Registration successful',
      life: 3000
    })
    router.push('/')
  } else {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: authStore.error || 'Registration failed',
      life: 3000
    })
  }
}
</script>

<style scoped>
.register-view {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 1rem;
}

.register-card {
  width: 100%;
  max-width: 500px;
}

.field {
  margin-bottom: 1.5rem;
}

.field label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
}

.w-full {
  width: 100%;
}

.text-center {
  text-align: center;
}

.text-primary {
  color: var(--primary-color);
  text-decoration: none;
}

.text-primary:hover {
  text-decoration: underline;
}
</style>
