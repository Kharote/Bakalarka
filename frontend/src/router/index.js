import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/auth/LoginView.vue'),
      meta: { requiresAuth: false }
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('@/views/auth/RegisterView.vue'),
      meta: { requiresAuth: false }
    },
    {
      path: '/auth/callback',
      name: 'auth-callback',
      component: () => import('@/views/auth/AuthCallback.vue'),
      meta: { requiresAuth: false }
    },
    {
      path: '/',
      name: 'dashboard',
      component: () => import('@/views/DashboardView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/projects',
      name: 'projects',
      component: () => import('@/views/projects/ProjectsView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/projects/:id',
      name: 'project-detail',
      component: () => import('@/views/projects/ProjectDetailView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/ai-suggestions/:suggestionId',
      name: 'ai-suggestions',
      component: () => import('@/views/projects/AIProjectSuggestionsView.vue'),
      meta: { 
        requiresAuth: true,
        requiredRole: ['pm', 'admin']
      }
    },
    {
      path: '/users',
      name: 'users',
      component: () => import('@/views/UsersView.vue'),
      meta: { 
        requiresAuth: true,
        requiredRole: ['pm', 'admin']
      }
    },
    {
      path: '/users/:id',
      name: 'user-detail',
      component: () => import('@/views/user/ProfileView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/tasks',
      name: 'tasks',
      component: () => import('@/views/tasks/TasksView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/teams',
      name: 'teams',
      component: () => import('@/views/TeamsView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/tasks/:id',
      name: 'task-detail',
      component: () => import('@/views/tasks/TaskDetailView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/profile',
      name: 'profile',
      component: () => import('@/views/user/ProfileView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('@/views/user/SettingsView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/ai-chat',
      name: 'ai-chat',
      component: () => import('@/views/AIChatView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/admin/settings',
      name: 'admin-settings',
      component: () => import('@/views/admin/AdminSettingsView.vue'),
      meta: {
        requiresAuth: true,
        requiredRole: ['admin']
      }
    }
  ]
})

router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()
  
  console.log(`🔀 Router: ${from.name || 'initial'} → ${to.name}`)
  
  // Initialize auth store if not already done
  if (!authStore.initialized) {
    console.log('🔄 Initializing auth...')
    await authStore.initializeAuth()
  }
  
  console.log(`🔐 Auth status: authenticated=${authStore.isAuthenticated}, token=${!!authStore.token}, user=${!!authStore.user}`)
  
  // Auth routes - always allow access
  if (to.name === 'login' || to.name === 'register' || to.name === 'auth-callback') {
    // But redirect authenticated users away from login/register
    if (authStore.isAuthenticated && (to.name === 'login' || to.name === 'register')) {
      console.log('✅ Authenticated user accessing auth page, redirecting to dashboard')
      next('/')
      return
    }
    next()
    return
  }
  
  // Protected routes - require authentication
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    console.log('❌ Protected route accessed without auth, redirecting to login')
    next('/login')
    return
  }
  
  // Role-based access
  if (to.meta.requiredRole && authStore.isAuthenticated) {
    const userRole = authStore.user?.role
    const requiredRoles = Array.isArray(to.meta.requiredRole) ? to.meta.requiredRole : [to.meta.requiredRole]
    
    if (!requiredRoles.includes(userRole)) {
      console.log('❌ Insufficient role, redirecting to dashboard')
      next('/')
      return
    }
  }
  
  console.log('✅ Navigation allowed')
  next()
})

export default router
