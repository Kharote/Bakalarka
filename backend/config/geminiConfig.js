// Google Gemini AI configuration
// Setup for Google's Generative AI API

import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-pro';

if (!GEMINI_API_KEY) {
  console.warn('Warning: GEMINI_API_KEY is not set in environment variables');
}

// Initialize Google Generative AI
const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

// Get the generative model
const getModel = () => {
  if (!genAI) {
    throw new Error('Gemini API is not configured');
  }
  return genAI.getGenerativeModel({ model: GEMINI_MODEL });
};

export { getModel, GEMINI_MODEL };
