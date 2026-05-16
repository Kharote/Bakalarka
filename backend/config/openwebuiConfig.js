// OpenWebUI configuration
// Setup for OpenWebUI API

import dotenv from 'dotenv';

dotenv.config();

const OPENWEBUI_API_URL = process.env.OPENWEBUI_API_URL || 'http://localhost:8080';
const OPENWEBUI_API_KEY = process.env.OPENWEBUI_API_KEY;

if (!OPENWEBUI_API_KEY) {
  console.warn('Warning: OPENWEBUI_API_KEY is not set in environment variables');
}

export { OPENWEBUI_API_URL, OPENWEBUI_API_KEY };
