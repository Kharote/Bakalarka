// System Settings Service
// Central service for reading system settings from the database
// Used by AI services, middleware, and controllers to get admin-configured values

import SystemSettings from '../models/SystemSettings.js';

// Simple in-memory cache with TTL
let settingsCache = {};
let cacheTimestamp = 0;
const CACHE_TTL = 30000; // 30 seconds

/**
 * Get a specific setting value from the database (with caching)
 * @param {string} key - Setting key (e.g., 'ai.provider')
 * @returns {object|null} - The JSONB value or null
 */
export async function getSetting(key) {
  try {
    const now = Date.now();
    if (now - cacheTimestamp < CACHE_TTL && settingsCache[key] !== undefined) {
      return settingsCache[key];
    }

    const setting = await SystemSettings.findOne({ where: { key } });
    const value = setting ? setting.value : null;
    settingsCache[key] = value;
    cacheTimestamp = now;
    return value;
  } catch (error) {
    // If DB is not ready yet (e.g., during startup), fall back to null
    console.warn(`[SystemSettings] Could not read setting "${key}":`, error.message);
    return null;
  }
}

/**
 * Get multiple settings at once
 * @param {string[]} keys - Array of setting keys
 * @returns {object} - Map of key -> value
 */
export async function getSettings(keys) {
  const result = {};
  try {
    const settings = await SystemSettings.findAll({
      where: { key: keys }
    });
    for (const s of settings) {
      result[s.key] = s.value;
      settingsCache[s.key] = s.value;
    }
    cacheTimestamp = Date.now();
  } catch (error) {
    console.warn('[SystemSettings] Could not read settings:', error.message);
  }
  return result;
}

/**
 * Clear the settings cache (called after admin updates settings)
 */
export function clearSettingsCache() {
  settingsCache = {};
  cacheTimestamp = 0;
}

export default { getSetting, getSettings, clearSettingsCache };
