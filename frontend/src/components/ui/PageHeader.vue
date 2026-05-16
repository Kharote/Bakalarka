<template>
  <div class="page-header">
    <div class="header-content">
      <div class="header-info">
        <slot name="title">
          <h1 class="header-title">{{ title }}</h1>
        </slot>
        <slot name="subtitle">
          <p v-if="subtitle" class="header-subtitle">{{ subtitle }}</p>
        </slot>
      </div>
      <div class="header-actions">
        <slot name="actions"></slot>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  title: String,
  subtitle: String
})
</script>

<style scoped>
.page-header {
  background: white;
  border-bottom: 1px solid #e5e7eb;
  margin-bottom: 2rem;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 2rem 0;
  gap: 2rem;
}

.header-info {
  flex: 1;
}

.header-title {
  font-size: 2rem;
  font-weight: 700;
  color: #111827;
  margin: 0 0 0.5rem 0;
  line-height: 1.2;
}

.header-subtitle {
  font-size: 1rem;
  color: #6b7280;
  margin: 0;
  line-height: 1.5;
}

.header-actions {
  display: flex;
  gap: 1rem;
  align-items: center;
  flex-shrink: 0;
}

@media (max-width: 768px) {
  .header-content {
    flex-direction: column;
    align-items: stretch;
    gap: 1rem;
  }

  .header-title {
    font-size: 1.5rem;
  }

  .header-actions {
    justify-content: flex-end;
  }
}
</style>