import OpenAI from 'openai';

/**
 * OpenAI configuration for AI-powered project planning features
 * This handles all AI-related functionality in the application
 */
const openaiClient = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Check if OpenAI is properly configured
 */
export const isOpenAIConfigured = () => {
  return !!process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your-openai-api-key';
};

export default openaiClient;
