<template>
  <div class="view-container users-view">
    <!-- Standardized Header -->
    <div class="view-header">
      <div class="header-content">
        <h1>{{ t('users.title') }}</h1>
        <p>{{ t('users.subtitle') }}</p>
      </div>
    </div>

    <div class="users-content">
      <!-- Filters -->
      <div class="filters-card">
        <div class="filters-row">
          <div class="search-field">
            <InputText
              v-model="searchQuery"
              :placeholder="t('users.searchUsers')"
              @input="debouncedSearch"
            />
            <i class="pi pi-search search-icon"></i>
          </div>
          
          <div class="filter-group">
            <Dropdown
              v-model="selectedRole"
              :options="roleOptions"
              optionLabel="label"
              optionValue="value"
              :placeholder="t('users.filterByRole')"
              showClear
              @change="loadUsers"
            />
          </div>
          
          <div class="filter-group">
            <Dropdown
              v-model="selectedSubRole"
              :options="subRoleOptions"
              optionLabel="label"
              optionValue="value"
              :placeholder="t('users.filterBySubRole')"
              showClear
              @change="loadUsers"
            />
          </div>
          
          <div class="filter-group">
            <Dropdown
              v-model="selectedDepartment"
              :options="departmentOptions"
              optionLabel="label"
              optionValue="value"
              :placeholder="t('users.filterByDepartment')"
              showClear
              @change="loadUsers"
            />
          </div>
        </div>
      </div>

      <!-- Users Grid -->
      <div class="users-grid" v-if="!loading">
        <div 
          v-for="user in users" 
          :key="user.id" 
          class="user-card"
          @click="viewUser(user.id)"
        >
          <div class="user-avatar">
            <img v-if="user.profilePicture" 
                 :src="user.profilePicture" 
                 :alt="user.name"
                 @error="$event.target.style.display = 'none'" />
            <i v-else class="pi pi-user"></i>
          </div>
          
          <div class="user-info">
            <h3>{{ user.name }}</h3>
            <p class="user-email">{{ user.email }}</p>
            <p class="user-department">{{ user.department || t('users.noDepartment') }}</p>
            <p class="user-position">{{ user.position || t('users.noPosition') }}</p>
            <p class="user-subrole" v-if="user.subRoles && user.subRoles.length > 0">
              <i class="pi pi-code"></i> {{ formatSubRoles(user.subRoles) }}
            </p>
            <p class="user-bio-indicator" v-if="user.bio">
              <i class="pi pi-id-card"></i> {{ t('users.hasBio') }}
            </p>
          </div>
          
          <div class="user-meta">
            <div class="user-role" :class="getRoleClass(user.role)">
              {{ getRoleLabel(user.role) }}
            </div>
            <div class="user-actions" @click.stop>
              <Button
                v-if="canManageRoles"
                icon="pi pi-cog"
                class="p-button-text p-button-sm p-button-rounded"
                @click="showRoleDialog(user)"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="loading-state">
        <ProgressSpinner />
        <p>Loading users...</p>
      </div>

      <!-- Empty State -->
      <div v-if="!loading && users.length === 0" class="empty-state">
        <i class="pi pi-users"></i>
        <h3>No Users Found</h3>
        <p>No users match your current filters.</p>
      </div>
    </div>

    <!-- Role Management Dialog -->
    <div v-if="roleDialogVisible" class="modal-overlay" @click.self="roleDialogVisible = false">
      <div class="modal-container">
        <div class="modal-header">
          <div class="modal-title-section">
            <div>
              <h2 class="modal-title">{{ t('users.manageRoles') }}</h2>
              <p class="modal-subtitle">{{ t('users.manageRolesSubtitle', { name: selectedUser?.name }) }}</p>
            </div>
          </div>
          <button class="modal-close" @click="roleDialogVisible = false" type="button">
            <i class="pi pi-times"></i>
          </button>
        </div>

        <form @submit.prevent="updateUserRole" class="modal-form">
          <div class="form-section">
            <div class="form-group">
              <label class="form-label">{{ t('users.systemRole') }} <span class="required">*</span></label>
              <div class="role-options">
                <div 
                  v-for="role in availableRoles" 
                  :key="role.value"
                  class="role-option"
                  :class="{ active: newRole === role.value }"
                  @click="newRole = role.value"
                >
                  <div class="role-badge" :class="getRoleClass(role.value)">
                    {{ t('users.roles.' + role.value) }}
                  </div>
                  <p class="role-description">{{ t('users.roleDescriptions.' + role.value) }}</p>
                </div>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">{{ t('users.developerSpecializations') }}</label>
              <p class="form-helper">{{ t('users.selectExpertise') }}</p>
              <div class="subroles-grid">
                <label 
                  v-for="subRole in subRoleOptions.filter(s => s.value && s.value !== 'none')" 
                  :key="subRole.value"
                  class="subrole-checkbox"
                >
                  <input 
                    type="checkbox" 
                    :value="subRole.value"
                    v-model="newSubRoles"
                  />
                  <div class="checkbox-custom">
                    <i class="pi pi-check"></i>
                  </div>
                  <div class="subrole-info">
                    <span class="subrole-label">{{ t('users.subRoles.' + subRole.value) }}</span>
                    <span class="subrole-icon"><i class="pi pi-code"></i></span>
                  </div>
                </label>
              </div>
            </div>
          </div>

          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" @click="roleDialogVisible = false">
              <i class="pi pi-times"></i>
              {{ t('users.cancel') }}
            </button>
            <button type="submit" class="btn btn-primary" :disabled="updating">
              <i class="pi" :class="updating ? 'pi-spin pi-spinner' : 'pi-check'"></i>
              {{ updating ? t('users.updating') : t('users.updateRoles') }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useLocale } from '@/composables/useLocale'
import { userAPI } from '@/services/api'
import { useToast } from 'primevue/usetoast'
import InputText from 'primevue/inputtext'
import Dropdown from 'primevue/dropdown'
import Button from 'primevue/button'
import ProgressSpinner from 'primevue/progressspinner'

const router = useRouter()
const authStore = useAuthStore()
const { t } = useLocale()
const toast = useToast()

const users = ref([])
const loading = ref(true)
const updating = ref(false)
const searchQuery = ref('')
const selectedRole = ref(null)
const selectedSubRole = ref(null)
const selectedDepartment = ref(null)

const roleDialogVisible = ref(false)
const selectedUser = ref(null)
const newRole = ref('')
const newSubRoles = ref([])

const canManageRoles = computed(() => authStore.user?.role === 'admin')

const roleOptions = computed(() => [
  { label: t('users.allRoles'), value: '' },
  { label: t('users.roles.user'), value: 'user' },
  { label: t('users.roles.pm'), value: 'pm' },
  { label: t('users.roles.admin'), value: 'admin' }
])

const subRoleOptions = computed(() => [
  { label: t('users.allSubRoles'), value: '' },
  { label: t('users.subRoles.frontend_developer'), value: 'frontend_developer' },
  { label: t('users.subRoles.backend_developer'), value: 'backend_developer' },
  { label: t('users.subRoles.fullstack_developer'), value: 'fullstack_developer' },
  { label: t('users.subRoles.devops'), value: 'devops' },
  { label: t('users.subRoles.none'), value: 'none' }
])

const departmentOptions = ref([
  { label: 'All Departments', value: '' },
  { label: 'Engineering', value: 'Engineering' },
  { label: 'Marketing', value: 'Marketing' },
  { label: 'Sales', value: 'Sales' },
  { label: 'HR', value: 'HR' },
  { label: 'Finance', value: 'Finance' }
])

const availableRoles = ref([
  { value: 'user' },
  { value: 'pm' },
  { value: 'admin' }
])

const loadUsers = async () => {
  try {
    loading.value = true
    const params = {}
    
    if (searchQuery.value) params.search = searchQuery.value
    if (selectedRole.value) params.role = selectedRole.value
    if (selectedSubRole.value) params.subRole = selectedSubRole.value
    if (selectedDepartment.value) params.department = selectedDepartment.value
    
    const response = await userAPI.getAllUsers(params)
    
    if (response.data.success) {
      users.value = response.data.users
    }
  } catch (error) {
    console.error('Error loading users:', error)
    toast.add({
      severity: 'error',
      summary: t('common.error'),
      detail: t('users.loadError'),
      life: 3000
    })
  } finally {
    loading.value = false
  }
}

// Native debounce function
const debounce = (func, wait) => {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

const debouncedSearch = debounce(() => {
  loadUsers()
}, 300)

const getRoleClass = (role) => {
  const roleClasses = {
    'admin': 'role-admin',
    'pm': 'role-pm',
    'user': 'role-user'
  }
  return roleClasses[role] || 'role-user'
}

const getRoleLabel = (role) => {
  return t('users.roles.' + role) || 'User'
}

const viewUser = (userId) => {
  router.push(`/users/${userId}`)
}

const getSubRoleLabel = (subRole) => {
  return t('users.subRoles.' + subRole) || subRole
}

const formatSubRoles = (subRoles) => {
  if (!subRoles || subRoles.length === 0) return 'No specializations'
  return subRoles.map(role => getSubRoleLabel(role)).join(', ')
}

const showRoleDialog = (user) => {
  selectedUser.value = user
  newRole.value = user.role
  newSubRoles.value = user.subRoles || []
  roleDialogVisible.value = true
}

const updateUserRole = async () => {
  try {
    updating.value = true
    
    await userAPI.updateUserRole(selectedUser.value.id, {
      role: newRole.value,
      subRoles: newSubRoles.value
    })
    
    // Update local data
    const userIndex = users.value.findIndex(u => u.id === selectedUser.value.id)
    if (userIndex > -1) {
      users.value[userIndex].role = newRole.value
      users.value[userIndex].subRoles = newSubRoles.value
    }
    
    roleDialogVisible.value = false
    
    toast.add({
      severity: 'success',
      summary: t('common.success'),
      detail: t('users.rolesUpdated'),
      life: 3000
    })
  } catch (error) {
    console.error('Error updating user roles:', error)
    toast.add({
      severity: 'error',
      summary: t('common.error'),
      detail: error.response?.data?.error || t('users.rolesUpdateError'),
      life: 3000
    })
  } finally {
    updating.value = false
  }
}

onMounted(() => {
  // Check if user has permission to view this page
  if (authStore.user?.role === 'user') {
    router.push('/dashboard')
    return
  }
  
  loadUsers()
})
</script>

<style scoped>
.filters-card {
  background: var(--color-bg-primary);
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
  margin-bottom: 24px;
  border: 1px solid var(--color-border);
}

.filters-row {
  display: grid;
  grid-template-columns: 1fr auto auto auto;
  gap: 16px;
  align-items: center;
}

.search-field {
  position: relative;
  min-width: 280px;
}

.search-field :deep(.p-inputtext) {
  width: 100%;
  padding-right: 36px;
}

.search-icon {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--color-text-tertiary);
  font-size: 16px;
  pointer-events: none;
}

.filter-group {
  min-width: 200px;
}

.users-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 24px;
  margin-top: 24px;
}

.user-card {
  background: var(--color-bg-primary);
  border-radius: 16px;
  padding: 28px;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
  border: 1px solid var(--color-border);
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  gap: 18px;
  min-height: 340px;
  height: 100%;
}

.user-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 16px -8px rgba(0, 0, 0, 0.1);
  border-color: #e5e7eb;
}

.user-avatar {
  width: 88px;
  height: 88px;
  border-radius: 50%;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--gray-100) 0%, var(--gray-200) 100%);
  margin: 0 auto 8px;
  border: 3px solid var(--color-bg-secondary);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  flex-shrink: 0;
}

.user-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.user-avatar i {
  font-size: 32px;
  color: var(--color-text-tertiary);
}

.user-info {
  text-align: center;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
  overflow: hidden;
}

.user-info h3 {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0;
  line-height: 1.3;
}

.user-email {
  color: var(--color-text-secondary);
  font-size: 0.9375rem;
  margin: 0;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
  word-break: break-all;
}

.user-department,
.user-position {
  color: var(--color-text-tertiary);
  font-size: 0.875rem;
  margin: 0;
  font-weight: 400;
}

.user-subrole {
  color: var(--primary-600);
  font-size: 0.875rem;
  font-weight: 600;
  margin: 4px 0 0 0;
  display: flex;
  align-items: center;
  gap: 6px;
  justify-content: center;
}

.user-bio-indicator {
  color: var(--success-600);
  font-size: 0.875rem;
  font-weight: 600;
  margin: 4px 0 0 0;
  display: flex;
  align-items: center;
  gap: 6px;
}

.user-bio-indicator i {
  font-size: 0.875rem;
}

.user-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: auto;
  padding-top: 12px;
  border-top: 1px solid var(--color-border);
}

.user-role {
  padding: 6px 16px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.role-admin {
  background: var(--danger-50);
  color: var(--danger-600);
  border: 1px solid var(--danger-100);
}

.role-pm {
  background: var(--info-50);
  color: var(--info-600);
  border: 1px solid var(--info-100);
}

.role-user {
  background: var(--gray-100);
  color: var(--gray-600);
  border: 1px solid var(--gray-200);
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 48px;
  color: var(--color-text-secondary);
  background: var(--color-bg-primary);
  border-radius: 16px;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
  border: 1px solid var(--color-border);
}

.empty-state i {
  font-size: 4rem;
  margin-bottom: 24px;
  color: var(--color-text-tertiary);
}

.loading-state p,
.empty-state h3 {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 8px 0;
}

.empty-state p {
  font-size: 1rem;
  font-weight: 400;
  color: var(--color-text-secondary);
  margin: 0;
}

/* Modern Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.75);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 20px;
}

.modal-container {
  background: var(--color-bg-primary);
  border-radius: 12px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  width: 100%;
  min-width: 600px;
  max-width: 600px;
  max-height: 80vh;
  overflow-y: auto;
}

.modal-header {
  padding: 24px 24px 16px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  border-bottom: 1px solid var(--color-border);
}

.modal-title-section {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.modal-icon {
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 18px;
  flex-shrink: 0;
}

.modal-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0 0 4px 0;
}

.modal-subtitle {
  color: var(--color-text-secondary);
  font-size: 14px;
  margin: 0;
  line-height: 1.4;
}

.modal-close {
  background: var(--color-bg-secondary);
  border: none;
  border-radius: 6px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--color-text-secondary);
  transition: all 0.2s;
}

.modal-close:hover {
  background: #fee2e2;
  color: #ef4444;
}

.modal-form {
  padding: 1rem 24px 24px;
}

.form-section {
  display: flex;
  flex-direction: column;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-label {
  font-weight: 500;
  font-size: 14px;
  color: var(--color-text-primary);
  margin-bottom: 8px;
}

.form-helper {
  font-size: 13px;
  color: var(--color-text-secondary);
  margin-bottom: 12px;
}

.required {
  color: #ef4444;
}

.role-options {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
  padding-top: 8px;
}

.role-option {
  padding: 16px;
  border: 2px solid var(--color-border);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.role-option:hover {
  border-color: var(--color-border);
}

.role-option.active {
  border-color: #4f46e5;
  background: var(--color-bg-secondary);
}

.role-badge {
  padding: 6px 16px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  display: inline-block;
  margin-bottom: 8px;
}

.role-description {
  color: var(--color-text-secondary);
  font-size: 0.875rem;
  margin: 0;
}

.subroles-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.subrole-checkbox {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.subrole-checkbox:hover {
  border-color: #4f46e5;
  background: var(--color-bg-secondary);
}

.subrole-checkbox input[type="checkbox"] {
  display: none;
}

.checkbox-custom {
  width: 20px;
  height: 20px;
  border: 2px solid var(--color-border);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 12px;
  transition: all 0.2s;
}

.checkbox-custom i {
  display: none;
}

.subrole-checkbox input:checked + .checkbox-custom {
  background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
  border-color: #4f46e5;
}

.subrole-checkbox input:checked + .checkbox-custom i {
  display: block;
}

.subrole-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex: 1;
}

.subrole-label {
  font-weight: 500;
  color: var(--color-text-primary);
  font-size: 14px;
}

.subrole-icon {
  color: #7c3aed;
  font-size: 14px;
}

.modal-actions {
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid var(--color-border);
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.btn {
  padding: 10px 20px;
  border-radius: 6px;
  font-weight: 500;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 120px;
  justify-content: center;
}

.btn-secondary {
  background: var(--color-bg-secondary);
  color: var(--color-text-secondary);
}

.btn-secondary:hover {
  background: var(--color-border);
  color: var(--color-text-primary);
}

.btn-primary {
  background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

@media (max-width: 768px) {
  .modal-overlay {
    padding: 1rem;
  }
  
  .modal-container {
    min-width: auto;
    max-width: 100%;
  }
  
  .subroles-grid {
    grid-template-columns: 1fr;
  }
  
  .modal-actions {
    flex-direction: column;
  }
  
  .btn {
    width: 100%;
  }
}

@media (max-width: 1024px) {
  .filters-row {
    grid-template-columns: 1fr 1fr !important;
    gap: 12px !important;
  }
  
  .search-field {
    grid-column: span 2 !important;
    min-width: auto !important;
  }
}

@media (max-width: 768px) {
  .page-header {
    padding: 32px 16px;
  }
  
  .users-content {
    padding: 0 16px 32px;
  }
  
  .filters-card {
    padding: 16px;
    margin-bottom: 16px;
  }
  
  .filters-row {
    grid-template-columns: 1fr !important;
    gap: 12px !important;
  }
  
  .search-field {
    grid-column: span 1 !important;
    min-width: auto !important;
  }
  
  .users-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  
  .user-card {
    padding: 20px;
  }
}
</style>