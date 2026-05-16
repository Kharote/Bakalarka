// AI Service Factory
// Selects and returns the appropriate AI service based on admin system settings (DB)
// Falls back to environment variable if DB is unavailable

import dotenv from 'dotenv';
import { getSetting } from './systemSettingsService.js';

dotenv.config();

let serviceInstance = null;
let currentProvider = null;

// Get AI service based on configuration
async function getAIService() {
  // Read provider from DB (admin setting), fall back to env
  let provider;
  try {
    const providerSetting = await getSetting('ai.provider');
    provider = providerSetting?.provider || process.env.AI_SERVICE_PROVIDER || 'gemini';
  } catch {
    provider = process.env.AI_SERVICE_PROVIDER || 'gemini';
  }
  provider = provider.toLowerCase();

  // If provider changed, invalidate cached instance
  if (serviceInstance && currentProvider !== provider) {
    console.log(`🔄 AI provider changed from ${currentProvider} to ${provider}, reinitializing...`);
    serviceInstance = null;
  }

  if (serviceInstance) {
    return serviceInstance;
  }

  currentProvider = provider;
  console.log(`🤖 Initializing AI Service Provider: ${provider}`);

  if (provider === 'openwebui') {
    const { default: openwebuiService } = await import('./openwebuiProjectService.js');
    serviceInstance = openwebuiService;
    console.log('✅ OpenWebUI service initialized');
  } else if (provider === 'gemini') {
    const { default: geminiService } = await import('./geminiProjectService.js');
    serviceInstance = geminiService;
    console.log('✅ Gemini service initialized');
  } else {
    console.warn(`⚠️  Unknown AI provider "${provider}", falling back to Gemini`);
    const { default: geminiService } = await import('./geminiProjectService.js');
    serviceInstance = geminiService;
    currentProvider = 'gemini';
  }

  return serviceInstance;
}

// Get current provider name
async function getCurrentProvider() {
  try {
    const providerSetting = await getSetting('ai.provider');
    return (providerSetting?.provider || process.env.AI_SERVICE_PROVIDER || 'gemini').toLowerCase();
  } catch {
    return (process.env.AI_SERVICE_PROVIDER || 'gemini').toLowerCase();
  }
}

// Invalidate cached service (call when admin changes provider)
function invalidateServiceCache() {
  serviceInstance = null;
  currentProvider = null;
}

export { getAIService, getCurrentProvider, invalidateServiceCache };
export default getAIService;
