<template>
  <div class="view-container ai-assistant-view">
    <!-- Standardized Header -->
    <div class="view-header">
      <div class="header-content">
        <h1>AI Assistant</h1>
        <p>Get AI-powered insights and assistance for your projects</p>
      </div>
    </div>
    
    <div class="grid grid-cols-2 gap-2">
      <Card>
        <template #title>Generate Project Plan</template>
        <template #content>
          <p class="mb-2">Create a comprehensive project plan using AI</p>
          <Button label="Generate Plan" icon="pi pi-sparkles" @click="generatePlan" />
        </template>
      </Card>
      
      <Card>
        <template #title>Task Suggestions</template>
        <template #content>
          <p class="mb-2">Get AI-generated task suggestions for your project</p>
          <Button label="Suggest Tasks" icon="pi pi-list" @click="suggestTasks" />
        </template>
      </Card>
      
      <Card>
        <template #title>Risk Analysis</template>
        <template #content>
          <p class="mb-2">Analyze potential risks in your project</p>
          <Button label="Analyze Risks" icon="pi pi-exclamation-triangle" @click="analyzeRisks" />
        </template>
      </Card>
      
      <Card>
        <template #title>Resource Optimization</template>
        <template #content>
          <p class="mb-2">Optimize team resource allocation</p>
          <Button label="Optimize Resources" icon="pi pi-users" @click="optimizeResources" />
        </template>
      </Card>
    </div>
  </div>
</template>

<script setup>
import { useToast } from 'primevue/usetoast'
import Card from 'primevue/card'
import Button from 'primevue/button'

const toast = useToast()

const generatePlan = () => {
  toast.add({
    severity: 'info',
    summary: 'Info',
    detail: 'Project plan generation feature coming soon',
    life: 3000
  })
}

const suggestTasks = () => {
  toast.add({
    severity: 'info',
    summary: 'Info',
    detail: 'Task suggestion feature coming soon',
    life: 3000
  })
}

const analyzeRisks = () => {
  toast.add({
    severity: 'info',
    summary: 'Info',
    detail: 'Risk analysis feature coming soon',
    life: 3000
  })
}

const optimizeResources = () => {
  toast.add({
    severity: 'info',
    summary: 'Info',
    detail: 'Resource optimization feature coming soon',
    life: 3000
  })
}
</script>

<style scoped>
.ai-assistant-view {
  max-width: 1400px;
  margin: 0 auto;
}
</style>
