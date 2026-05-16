<template>
  <div class="error-state">
    <div class="error-icon">
      <i :class="icon"></i>
    </div>
    <h3>{{ title }}</h3>
    <p v-if="description">{{ description }}</p>
    <div class="error-actions" v-if="$slots.default">
      <slot></slot>
    </div>
  </div>
</template>

<script setup>
defineProps({
  icon: {
    type: String,
    default: 'pi pi-exclamation-triangle'
  },
  title: {
    type: String,
    default: 'Something went wrong'
  },
  description: {
    type: String,
    default: ''
  }
})
</script>

<style scoped>
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  text-align: center;
}

.error-icon {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1.5rem;
}

.error-icon i {
  font-size: 2.5rem;
  color: #dc2626;
}

.error-state h3 {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0 0 0.75rem 0;
}

.error-state p {
  font-size: 1rem;
  color: var(--color-text-secondary);
  margin: 0 0 2rem 0;
  max-width: 500px;
  line-height: 1.6;
}

.error-actions {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  justify-content: center;
}

@media (max-width: 768px) {
  .error-state {
    padding: 3rem 1.5rem;
  }
  
  .error-icon {
    width: 64px;
    height: 64px;
  }
  
  .error-icon i {
    font-size: 2rem;
  }
  
  .error-state h3 {
    font-size: 1.25rem;
  }
  
  .error-state p {
    font-size: 0.9375rem;
  }
  
  .error-actions {
    flex-direction: column;
    width: 100%;
  }
}
</style>
