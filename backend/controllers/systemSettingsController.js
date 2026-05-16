// System Settings Controller
// Admin-only endpoints for managing system-wide settings

import SystemSettings from '../models/SystemSettings.js';
import { AppError } from '../middleware/errorHandler.js';
import promptLoaderService from '../services/promptLoaderService.js';
import { clearSettingsCache } from '../services/systemSettingsService.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Default system settings that are seeded on first load
const DEFAULT_SETTINGS = [
  {
    key: 'ai.provider',
    value: { provider: process.env.AI_SERVICE_PROVIDER || 'gemini' },
    category: 'ai',
    description: 'Active AI service provider (gemini or openwebui)'
  },
  {
    key: 'ai.gemini.model',
    value: { model: process.env.GEMINI_MODEL || 'gemini-2.5-flash' },
    category: 'ai',
    description: 'Gemini model to use for AI generation'
  },
  {
    key: 'ai.openwebui.model',
    value: { model: process.env.OPENWEBUI_DEFAULT_MODEL || 'llama3.1:latest' },
    category: 'ai',
    description: 'OpenWebUI model to use for AI generation'
  },
  {
    key: 'ai.maxTokens',
    value: { maxTokens: 8192 },
    category: 'ai',
    description: 'Maximum tokens for AI responses'
  },
  {
    key: 'ai.modelRestriction',
    value: { restricted: false, model: null },
    category: 'ai',
    description: 'When restricted, all users must use the specified model. When not restricted, PMs can choose freely.'
  },
  {
    key: 'ai.temperature',
    value: { temperature: 0.7 },
    category: 'ai',
    description: 'AI creativity/randomness (0.0 = deterministic, 1.0 = creative)'
  },
  {
    key: 'system.maintenanceMode',
    value: { enabled: false, message: 'System is under maintenance. Please try again later.' },
    category: 'system',
    description: 'Enable/disable maintenance mode'
  },
  {
    key: 'system.maxProjectsPerUser',
    value: { limit: 50 },
    category: 'system',
    description: 'Maximum number of projects a user can own'
  },
  {
    key: 'notifications.teamsEnabled',
    value: { enabled: true },
    category: 'notifications',
    description: 'Enable/disable Microsoft Teams notifications system-wide'
  }
];

/**
 * Seed default settings if they don't exist
 */
const seedDefaults = async () => {
  for (const setting of DEFAULT_SETTINGS) {
    await SystemSettings.findOrCreate({
      where: { key: setting.key },
      defaults: setting
    });
  }
};

/**
 * GET /api/admin/settings
 * Get all system settings grouped by category
 */
export const getAllSettings = async (req, res, next) => {
  try {
    // Seed defaults on first access
    await seedDefaults();

    const settings = await SystemSettings.findAll({
      order: [['category', 'ASC'], ['key', 'ASC']]
    });

    // Group by category
    const grouped = {};
    settings.forEach(setting => {
      if (!grouped[setting.category]) {
        grouped[setting.category] = [];
      }
      grouped[setting.category].push({
        id: setting.id,
        key: setting.key,
        value: setting.value,
        category: setting.category,
        description: setting.description,
        updatedAt: setting.updatedAt,
        updatedBy: setting.updatedBy
      });
    });

    res.json({
      success: true,
      settings: grouped
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/settings/:key
 * Get a specific setting by key
 */
export const getSetting = async (req, res, next) => {
  try {
    const { key } = req.params;

    const setting = await SystemSettings.findOne({ where: { key } });
    if (!setting) {
      throw new AppError(`Setting '${key}' not found`, 404);
    }

    res.json({
      success: true,
      setting: {
        id: setting.id,
        key: setting.key,
        value: setting.value,
        category: setting.category,
        description: setting.description,
        updatedAt: setting.updatedAt,
        updatedBy: setting.updatedBy
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/admin/settings/:key
 * Update a specific setting
 */
export const updateSetting = async (req, res, next) => {
  try {
    const { key } = req.params;
    const { value } = req.body;

    if (value === undefined || value === null) {
      throw new AppError('Setting value is required', 400);
    }

    let setting = await SystemSettings.findOne({ where: { key } });
    if (!setting) {
      throw new AppError(`Setting '${key}' not found`, 404);
    }

    setting.value = value;
    setting.updatedBy = req.user.id;
    await setting.save();

    // Clear cache so services pick up changes
    clearSettingsCache();

    res.json({
      success: true,
      setting: {
        id: setting.id,
        key: setting.key,
        value: setting.value,
        category: setting.category,
        description: setting.description,
        updatedAt: setting.updatedAt,
        updatedBy: setting.updatedBy
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/admin/settings
 * Batch update multiple settings
 */
export const updateMultipleSettings = async (req, res, next) => {
  try {
    const { settings } = req.body;

    if (!settings || !Array.isArray(settings)) {
      throw new AppError('Settings array is required', 400);
    }

    const updated = [];
    for (const { key, value } of settings) {
      const setting = await SystemSettings.findOne({ where: { key } });
      if (setting) {
        setting.value = value;
        setting.updatedBy = req.user.id;
        await setting.save();
        updated.push(setting);
      }
    }

    res.json({
      success: true,
      message: `${updated.length} settings updated`,
      updated: updated.map(s => ({
        key: s.key,
        value: s.value,
        updatedAt: s.updatedAt
      }))
    });

    // Clear cache so services pick up changes immediately
    clearSettingsCache();
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/prompts
 * Get all AI prompt templates
 */
export const getPrompts = async (req, res, next) => {
  try {
    const promptsDir = path.join(__dirname, '..', 'prompts');
    const locales = await promptLoaderService.getAvailableLocales();
    const prompts = {};

    for (const locale of locales) {
      const localeDir = path.join(promptsDir, locale);
      try {
        const files = await fs.readdir(localeDir);
        prompts[locale] = {};

        for (const file of files) {
          if (file.endsWith('.txt')) {
            const name = file.replace('.txt', '');
            const content = await fs.readFile(path.join(localeDir, file), 'utf-8');
            prompts[locale][name] = content;
          }
        }
      } catch (err) {
        console.warn(`Could not read prompts for locale ${locale}:`, err.message);
      }
    }

    res.json({
      success: true,
      prompts,
      locales
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/admin/prompts/:locale/:promptName
 * Update a specific AI prompt template
 */
export const updatePrompt = async (req, res, next) => {
  try {
    const { locale, promptName } = req.params;
    const { content } = req.body;

    if (!content) {
      throw new AppError('Prompt content is required', 400);
    }

    // Validate locale
    const validLocales = await promptLoaderService.getAvailableLocales();
    if (!validLocales.includes(locale)) {
      // Create locale directory if it doesn't exist
      const localeDir = path.join(__dirname, '..', 'prompts', locale);
      await fs.mkdir(localeDir, { recursive: true });
    }

    const filePath = path.join(__dirname, '..', 'prompts', locale, `${promptName}.txt`);
    await fs.writeFile(filePath, content, 'utf-8');

    // Clear the prompt cache so changes take effect
    promptLoaderService.clearCache();

    res.json({
      success: true,
      message: `Prompt '${promptName}' for locale '${locale}' updated successfully`
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/prompts/:locale/:promptName
 * Create a new prompt template
 */
export const createPrompt = async (req, res, next) => {
  try {
    const { locale, promptName } = req.params;
    const { content } = req.body;

    if (!content) {
      throw new AppError('Prompt content is required', 400);
    }

    const localeDir = path.join(__dirname, '..', 'prompts', locale);
    await fs.mkdir(localeDir, { recursive: true });

    const filePath = path.join(localeDir, `${promptName}.txt`);

    // Check if file already exists
    try {
      await fs.access(filePath);
      throw new AppError(`Prompt '${promptName}' already exists for locale '${locale}'`, 409);
    } catch (err) {
      if (err instanceof AppError) throw err;
      // File doesn't exist — good, continue
    }

    await fs.writeFile(filePath, content, 'utf-8');
    promptLoaderService.clearCache();

    res.status(201).json({
      success: true,
      message: `Prompt '${promptName}' created for locale '${locale}'`
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/admin/prompts/:locale/:promptName
 * Delete a prompt template
 */
// System prompts that cannot be deleted
const SYSTEM_PROMPTS = ['project-tasks', 'risk-analysis', 'timeline', 'gantt-chart', 'gantt-chart-json'];

export const deletePrompt = async (req, res, next) => {
  try {
    const { locale, promptName } = req.params;

    if (SYSTEM_PROMPTS.includes(promptName)) {
      throw new AppError(`Cannot delete system prompt '${promptName}'. System prompts are required for core functionality.`, 403);
    }

    const filePath = path.join(__dirname, '..', 'prompts', locale, `${promptName}.txt`);

    try {
      await fs.access(filePath);
    } catch {
      throw new AppError(`Prompt '${promptName}' not found for locale '${locale}'`, 404);
    }

    await fs.unlink(filePath);
    promptLoaderService.clearCache();

    res.json({
      success: true,
      message: `Prompt '${promptName}' deleted for locale '${locale}'`
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/model-restriction (public, requires only auth)
 * Check if model selection is restricted by admin
 */
export const getModelRestriction = async (req, res, next) => {
  try {
    // Seed defaults if needed
    await seedDefaults();

    const setting = await SystemSettings.findOne({
      where: { key: 'ai.modelRestriction' }
    });

    const value = setting?.value || { restricted: false, model: null };

    res.json({
      success: true,
      data: {
        restricted: value.restricted || false,
        model: value.model || null
      }
    });
  } catch (error) {
    next(error);
  }
};
