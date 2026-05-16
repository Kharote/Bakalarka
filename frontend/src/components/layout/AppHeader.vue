<template>
  <header class="app-header">
    <div class="header-left">
      <h2 class="app-title">AI Project Management</h2>
    </div>
    
    <div class="header-right">
      <!-- Notifications -->
      <div class="notification-wrapper">
        <Button 
          icon="pi pi-bell" 
          class="p-button-rounded p-button-text header-action-btn"
          :class="{ 'ws-connected': websocketConnected, 'ws-disconnected': !websocketConnected }"
          :badge="unreadCount > 0 ? unreadCount.toString() : null"
          badgeSeverity="danger"
          @click="toggleNotifications"
        />
        
        <!-- Custom notification dropdown -->
        <OverlayPanel 
          ref="notificationMenu" 
          class="notification-dropdown"
          :showCloseIcon="false"
          :dismissable="true"
          :autoZIndex="true"
          appendTo="self"
        >
          <div class="notification-panel">
            <div class="notification-header">
              <span class="notification-header-title">Notifications</span>
              <div class="notification-header-actions">
                <button class="notif-action-btn mark-read-btn" @click="markAllRead">
                  <i class="pi pi-check-circle"></i>
                  <span>Mark all read</span>
                </button>
                <button class="notif-action-btn clear-btn" @click="clearAllNotifications">
                  <i class="pi pi-trash"></i>
                  <span>Clear</span>
                </button>
              </div>
            </div>
            
            <div class="notification-list" v-if="notifications.length > 0">
              <div 
                v-for="notification in notifications" 
                :key="notification.id"
                class="notification-item" 
                :class="{ 'unread': !notification.isRead }" 
                @click="handleNotificationClick(notification)"
              >
                <div class="notification-icon">
                  <i :class="notification.icon" :style="{ color: notification.color }"></i>
                </div>
                <div class="notification-content">
                  <div class="notification-title">{{ notification.title }}</div>
                  <div class="notification-time">{{ formatNotificationTime(notification.createdAt) }}</div>
                </div>
                <div v-if="!notification.isRead" class="unread-dot"></div>
              </div>
            </div>
            
            <div class="notification-empty" v-else>
              <i class="pi pi-bell text-lg text-gray-400"></i>
              <p class="text-gray-500 text-xs mt-1">No notifications</p>
            </div>
          </div>
        </OverlayPanel>
      </div>
      
      <!-- User Menu -->
      <div class="user-menu-wrapper">
        <Button 
          class="header-user-btn"
          @click="toggleUserMenu"
        >
          <div class="user-button-content">
            <div class="user-avatar">
              <img v-if="authStore.user?.profilePicture" 
                   :src="authStore.user.profilePicture" 
                   :alt="authStore.user?.name"
                   @error="handleImageError" />
              <i v-else class="pi pi-user"></i>
            </div>
            <span class="user-name">{{ authStore.user?.name || 'User' }}</span>
          </div>
        </Button>
        <Menu ref="userMenu" :model="userMenuItems" :popup="true" class="user-menu" />
      </div>
    </div>
  </header>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useProjectStore } from '@/stores/project'
import { useToast } from 'primevue/usetoast'
import { notificationAPI, profileAPI } from '@/services/api'
import websocketService from '@/services/websocketService'
import Button from 'primevue/button'
import Menu from 'primevue/menu'
import OverlayPanel from 'primevue/overlaypanel'

const router = useRouter()
const authStore = useAuthStore()
const projectStore = useProjectStore()
const toast = useToast()

const userMenu = ref()
const notificationMenu = ref()
const notifications = ref([])
const notificationsLoading = ref(false)
const unreadCount = ref(0)
const websocketConnected = ref(websocketService.connected)

const userMenuItems = ref([
  {
    label: 'Profile',
    icon: 'pi pi-user',
    command: () => router.push('/profile')
  },
  {
    label: 'Settings',
    icon: 'pi pi-cog',
    command: () => router.push('/settings')
  },
  {
    separator: true
  },
  {
    label: 'Logout',
    icon: 'pi pi-sign-out',
    command: () => {
      authStore.logout()
      router.push('/login')
    }
  }
])

const notificationItems = computed(() => notifications.value.map(notif => ({
  id: notif.id,
  label: notif.title,
  icon: notif.icon,
  color: notif.color,
  time: notif.timeAgo,
  isRead: notif.isRead,
  priority: notif.priority
})))

const toggleUserMenu = async (event) => {
  await nextTick()
  if (userMenu.value && userMenu.value.toggle) {
    userMenu.value.toggle(event)
  } else {
    console.warn('User menu ref not available after nextTick')
  }
}

const toggleNotifications = async (event) => {
  if (notificationMenu.value && notificationMenu.value.toggle) {
    notificationMenu.value.toggle(event)
    await loadNotifications()
  } else {
    console.warn('Notification menu ref not available')
  }
}

const loadNotifications = async () => {
  try {
    notificationsLoading.value = true
    const response = await notificationAPI.getNotifications({ limit: 10 })
    
    if (response.data.success) {
      notifications.value = response.data.notifications
      unreadCount.value = response.data.unreadCount
    }
  } catch (error) {
    console.error('Error loading notifications:', error)
  } finally {
    notificationsLoading.value = false
  }
}

const markAllRead = async () => {
  try {
    await notificationAPI.markAllAsRead()
    notifications.value.forEach(n => n.isRead = true)
    unreadCount.value = 0
    toast.add({
      severity: 'success',
      summary: 'All marked as read',
      life: 2000
    })
  } catch (error) {
    console.error('Error marking all as read:', error)
  }
}

const clearAllNotifications = async () => {
  try {
    // Call the API to clear all notifications
    await notificationAPI.clearAllNotifications()
    
    // Clear all notifications from the list
    notifications.value = []
    unreadCount.value = 0
    
    toast.add({
      severity: 'info',
      summary: 'All notifications cleared',
      life: 2000
    })
    
    // Hide the dropdown
    notificationMenu.value.hide()
    
  } catch (error) {
    console.error('Error clearing notifications:', error)
    toast.add({
      severity: 'error',
      summary: 'Error clearing notifications',
      life: 3000
    })
  }
}

const formatNotificationTime = (timestamp) => {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

const handleNotificationClick = async (notification) => {
  // Mark notification as read
  await markAsRead(notification.id)
  
  // Handle different notification types
  if (notification.type === 'ai_suggestion_ready' && notification.data?.suggestionId) {
    // Navigate to AI suggestions view
    router.push(`/ai-suggestions/${notification.data.suggestionId}`)
    notificationMenu.value.hide()
  } else {
    // For other notifications, just mark as read
    console.log('Notification clicked:', notification)
  }
}

const handleImageError = async (event) => {
  console.log('Profile image failed to load, attempting refresh...')
  try {
    const response = await profileAPI.refreshPhoto()
    if (response.data?.profilePicture) {
      authStore.user.profilePicture = response.data.profilePicture
      // Force re-render by updating the src
      event.target.src = response.data.profilePicture
    } else {
      // Hide broken image and show fallback icon
      event.target.style.display = 'none'
    }
  } catch (error) {
    console.log('Could not refresh profile photo:', error.message)
    // Hide broken image and show fallback icon
    event.target.style.display = 'none'
  }
}

const getNotificationSeverity = (type) => {
  const severityMap = {
    'task_assigned': 'info',
    'task_completed': 'success',
    'project_invitation': 'info',
    'deadline_approaching': 'warn',
    'team_member_joined': 'info',
    'project_updated': 'info',
    'ai_suggestion_ready': 'success',
    'ai_suggestion_failed': 'error'
  }
  return severityMap[type] || 'info'
}

const markAsRead = async (notificationId) => {
  try {
    await notificationAPI.markAsRead(notificationId)
    const notif = notifications.value.find(n => n.id === notificationId)
    if (notif && !notif.isRead) {
      notif.isRead = true
      unreadCount.value = Math.max(0, unreadCount.value - 1)
    }
    
    // Notify WebSocket service
    websocketService.markNotificationRead(notificationId)
  } catch (error) {
    console.error('Error marking as read:', error)
  }
}

onMounted(() => {
  loadNotifications()
  
  // Listen for new notifications (connection is handled by auth store)
  websocketService.on('notification:new', (notification) => {
    console.log('Received real-time notification:', notification)
    
    // Show toast notification
    toast.add({
      severity: getNotificationSeverity(notification.type),
      summary: notification.title || 'New Notification',
      detail: notification.message || '',
      life: 6000
    })
    
    // Add to notifications array
    notifications.value.unshift({
      ...notification,
      timeAgo: 'Just now'
    })
    
    // Update unread count
    if (!notification.isRead) {
      unreadCount.value++
    }
    
    // Limit notifications in memory (keep only latest 50)
    if (notifications.value.length > 50) {
      notifications.value = notifications.value.slice(0, 50)
    }
  })
  
  // Listen for broadcast notifications
  websocketService.on('notification:broadcast', (notification) => {
    console.log('Received broadcast notification:', notification)
    
    // Show toast notification
    toast.add({
      severity: getNotificationSeverity(notification.type),
      summary: notification.title || 'System Notification',
      detail: notification.message || '',
      life: 6000
    })
    
    notifications.value.unshift({
      ...notification,
      timeAgo: 'Just now'
    })
    if (!notification.isRead) {
      unreadCount.value++
    }
  })

  // Listen for AI suggestion ready notifications
  websocketService.on('ai_suggestion_ready', (data) => {
    console.log('AI suggestion ready:', data)
    
    // Create notification for AI suggestion
    const notification = {
      id: Date.now(),
      title: 'AI Analysis Complete',
      message: data.message,
      type: 'ai_suggestion_ready',
      isRead: false,
      createdAt: data.timestamp,
      data: data
    }
    
    notifications.value.unshift(notification)
    unreadCount.value++
    
    // Show toast notification
    toast.add({
      severity: 'success',
      summary: 'AI Analysis Ready',
      detail: data.message,
      life: 8000
    })
  })
  
  // Handle connection status
  websocketService.on('connected', () => {
    console.log('WebSocket connected')
    websocketConnected.value = true
  })
  
  websocketService.on('disconnected', () => {
    console.log('WebSocket disconnected')
    websocketConnected.value = false
  })
  
  websocketService.on('error', (error) => {
    console.error('WebSocket error:', error)
  })
})

onUnmounted(() => {
  // Clean up WebSocket listeners
  websocketService.off('notification:new')
  websocketService.off('notification:broadcast')
  websocketService.off('ai_suggestion_ready')
  websocketService.off('connected')
  websocketService.off('disconnected')
  websocketService.off('error')
})
</script>

<style scoped>
.app-header {
  background: var(--color-bg-primary, rgba(255, 255, 255, 0.98));
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--color-border, #e5e7eb);
  padding: 0 32px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 64px;
  position: sticky;
  top: 0;
  z-index: 100;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
  transition: all 0.2s ease;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.app-title {
  margin: 0;
  background: linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  font-size: 1.25rem;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.notification-wrapper,
.user-menu-wrapper {
  position: relative;
}

.header-action-btn {
  width: 40px !important;
  height: 40px !important;
  position: relative !important;
  box-shadow: none !important;
  outline: none !important;
  background: transparent !important;
  border: none !important;
  color: #374151 !important;
}

.header-action-btn:hover {
  background: #f3f4f6 !important;
}

.header-action-btn :deep(.p-button-icon) {
  color: #374151 !important;
  font-size: 1.15rem !important;
}

.header-action-btn:focus,
.header-action-btn:active,
.header-action-btn:focus-visible {
  box-shadow: none !important;
  outline: none !important;
}

/* Custom notification badge styling */
.header-action-btn :deep(.p-badge) {
  position: absolute !important;
  top: 2px !important;
  right: 2px !important;
  min-width: 20px !important;
  height: 20px !important;
  line-height: 20px !important;
  padding: 0 6px !important;
  font-size: 11px !important;
  font-weight: 600 !important;
  border-radius: 12px !important;
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%) !important;
  color: white !important;
  border: 2.5px solid var(--color-bg-primary, white) !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
}

.header-user-btn {
  font-weight: 600 !important;
  color: var(--color-text-primary, #374151) !important;
  background: transparent !important;
  border: 1px solid var(--color-border, #e5e7eb) !important;
}

.header-user-btn:hover {
  background: var(--color-bg-tertiary, #f3f4f6) !important;
}

:deep(.p-menu) {
  background: var(--color-bg-primary, white) !important;
  border-radius: 12px !important;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04) !important;
  border: 1px solid var(--color-border, transparent) !important;
  padding: 8px !important;
  margin-top: 8px !important;
  overflow: hidden !important;
  min-width: 200px !important;
}

:deep(.p-menu-list) {
  padding: 0 !important;
  margin: 0 !important;
}

:deep(.p-menuitem) {
  margin: 0 !important;
}

:deep(.p-menuitem-link) {
  padding: 12px 16px !important;
  border-radius: 8px !important;
  transition: all 0.2s ease !important;
  color: var(--color-text-primary, #374151) !important;
  font-weight: 500 !important;
  font-size: 14px !important;
  margin: 2px 4px !important;
  display: flex !important;
  align-items: center !important;
}

:deep(.p-menuitem-link:hover) {
  background: var(--color-bg-tertiary, #f3f4f6) !important;
  color: var(--color-text-primary, #111827) !important;
}

:deep(.p-menuitem-link:focus) {
  background: var(--color-bg-tertiary, #f3f4f6) !important;
  color: var(--color-text-primary, #111827) !important;
  box-shadow: none !important;
}

:deep(.p-menuitem-icon) {
  color: var(--color-text-secondary, #6b7280) !important;
  margin-right: 12px !important;
  font-size: 16px !important;
  width: 16px !important;
}

:deep(.p-menuitem-text) {
  color: inherit !important;
}

:deep(.p-menu-separator) {
  border-top: 1px solid var(--color-border, #e5e7eb) !important;
  margin: 8px 4px !important;
}

:deep(.user-menu) {
  min-width: 200px !important;
  background: var(--color-bg-primary, white) !important;
  border-radius: 12px !important;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04) !important;
  border: 1px solid var(--color-border, transparent) !important;
  padding: 8px !important;
  margin-top: 8px !important;
  overflow: hidden !important;
}

:deep(.user-menu .p-menu-list) {
  padding: 0 !important;
  margin: 0 !important;
}

:deep(.user-menu .p-menuitem) {
  margin: 0 !important;
}

:deep(.user-menu .p-menuitem-link) {
  padding: 12px 16px !important;
  border-radius: 8px !important;
  transition: all 0.2s ease !important;
  color: var(--color-text-primary, #374151) !important;
  font-weight: 500 !important;
  font-size: 14px !important;
  margin: 2px 4px !important;
  display: flex !important;
  align-items: center !important;
  text-decoration: none !important;
}

:deep(.user-menu .p-menuitem-link:hover) {
  background: var(--color-bg-tertiary, #f8fafc) !important;
  color: var(--color-text-primary, #111827) !important;
}

:deep(.user-menu .p-menuitem-link:focus) {
  background: var(--color-bg-tertiary, #f8fafc) !important;
  color: var(--color-text-primary, #111827) !important;
  box-shadow: none !important;
  outline: none !important;
}

:deep(.user-menu .p-menuitem-icon) {
  color: var(--color-text-secondary, #6b7280) !important;
  margin-right: 12px !important;
  font-size: 16px !important;
  width: 16px !important;
  text-align: center !important;
}

:deep(.user-menu .p-menuitem-text) {
  color: inherit !important;
  font-weight: inherit !important;
}

:deep(.user-menu .p-menu-separator) {
  border-top: 1px solid #e5e7eb !important;
  margin: 8px 4px !important;
  height: 1px !important;
}

:deep(.notification-menu) {
  min-width: 360px !important;
  max-height: 480px !important;
  overflow-y: auto !important;
  background: white !important;
  border-radius: 12px !important;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04) !important;
  border: none !important;
  padding: 0 !important;
  margin-top: 8px !important;
}

:deep(.notification-menu .p-menu-list) {
  padding: 0 !important;
  margin: 0 !important;
}

.menu-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #e5e7eb;
  font-size: 0.9375rem;
  background: white;
  border-radius: 12px 12px 0 0;
}

.menu-header .font-semibold {
  font-weight: 600;
  color: #111827;
  font-size: 1rem;
}

.menu-footer {
  padding: 16px 20px;
  border-top: 1px solid #e5e7eb;
  text-align: center;
  background: white;
  border-radius: 0 0 12px 12px;
}

.menu-footer :deep(.p-button) {
  color: #3b82f6 !important;
  font-weight: 500 !important;
  padding: 8px 0 !important;
}

.notification-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
  background: var(--color-bg-primary, white);
  border-radius: 8px;
  margin: 4px 8px;
  position: relative;
}

.notification-item:hover {
  background: var(--color-bg-tertiary, #f8fafc);
}

.notification-item.unread {
  background-color: var(--color-bg-secondary, #f0f9ff);
  border-left: 3px solid var(--color-primary, #3b82f6);
}

.notification-item.unread:hover {
  background-color: var(--color-bg-tertiary, #e0f2fe);
}

.notification-item i {
  font-size: 1.25rem;
  flex-shrink: 0;
  margin-top: 2px;
}

.notification-content {
  flex: 1;
  min-width: 0;
}

.notification-title {
  font-size: 0.875rem;
  color: var(--color-text-primary, #111827);
  margin-bottom: 4px;
  font-weight: 500;
  line-height: 1.3;
}

.notification-item.unread .notification-title {
  font-weight: 600;
  color: var(--color-text-primary, #1f2937);
}

.notification-time {
  font-size: 0.75rem;
  color: var(--color-text-secondary, #6b7280);
  font-weight: 400;
}

.unread-dot {
  width: 8px;
  height: 8px;
  background: var(--color-primary, #3b82f6);
  border-radius: 50%;
  flex-shrink: 0;
  margin-top: 8px;
}

/* WebSocket connection status via bell color */
.header-action-btn.ws-connected :deep(.p-button-icon) {
  color: #10b981 !important;
}

.header-action-btn.ws-disconnected :deep(.p-button-icon) {
  color: #f59e0b !important; /* Changed from red to amber for better UX */
}

.header-action-btn:not(.ws-connected):not(.ws-disconnected) :deep(.p-button-icon) {
  color: #6b7280 !important;
}

/* User Avatar Styles */
.header-user-btn {
  padding: 8px 12px !important;
  background: transparent !important;
  border: none !important;
  color: #374151 !important;
  border-radius: 8px !important;
  transition: all 0.2s ease !important;
}

.header-user-btn:hover {
  background: #f3f4f6 !important;
}

.user-button-content {
  display: flex;
  align-items: center;
  gap: 8px;
}

.user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #e5e7eb;
  flex-shrink: 0;
}

.user-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.user-avatar i {
  font-size: 16px;
  color: #6b7280;
}

.user-name {
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Notification Dropdown Desktop Styles */
:deep(.p-overlaypanel.notification-dropdown) {
  border-radius: 16px !important;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15) !important;
  border: 1px solid var(--color-border, rgba(0, 0, 0, 0.06)) !important;
  overflow: hidden !important;
  padding: 0 !important;
  z-index: 1000 !important;
  /* Override PrimeVue's viewport-based positioning since appendTo="self" */
  top: 100% !important;
  left: auto !important;
  right: 0 !important;
  margin-top: 8px !important;
}

:deep(.notification-dropdown .p-overlaypanel-content) {
  padding: 0 !important;
}

.notification-panel {
  width: 380px;
  max-height: 520px;
  display: flex;
  flex-direction: column;
  background: var(--color-bg-primary, #ffffff);
  overflow: hidden;
}

.notification-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px 12px;
  border-bottom: 1px solid var(--color-border, #e5e7eb);
  flex-shrink: 0;
}

.notification-header-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-secondary, #6b7280);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.notification-header-actions {
  display: flex;
  gap: 6px;
  align-items: center;
}

.notif-action-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: 20px;
  border: 1px solid var(--color-border, #e5e7eb);
  background: transparent;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
  color: var(--color-text-secondary, #6b7280);
  white-space: nowrap;
}

.notif-action-btn i {
  font-size: 11px;
}

.notif-action-btn.mark-read-btn:hover {
  background: #eff6ff;
  border-color: #3b82f6;
  color: #2563eb;
}

.notif-action-btn.clear-btn:hover {
  background: #fff1f2;
  border-color: #f87171;
  color: #dc2626;
}

.notification-list {
  flex: 1;
  min-height: 0;
  max-height: 420px;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 8px;
  background: var(--color-bg-secondary, #fafbfc);
}

.notification-list::-webkit-scrollbar {
  width: 6px;
}

.notification-list::-webkit-scrollbar-track {
  background: transparent;
}

.notification-list::-webkit-scrollbar-thumb {
  background: var(--color-border, #d0d7de);
  border-radius: 3px;
}

.notification-list::-webkit-scrollbar-thumb:hover {
  background: var(--color-text-tertiary, #afb8c1);
}

.notification-empty {
  text-align: center;
  padding: 48px 20px;
  background: var(--color-bg-secondary, #fafbfc);
}

@media (max-width: 768px) {
  .app-header {
    padding: 0 16px;
    height: 56px;
  }
  
  .app-title {
    font-size: 1.125rem;
  }
  
  .header-user-btn .user-name {
    display: none;
  }
  
  .user-avatar {
    width: 28px;
    height: 28px;
  }
  
  /* Notification Dropdown Styles */
  :deep(.notification-dropdown) {
    width: 280px !important;
    max-width: 280px !important;
    min-width: 280px !important;
  }

  :deep(.notification-dropdown .p-overlaypanel-content) {
    padding: 0 !important;
    max-height: 250px;
    overflow: hidden;
  }

  :deep(.p-overlaypanel.notification-dropdown) {
    top: 100% !important;
    left: auto !important;
    right: 0 !important;
    margin-left: 0 !important;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.12) !important;
  }

  :deep(.p-overlaypanel.p-component.notification-dropdown) {
    margin-left: 0 !important;
  }

  :deep(.notification-panel) {
    width: 280px !important;
    max-height: 500px;
    border-radius: 16px;
    background: var(--color-bg-primary, #ffffff);
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
    border: 1px solid var(--color-border, rgba(0, 0, 0, 0.06));
    overflow: hidden;
    margin: 0 !important;
    position: relative !important;
    display: flex;
    flex-direction: column;
  }

  :deep(.notification-actions) {
    display: flex;
    padding: 20px;
    background: var(--color-bg-primary, #ffffff);
    border-bottom: 2px solid var(--color-border, #f0f2f5);
    gap: 12px;
    align-items: center;
    flex-shrink: 0;
  }



  :deep(.notification-list) {
    max-height: 400px;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 12px;
    margin: 0;
    background: var(--color-bg-secondary, #fafbfc);
    flex: 1;
    min-height: 0;
  }

  :deep(.notification-list::-webkit-scrollbar) {
    width: 8px;
  }

  :deep(.notification-list::-webkit-scrollbar-track) {
    background: var(--color-bg-tertiary, #f6f8fa);
    border-radius: 4px;
  }

  :deep(.notification-list::-webkit-scrollbar-thumb) {
    background: var(--color-border-dark, #d0d7de);
    border-radius: 4px;
    border: 2px solid var(--color-bg-tertiary, #f6f8fa);
  }

  :deep(.notification-list::-webkit-scrollbar-thumb:hover) {
    background: var(--color-text-tertiary, #afb8c1);
  }

  :deep(.notification-item) {
    display: flex;
    align-items: flex-start;
    padding: 16px;
    margin-bottom: 8px;
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.2s ease;
    position: relative;
    background: var(--color-bg-primary, #ffffff);
    border: 1px solid var(--color-border, #e1e4e8);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  }

  :deep(.notification-item:hover) {
    background: var(--color-bg-tertiary, #f6f8fa);
    border-color: var(--color-border-dark, #d0d7de);
    transform: translateX(4px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  }

  :deep(.notification-item:last-child) {
    margin-bottom: 0;
  }

  :deep(.notification-item.unread) {
    background: var(--color-bg-primary, #f0f6ff);
    border-color: var(--color-primary, #0969da);
    border-left: 4px solid var(--color-primary, #0969da);
  }
  }

  :deep(.notification-item:last-child) {
    border-bottom: none;
  }

  :deep(.notification-item:hover) {
    background-color: var(--surface-100);
  }

  :deep(.notification-item.unread) {
    background-color: var(--primary-50);
  }

  :deep(.notification-icon) {
    flex-shrink: 0;
    margin-right: 0.5rem;
    font-size: 0.9rem;
    width: 16px;
    text-align: center;
  }

  :deep(.notification-content) {
    flex: 1;
    min-width: 0;
  }

  :deep(.notification-title) {
    font-weight: 500;
    margin-bottom: 0.1rem;
    font-size: 0.75rem;
    line-height: 1.2;
    color: var(--text-color);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  :deep(.notification-time) {
    color: var(--text-color-secondary);
    font-size: 0.65rem;
  }

  :deep(.unread-dot) {
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background-color: var(--primary-color);
  }

  :deep(.notification-icon) {
    margin-right: 14px;
    margin-top: 2px;
    font-size: 20px;
    opacity: 0.95;
  }

  :deep(.notification-content) {
    flex: 1;
    min-width: 0;
  }

  :deep(.notification-title) {
    font-size: 14px;
    font-weight: 600;
    color: var(--color-text-primary, #24292f);
    line-height: 1.5;
    margin-bottom: 4px;
  }

  :deep(.notification-time) {
    font-size: 12px;
    color: var(--color-text-secondary, #57606a);
    font-weight: 500;
  }

  :deep(.unread-dot) {
    width: 10px;
    height: 10px;
    background: #0969da;
    border-radius: 50%;
    margin-left: 12px;
    margin-top: 8px;
    box-shadow: 0 0 0 3px rgba(9, 105, 218, 0.15);
    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }

  @keyframes pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }

  :deep(.notification-empty) {
    text-align: center;
    padding: 60px 20px;
    background: var(--color-bg-secondary, #fafbfc);
    color: var(--color-text-secondary, #57606a);
    border-radius: 0 0 16px 16px;
  }

  :deep(.notification-empty i) {
    font-size: 48px;
    color: var(--color-text-tertiary, #d0d7de);
    margin-bottom: 16px;
    opacity: 0.6;
  }

  :deep(.notification-empty p) {
    margin: 0;
    font-size: 15px;
    color: var(--color-text-secondary, #57606a);
    font-weight: 500;
    letter-spacing: -0.01em;
  }
</style>


