// Authentication controller
// Handle user authentication logic with MS SSO

import { User } from '../models/index.js';
import { AppError } from '../middleware/errorHandler.js';
import { getAuthCodeUrl, getTokenFromCode, getUserProfile, getUserPhoto } from '../services/msalService.js';

// Register new user with email and password
export const register = async (req, res, next) => {
  try {
    const { email, name, password, department, position } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      throw new AppError('User with this email already exists', 400);
    }

    // Create new user
    const user = await User.create({
      email,
      name,
      password,
      department,
      position
    });

    // Generate token
    const token = user.generateAuthToken();

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    next(error);
  }
};

// Login with email and password
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      throw new AppError('Please provide email and password', 400);
    }

    // Find user
    const user = await User.findOne({ where: { email } });
    
    if (!user) {
      throw new AppError('Invalid credentials', 401);
    }

    // Check password
    const isPasswordCorrect = await user.comparePassword(password);
    
    if (!isPasswordCorrect) {
      throw new AppError('Invalid credentials', 401);
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate token
    const token = user.generateAuthToken();

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        profilePicture: user.profilePicture
      }
    });
  } catch (error) {
    next(error);
  }
};

// Initiate Microsoft SSO login
export const microsoftLogin = async (req, res, next) => {
  try {
    console.log('Microsoft SSO login initiated');
    console.log('Azure Client ID:', process.env.AZURE_AD_CLIENT_ID ? 'Configured' : 'NOT CONFIGURED');
    console.log('Azure Tenant ID:', process.env.AZURE_AD_TENANT_ID ? 'Configured' : 'NOT CONFIGURED');
    
    if (!process.env.AZURE_AD_CLIENT_ID || !process.env.AZURE_AD_CLIENT_SECRET || !process.env.AZURE_AD_TENANT_ID) {
      throw new AppError('Azure AD is not configured. Please set AZURE_AD_CLIENT_ID, AZURE_AD_CLIENT_SECRET, and AZURE_AD_TENANT_ID in .env file', 500);
    }
    
    const authUrl = await getAuthCodeUrl();
    console.log('Auth URL generated successfully');
    
    res.json({
      success: true,
      authUrl
    });
  } catch (error) {
    console.error('Microsoft login error:', error);
    next(error);
  }
};

// Handle Microsoft SSO callback
export const microsoftCallback = async (req, res, next) => {
  try {
    console.log('Processing Microsoft SSO callback...');
    
    const { code, state, error, error_description } = req.query;
    
    if (error) {
      console.error('Microsoft SSO error:', error, error_description);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      return res.redirect(`${frontendUrl}/auth/callback?error=${encodeURIComponent(error_description || error)}`);
    }
    
    if (!code) {
      console.error('No authorization code received from Microsoft');
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      return res.redirect(`${frontendUrl}/auth/callback?error=${encodeURIComponent('No authorization code received')}`);
    }

    // Check if this is a Teams linking callback
    if (state) {
      try {
        const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
        if (stateData.action === 'link-teams') {
          return handleTeamsLinking(code, stateData, res);
        }
      } catch (err) {
        // Not a valid state, continue with normal login
        console.log('State parameter present but not valid JSON, continuing with normal login');
      }
    }

    console.log('Exchanging authorization code for tokens...');
    
    // Exchange code for token
    const tokenResponse = await getTokenFromCode(code);
    
    // Get user profile from Microsoft Graph
    const profile = await getUserProfile(tokenResponse.accessToken);
    
    // Get user photo from Microsoft Graph
    const photoData = await getUserPhoto(tokenResponse.accessToken);

    console.log('Microsoft user info received:', {
      email: profile.mail || profile.userPrincipalName,
      name: profile.displayName,
      id: profile.id
    });

    // Find or create user
    let user = await User.findOne({ where: { microsoftId: profile.id } });

    if (!user) {
      console.log('Creating new user for:', profile.mail || profile.userPrincipalName);
      // Create new user from Microsoft profile
      user = await User.create({
        email: profile.mail || profile.userPrincipalName,
        name: profile.displayName,
        microsoftId: profile.id,
        profilePicture: photoData?.photo || '',
        department: profile.department || '',
        position: profile.jobTitle || '',
        azureAdToken: tokenResponse.accessToken,
        refreshToken: tokenResponse.refreshToken
      });
      console.log('New user created with ID:', user.id);
    } else {
      console.log('Updating existing user:', user.id);
      // Update existing user with latest info
      user.azureAdToken = tokenResponse.accessToken;
      user.refreshToken = tokenResponse.refreshToken;
      user.lastLogin = new Date();
      if (photoData?.photo) {
        user.profilePicture = photoData.photo;
      }
      await user.save();
    }

    // Generate JWT token
    const token = user.generateAuthToken();
    console.log('JWT token generated for user:', user.id);

    console.log('Redirecting to frontend with token...');
    
    // Redirect to frontend callback page with token in URL
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/auth/callback?token=${token}`);
    
  } catch (error) {
    console.error('Microsoft callback error:', error);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/auth/callback?error=${encodeURIComponent('Authentication failed')}`);
  }
};

// Helper function to handle Teams linking
const handleTeamsLinking = async (code, stateData, res) => {
  try {
    console.log('MS Teams callback received for user:', stateData.userId);

    // Exchange code for access token
    const tokenData = await getTokenFromCode(code);
    
    // Get user profile from Microsoft Graph
    const profile = await getUserProfile(tokenData.accessToken);
    
    console.log('MS Teams profile retrieved:', profile.id);

    // Update user with MS Teams user ID
    const user = await User.findByPk(stateData.userId);
    
    if (!user) {
      throw new AppError('User not found', 404);
    }

    user.msTeamsUserId = profile.id;
    await user.save();

    console.log('MS Teams account linked successfully for user:', stateData.userId);

    // Redirect back to frontend dashboard with success flag
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/dashboard?teams-linked=success`);
  } catch (error) {
    console.error('Error in MS Teams callback:', error);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/dashboard?teams-linked=error`);
  }
};
// Logout user
export const logout = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Get current authenticated user
export const getCurrentUser = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id);
    
    res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    next(error);
  }
};

// Refresh JWT token
export const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new AppError('Refresh token is required', 400);
    }

    // Find user with refresh token
    const user = await User.findOne({ where: { refreshToken } });

    if (!user) {
      throw new AppError('Invalid refresh token', 401);
    }

    // Generate new token
    const token = user.generateAuthToken();

    res.status(200).json({
      success: true,
      token
    });
  } catch (error) {
    next(error);
  }
};

// Get current user profile
export const getProfile = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password', 'azureAdToken', 'refreshToken'] }
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    res.json({
      success: true,
      user
    });
  } catch (error) {
    next(error);
  }
};

// Update user profile
export const updateProfile = async (req, res, next) => {
  try {
    const { name, department, position, phone, location, bio } = req.body;
    
    const user = await User.findByPk(req.user.id);
    
    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Update allowed fields
    if (name !== undefined) user.name = name;
    if (department !== undefined) user.department = department;
    if (position !== undefined) user.position = position;
    if (phone !== undefined) user.phone = phone;
    if (location !== undefined) user.location = location;
    if (bio !== undefined) user.bio = bio;

    await user.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        department: user.department,
        position: user.position,
        phone: user.phone,
        location: user.location,
        bio: user.bio,
        profilePicture: user.profilePicture,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });
  } catch (error) {
    next(error);
  }
};

// Refresh user photo from Microsoft Graph
export const refreshUserPhoto = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id);
    
    if (!user || !user.azureAdToken) {
      throw new AppError('User not found or no Azure AD token available', 404);
    }

    // Get updated photo from Microsoft Graph
    const photoData = await getUserPhoto(user.azureAdToken);
    
    if (photoData?.photo) {
      user.profilePicture = photoData.photo;
      await user.save();
    }

    res.json({
      success: true,
      message: 'Profile photo updated successfully',
      profilePicture: user.profilePicture
    });
  } catch (error) {
    next(error);
  }
};

// Get user statistics
export const getUserStats = async (req, res, next) => {
  try {
    // Import Project and Task models to get real stats
    const { Project, Task } = await import('../models/index.js');
    const { default: ProjectMember } = await import('../models/ProjectMember.js');
    
    const userId = req.user.id;
    
    // Get project count where user is a member
    const projectCount = await ProjectMember.count({
      where: { userId }
    });

    // Get completed tasks count
    const completedTasksCount = await Task.count({
      where: {
        assignedToId: userId,
        status: 'completed'
      }
    });

    // Calculate days since user creation
    const user = await User.findByPk(userId);
    const daysSinceCreation = Math.floor((new Date() - user.createdAt) / (1000 * 60 * 60 * 24));

    res.json({
      success: true,
      stats: {
        projects: projectCount || 0,
        completedTasks: completedTasksCount || 0,
        daysActive: daysSinceCreation || 0,
        collaborations: projectCount || 0
      }
    });
  } catch (error) {
    console.error('Error getting user stats:', error);
    // Return default stats if there's an error
    res.json({
      success: true,
      stats: {
        projects: 0,
        completedTasks: 0,
        daysActive: 0,
        collaborations: 0
      }
    });
  }
};

// Get user settings
export const getSettings = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id);
    
    if (!user) {
      throw new AppError('User not found', 404);
    }

    res.json({
      success: true,
      settings: user.settings || {},
      user: {
        locale: user.locale || 'en'
      }
    });
  } catch (error) {
    next(error);
  }
};

// Update user settings
export const updateSettings = async (req, res, next) => {
  try {
    const settings = req.body;
    
    const user = await User.findByPk(req.user.id);
    
    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Merge with existing settings
    user.settings = {
      ...user.settings,
      ...settings
    };

    await user.save();

    res.json({
      success: true,
      message: 'Settings updated successfully',
      settings: user.settings
    });
  } catch (error) {
    next(error);
  }
};

// Update single setting
export const updateSetting = async (req, res, next) => {
  try {
    const { key, value } = req.body;
    
    const user = await User.findByPk(req.user.id);
    
    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Update single setting
    user.settings = {
      ...user.settings,
      [key]: value
    };

    await user.save();

    res.json({
      success: true,
      message: 'Setting updated successfully',
      settings: user.settings
    });
  } catch (error) {
    next(error);
  }
};

// Update user locale
export const updateLocale = async (req, res, next) => {
  try {
    const { locale } = req.body;
    
    if (!locale || !['en', 'sk'].includes(locale)) {
      throw new AppError('Invalid locale. Must be either "en" or "sk"', 400);
    }
    
    const user = await User.findByPk(req.user.id);
    
    if (!user) {
      throw new AppError('User not found', 404);
    }

    user.locale = locale;
    await user.save();

    res.json({
      success: true,
      message: 'Locale updated successfully',
      locale: user.locale
    });
  } catch (error) {
    next(error);
  }
};

// Initiate MS Teams account linking
export const linkTeamsAccount = async (req, res, next) => {
  try {
    console.log('MS Teams linking initiated for user:', req.user.id);
    
    // Generate auth URL with state parameter containing user ID and JWT token
    const state = Buffer.from(JSON.stringify({
      userId: req.user.id,
      action: 'link-teams',
      timestamp: Date.now()
    })).toString('base64');
    
    const authUrl = await getAuthCodeUrl(state);
    
    res.json({
      success: true,
      authUrl: authUrl
    });
  } catch (error) {
    console.error('Error initiating MS Teams linking:', error);
    next(error);
  }
};

// Handle MS Teams callback and save Teams user ID
