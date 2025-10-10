import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';

export const authorize = (permissions: string[]) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user;

      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      const userPermissions = user.permissions || [];

      // Check if user has any of the required permissions
      const hasPermission = permissions.some(permission =>
        userPermissions.includes(permission)
      );

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions'
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
