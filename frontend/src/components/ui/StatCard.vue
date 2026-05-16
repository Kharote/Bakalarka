<template>
  <div class="stat-card" :class="color">
    <div class="stat-icon">
      <i :class="icon"></i>
    </div>
    <div class="stat-content">
      <div class="stat-value">{{ value }}</div>
      <div class="stat-title">{{ title }}</div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'StatCard',
  props: {
    title: {
      type: String,
      required: true
    },
    value: {
      type: [String, Number],
      required: true
    },
    icon: {
      type: String,
      default: 'pi pi-info-circle'
    },
    color: {
      type: String,
      default: 'blue',
      validator: value => ['blue', 'green', 'purple', 'red', 'orange'].includes(value)
    }
  }
};
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
  border-left: 4px solid var(--accent-color);
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.stat-card.blue {
  --accent-color: var(--color-primary);
}

.stat-card.green {
  --accent-color: var(--color-success);
}

.stat-card.purple {
  --accent-color: #8b5cf6;
}

.stat-card.red {
  --accent-color: var(--color-error);
}

.stat-card.orange {
  --accent-color: var(--color-warning);
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: var(--accent-color);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-icon i {
  font-size: 1.5rem;
  color: white;
}

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: 1.8rem;
  font-weight: 700;
  color: var(--color-text-primary);
  line-height: 1;
  margin-bottom: 0.25rem;
}

.stat-title {
  font-size: 0.9rem;
  color: var(--color-text-secondary);
  font-weight: 500;
}

@media (max-width: 768px) {
  .stat-card {
    padding: 1rem;
  }
  
  .stat-icon {
    width: 40px;
    height: 40px;
  }
  
  .stat-icon i {
    font-size: 1.25rem;
  }
  
  .stat-value {
    font-size: 1.5rem;
  }
}
</style>