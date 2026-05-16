<template>
  <div class="stat-card">
    <div class="stat-icon" :style="{ backgroundColor: color + '20' }">
      <i :class="iconClass" :style="{ color }"></i>
    </div>
    <div class="stat-content">
      <h3 class="stat-value">{{ value }}</h3>
      <p class="stat-label">{{ label }}</p>
    </div>
  </div>
</template>

<script setup>
defineProps({
  label: {
    type: String,
    required: true
  },
  value: {
    type: [String, Number],
    required: true
  },
  iconClass: {
    type: String,
    required: true
  },
  color: {
    type: String,
    required: true
  }
})
</script>

<style scoped>
.stat-card {
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 1.5rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  transition: all 0.2s ease;
}

.stat-card:hover {
  border-color: var(--color-border);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-icon i {
  font-size: 1.25rem;
}

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: 1.875rem;
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0 0 0.25rem 0;
  line-height: 1;
}

.stat-label {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  margin: 0;
  font-weight: 500;
}

@media (max-width: 768px) {
  .stat-card {
    padding: 1rem;
  }
  
  .stat-value {
    font-size: 1.5rem;
  }
}
</style>