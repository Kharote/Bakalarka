// Maintenance Mode Middleware
// Blocks non-admin requests when maintenance mode is enabled in SystemSettings

import jwt from 'jsonwebtoken';
import { getSetting } from '../services/systemSettingsService.js';
import { User } from '../models/index.js';

export const checkMaintenanceMode = async (req, res, next) => {
  try {
    const maintenanceSetting = await getSetting('system.maintenanceMode');

    if (maintenanceSetting?.enabled) {
      // Allow auth routes (login/callback) so admins can still sign in
      if (req.path.startsWith('/api/auth')) {
        return next();
      }

      // Allow health check
      if (req.path === '/health') {
        return next();
      }

      // Check if req.user is already set (e.g. from earlier middleware)
      if (req.user && req.user.role === 'admin') {
        return next();
      }

      // req.user is not populated yet — decode JWT to check admin role
      try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1];
        if (token) {
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          const user = await User.findByPk(decoded.id, {
            attributes: ['id', 'role']
          });
          if (user && user.role === 'admin') {
            return next();
          }
        }
      } catch {
        // Token invalid / expired — fall through to 503
      }

      const message = maintenanceSetting.message || 'System is under maintenance. Please try again later.';
      return res.status(503).json({
        success: false,
        error: 'Service Unavailable',
        message
      });
    }

    next();
  } catch (error) {
    // If we can't read settings (DB down etc.), let requests through
    next();
  }
};
