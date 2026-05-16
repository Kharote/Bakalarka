// Microsoft Teams service
// Handle Teams API integration for channels and tasks

import axios from 'axios';
import User from '../models/User.js';

const GRAPH_API_ENDPOINT = process.env.GRAPH_API_ENDPOINT || 'https://graph.microsoft.com/v1.0';

// Get access token for Teams API calls
const getAccessToken = async (userId) => {
  const user = await User.findById(userId).select('+azureAdToken');
  if (!user || !user.azureAdToken) {
    throw new Error('User does not have valid Teams access token');
  }
  return user.azureAdToken;
};

// Create a channel in Teams
export const createChannel = async (teamId, channelName, description) => {
  try {
    // This would require app-level permissions or user delegation
    const response = await axios.post(
      `${GRAPH_API_ENDPOINT}/teams/${teamId}/channels`,
      {
        displayName: channelName,
        description: description || '',
        membershipType: 'standard'
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.TEAMS_APP_PASSWORD}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data;
  } catch (error) {
    console.error('Error creating Teams channel:', error.response?.data || error.message);
    throw new Error('Failed to create Teams channel');
  }
};

// Send message to Teams channel
export const sendChannelMessage = async (channelId, message, senderName) => {
  try {
    const response = await axios.post(
      `${GRAPH_API_ENDPOINT}/channels/${channelId}/messages`,
      {
        body: {
          content: message,
          contentType: 'text'
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.TEAMS_APP_PASSWORD}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data;
  } catch (error) {
    console.error('Error sending Teams message:', error.response?.data || error.message);
    throw new Error('Failed to send message to Teams');
  }
};

// Create task in Microsoft Planner
export const createPlannerTask = async (planId, taskData) => {
  try {
    const response = await axios.post(
      `${GRAPH_API_ENDPOINT}/planner/tasks`,
      {
        planId: planId,
        title: taskData.title,
        dueDateTime: taskData.dueDateTime,
        percentComplete: taskData.percentComplete || 0,
        assignments: taskData.assignments || {}
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.TEAMS_APP_PASSWORD}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data;
  } catch (error) {
    console.error('Error creating Planner task:', error.response?.data || error.message);
    throw new Error('Failed to create task in Planner');
  }
};

// Update task in Microsoft Planner
export const updatePlannerTask = async (taskId, updates) => {
  try {
    // First get the task to get the etag
    const taskResponse = await axios.get(
      `${GRAPH_API_ENDPOINT}/planner/tasks/${taskId}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.TEAMS_APP_PASSWORD}`
        }
      }
    );

    const response = await axios.patch(
      `${GRAPH_API_ENDPOINT}/planner/tasks/${taskId}`,
      updates,
      {
        headers: {
          'Authorization': `Bearer ${process.env.TEAMS_APP_PASSWORD}`,
          'Content-Type': 'application/json',
          'If-Match': taskResponse.headers.etag
        }
      }
    );

    return response.data;
  } catch (error) {
    console.error('Error updating Planner task:', error.response?.data || error.message);
    throw new Error('Failed to update task in Planner');
  }
};

// Get tasks from Microsoft Planner
export const getPlannerTasks = async (planId) => {
  try {
    const response = await axios.get(
      `${GRAPH_API_ENDPOINT}/planner/plans/${planId}/tasks`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.TEAMS_APP_PASSWORD}`
        }
      }
    );

    return response.data.value;
  } catch (error) {
    console.error('Error getting Planner tasks:', error.response?.data || error.message);
    throw new Error('Failed to get tasks from Planner');
  }
};

// Get user's Teams
export const getUserTeams = async (accessToken) => {
  try {
    const response = await axios.get(
      `${GRAPH_API_ENDPOINT}/me/joinedTeams`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );

    return response.data.value;
  } catch (error) {
    console.error('Error getting user Teams:', error.response?.data || error.message);
    throw new Error('Failed to get user Teams');
  }
};

// Send adaptive card to Teams
export const sendAdaptiveCard = async (channelId, cardContent) => {
  try {
    const response = await axios.post(
      `${GRAPH_API_ENDPOINT}/channels/${channelId}/messages`,
      {
        body: {
          contentType: 'html',
          content: cardContent
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.TEAMS_APP_PASSWORD}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data;
  } catch (error) {
    console.error('Error sending adaptive card:', error.response?.data || error.message);
    throw new Error('Failed to send adaptive card to Teams');
  }
};
