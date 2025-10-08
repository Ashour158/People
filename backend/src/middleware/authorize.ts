import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';

export const authorize = (permissions: string[]) => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = req.user;

      if (!user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const userPermissions = user.permissions || [];

      // Check if user has any of the required permissions
      const hasPermission = permissions.some(permission =>
        userPermissions.includes(permission)
      );

      if (!hasPermission) {
        res.status(403).json({
          success: false,
          error: 'Insufficient permissions'
        });
        return;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
