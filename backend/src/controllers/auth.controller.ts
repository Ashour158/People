import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { successResponse } from '../utils/response';
import { AuthRequest } from '../types';

const authService = new AuthService();

export class AuthController {
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.register(req.body);
      successResponse(res, result, 'Registration successful', undefined, 201);
    } catch (error) {
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body;
      const ipAddress = req.ip || 'unknown';
      const userAgent = req.headers['user-agent'] || 'unknown';
      
      const result = await authService.login(email as string, password as string, ipAddress, userAgent);
      successResponse(res, result, 'Login successful');
    } catch (error) {
      next(error);
    }
  }

  async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email } = req.body;
      const result = await authService.forgotPassword(email as string);
      successResponse(res, result);
    } catch (error) {
      next(error);
    }
  }

  async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token, new_password } = req.body;
      const result = await authService.resetPassword(token as string, new_password as string);
      successResponse(res, result);
    } catch (error) {
      next(error);
    }
  }

  async changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as AuthRequest).user?.user_id;
      const { current_password, new_password } = req.body;
      
      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }
      
      const result = await authService.changePassword(userId, current_password as string, new_password as string);
      successResponse(res, result);
    } catch (error) {
      next(error);
    }
  }

  async getCurrentUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as AuthRequest).user?.user_id;
      
      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }
      
      const result = await authService.getCurrentUser(userId);
      successResponse(res, result);
    } catch (error) {
      next(error);
    }
  }

  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as AuthRequest).user?.user_id;
      
      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }
      
      const result = await authService.logout(userId);
      successResponse(res, result);
    } catch (error) {
      next(error);
    }
  }

  async refreshToken(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // This is a simplified version. In production, implement proper refresh token logic
      successResponse(res, { message: 'Refresh token endpoint' });
    } catch (error) {
      next(error);
    }
  }
}
