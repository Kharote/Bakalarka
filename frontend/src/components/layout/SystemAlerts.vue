<template>
  <div class="system-alerts">
    <!-- MS Teams Integration Alert -->
    <div 
      v-if="showTeamsAlert" 
      class="alert-banner alert-warning"
    >
      <div class="alert-content">
        <i class="pi pi-exclamation-triangle alert-icon"></i>
        <div class="alert-text">
          <strong>Microsoft Teams Integration Required</strong>
          <p>Link your Microsoft Teams account to use AI project features and team collaboration.</p>
        </div>
        <button 
          @click="linkTeamsAccount"
          :disabled="linkingTeams"
          class="alert-button"
        >
          <i class="pi pi-link" v-if="!linkingTeams"></i>
          <i class="pi pi-spin pi-spinner" v-else></i>
          <span>Link MS Teams</span>
        </button>
      </div>
    </div>

    <!-- Add more system alerts here as needed -->
    <!-- Example critical alert:
    <div class="alert-banner alert-critical">
      ...
    </div>
    -->
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useToast } from 'primevue/usetoast'
import { useRouter, useRoute } from 'vue-router'

const authStore = useAuthStore()
const toast = useToast()
const router = useRouter()
const route = useRoute()
const linkingTeams = ref(false)

const showTeamsAlert = computed(() => {
  return false
})

const linkTeamsAccount = async () => {
  try {
    linkingTeams.value = true
    await authStore.linkTeamsAccount()
    // Redirect happens in store, so this won't execute
  } catch (error) {
    console.error('Error linking MS Teams:', error)
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.response?.data?.message || 'Failed to link Microsoft Teams account',
      life: 5000
    })
    linkingTeams.value = false
  }
}

// Handle MS Teams linking callback on any page
onMounted(async () => {
  const teamsLinked = route.query['teams-linked']
  
  if (teamsLinked === 'success') {
    // Refresh user data to update msTeamsUserId
    await authStore.getCurrentUser()
    
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Microsoft Teams account linked successfully!',
      life: 5000
    })
    
    // Clean up URL parameter
    const cleanQuery = { ...route.query }
    delete cleanQuery['teams-linked']
    router.replace({ query: cleanQuery })
  } else if (teamsLinked === 'error') {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to link Microsoft Teams account. Please try again.',
      life: 5000
    })
    
    // Clean up URL parameter
    const cleanQuery = { ...route.query }
    delete cleanQuery['teams-linked']
    router.replace({ query: cleanQuery })
  }
})
</script>

<style scoped>
.system-alerts {
  width: 100%;
}

.alert-banner {
  padding: 16px 20px 16px 24px;
  border-radius: 12px;
  margin-bottom: 24px;
  border-left: 4px solid;
  background: var(--color-bg-primary);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.alert-warning {
  border-left-color: #f59e0b;
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.05) 0%, rgba(245, 158, 11, 0.02) 100%);
}

.alert-critical {
  border-left-color: #ef4444;
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.05) 0%, rgba(239, 68, 68, 0.02) 100%);
}

.alert-content {
  display: flex;
  align-items: center;
  gap: 16px;
  width: 100%;
}

.alert-icon {
  font-size: 1.75rem;
  flex-shrink: 0;
  margin-left: 4px;
}

.alert-warning .alert-icon {
  color: #f59e0b;
}

.alert-critical .alert-icon {
  color: #ef4444;
}

.alert-text {
  flex: 1;
  min-width: 0;
}

.alert-text strong {
  display: block;
  margin-bottom: 4px;
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text-primary);
}

.alert-text p {
  margin: 0;
  font-size: 0.9rem;
  line-height: 1.5;
  color: var(--color-text-secondary);
}

.alert-button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: white;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
  box-shadow: 0 2px 4px rgba(59, 130, 246, 0.2);
}

.alert-button:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(59, 130, 246, 0.3);
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
}

.alert-button:active:not(:disabled) {
  transform: translateY(0);
  box-shadow: 0 2px 4px rgba(59, 130, 246, 0.2);
}

.alert-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.alert-button i {
  font-size: 1rem;
}

@media (max-width: 768px) {
  .alert-banner {
    padding: 14px 16px 14px 20px;
  }
  
  .alert-content {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .alert-icon {
    margin-left: 0;
  }
  
  .alert-button {
    width: 100%;
    justify-content: center;
  }
}
</style>
