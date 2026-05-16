<template>
  <div class="empty-state">
    <div class="empty-content">
      <div class="empty-icon">
        <slot name="icon">
          <i :class="iconClass"></i>
        </slot>
      </div>
      <slot name="title">
        <h3 class="empty-title">{{ title }}</h3>
      </slot>
      <slot name="subtitle">
        <p v-if="subtitle" class="empty-subtitle">{{ subtitle }}</p>
      </slot>
      <slot name="action"></slot>
    </div>
  </div>
</template>

<script setup>
defineProps({
  title: String,
  subtitle: String,
  iconClass: {
    type: String,
    default: 'pi pi-folder-open'
  }
})
</script>

<style scoped>
.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 300px;
  padding: 3rem 1rem;
}

.empty-content {
  text-align: center;
  max-width: 400px;
}

.empty-icon {
  width: 80px;
  height: 80px;
  background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 1.5rem;
}

.empty-icon i {
  font-size: 2rem;
  color: #9ca3af;
}

.empty-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #374151;
  margin: 0 0 0.5rem 0;
}

.empty-subtitle {
  font-size: 1rem;
  color: #6b7280;
  margin: 0 0 2rem 0;
  line-height: 1.5;
}
</style>