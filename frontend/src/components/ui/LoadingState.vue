<template>
  <div class="loading-state">
    <div class="loading-content">
      <div class="loading-spinner">
        <i class="pi pi-spin pi-spinner"></i>
      </div>
      <slot>
        <p class="loading-text">{{ text }}</p>
      </slot>
    </div>
  </div>
</template>

<script setup>
defineProps({
  text: {
    type: String,
    default: 'Loading...'
  }
})
</script>

<style scoped>
.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  padding: 2rem 1rem;
}

.loading-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.loading-spinner i {
  font-size: 2rem;
  color: #4f46e5;
}

.loading-text {
  font-size: 1rem;
  color: #6b7280;
  margin: 0;
}
</style>