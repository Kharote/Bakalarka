<template>
  <div class="view-container teams-view">
    <!-- Header Section -->
    <div class="view-header">
      <div class="header-content">
        <h1>{{ t('teams.title') }}</h1>
        <p>{{ teams.length }} {{ t('teams.teamsTotal') }}</p>
      </div>
      <div class="header-actions">
        <Button 
          v-if="canManageTeams"
          icon="pi pi-plus" 
          :label="t('teams.createTeam')" 
          @click="showCreateDialog = true"
          class="btn-primary"
        />
      </div>
    </div>

    <div class="view-content">
      <!-- Search -->
      <div class="filters-card">
        <div class="filters-row">
          <div class="search-field">
            <InputText
              v-model="searchQuery"
              :placeholder="t('teams.searchTeams')"
              class="w-full"
            />
            <i class="pi pi-search search-icon"></i>
          </div>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="teamStore.loading" class="loading-container">
        <i class="pi pi-spin pi-spinner"></i>
        <span>{{ t('common.loading') }}</span>
      </div>

      <!-- Empty State -->
      <div v-else-if="filteredTeams.length === 0 && !searchQuery" class="empty-state">
        <i class="pi pi-users"></i>
        <h3>{{ t('teams.noTeams') }}</h3>
        <p>{{ t('teams.noTeamsDesc') }}</p>
        <Button 
          v-if="canManageTeams"
          icon="pi pi-plus" 
          :label="t('teams.createTeam')" 
          @click="showCreateDialog = true"
          class="btn-primary"
        />
      </div>

      <!-- Teams Grid -->
      <div v-else class="teams-grid">
        <div 
          v-for="team in filteredTeams" 
          :key="team.id" 
          class="team-card"
          @click="openTeamDetail(team)"
        >
          <div class="team-card-header">
            <div class="team-info">
              <h3>{{ team.name }}</h3>
              <p class="team-description">{{ team.description || t('teams.noDescription') }}</p>
            </div>
            <div class="team-actions" v-if="canEditTeam(team)" @click.stop>
              <button class="btn-icon" @click="editTeam(team)">
                <i class="pi pi-pencil"></i>
              </button>
              <button class="btn-icon danger" @click="confirmDeleteTeam(team)" v-if="canDeleteTeam">
                <i class="pi pi-trash"></i>
              </button>
            </div>
          </div>
          <div class="team-card-body">
            <div class="team-leader">
              <i class="pi pi-crown"></i>
              <span>{{ team.teamLeader?.name || 'Unknown' }}</span>
            </div>
            <div class="team-member-count">
              <i class="pi pi-users"></i>
              <span>{{ team.members?.length || 0 }} {{ t('teams.members') }}</span>
            </div>
            <div class="team-member-avatars" v-if="team.members?.length > 0">
              <div 
                v-for="member in team.members.slice(0, 5)" 
                :key="member.id"
                class="member-avatar-small"
                :title="member.user?.name"
              >
                <img 
                  v-if="member.user?.profilePicture" 
                  :src="member.user.profilePicture" 
                  :alt="member.user.name"
                  @error="$event.target.style.display = 'none'"
                />
                <i v-else class="pi pi-user"></i>
              </div>
              <span v-if="team.members.length > 5" class="more-members">
                +{{ team.members.length - 5 }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Create Team Dialog -->
    <Dialog 
      v-model:visible="showCreateDialog" 
      :header="editingTeam ? t('teams.editTeam') : t('teams.createTeam')"
      modal 
      :style="{ width: '500px' }"
      class="team-dialog"
    >
      <div class="dialog-form">
        <div class="form-group">
          <label>{{ t('teams.teamName') }} <span class="required">*</span></label>
          <InputText v-model="teamForm.name" :placeholder="t('teams.teamNamePlaceholder')" class="w-full" />
        </div>
        <div class="form-group">
          <label>{{ t('teams.description') }}</label>
          <Textarea v-model="teamForm.description" :placeholder="t('teams.descriptionPlaceholder')" rows="3" class="w-full" />
        </div>
        <div class="form-group" v-if="!editingTeam">
          <label>{{ t('teams.teamLeader') }} <span class="required">*</span></label>
          <Dropdown 
            v-model="teamForm.teamLeaderId" 
            :options="allUsers" 
            optionLabel="name" 
            optionValue="id"
            :placeholder="t('teams.selectTeamLeader')"
            filter
            class="w-full"
          >
            <template #option="{ option }">
              <div class="user-option">
                <span class="user-name">{{ option.name }}</span>
                <span class="user-email">{{ option.email }}</span>
              </div>
            </template>
          </Dropdown>
        </div>
      </div>
      <template #footer>
        <div class="dialog-footer">
          <Button :label="t('common.cancel')" icon="pi pi-times" class="btn-secondary" @click="closeCreateDialog" />
          <Button 
            :label="editingTeam ? t('common.update') : t('common.create')" 
            icon="pi pi-check" 
            class="btn-primary"
            @click="saveTeam" 
            :loading="teamStore.loading"
            autofocus 
          />
        </div>
      </template>
    </Dialog>

    <!-- Team Detail Dialog -->
    <Dialog 
      v-model:visible="showDetailDialog" 
      :header="selectedTeam?.name"
      modal 
      :style="{ width: '700px' }"
      class="team-detail-dialog"
    >
      <div v-if="selectedTeam" class="team-detail">
        <div class="detail-section">
          <h4>{{ t('teams.description') }}</h4>
          <p>{{ selectedTeam.description || t('teams.noDescription') }}</p>
        </div>

        <div class="detail-section">
          <div class="section-header">
            <h4>{{ t('teams.teamLeader') }}</h4>
            <Button 
              v-if="canEditTeam(selectedTeam)"
              icon="pi pi-arrow-right-arrow-left" 
              :label="t('teams.transferLeadership')" 
              class="p-button-text p-button-sm"
              @click="showTransferDialog = true"
            />
          </div>
          <div class="leader-card">
            <div class="member-avatar">
              <img 
                v-if="selectedTeam.teamLeader?.profilePicture" 
                :src="selectedTeam.teamLeader.profilePicture" 
                :alt="selectedTeam.teamLeader.name"
                @error="$event.target.style.display = 'none'"
              />
              <i v-else class="pi pi-user"></i>
            </div>
            <div class="member-info">
              <h5>{{ selectedTeam.teamLeader?.name }}</h5>
              <p>{{ selectedTeam.teamLeader?.email }}</p>
            </div>
            <span class="role-badge leader">
              <i class="pi pi-crown"></i> {{ t('teams.leader') }}
            </span>
          </div>
        </div>

        <div class="detail-section">
          <div class="section-header">
            <h4>{{ t('teams.members') }} ({{ selectedTeam.members?.length || 0 }})</h4>
            <Button 
              v-if="canEditTeam(selectedTeam)"
              icon="pi pi-plus" 
              :label="t('teams.addMember')" 
              class="p-button-text p-button-sm"
              @click="showAddMemberDialog = true"
            />
          </div>
          <div class="members-list">
            <div v-for="member in selectedTeam.members" :key="member.id" class="member-card">
              <div class="member-avatar">
                <img 
                  v-if="member.user?.profilePicture" 
                  :src="member.user.profilePicture" 
                  :alt="member.user?.name"
                  @error="$event.target.style.display = 'none'"
                />
                <i v-else class="pi pi-user"></i>
              </div>
              <div class="member-info">
                <h5>{{ member.user?.name }}</h5>
                <p>{{ member.user?.position || member.user?.email }}</p>
                <div class="member-roles" v-if="member.user?.subRoles?.length > 0">
                  <span v-for="role in member.user.subRoles" :key="role" class="role-tag">
                    {{ formatSubRole(role) }}
                  </span>
                </div>
              </div>
              <span class="role-badge" :class="member.role">
                {{ member.role === 'leader' ? t('teams.leader') : t('teams.member') }}
              </span>
              <button 
                v-if="canEditTeam(selectedTeam) && member.userId !== selectedTeam.teamLeaderId"
                class="btn-icon danger" 
                @click="removeMember(member.userId)"
                :title="t('teams.removeMember')"
              >
                <i class="pi pi-times"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    </Dialog>

    <!-- Add Member Dialog -->
    <Dialog 
      v-model:visible="showAddMemberDialog" 
      :header="t('teams.addMember')"
      modal 
      :style="{ width: '450px' }"
      class="team-dialog"
    >
      <div class="dialog-form">
        <div class="form-group">
          <label>{{ t('teams.selectUser') }}</label>
          <Dropdown 
            v-model="addMemberUserId" 
            :options="availableUsersForTeam" 
            optionLabel="name" 
            optionValue="id"
            :placeholder="t('teams.selectUser')"
            filter
            class="w-full"
          >
            <template #option="{ option }">
              <div class="user-option">
                <span class="user-name">{{ option.name }}</span>
                <span class="user-email">{{ option.email }}</span>
                <div class="user-roles" v-if="option.subRoles?.length > 0">
                  <span v-for="r in option.subRoles" :key="r" class="role-tag-sm">{{ formatSubRole(r) }}</span>
                </div>
              </div>
            </template>
          </Dropdown>
        </div>
      </div>
      <template #footer>
        <div class="dialog-footer">
          <Button :label="t('common.cancel')" icon="pi pi-times" class="btn-secondary" @click="showAddMemberDialog = false" />
          <Button :label="t('teams.addMember')" icon="pi pi-plus" class="btn-primary" @click="addMember" :loading="teamStore.loading" :disabled="!addMemberUserId" />
        </div>
      </template>
    </Dialog>

    <!-- Transfer Leadership Dialog -->
    <Dialog 
      v-model:visible="showTransferDialog" 
      :header="t('teams.transferLeadership')"
      modal 
      :style="{ width: '450px' }"
      class="team-dialog"
    >
      <div class="dialog-form">
        <p class="transfer-warning">
          <i class="pi pi-exclamation-triangle"></i>
          {{ t('teams.transferWarning') }}
        </p>
        <div class="form-group">
          <label>{{ t('teams.newLeader') }}</label>
          <Dropdown 
            v-model="newLeaderId" 
            :options="teamMembersForTransfer" 
            optionLabel="name" 
            optionValue="id"
            :placeholder="t('teams.selectNewLeader')"
            class="w-full"
          />
        </div>
      </div>
      <template #footer>
        <div class="dialog-footer">
          <Button :label="t('common.cancel')" icon="pi pi-times" class="btn-secondary" @click="showTransferDialog = false" />
          <Button :label="t('teams.transferLeadership')" icon="pi pi-arrow-right-arrow-left" class="btn-primary" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%) !important;" @click="doTransferLeadership" :loading="teamStore.loading" :disabled="!newLeaderId" />
        </div>
      </template>
    </Dialog>

    <!-- Confirm Delete Dialog -->
    <Dialog 
      v-model:visible="showDeleteDialog" 
      :header="t('teams.deleteTeam')"
      modal 
      :style="{ width: '400px' }"
      class="team-dialog"
    >
      <p>{{ t('teams.confirmDelete') }}</p>
      <template #footer>
        <div class="dialog-footer">
          <Button :label="t('common.cancel')" icon="pi pi-times" class="btn-secondary" @click="showDeleteDialog = false" />
          <Button :label="t('common.delete')" icon="pi pi-trash" class="btn-primary" style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%) !important;" @click="doDeleteTeam" :loading="teamStore.loading" />
        </div>
      </template>
    </Dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useTeamStore } from '@/stores/team'
import { useAuthStore } from '@/stores/auth'
import { userAPI } from '@/services/api'
import { useLocale } from '@/composables/useLocale'
import { useToast } from 'primevue/usetoast'
import InputText from 'primevue/inputtext'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import Dropdown from 'primevue/dropdown'
import Textarea from 'primevue/textarea'

const teamStore = useTeamStore()
const authStore = useAuthStore()
const { t } = useLocale()
const toast = useToast()

const searchQuery = ref('')
const showCreateDialog = ref(false)
const showDetailDialog = ref(false)
const showAddMemberDialog = ref(false)
const showTransferDialog = ref(false)
const showDeleteDialog = ref(false)
const editingTeam = ref(null)
const selectedTeam = ref(null)
const teamToDelete = ref(null)
const addMemberUserId = ref(null)
const newLeaderId = ref(null)
const allUsers = ref([])

const teamForm = ref({
  name: '',
  description: '',
  teamLeaderId: ''
})

const teams = computed(() => teamStore.teams)

const filteredTeams = computed(() => {
  if (!searchQuery.value) return teams.value
  const q = searchQuery.value.toLowerCase()
  return teams.value.filter(t => 
    t.name.toLowerCase().includes(q) ||
    t.description?.toLowerCase().includes(q) ||
    t.teamLeader?.name?.toLowerCase().includes(q)
  )
})

const canManageTeams = computed(() => {
  return ['pm', 'admin'].includes(authStore.user?.role)
})

const canDeleteTeam = computed(() => {
  return ['pm', 'admin'].includes(authStore.user?.role)
})

const canEditTeam = (team) => {
  const role = authStore.user?.role
  const userId = authStore.user?.id
  return role === 'admin' || role === 'pm' || team.teamLeaderId === userId
}

const availableUsersForTeam = computed(() => {
  if (!selectedTeam.value) return allUsers.value
  const existingIds = new Set(selectedTeam.value.members?.map(m => m.userId) || [])
  return allUsers.value.filter(u => !existingIds.has(u.id))
})

const teamMembersForTransfer = computed(() => {
  if (!selectedTeam.value?.members) return []
  return selectedTeam.value.members
    .filter(m => m.userId !== selectedTeam.value.teamLeaderId)
    .map(m => ({ id: m.userId, name: m.user?.name || 'Unknown' }))
})

const formatSubRole = (subRole) => {
  const roleLabels = {
    'frontend_developer': 'Frontend',
    'backend_developer': 'Backend',
    'fullstack_developer': 'Fullstack',
    'devops': 'DevOps'
  }
  return roleLabels[subRole] || subRole
}

const loadUsers = async () => {
  try {
    const response = await userAPI.getAllUsers({})
    if (response.data.success) {
      allUsers.value = response.data.users
    }
  } catch (error) {
    console.error('Error loading users:', error)
  }
}

const closeCreateDialog = () => {
  showCreateDialog.value = false
  editingTeam.value = null
  teamForm.value = { name: '', description: '', teamLeaderId: '' }
}

const saveTeam = async () => {
  if (!teamForm.value.name) {
    toast.add({ severity: 'error', summary: t('common.error'), detail: t('teams.nameRequired'), life: 3000 })
    return
  }

  try {
    if (editingTeam.value) {
      await teamStore.updateTeam(editingTeam.value.id, {
        name: teamForm.value.name,
        description: teamForm.value.description
      })
      toast.add({ severity: 'success', summary: t('common.success'), detail: t('teams.teamUpdated'), life: 3000 })
    } else {
      if (!teamForm.value.teamLeaderId) {
        toast.add({ severity: 'error', summary: t('common.error'), detail: t('teams.leaderRequired'), life: 3000 })
        return
      }
      await teamStore.createTeam(teamForm.value)
      toast.add({ severity: 'success', summary: t('common.success'), detail: t('teams.teamCreated'), life: 3000 })
    }
    closeCreateDialog()
    await teamStore.fetchTeams()
  } catch (error) {
    toast.add({ severity: 'error', summary: t('common.error'), detail: error.response?.data?.message || t('teams.saveError'), life: 3000 })
  }
}

const editTeam = (team) => {
  editingTeam.value = team
  teamForm.value = {
    name: team.name,
    description: team.description || '',
    teamLeaderId: team.teamLeaderId
  }
  showCreateDialog.value = true
}

const openTeamDetail = async (team) => {
  try {
    const response = await teamStore.fetchTeamById(team.id)
    selectedTeam.value = response.team
    showDetailDialog.value = true
  } catch (error) {
    toast.add({ severity: 'error', summary: t('common.error'), detail: t('teams.loadError'), life: 3000 })
  }
}

const addMember = async () => {
  if (!addMemberUserId.value || !selectedTeam.value) return
  try {
    const response = await teamStore.addTeamMember(selectedTeam.value.id, addMemberUserId.value)
    selectedTeam.value = response.team
    addMemberUserId.value = null
    showAddMemberDialog.value = false
    toast.add({ severity: 'success', summary: t('common.success'), detail: t('teams.memberAdded'), life: 3000 })
    await teamStore.fetchTeams()
  } catch (error) {
    toast.add({ severity: 'error', summary: t('common.error'), detail: error.response?.data?.message || t('teams.memberAddError'), life: 3000 })
  }
}

const removeMember = async (userId) => {
  if (!selectedTeam.value) return
  try {
    const response = await teamStore.removeTeamMember(selectedTeam.value.id, userId)
    selectedTeam.value = response.team
    toast.add({ severity: 'success', summary: t('common.success'), detail: t('teams.memberRemoved'), life: 3000 })
    await teamStore.fetchTeams()
  } catch (error) {
    toast.add({ severity: 'error', summary: t('common.error'), detail: error.response?.data?.message || t('teams.memberRemoveError'), life: 3000 })
  }
}

const doTransferLeadership = async () => {
  if (!newLeaderId.value || !selectedTeam.value) return
  try {
    const response = await teamStore.transferLeadership(selectedTeam.value.id, newLeaderId.value)
    selectedTeam.value = response.team
    newLeaderId.value = null
    showTransferDialog.value = false
    toast.add({ severity: 'success', summary: t('common.success'), detail: t('teams.leadershipTransferred'), life: 3000 })
    await teamStore.fetchTeams()
  } catch (error) {
    toast.add({ severity: 'error', summary: t('common.error'), detail: error.response?.data?.message || t('teams.transferError'), life: 3000 })
  }
}

const confirmDeleteTeam = (team) => {
  teamToDelete.value = team
  showDeleteDialog.value = true
}

const doDeleteTeam = async () => {
  if (!teamToDelete.value) return
  try {
    await teamStore.deleteTeam(teamToDelete.value.id)
    showDeleteDialog.value = false
    showDetailDialog.value = false
    teamToDelete.value = null
    toast.add({ severity: 'success', summary: t('common.success'), detail: t('teams.teamDeleted'), life: 3000 })
    await teamStore.fetchTeams()
  } catch (error) {
    toast.add({ severity: 'error', summary: t('common.error'), detail: error.response?.data?.message || t('teams.deleteError'), life: 3000 })
  }
}

onMounted(async () => {
  await Promise.all([
    teamStore.fetchTeams(),
    loadUsers()
  ])
})
</script>

<style scoped>
.teams-view {
  padding: 2rem;
}

.view-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.header-content h1 {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--color-text-primary, #1f2937);
  margin: 0;
}

.header-content p {
  color: var(--color-text-secondary, #6b7280);
  margin: 0.25rem 0 0 0;
}

.filters-card {
  background: var(--color-bg-primary, white);
  border-radius: 12px;
  padding: 1rem 1.5rem;
  border: 1px solid var(--color-border, #e5e7eb);
  margin-bottom: 1.5rem;
}

.filters-row {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.search-field {
  flex: 1;
  position: relative;
}

.search-field .search-icon {
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--color-text-secondary, #9ca3af);
}

.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.75rem;
  padding: 3rem;
  color: var(--color-text-secondary, #6b7280);
}

.loading-container i {
  font-size: 1.5rem;
}

.empty-state {
  text-align: center;
  padding: 4rem 2rem;
  background: var(--color-bg-primary, white);
  border-radius: 12px;
  border: 1px solid var(--color-border, #e5e7eb);
}

.empty-state i {
  font-size: 3rem;
  color: var(--color-text-secondary, #9ca3af);
  margin-bottom: 1rem;
}

.empty-state h3 {
  color: var(--color-text-primary, #1f2937);
  margin: 0 0 0.5rem;
}

.empty-state p {
  color: var(--color-text-secondary, #6b7280);
  margin-bottom: 1.5rem;
}

.teams-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 1.25rem;
}

.team-card {
  background: var(--color-bg-primary, white);
  border-radius: 12px;
  border: 1px solid var(--color-border, #e5e7eb);
  padding: 1.5rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.team-card:hover {
  border-color: #7c3aed;
  box-shadow: 0 4px 12px rgba(124, 58, 237, 0.1);
  transform: translateY(-2px);
}

.team-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
}

.team-info h3 {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-text-primary, #1f2937);
  margin: 0 0 0.25rem;
}

.team-description {
  color: var(--color-text-secondary, #6b7280);
  font-size: 0.875rem;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.team-actions {
  display: flex;
  gap: 0.25rem;
}

.btn-icon {
  background: none;
  border: none;
  padding: 0.375rem;
  border-radius: 6px;
  cursor: pointer;
  color: var(--color-text-secondary, #6b7280);
  transition: all 0.2s;
}

.btn-icon:hover {
  background: var(--color-bg-tertiary, #f3f4f6);
  color: #7c3aed;
}

.btn-icon.danger:hover {
  background: #fef2f2;
  color: #ef4444;
}

.team-card-body {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.team-leader,
.team-member-count {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: var(--color-text-secondary, #6b7280);
}

.team-leader i {
  color: #f59e0b;
}

.team-member-avatars {
  display: flex;
  align-items: center;
  gap: -0.25rem;
}

.member-avatar-small {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--color-bg-tertiary, #f3f4f6);
  border: 2px solid white;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  margin-left: -4px;
}

.member-avatar-small:first-child {
  margin-left: 0;
}

.member-avatar-small img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.member-avatar-small i {
  font-size: 0.7rem;
  color: var(--color-text-secondary, #9ca3af);
}

.more-members {
  font-size: 0.75rem;
  color: var(--color-text-secondary, #6b7280);
  margin-left: 0.5rem;
}

/* Dialog Styles */
.dialog-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  font-weight: 600;
  font-size: 0.875rem;
  color: var(--color-text-primary, #1f2937);
}

.required {
  color: #ef4444;
}

.user-option {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.user-name {
  font-weight: 500;
}

.user-email {
  font-size: 0.8rem;
  color: var(--color-text-secondary, #6b7280);
}

.user-roles {
  display: flex;
  gap: 0.25rem;
  margin-top: 0.125rem;
}

.role-tag-sm {
  font-size: 0.7rem;
  padding: 0.1rem 0.4rem;
  border-radius: 4px;
  background: rgba(124, 58, 237, 0.1);
  color: #7c3aed;
}

/* Team Detail */
.team-detail {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.detail-section h4 {
  margin: 0 0 0.75rem;
  font-weight: 600;
  color: var(--color-text-primary, #1f2937);
}

.detail-section p {
  color: var(--color-text-secondary, #6b7280);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.section-header h4 {
  margin: 0;
}

.leader-card,
.member-card {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  border-radius: 8px;
  background: var(--color-bg-secondary, #f9fafb);
  border: 1px solid var(--color-border, #e5e7eb);
}

.members-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-height: 400px;
  overflow-y: auto;
}

.member-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--color-bg-tertiary, #e5e7eb);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
}

.member-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.member-info {
  flex: 1;
  min-width: 0;
}

.member-info h5 {
  margin: 0;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-text-primary, #1f2937);
}

.member-info p {
  margin: 0;
  font-size: 0.8rem;
  color: var(--color-text-secondary, #6b7280);
}

.member-roles {
  display: flex;
  gap: 0.25rem;
  flex-wrap: wrap;
  margin-top: 0.25rem;
}

.role-tag {
  font-size: 0.7rem;
  padding: 0.15rem 0.5rem;
  border-radius: 4px;
  background: rgba(124, 58, 237, 0.1);
  color: #7c3aed;
  font-weight: 500;
}

.role-badge {
  font-size: 0.75rem;
  padding: 0.2rem 0.6rem;
  border-radius: 12px;
  font-weight: 500;
  flex-shrink: 0;
}

.role-badge.leader {
  background: rgba(245, 158, 11, 0.1);
  color: #d97706;
}

.role-badge.member {
  background: rgba(124, 58, 237, 0.1);
  color: #7c3aed;
}

.transfer-warning {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background: #fffbeb;
  border-radius: 8px;
  color: #92400e;
  font-size: 0.875rem;
  margin-bottom: 0.5rem;
}

.transfer-warning i {
  color: #f59e0b;
}

/* Dialog footer */
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  width: 100%;
}

.btn-primary {
  background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%) !important;
  color: white !important;
  border: none !important;
  border-radius: 8px !important;
  font-weight: 600 !important;
  padding: 0.625rem 1.25rem !important;
  transition: all 0.2s ease !important;
}

.btn-primary:hover {
  background: linear-gradient(135deg, #6d28d9 0%, #5b21b6 100%) !important;
  transform: translateY(-1px) !important;
  box-shadow: 0 4px 12px rgba(124, 58, 237, 0.3) !important;
}

.btn-secondary {
  background: var(--color-bg-tertiary, #f3f4f6) !important;
  color: var(--color-text-primary, #374151) !important;
  border: 1px solid var(--color-border, #e5e7eb) !important;
  border-radius: 8px !important;
  font-weight: 600 !important;
  padding: 0.625rem 1.25rem !important;
  transition: all 0.2s ease !important;
}

.btn-secondary:hover {
  background: var(--color-bg-secondary, #e5e7eb) !important;
}

@media (max-width: 768px) {
  .teams-grid {
    grid-template-columns: 1fr;
  }
  
  .teams-view {
    padding: 1rem;
  }
}
</style>

<!-- Unscoped styles for PrimeVue overlays that are teleported to body -->
<style>
/* Dialog styling */
.team-dialog .p-dialog-header {
  background: var(--color-bg-primary, white) !important;
  color: var(--color-text-primary, #1f2937) !important;
  border-bottom: 1px solid var(--color-border, #e5e7eb) !important;
  padding: 1.25rem 1.5rem !important;
}

.team-dialog .p-dialog-header .p-dialog-title {
  font-weight: 700 !important;
  font-size: 1.125rem !important;
}

.team-dialog .p-dialog-header .p-dialog-header-icon {
  color: var(--color-text-secondary, #6b7280) !important;
}

.team-dialog .p-dialog-header .p-dialog-header-icon:hover {
  background: var(--color-bg-tertiary, #f3f4f6) !important;
}

.team-dialog .p-dialog-content {
  background: var(--color-bg-primary, white) !important;
  color: var(--color-text-primary, #1f2937) !important;
  padding: 1.5rem !important;
}

.team-dialog .p-dialog-footer {
  background: var(--color-bg-primary, white) !important;
  border-top: 1px solid var(--color-border, #e5e7eb) !important;
  padding: 1rem 1.5rem !important;
}

.team-dialog .p-inputtext,
.team-dialog .p-textarea {
  background: var(--color-bg-secondary, #f9fafb) !important;
  border: 1px solid var(--color-border, #e5e7eb) !important;
  color: var(--color-text-primary, #1f2937) !important;
  border-radius: 8px !important;
}

.team-dialog .p-inputtext:focus,
.team-dialog .p-textarea:focus {
  border-color: #7c3aed !important;
  box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.15) !important;
}

.team-dialog .p-dropdown {
  background: var(--color-bg-secondary, #f9fafb) !important;
  border: 1px solid var(--color-border, #e5e7eb) !important;
  border-radius: 8px !important;
}

.team-dialog .p-dropdown .p-dropdown-label {
  color: var(--color-text-primary, #1f2937) !important;
}

.team-dialog .p-dropdown .p-dropdown-trigger {
  color: var(--color-text-secondary, #6b7280) !important;
}

.team-dialog .p-dropdown:hover {
  border-color: #7c3aed !important;
}

.team-dialog .p-dropdown.p-focus {
  border-color: #7c3aed !important;
  box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.15) !important;
}

/* Dropdown panel overlay (teleported to body) */
.p-dropdown-panel {
  background: var(--color-bg-primary, white) !important;
  border: 1px solid var(--color-border, #e5e7eb) !important;
  border-radius: 8px !important;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.15) !important;
  z-index: 9999 !important;
}

.p-dropdown-panel .p-dropdown-header {
  background: var(--color-bg-primary, white) !important;
  border-bottom: 1px solid var(--color-border, #e5e7eb) !important;
  padding: 0.75rem !important;
}

.p-dropdown-panel .p-dropdown-header .p-dropdown-filter {
  background: var(--color-bg-secondary, #f9fafb) !important;
  border: 1px solid var(--color-border, #e5e7eb) !important;
  color: var(--color-text-primary, #1f2937) !important;
  border-radius: 6px !important;
}

.p-dropdown-panel .p-dropdown-items {
  padding: 0.25rem !important;
}

.p-dropdown-panel .p-dropdown-item {
  color: var(--color-text-primary, #1f2937) !important;
  padding: 0.625rem 0.75rem !important;
  border-radius: 6px !important;
  margin: 1px 0 !important;
  transition: background 0.15s ease !important;
}

.p-dropdown-panel .p-dropdown-item:hover {
  background: var(--color-bg-tertiary, #f3f4f6) !important;
}

.p-dropdown-panel .p-dropdown-item.p-highlight {
  background: rgba(124, 58, 237, 0.1) !important;
  color: #7c3aed !important;
}

.p-dropdown-panel .p-dropdown-empty-message {
  color: var(--color-text-secondary, #6b7280) !important;
  padding: 0.625rem 0.75rem !important;
}

/* Team detail dialog */
.team-detail-dialog .p-dialog-header {
  background: var(--color-bg-primary, white) !important;
  color: var(--color-text-primary, #1f2937) !important;
  border-bottom: 1px solid var(--color-border, #e5e7eb) !important;
  padding: 1.25rem 1.5rem !important;
}

.team-detail-dialog .p-dialog-header .p-dialog-title {
  font-weight: 700 !important;
  font-size: 1.125rem !important;
}

.team-detail-dialog .p-dialog-content {
  background: var(--color-bg-primary, white) !important;
  color: var(--color-text-primary, #1f2937) !important;
  padding: 1.5rem !important;
}

.team-detail-dialog .p-dialog-footer {
  background: var(--color-bg-primary, white) !important;
  border-top: 1px solid var(--color-border, #e5e7eb) !important;
}
</style>
