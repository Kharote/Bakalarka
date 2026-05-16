// Google Gemini AI service
// Handle AI-powered features using Google Gemini API

import { getModel } from '../config/geminiConfig.js';

// Generate AI completion using Gemini
export const generateCompletion = async (prompt, options = {}) => {
  try {
    const model = getModel();
    
    const generationConfig = {
      temperature: options.temperature || 0.7,
      topK: options.topK || 40,
      topP: options.topP || 0.95,
      maxOutputTokens: options.maxTokens || 2000,
    };

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig,
    });

    const response = await result.response;
    const text = response.text();
    
    // Try to parse as JSON if it looks like JSON
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      // Not JSON or invalid JSON, return as text
    }

    return text;
  } catch (error) {
    console.error('Gemini API Error:', error.message);
    throw new Error('Failed to generate AI completion: ' + error.message);
  }
};

// Analyze text sentiment and extract insights
export const analyzeText = async (text) => {
  const prompt = `
    Analyze the following text and provide:
    1. Sentiment (positive, negative, neutral)
    2. Key themes or topics
    3. Action items mentioned
    4. Overall tone
    
    Text: "${text}"
    
    Respond in JSON format with these fields: sentiment, themes, actionItems, tone
  `;

  try {
    const analysis = await generateCompletion(prompt);
    return analysis;
  } catch (error) {
    console.error('Text analysis error:', error.message);
    throw error;
  }
};

// Generate project breakdown structure
export const generateWBS = async (projectName, description, goals) => {
  const prompt = `
    Create a Work Breakdown Structure (WBS) for the following project:
    
    Project Name: ${projectName}
    Description: ${description}
    Goals: ${goals || 'Not specified'}
    
    Provide a hierarchical breakdown of work packages and deliverables.
    Format as JSON with nested structure.
  `;

  try {
    const wbs = await generateCompletion(prompt);
    return wbs;
  } catch (error) {
    console.error('WBS generation error:', error.message);
    throw error;
  }
};

// Estimate task duration
export const estimateTaskDuration = async (taskTitle, taskDescription, complexity) => {
  const prompt = `
    Estimate the duration for this task:
    
    Title: ${taskTitle}
    Description: ${taskDescription}
    Complexity: ${complexity || 'medium'}
    
    Provide:
    1. Estimated hours
    2. Confidence level
    3. Factors affecting estimate
    
    Respond in JSON format.
  `;

  try {
    const estimate = await generateCompletion(prompt);
    return estimate;
  } catch (error) {
    console.error('Duration estimation error:', error.message);
    throw error;
  }
};

// Suggest best practices
export const suggestBestPractices = async (context) => {
  const prompt = `
    Based on this project management context:
    ${context}
    
    Suggest relevant best practices from:
    1. PMBOK (Project Management Body of Knowledge)
    2. Agile methodologies
    3. IT project management
    
    Provide 5-10 actionable recommendations.
    Format as JSON array.
  `;

  try {
    const practices = await generateCompletion(prompt);
    return practices;
  } catch (error) {
    console.error('Best practices suggestion error:', error.message);
    throw error;
  }
};
