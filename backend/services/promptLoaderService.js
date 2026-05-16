// Prompt Loader Service
// Loads AI prompts from locale-specific .txt files

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class PromptLoaderService {
  constructor() {
    this.promptsDir = path.join(__dirname, '..', 'prompts');
    this.cache = new Map();
  }

  /**
   * Load a prompt template from file
   * @param {string} promptName - Name of the prompt file (without .txt extension)
   * @param {string} locale - Locale code (e.g., 'en', 'cs', 'de')
   * @returns {Promise<string>} - The prompt template content
   */
  async loadPrompt(promptName, locale = 'en') {
    const cacheKey = `${locale}:${promptName}`;
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      console.log(`Prompt loaded from cache: ${cacheKey}`);
      return this.cache.get(cacheKey);
    }

    try {
      const filePath = path.join(this.promptsDir, locale, `${promptName}.txt`);
      console.log(`Loading prompt from: ${filePath}`);
      const content = await fs.readFile(filePath, 'utf-8');
      
      // Cache the content
      this.cache.set(cacheKey, content);
      console.log(`Prompt loaded and cached: ${cacheKey} (${content.length} chars)`);
      
      return content;
    } catch (error) {
      // Fallback to English if locale not found
      if (locale !== 'en') {
        console.warn(`[WARN] Prompt '${promptName}' not found for locale '${locale}', falling back to 'en'`);
        return this.loadPrompt(promptName, 'en');
      }
      
      console.error(`[ERROR] Failed to load prompt '${promptName}' for locale '${locale}':`, error);
      throw new Error(`Prompt template '${promptName}' not found`);
    }
  }

  /**
   * Replace placeholders in prompt template with actual values
   * @param {string} template - The prompt template with {{placeholders}}
   * @param {Object} data - Object with placeholder values
   * @returns {string} - The filled prompt
   */
  fillTemplate(template, data) {
    let filled = template;
    
    for (const [key, value] of Object.entries(data)) {
      const placeholder = `{{${key}}}`;
      const replacement = value !== undefined && value !== null ? String(value) : '';
      filled = filled.split(placeholder).join(replacement);
    }
    
    return filled;
  }

  /**
   * Load and fill a prompt template
   * @param {string} promptName - Name of the prompt file
   * @param {Object} data - Data to fill the template
   * @param {string} locale - Locale code
   * @returns {Promise<string>} - The filled prompt
   */
  async getPrompt(promptName, data, locale = 'en') {
    const template = await this.loadPrompt(promptName, locale);
    return this.fillTemplate(template, data);
  }

  /**
   * Clear the cache (useful for development/testing)
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Get list of available locales
   * @returns {Promise<string[]>} - Array of locale codes
   */
  async getAvailableLocales() {
    try {
      const entries = await fs.readdir(this.promptsDir, { withFileTypes: true });
      return entries
        .filter(entry => entry.isDirectory())
        .map(entry => entry.name);
    } catch (error) {
      console.error('Failed to get available locales:', error);
      return ['en']; // Fallback to English only
    }
  }
}

export default new PromptLoaderService();
