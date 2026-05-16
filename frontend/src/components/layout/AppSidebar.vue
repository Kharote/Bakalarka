<template>
  <aside class="sidebar">
    <nav class="sidebar-nav">
      <router-link 
        v-for="item in menuItems" 
        :key="item.path"
        :to="item.path"
        class="nav-item"
        :class="{ 'active': isActive(item.path) }"
      >
        <i :class="item.icon"></i>
        <span>{{ item.label }}</span>
      </router-link>
    </nav>
  </aside>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useLocale } from '@/composables/useLocale'

const route = useRoute()
const authStore = useAuthStore()
const { t } = useLocale()

const allMenuItems = computed(() => [
  {
    label: t('nav.dashboard'),
    path: '/',
    icon: 'pi pi-home',
    roles: ['user', 'pm', 'admin']
  },
  {
    label: t('nav.projects'),
    path: '/projects',
    icon: 'pi pi-folder',
    roles: ['user', 'pm', 'admin']
  },
  {
    label: t('nav.tasks'),
    path: '/tasks',
    icon: 'pi pi-check-square',
    roles: ['user', 'pm', 'admin']
  },
  {
    label: t('nav.teams'),
    path: '/teams',
    icon: 'pi pi-sitemap',
    roles: ['user', 'pm', 'admin']
  },
  {
    label: t('nav.aiChat'),
    path: '/ai-chat',
    icon: 'pi pi-comments',
    roles: ['user', 'pm', 'admin']
  },
  {
    label: t('nav.users'),
    path: '/users',
    icon: 'pi pi-users',
    roles: ['pm', 'admin']
  },
  {
    label: t('nav.adminSettings'),
    path: '/admin/settings',
    icon: 'pi pi-cog',
    roles: ['admin']
  }
])

const menuItems = computed(() => {
  const userRole = authStore.user?.role
  if (!userRole) return []
  
  return allMenuItems.value.filter(item => item.roles.includes(userRole))
})

const isActive = (path) => {
  if (path === '/') {
    return route.path === '/'
  }
  return route.path.startsWith(path)
}
</script>

<style scoped>
.sidebar {
  width: 280px;
  background: var(--color-bg-primary, white);
  border-right: 1px solid var(--color-border, #e5e7eb);
  padding: 1.5rem 0;
  overflow-y: auto;
  transition: width 0.2s ease;
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0 0.75rem;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.25rem;
  color: var(--color-text-secondary, #6b7280);
  text-decoration: none;
  transition: all 0.2s ease;
  border-radius: 8px;
  font-weight: 500;
  font-size: 0.9375rem;
  position: relative;
}

.nav-item:hover {
  background-color: var(--color-bg-tertiary, #f9fafb);
  color: #7c3aed;
  transform: translateX(2px);
}

.nav-item.active {
  background: linear-gradient(135deg, rgba(124, 58, 237, 0.1) 0%, rgba(168, 85, 247, 0.1) 100%);
  color: #7c3aed;
  font-weight: 700;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
}

.nav-item.active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 60%;
  background: #7c3aed;
  border-radius: 0 2px 2px 0;
}

.nav-item i {
  font-size: 1.375rem;
  min-width: 24px;
  text-align: center;
}

.nav-item span {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

@media (max-width: 1024px) {
  .sidebar {
    width: 240px;
  }
}

@media (max-width: 768px) {
  .sidebar {
    width: 80px;
    padding: 1rem 0;
  }
  
  .sidebar-nav {
    padding: 0 0.5rem;
  }
  
  .nav-item {
    padding: 1rem 0.75rem;
    justify-content: center;
  }
  
  .nav-item span {
    display: none;
  }
  
  .nav-item i {
    min-width: auto;
  }
}

@media (max-width: 480px) {
  .sidebar {
    position: fixed;
    left: -100%;
    top: 60px;
    bottom: 0;
    z-index: 99;
    width: 240px;
    transition: left 0.2s ease;
  }
  
  .sidebar.mobile-open {
    left: 0;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  }
  
  .nav-item span {
    display: block;
  }
  
  .nav-item {
    justify-content: flex-start;
    padding: 1rem 1.25rem;
  }
}
</style>
