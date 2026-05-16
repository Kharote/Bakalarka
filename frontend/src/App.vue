<template>
  <div id="app">
    <Toast />
    <ConfirmDialog />
    
    <div v-if="!authStore.isAuthenticated" class="auth-layout">
      <router-view />
    </div>
    
    <div v-else class="app-layout">
      <AppHeader />
      <div class="app-content">
        <AppSidebar />
        <main class="main-content">
          <SystemAlerts />
          <router-view />
        </main>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useAutoLogout } from '@/composables/useAutoLogout'
import AppHeader from '@/components/layout/AppHeader.vue'
import AppSidebar from '@/components/layout/AppSidebar.vue'
import SystemAlerts from '@/components/layout/SystemAlerts.vue'
import Toast from 'primevue/toast'
import ConfirmDialog from 'primevue/confirmdialog'

const authStore = useAuthStore()
const { setup: setupAutoLogout, cleanup: cleanupAutoLogout } = useAutoLogout()

// Start / stop auto-logout based on auth state
watch(() => authStore.isAuthenticated, (authenticated) => {
  if (authenticated) {
    setupAutoLogout()
  } else {
    cleanupAutoLogout()
  }
}, { immediate: true })
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: var(--font-family);
  background-color: var(--bg-secondary);
}

.auth-layout {
  min-height: 100vh;
}

.app-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: var(--bg-secondary);
}

.app-content {
  display: flex;
  flex: 1;
  position: relative;
  height: calc(100vh - var(--header-height));
}

.main-content {
  flex: 1;
  padding: var(--space-8);
  overflow-y: auto;
  max-width: 100%;
}

/* Responsive adjustments */
@media (max-width: 1024px) {
  .main-content {
    padding: 1.5rem;
  }
}

@media (max-width: 768px) {
  .main-content {
    padding: 1rem;
  }
}

@media (max-width: 480px) {
  .main-content {
    padding: 0.75rem;
  }
}

/* ConfirmDialog Custom Styling - Match design system */
.p-confirm-dialog {
  border-radius: 16px !important;
  border: none !important;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25) !important;
  background: white !important;
  overflow: hidden !important;
  max-width: 400px !important;
}

.p-confirm-dialog .p-dialog-header {
  background: white !important;
  border-bottom: 1px solid #e5e7eb !important;
  padding: 24px 24px 16px 24px !important;
  border-radius: 16px 16px 0 0 !important;
}

.p-confirm-dialog .p-dialog-header .p-dialog-title {
  font-size: 1.125rem !important;
  font-weight: 700 !important;
  color: #111827 !important;
  margin: 0 !important;
}

.p-confirm-dialog .p-dialog-header .p-dialog-header-icon {
  font-size: 1.25rem !important;
  color: #f59e0b !important;
  margin-right: 12px !important;
}

.p-confirm-dialog .p-dialog-content {
  padding: 16px 24px !important;
  background: white !important;
  border: none !important;
}

.p-confirm-dialog .p-confirm-dialog-message {
  font-size: 0.875rem !important;
  color: #6b7280 !important;
  line-height: 1.5 !important;
  margin: 0 !important;
}

.p-confirm-dialog .p-dialog-footer {
  padding: 16px 24px 24px 24px !important;
  background: white !important;
  border-top: 1px solid #e5e7eb !important;
  border-radius: 0 0 16px 16px !important;
  display: flex !important;
  gap: 12px !important;
  justify-content: flex-end !important;
}

.p-confirm-dialog .p-dialog-footer .p-button {
  font-size: 0.875rem !important;
  font-weight: 600 !important;
  padding: 10px 20px !important;
  border-radius: 8px !important;
  border: none !important;
  transition: all 0.2s ease !important;
}

.p-confirm-dialog .p-dialog-footer .p-button.p-button-secondary {
  background: #f3f4f6 !important;
  color: #374151 !important;
}

.p-confirm-dialog .p-dialog-footer .p-button.p-button-secondary:hover {
  background: #e5e7eb !important;
  color: #111827 !important;
}

.p-confirm-dialog .p-dialog-footer .p-button.p-button-danger {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%) !important;
  color: white !important;
}

.p-confirm-dialog .p-dialog-footer .p-button.p-button-danger:hover {
  background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%) !important;
  transform: translateY(-1px) !important;
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3) !important;
}

.p-confirm-dialog .p-dialog-footer .p-button:focus {
  outline: none !important;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.5) !important;
}
</style>
