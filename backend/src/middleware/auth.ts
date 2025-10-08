import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { query } from '../config/database';
import { AuthRequest } from '../types';
import { env } from '../config/env';
import { logger } from '../config/logger';

const JWT_SECRET = env.jwt.secret;

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      logger.warn('Authentication attempt without token', {
        ip: req.ip,
        path: req.path,
      });
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Verify token
    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (jwtError: any) {
      logger.warn('Invalid JWT token', {
        ip: req.ip,
        path: req.path,
        error: jwtError.message,
      });
      return res.status(401).json({
        success: false,
        error: jwtError.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token'
      });
    }

    // Get user details with roles and permissions
    const userResult = await query(
      `SELECT 
        u.user_id, u.username, u.email, u.organization_id, u.employee_id,
        u.is_active, u.is_deleted,
        COALESCE(
          json_agg(DISTINCT r.role_name) FILTER (WHERE r.role_name IS NOT NULL),
          '[]'
        ) as roles,
        COALESCE(
          json_agg(DISTINCT p.permission_code) FILTER (WHERE p.permission_code IS NOT NULL),
          '[]'
        ) as permissions
      FROM users u
      LEFT JOIN user_roles ur ON u.user_id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.role_id
      LEFT JOIN role_permissions rp ON r.role_id = rp.role_id
      LEFT JOIN permissions p ON rp.permission_id = p.permission_id
      WHERE u.user_id = $1
      GROUP BY u.user_id`,
      [decoded.userId]
    );

    if (userResult.rows.length === 0) {
      logger.warn('Token references non-existent user', {
        userId: decoded.userId,
        ip: req.ip,
      });
      return res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
    }

    const user = userResult.rows[0];

    // Check if user is active and not deleted
    if (!user.is_active || user.is_deleted) {
      logger.warn('Inactive or deleted user attempted access', {
        userId: user.user_id,
        ip: req.ip,
        isActive: user.is_active,
        isDeleted: user.is_deleted,
      });
      return res.status(401).json({
        success: false,
        error: 'Account is inactive'
      });
    }

    (req as AuthRequest).user = user;
    next();
  } catch (error: any) {
    logger.error('Authentication error', {
      error: error.message,
      ip: req.ip,
      path: req.path,
    });
    return res.status(401).json({
      success: false,
      error: 'Authentication failed'
    });
  }
};
