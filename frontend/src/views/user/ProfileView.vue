<template>
  <div class="view-container profile-view">
    <div v-if="loading" class="loading-container">
      <i class="pi pi-spin pi-spinner" style="font-size: 2rem;"></i>
      <p>{{ t('profile.loading') }}</p>
    </div>
    
    <template v-else>
      <div class="view-header">
        <div class="header-content">
          <h1>{{ t('profile.title') }}</h1>
          <p>{{ t('profile.subtitle') }}</p>
        </div>
      </div>

    <div class="view-content">
      <!-- Profile Card -->
      <div class="profile-card">
        <div class="profile-header">
          <div class="avatar-section">
            <div class="avatar">
              <img v-if="user.profilePicture" 
                   :src="user.profilePicture" 
                   :alt="user.name"
                   @error="handleImageError" />
              <i v-else class="pi pi-user"></i>
            </div>
            <div class="avatar-info">
              <h2>{{ user.name || 'Loading...' }}</h2>
              <p>{{ user.email || 'Loading...' }}</p>
              <div class="user-role" :class="getRoleClass(user.role)" v-if="user.role">
                {{ getRoleLabel(user.role) }}
              </div>
              <div class="member-since-container">
                <span class="member-since">{{ t('profile.memberSince') }} {{ formatDate(user.createdAt) }}</span>
              </div>
            </div>
          </div>
          <Button 
            v-if="isOwnProfile"
            :label="loading ? t('profile.refreshing') : t('profile.refreshPhoto')" 
            icon="pi pi-refresh"
            class="btn-secondary"
            :loading="loading"
            @click="updatePhoto"
          />
        </div>
      </div>

      <!-- Personal Information -->
      <div class="info-section">
        <div class="section-header">
          <h3>{{ t('profile.personalInfo') }}</h3>
          <Button 
            v-if="canEdit"
            :label="isEditing ? t('common.cancel') : t('common.edit')"
            :icon="isEditing ? 'pi pi-times' : 'pi pi-pencil'"
            class="btn-outline"
            @click="toggleEdit"
          />
        </div>

        <div class="info-grid">
          <div class="field-group">
            <label>{{ t('profile.fullName') }}</label>
            <InputText 
              v-model="profileForm.name"
              :disabled="!isEditing"
              :placeholder="t('profile.fullName')"
            />
          </div>

          <div class="field-group">
            <label>{{ t('profile.email') }}</label>
            <InputText 
              v-model="profileForm.email"
              disabled
              :placeholder="t('profile.email')"
              class="readonly-field"
            />
            <small>{{ t('profile.emailNote') }}</small>
          </div>

          <div class="field-group">
            <label>{{ t('profile.jobTitle') }}</label>
            <InputText 
              v-model="profileForm.position"
              :disabled="!isEditing"
              :placeholder="t('profile.jobTitle')"
            />
          </div>

          <div class="field-group">
            <label>{{ t('profile.department') }}</label>
            <InputText 
              v-model="profileForm.department"
              :disabled="!isEditing"
              :placeholder="t('profile.department')"
            />
          </div>

          <div class="field-group">
            <label>{{ t('profile.subRoles') }}</label>
            <div v-if="isAdmin && isEditing" class="subroles-edit-grid">
              <label 
                v-for="option in subRoleOptions" 
                :key="option.value"
                class="subrole-checkbox-label"
              >
                <input 
                  type="checkbox" 
                  :value="option.value"
                  v-model="editSubRoles"
                />
                <span class="subrole-checkbox-text">{{ t(option.labelKey) }}</span>
              </label>
            </div>
            <InputText 
              v-else
              :value="formatSubRoles(user.subRoles)"
              disabled
              :placeholder="t('profile.noSpecializations')"
              class="readonly-field"
            />
            <small v-if="!isAdmin">{{ t('profile.subRolesNote') }}</small>
          </div>

          <div class="field-group">
            <label>{{ t('profile.phone') }}</label>
            <InputText 
              v-model="profileForm.phone"
              :disabled="!isEditing"
              :placeholder="t('profile.phone')"
            />
          </div>

          <div class="field-group">
            <label>{{ t('profile.location') }}</label>
            <InputText 
              v-model="profileForm.location"
              :disabled="!isEditing"
              :placeholder="t('profile.location')"
            />
          </div>

          <div class="field-group full-width">
            <label>{{ t('profile.bio') }}</label>
            <Textarea 
              v-model="profileForm.bio"
              :disabled="!isEditing"
              :placeholder="t('profile.bioPlaceholder')"
              rows="3"
            />
          </div>
        </div>

        <div v-if="isEditing" class="form-actions">
          <Button 
            :label="t('profile.saveChanges')"
            icon="pi pi-check"
            class="btn-primary"
            :loading="saving"
            @click="saveProfile"
          />
          <Button 
            :label="t('common.cancel')"
            icon="pi pi-times"
            class="btn-outline"
            @click="cancelEdit"
          />
        </div>
      </div>

      <!-- Activity Stats -->
      <div class="stats-section">
        <h3>{{ t('profile.statistics') }}</h3>
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-icon">
              <i class="pi pi-folder"></i>
            </div>
            <div class="stat-content">
              <div class="stat-number">{{ stats.projects }}</div>
              <div class="stat-label">{{ t('profile.projects') }}</div>
            </div>
          </div>
          
          <div class="stat-card">
            <div class="stat-icon">
              <i class="pi pi-check-square"></i>
            </div>
            <div class="stat-content">
              <div class="stat-number">{{ stats.completedTasks }}</div>
              <div class="stat-label">{{ t('profile.tasksCompleted') }}</div>
            </div>
          </div>
          
          <div class="stat-card">
            <div class="stat-icon">
              <i class="pi pi-users"></i>
            </div>
            <div class="stat-content">
              <div class="stat-number">{{ stats.collaborations }}</div>
              <div class="stat-label">{{ t('profile.collaborations') }}</div>
            </div>
          </div>
          
          <div class="stat-card">
            <div class="stat-icon">
              <i class="pi pi-calendar"></i>
            </div>
            <div class="stat-content">
              <div class="stat-number">{{ stats.daysActive }}</div>
              <div class="stat-label">{{ t('profile.daysActive') }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </template>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useToast } from 'primevue/usetoast'
import { profileAPI, userAPI } from '@/services/api'
import { useLocale } from '@/composables/useLocale'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'

const route = useRoute()
const authStore = useAuthStore()
const { t } = useLocale()
const toast = useToast()

const user = ref({})
const isEditing = ref(false)
const isAdmin = computed(() => authStore.user?.role === 'admin')
const canEdit = computed(() => isOwnProfile.value || isAdmin.value)
const editSubRoles = ref([])

// Watch for route changes so navigating between /users/:id and /profile reloads
watch(() => route.params.id, () => {
  isEditing.value = false
  loadProfile()
  loadStats()
})
watch(() => route.name, () => {
  isEditing.value = false
  loadProfile()
  loadStats()
})

const subRoleOptions = [
  { value: 'frontend_developer', labelKey: 'profile.developerRoles.frontend_developer' },
  { value: 'backend_developer', labelKey: 'profile.developerRoles.backend_developer' },
  { value: 'fullstack_developer', labelKey: 'profile.developerRoles.fullstack_developer' },
  { value: 'devops', labelKey: 'profile.developerRoles.devops' }
]
const saving = ref(false)
const loading = ref(true)
const isOwnProfile = ref(true) // Track if viewing own profile or another user's

const profileForm = reactive({
  name: '',
  email: '',
  department: '',
  position: '',
  phone: '',
  location: '',
  bio: ''
})

const stats = ref({
  projects: 0,
  completedTasks: 0,
  daysActive: 0,
  collaborations: 0
})

const formatDate = (date) => {
  if (!date) return t('profile.recently')
  return new Date(date).toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long' 
  })
}

const loadProfile = async () => {
  try {
    loading.value = true
    
    // Check if we're viewing another user's profile or own profile
    const userId = route.params.id
    
    if (userId && userId !== authStore.user?.id) {
      // Viewing another user's profile
      isOwnProfile.value = false
      const response = await userAPI.getUserById(userId)
      user.value = response.data.user
    } else {
      // Viewing own profile
      isOwnProfile.value = true
      const response = await profileAPI.getProfile()
      user.value = response.data.user
    }
    
    // Update form with current user data
    profileForm.name = user.value.name || ''
    profileForm.email = user.value.email || ''
    profileForm.department = user.value.department || ''
    profileForm.position = user.value.position || ''
    profileForm.phone = user.value.phone || ''
    profileForm.location = user.value.location || ''
    profileForm.bio = user.value.bio || ''
    
  } catch (error) {
    console.error('Error loading profile:', error)
    toast.add({
      severity: 'error',
      summary: t('common.error'),
      detail: t('profile.messages.loadError'),
      life: 3000
    })
  } finally {
    loading.value = false
  }
}

const loadStats = async () => {
  try {
    const response = await profileAPI.getStats()
    stats.value = response.data.stats
  } catch (error) {
    console.error('Error loading stats:', error)
    // Keep default stats if error
  }
}

const toggleEdit = () => {
  if (isEditing.value) {
    cancelEdit()
  } else {
    isEditing.value = true
    editSubRoles.value = [...(user.value.subRoles || [])]
  }
}

const cancelEdit = () => {
  isEditing.value = false
  // Reset form to original values
  profileForm.name = user.value.name || ''
  profileForm.email = user.value.email || ''
  profileForm.department = user.value.department || ''
  profileForm.position = user.value.position || ''
  profileForm.phone = user.value.phone || ''
  profileForm.location = user.value.location || ''
  profileForm.bio = user.value.bio || ''
  editSubRoles.value = [...(user.value.subRoles || [])]
}

const saveProfile = async () => {
  saving.value = true
  try {
    const updateData = {
      name: profileForm.name,
      department: profileForm.department,
      position: profileForm.position,
      phone: profileForm.phone,
      location: profileForm.location,
      bio: profileForm.bio
    }
    
    let response
    if (isOwnProfile.value) {
      response = await profileAPI.updateProfile(updateData)
    } else {
      // Admin editing another user's profile
      response = await userAPI.updateUser(route.params.id, updateData)
    }
    user.value = response.data.user
    
    // If admin edited sub-roles, update them too
    if (isAdmin.value) {
      try {
        const userId = route.params.id || authStore.user?.id
        await userAPI.updateUserRole(userId, {
          role: user.value.role,
          subRoles: editSubRoles.value
        })
        user.value.subRoles = [...editSubRoles.value]
      } catch (subRoleError) {
        console.error('Error updating sub-roles:', subRoleError)
      }
    }
    
    toast.add({
      severity: 'success',
      summary: t('common.success'),
      detail: t('profile.messages.profileUpdated'),
      life: 3000
    })
    
    isEditing.value = false
  } catch (error) {
    console.error('Error updating profile:', error)
    toast.add({
      severity: 'error',
      summary: t('common.error'),
      detail: error.response?.data?.message || t('profile.messages.updateError'),
      life: 3000
    })
  } finally {
    saving.value = false
  }
}

const updatePhoto = async () => {
  try {
    loading.value = true
    const response = await profileAPI.refreshPhoto()
    
    if (response.data.success) {
      // Update the user data with the new photo
      user.value.profilePicture = response.data.profilePicture
      
      // Also update the auth store if it exists
      if (authStore.user) {
        authStore.user.profilePicture = response.data.profilePicture
      }
      
      toast.add({
        severity: 'success',
        summary: t('common.success'),
        detail: t('profile.messages.photoUpdated'),
        life: 3000
      })
    }
  } catch (error) {
    console.error('Error updating photo:', error)
    toast.add({
      severity: 'error',
      summary: t('common.error'),
      detail: t('profile.messages.photoError'),
      life: 5000
    })
  } finally {
    loading.value = false
  }
}

const getRoleClass = (role) => {
  const roleClasses = {
    'admin': 'role-admin',
    'pm': 'role-pm', 
    'user': 'role-user'
  }
  return roleClasses[role] || 'role-user'
}

const getRoleLabel = (role) => {
  const roleKey = `profile.roles.${role}`
  return t(roleKey)
}

const getSubRoleLabel = (subRole) => {
  const roleKey = `profile.developerRoles.${subRole}`
  return t(roleKey)
}

const formatSubRoles = (subRoles) => {
  if (!subRoles || subRoles.length === 0) return t('profile.noSpecializations')
  return subRoles.map(role => getSubRoleLabel(role)).join(', ')
}

onMounted(async () => {
  await loadProfile()
  await loadStats()
})
</script>

<style scoped>
.profile-view {
}

.page-header {
  background: white;
  border-radius: 16px;
  padding: 32px;
  margin-bottom: 24px;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.page-title {
  font-size: 2rem;
  font-weight: 800;
  color: #111827;
  margin: 0 0 8px 0;
  background: linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.page-subtitle {
  color: var(--color-text-secondary, #6b7280);
  font-size: 1.125rem;
  margin: 0;
}

.view-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.profile-card {
  background: white;
  border-radius: 16px;
  padding: 32px;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
}

.profile-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.avatar-section {
  display: flex;
  align-items: center;
  gap: 24px;
}

.avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar i {
  font-size: 2rem;
  color: white;
}

.avatar-info h2 {
  margin: 0 0 4px 0;
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-text-primary, #111827);
}

.avatar-info p {
  margin: 0 0 8px 0;
  color: var(--color-text-secondary, #6b7280);
  font-size: 1rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
  word-break: break-all;
}

.member-since-container {
  margin-top: 8px;
}

.member-since {
  color: var(--color-text-tertiary, #9ca3af);
  font-size: 0.875rem;
}

.info-section {
  background: white;
  border-radius: 16px;
  padding: 32px;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.section-header h3 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-text-primary, #111827);
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 24px;
  margin-bottom: 32px;
}

.field-group.full-width {
  grid-column: 1 / -1;
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 64px;
  color: var(--color-text-secondary, #6b7280);
}

.field-group label {
  font-weight: 600;
  color: var(--color-text-primary, #374151);
  font-size: 0.875rem;
}

.field-group small {
  color: var(--color-text-secondary, #6b7280);
  font-size: 0.75rem;
  margin-top: 4px;
}

:deep(.p-inputtext) {
  padding: 12px 16px;
  border-radius: 8px;
  border: 1px solid #d1d5db;
  font-size: 0.875rem;
}

:deep(.p-inputtextarea) {
  padding: 12px 16px;
  border-radius: 8px;
  border: 1px solid #d1d5db;
  font-size: 0.875rem;
  resize: vertical;
  min-height: 80px;
}

:deep(.p-inputtext:enabled:focus),
:deep(.p-inputtextarea:enabled:focus) {
  border-color: #7c3aed;
  box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.1);
}

:deep(.p-inputtext:disabled),
:deep(.p-inputtextarea:disabled) {
  background: var(--color-bg-secondary, #f9fafb) !important;
  color: var(--color-text-secondary, #6b7280) !important;
  border-color: var(--color-border, #e5e7eb) !important;
  opacity: 0.8 !important;
}

.readonly-field {
  background: var(--color-bg-secondary, #f9fafb) !important;
  color: var(--color-text-secondary, #6b7280) !important;
  border-color: var(--color-border, #e5e7eb) !important;
}

.subroles-edit-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.subrole-checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 8px 14px;
  border-radius: 8px;
  border: 1px solid var(--color-border, #e5e7eb);
  background: var(--color-bg-primary, #fff);
  transition: all 0.2s;
  font-size: 0.9rem;
}

.subrole-checkbox-label:hover {
  border-color: #4f46e5;
  background: var(--color-bg-secondary, #f9fafb);
}

.subrole-checkbox-label input[type="checkbox"] {
  accent-color: #4f46e5;
}

.subrole-checkbox-text {
  color: var(--color-text-primary, #374151);
  font-weight: 500;
}

.form-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  padding-top: 24px;
  border-top: 1px solid var(--color-border, #e5e7eb);
}

.stats-section {
  background: white;
  border-radius: 16px;
  padding: 32px;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
}

.stats-section h3 {
  margin: 0 0 24px 0;
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-text-primary, #111827);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.stat-card {
  background: var(--color-bg-secondary, #f8fafc);
  border-radius: 12px;
  padding: 24px;
  display: flex;
  align-items: center;
  gap: 16px;
  transition: all 0.2s ease;
  border: 1px solid var(--color-border, transparent);
}

.stat-card:hover {
  background: var(--color-bg-tertiary, #f1f5f9);
  transform: translateY(-2px);
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-icon i {
  font-size: 1.5rem;
  color: white;
}

.stat-number {
  font-size: 2rem;
  font-weight: 800;
  color: var(--color-text-primary, #111827);
  line-height: 1;
  margin-bottom: 4px;
}

.stat-label {
  color: var(--color-text-secondary, #6b7280);
  font-size: 0.875rem;
  font-weight: 500;
}

@media (max-width: 768px) {
  .profile-view {
    padding: 0 16px;
  }
  
  .page-header,
  .profile-card,
  .info-section,
  .stats-section {
    padding: 24px;
  }
  
  .profile-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 24px;
  }
  
  .avatar-section {
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 16px;
  }
  
  .info-grid {
    grid-template-columns: 1fr;
  }
  
  .form-actions {
    flex-direction: column;
  }
  
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 480px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
}

/* Button Icon Spacing */
:deep(.p-button .p-button-icon) {
  margin-right: 10px !important;
}

.user-role {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
}

.role-admin {
  background: #fee2e2;
  color: #dc2626;
  border: 1px solid #fecaca;
}

.role-pm {
  background: #dbeafe;
  color: #2563eb;
  border: 1px solid #bfdbfe;
}

.role-user {
  background: var(--gray-100, #f3f4f6);
  color: var(--gray-600, #6b7280);
  border: 1px solid var(--gray-200, #d1d5db);
}

:deep(.p-button .p-button-icon:last-child) {
  margin-right: 0 !important;
  margin-left: 10px !important;
}

:deep(.p-button.p-button-icon-only .p-button-icon) {
  margin: 0 !important;
}

:deep(.btn-primary) {
  background: linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%) !important;
  border: none !important;
  color: white !important;
  font-weight: 600 !important;
  padding: 12px 20px !important;
  border-radius: 8px !important;
  transition: all 0.2s ease !important;
}

:deep(.btn-primary:hover) {
  transform: translateY(-1px) !important;
  box-shadow: 0 8px 25px -5px rgba(124, 58, 237, 0.4) !important;
}

:deep(.btn-secondary) {
  background: var(--color-bg-secondary, #f3f4f6) !important;
  border: 1px solid var(--color-border, #d1d5db) !important;
  color: var(--color-text-primary, #374151) !important;
  font-weight: 600 !important;
  padding: 12px 20px !important;
  border-radius: 8px !important;
  transition: all 0.2s ease !important;
}

:deep(.btn-secondary:hover) {
  background: var(--color-bg-tertiary, #e5e7eb) !important;
  border-color: var(--gray-400, #9ca3af) !important;
}

:deep(.btn-outline) {
  background: transparent !important;
  border: 1px solid var(--color-border, #d1d5db) !important;
  color: var(--color-text-primary, #374151) !important;
  font-weight: 600 !important;
  padding: 12px 20px !important;
  border-radius: 8px !important;
  transition: all 0.2s ease !important;
}

:deep(.btn-outline:hover) {
  background: var(--color-bg-secondary, #f9fafb) !important;
  border-color: var(--color-text-secondary, #6b7280) !important;
}
</style>