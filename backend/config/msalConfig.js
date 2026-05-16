import { ConfidentialClientApplication } from '@azure/msal-node';

/**
 * Microsoft Authentication Library (MSAL) configuration
 * This is used for Microsoft SSO and Teams integration
 */
const msalConfig = {
  auth: {
    clientId: process.env.AZURE_CLIENT_ID,
    authority: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}`,
    clientSecret: process.env.AZURE_CLIENT_SECRET,
  },
  system: {
    loggerOptions: {
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) {
          return;
        }
        switch (level) {
          case 'Error':
            console.error(message);
            return;
          case 'Info':
            console.info(message);
            return;
          case 'Verbose':
            console.debug(message);
            return;
          case 'Warning':
            console.warn(message);
            return;
        }
      }
    }
  }
};

// Create MSAL instance
const msalInstance = new ConfidentialClientApplication(msalConfig);

/**
 * Get authorization URL for Microsoft login
 */
export const getAuthUrl = () => {
  const authCodeUrlParameters = {
    scopes: [
      'user.read',
      'tasks.readwrite',
      'group.read.all',
      'chat.read',
      'team.readbasic.all'
    ],
    redirectUri: process.env.AZURE_REDIRECT_URI,
  };

  return msalInstance.getAuthCodeUrl(authCodeUrlParameters);
};

/**
 * Exchange authorization code for access token
 */
export const getTokenFromCode = async (code) => {
  const tokenRequest = {
    code: code,
    scopes: [
      'user.read',
      'tasks.readwrite',
      'group.read.all',
      'chat.read',
      'team.readbasic.all'
    ],
    redirectUri: process.env.AZURE_REDIRECT_URI,
  };

  return await msalInstance.acquireTokenByCode(tokenRequest);
};

export default msalInstance;
