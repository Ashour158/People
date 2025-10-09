import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { query } from '../config/database';
import { AuthRequest } from '../types';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const decoded: any = jwt.verify(token, JWT_SECRET);

    // Get user details with roles and permissions
    const userResult = await query(
      `SELECT 
        u.user_id, u.username, u.email, u.organization_id, u.employee_id,
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
      WHERE u.user_id = $1 AND u.is_active = TRUE AND u.is_deleted = FALSE
      GROUP BY u.user_id`,
      [decoded.userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
    }

    (req as AuthRequest).user = userResult.rows[0];
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired token'
    });
  }
};
