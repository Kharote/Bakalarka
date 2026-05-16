// Microsoft Authentication Library (MSAL) service
// Handle Microsoft SSO authentication

import axios from 'axios';

// Get authorization URL for Microsoft login
export const getAuthCodeUrl = async (state = null) => {
  const clientId = process.env.AZURE_AD_CLIENT_ID;
  const redirectUri = process.env.AZURE_AD_REDIRECT_URI;
  const tenantId = process.env.AZURE_AD_TENANT_ID || 'common';
  
  // Include MS Teams permissions in the scope
  const scopes = [
    'openid',
    'profile',
    'email',
    'User.Read',
    'offline_access',
    'Team.Create',
    'Channel.Create',
    'TeamMember.ReadWrite.All',
    'Group.ReadWrite.All'
  ];
  
  let authUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?` +
    `client_id=${clientId}&` +
    `response_type=code&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `response_mode=query&` +
    `scope=${encodeURIComponent(scopes.join(' '))}&` +
    `prompt=consent`; // Force consent screen to show new permissions
  
  if (state) {
    authUrl += `&state=${encodeURIComponent(state)}`;
  }

  return authUrl;
};

// Exchange authorization code for access token
export const getTokenFromCode = async (code) => {
  const clientId = process.env.AZURE_AD_CLIENT_ID;
  const clientSecret = process.env.AZURE_AD_CLIENT_SECRET;
  const redirectUri = process.env.AZURE_AD_REDIRECT_URI;
  const tenantId = process.env.AZURE_AD_TENANT_ID || 'common';

  const tokenEndpoint = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

  const params = new URLSearchParams();
  params.append('client_id', clientId);
  params.append('scope', 'openid profile email User.Read offline_access');
  params.append('code', code);
  params.append('redirect_uri', redirectUri);
  params.append('grant_type', 'authorization_code');
  params.append('client_secret', clientSecret);

  try {
    const response = await axios.post(tokenEndpoint, params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    return {
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token,
      idToken: response.data.id_token,
      expiresIn: response.data.expires_in
    };
  } catch (error) {
    console.error('Error getting token from code:', error.response?.data || error.message);
    throw new Error('Failed to exchange authorization code for token');
  }
};

// Get user profile from Microsoft Graph API
export const getUserProfile = async (accessToken) => {
  try {
    const response = await axios.get('https://graph.microsoft.com/v1.0/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    return response.data;
  } catch (error) {
    console.error('Error getting user profile:', error.response?.data || error.message);
    throw new Error('Failed to get user profile from Microsoft Graph');
  }
};

// Get user photo from Microsoft Graph API
export const getUserPhoto = async (accessToken) => {
  try {
    // First check if photo exists
    const metaResponse = await axios.get('https://graph.microsoft.com/v1.0/me/photo', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    // If photo exists, get the actual photo data
    const photoResponse = await axios.get('https://graph.microsoft.com/v1.0/me/photo/$value', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      },
      responseType: 'arraybuffer'
    });

    // Convert to base64
    const base64Photo = Buffer.from(photoResponse.data, 'binary').toString('base64');
    const contentType = photoResponse.headers['content-type'] || 'image/jpeg';
    
    return {
      photo: `data:${contentType};base64,${base64Photo}`,
      contentType: contentType
    };
  } catch (error) {
    if (error.response?.status === 404) {
      // No photo available
      return null;
    }
    console.error('Error getting user photo:', error.response?.data || error.message);
    return null;
  }
};

// Refresh access token
export const refreshAccessToken = async (refreshToken) => {
  const clientId = process.env.AZURE_AD_CLIENT_ID;
  const clientSecret = process.env.AZURE_AD_CLIENT_SECRET;
  const tenantId = process.env.AZURE_AD_TENANT_ID || 'common';

  const tokenEndpoint = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

  const params = new URLSearchParams();
  params.append('client_id', clientId);
  params.append('scope', 'openid profile email User.Read offline_access');
  params.append('refresh_token', refreshToken);
  params.append('grant_type', 'refresh_token');
  params.append('client_secret', clientSecret);

  try {
    const response = await axios.post(tokenEndpoint, params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    return {
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token,
      expiresIn: response.data.expires_in
    };
  } catch (error) {
    console.error('Error refreshing token:', error.response?.data || error.message);
    throw new Error('Failed to refresh access token');
  }
};
