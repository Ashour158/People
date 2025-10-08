import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { validate } from '../middleware/validation';
import { authenticate } from '../middleware/auth';
import { loginLimiter } from '../middleware/rateLimiter';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema
} from '../validators/auth.validator';

const router = Router();
const authController = new AuthController();

// Public routes
router.post('/register', validate(registerSchema), authController.register.bind(authController));
router.post('/login', loginLimiter, validate(loginSchema), authController.login.bind(authController));
router.post('/forgot-password', validate(forgotPasswordSchema), authController.forgotPassword.bind(authController));
router.post('/reset-password', validate(resetPasswordSchema), authController.resetPassword.bind(authController));
router.post('/refresh-token', authController.refreshToken.bind(authController));

// Protected routes
router.get('/me', authenticate, authController.getCurrentUser.bind(authController));
router.post('/change-password', authenticate, validate(changePasswordSchema), authController.changePassword.bind(authController));
router.post('/logout', authenticate, authController.logout.bind(authController));

export default router;
