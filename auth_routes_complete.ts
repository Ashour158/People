// =====================================================
// AUTHENTICATION MODULE - COMPLETE IMPLEMENTATION
// =====================================================

// ===== src/validators/auth.validator.ts =====
import Joi from 'joi';

export const registerSchema = Joi.object({
  organization_name: Joi.string().min(2).max(200).required(),
  organization_code: Joi.string().min(2).max(50).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).max(100).required()
    .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])'))
    .message('Password must contain uppercase, lowercase, number and special character'),
  first_name: Joi.string().min(2).max(100).required(),
  last_name: Joi.string().min(2).max(100).required(),
  phone_number: Joi.string().pattern(/^[0-9]{10,15}$/).optional(),
  company_name: Joi.string().min(2).max(200).required(),
  timezone: Joi.string().default('UTC'),
  currency: Joi.string().length(3).default('USD')
});

export const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
  remember_me: Joi.boolean().default(false)
});

export const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required()
});

export const resetPasswordSchema = Joi.object({
  token: Joi.string().required(),
  new_password: Joi.string().min(8).max(100).required()
    .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])'))
});

export const changePasswordSchema = Joi.object({
  current_password: Joi.string().required(),
  new_password: Joi.string().min(8).max(100).required()
    .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])'))
});

// ===== src/services/auth.service.ts =====
import { v4 as uuidv4 } from 'uuid';
import { query, transaction } from '../config/database';
import { hashPassword, comparePassword } from '../utils/password';
import { generateAccessToken, generateRefreshToken } from '../utils/token';
import { sendEmail } from '../utils/email';
import { AppError } from '../middleware/errorHandler';
import crypto from 'crypto';

export class AuthService {
  /**
   * Register new organization with first user
   */
  async register(data: any) {
    return transaction(async (client) => {
      // Check if email already exists
      const existingUser = await client.query(
        'SELECT email FROM users WHERE email = $1',
        [data.email]
      );

      if (existingUser.rows.length > 0) {
        throw new AppError(409, 'Email already registered');
      }

      // Check if organization code exists
      const existingOrg = await client.query(
        'SELECT organization_code FROM organizations WHERE organization_code = $1',
        [data.organization_code]
      );

      if (existingOrg.rows.length > 0) {
        throw new AppError(409, 'Organization code already exists');
      }

      // Create organization
      const orgResult = await client.query(
        `INSERT INTO organizations (
          organization_name, organization_code, primary_contact_email,
          primary_contact_name, timezone, currency, subscription_plan,
          subscription_status, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, 'trial', 'active', true)
        RETURNING organization_id, organization_name, organization_code`,
        [
          data.organization_name,
          data.organization_code,
          data.email,
          `${data.first_name} ${data.last_name}`,
          data.timezone || 'UTC',
          data.currency || 'USD'
        ]
      );

      const organization = orgResult.rows[0];

      // Create company
      const companyResult = await client.query(
        `INSERT INTO companies (
          organization_id, company_name, company_code, email, 
          timezone, currency, company_type, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, 'headquarters', true)
        RETURNING company_id, company_name`,
        [
          organization.organization_id,
          data.company_name,
          data.organization_code + '-HQ',
          data.email,
          data.timezone || 'UTC',
          data.currency || 'USD'
        ]
      );

      const company = companyResult.rows[0];

      // Create employee record
      const employeeResult = await client.query(
        `INSERT INTO employees (
          organization_id, company_id, employee_code, first_name, last_name,
          email, hire_date, employment_type, employee_status, is_user
        ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_DATE, 'full_time', 'active', true)
        RETURNING employee_id, employee_code, first_name, last_name, email`,
        [
          organization.organization_id,
          company.company_id,
          'EMP001',
          data.first_name,
          data.last_name,
          data.email
        ]
      );

      const employee = employeeResult.rows[0];

      // Hash password
      const passwordHash = await hashPassword(data.password);

      // Create user
      const userResult = await client.query(
        `INSERT INTO users (
          organization_id, employee_id, username, email, password_hash,
          is_active, is_email_verified
        ) VALUES ($1, $2, $3, $4, $5, true, true)
        RETURNING user_id, username, email`,
        [
          organization.organization_id,
          employee.employee_id,
          data.email,
          data.email,
          passwordHash
        ]
      );

      const user = userResult.rows[0];

      // Create admin role
      const roleResult = await client.query(
        `INSERT INTO roles (
          organization_id, role_name, role_code, role_type, is_active
        ) VALUES ($1, 'Super Admin', 'super_admin', 'system', true)
        RETURNING role_id`,
        [organization.organization_id]
      );

      const role = roleResult.rows[0];

      // Assign all permissions to admin role
      await client.query(
        `INSERT INTO role_permissions (role_id, permission_id)
        SELECT $1, permission_id FROM permissions`,
        [role.role_id]
      );

      // Assign admin role to user
      await client.query(
        `INSERT INTO user_roles (user_id, role_id, is_active)
        VALUES ($1, $2, true)`,
        [user.user_id, role.role_id]
      );

      // Send welcome email
      await sendEmail({
        to: user.email,
        subject: 'Welcome to HR Management System',
        template: 'welcome',
        data: {
          name: employee.first_name,
          organization_name: organization.organization_name,
          login_url: process.env.APP_URL + '/login'
        }
      });

      // Generate tokens
      const accessToken = generateAccessToken(user.user_id, organization.organization_id);
      const refreshToken = generateRefreshToken(user.user_id, organization.organization_id);

      return {
        user: {
          user_id: user.user_id,
          email: user.email,
          employee_id: employee.employee_id,
          name: `${employee.first_name} ${employee.last_name}`
        },
        organization,
        company,
        tokens: {
          access_token: accessToken,
          refresh_token: refreshToken,
          expires_in: '24h'
        }
      };
    });
  }

  /**
   * Login user
   */
  async login(email: string, password: string, ipAddress?: string, userAgent?: string) {
    // Get user with organization details
    const result = await query(
      `SELECT 
        u.user_id, u.organization_id, u.employee_id, u.username, u.email,
        u.password_hash, u.is_active, u.is_locked, u.failed_login_attempts,
        u.locked_until, o.organization_name, o.subscription_status,
        e.first_name, e.last_name, e.employee_code
      FROM users u
      JOIN organizations o ON u.organization_id = o.organization_id
      LEFT JOIN employees e ON u.employee_id = e.employee_id
      WHERE u.email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      throw new AppError(401, 'Invalid email or password');
    }

    const user = result.rows[0];

    // Check if account is locked
    if (user.is_locked) {
      if (user.locked_until && new Date(user.locked_until) > new Date()) {
        const minutesLeft = Math.ceil(
          (new Date(user.locked_until).getTime() - Date.now()) / 60000
        );
        throw new AppError(
          403,
          `Account is locked. Please try again in ${minutesLeft} minutes.`
        );
      } else {
        // Unlock account if lock period expired
        await query(
          'UPDATE users SET is_locked = false, locked_until = NULL, failed_login_attempts = 0 WHERE user_id = $1',
          [user.user_id]
        );
      }
    }

    // Verify password
    const isPasswordValid = await comparePassword(password, user.password_hash);

    if (!isPasswordValid) {
      // Increment failed attempts
      const failedAttempts = user.failed_login_attempts + 1;
      const maxAttempts = parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5');

      if (failedAttempts >= maxAttempts) {
        // Lock account
        const lockoutMinutes = parseInt(process.env.LOCKOUT_DURATION_MINUTES || '30');
        await query(
          `UPDATE users 
          SET is_locked = true, 
              locked_until = NOW() + INTERVAL '${lockoutMinutes} minutes',
              failed_login_attempts = $1,
              last_failed_login = NOW()
          WHERE user_id = $2`,
          [failedAttempts, user.user_id]
        );

        throw new AppError(
          403,
          `Account locked due to too many failed login attempts. Please try again in ${lockoutMinutes} minutes.`
        );
      } else {
        await query(
          'UPDATE users SET failed_login_attempts = $1, last_failed_login = NOW() WHERE user_id = $2',
          [failedAttempts, user.user_id]
        );

        throw new AppError(401, 'Invalid email or password');
      }
    }

    // Check if user is active
    if (!user.is_active) {
      throw new AppError(403, 'Account is inactive. Please contact administrator.');
    }

    // Check organization subscription
    if (user.subscription_status !== 'active') {
      throw new AppError(403, 'Organization subscription is not active.');
    }

    // Reset failed attempts
    await query(
      'UPDATE users SET failed_login_attempts = 0, last_login = NOW(), last_login_ip = $1 WHERE user_id = $2',
      [ipAddress, user.user_id]
    );

    // Log login history
    await query(
      `INSERT INTO login_history (
        user_id, organization_id, login_timestamp, ip_address, 
        user_agent, login_status, device_type
      ) VALUES ($1, $2, NOW(), $3, $4, 'success', $5)`,
      [
        user.user_id,
        user.organization_id,
        ipAddress,
        userAgent,
        this.detectDeviceType(userAgent)
      ]
    );

    // Generate tokens
    const accessToken = generateAccessToken(user.user_id, user.organization_id);
    const refreshToken = generateRefreshToken(user.user_id, user.organization_id);

    return {
      user: {
        user_id: user.user_id,
        email: user.email,
        employee_id: user.employee_id,
        employee_code: user.employee_code,
        name: `${user.first_name} ${user.last_name}`,
        organization_id: user.organization_id,
        organization_name: user.organization_name
      },
      tokens: {
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_in: '24h'
      }
    };
  }

  /**
   * Forgot password - send reset link
   */
  async forgotPassword(email: string) {
    const result = await query(
      'SELECT user_id, email, employee_id FROM users WHERE email = $1 AND is_active = true',
      [email]
    );

    if (result.rows.length === 0) {
      // Don't reveal if email exists
      return { message: 'If email exists, password reset link has been sent' };
    }

    const user = result.rows[0];

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Save token
    await query(
      `UPDATE users 
      SET password_reset_token = $1, password_reset_expires = $2 
      WHERE user_id = $3`,
      [resetTokenHash, resetTokenExpiry, user.user_id]
    );

    // Send email
    const resetUrl = `${process.env.APP_URL}/reset-password?token=${resetToken}`;
    
    await sendEmail({
      to: user.email,
      subject: 'Password Reset Request',
      template: 'reset-password',
      data: {
        reset_url: resetUrl,
        expires_in: '1 hour'
      }
    });

    return { message: 'Password reset link has been sent to your email' };
  }

  /**
   * Reset password with token
   */
  async resetPassword(token: string, newPassword: string) {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const result = await query(
      `SELECT user_id, password_reset_expires 
      FROM users 
      WHERE password_reset_token = $1 AND is_active = true`,
      [tokenHash]
    );

    if (result.rows.length === 0) {
      throw new AppError(400, 'Invalid or expired reset token');
    }

    const user = result.rows[0];

    // Check if token expired
    if (new Date(user.password_reset_expires) < new Date()) {
      throw new AppError(400, 'Reset token has expired');
    }

    // Hash new password
    const passwordHash = await hashPassword(newPassword);

    // Update password and clear reset token
    await query(
      `UPDATE users 
      SET password_hash = $1, 
          password_reset_token = NULL, 
          password_reset_expires = NULL,
          password_changed_at = NOW(),
          must_change_password = false
      WHERE user_id = $2`,
      [passwordHash, user.user_id]
    );

    return { message: 'Password has been reset successfully' };
  }

  /**
   * Change password (authenticated user)
   */
  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const result = await query(
      'SELECT password_hash FROM users WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      throw new AppError(404, 'User not found');
    }

    const user = result.rows[0];

    // Verify current password
    const isValid = await comparePassword(currentPassword, user.password_hash);

    if (!isValid) {
      throw new AppError(401, 'Current password is incorrect');
    }

    // Hash new password
    const passwordHash = await hashPassword(newPassword);

    // Update password
    await query(
      `UPDATE users 
      SET password_hash = $1, 
          password_changed_at = NOW(),
          must_change_password = false
      WHERE user_id = $2`,
      [passwordHash, userId]
    );

    return { message: 'Password changed successfully' };
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string) {
    try {
      const decoded: any = jwt.verify(refreshToken, process.env.JWT_SECRET!);

      if (decoded.type !== 'refresh') {
        throw new AppError(401, 'Invalid token type');
      }

      // Verify user still exists and is active
      const result = await query(
        'SELECT user_id, organization_id, is_active FROM users WHERE user_id = $1',
        [decoded.userId]
      );

      if (result.rows.length === 0 || !result.rows[0].is_active) {
        throw new AppError(401, 'Invalid token');
      }

      // Generate new tokens
      const accessToken = generateAccessToken(decoded.userId, decoded.organizationId);
      const newRefreshToken = generateRefreshToken(decoded.userId, decoded.organizationId);

      return {
        access_token: accessToken,
        refresh_token: newRefreshToken,
        expires_in: '24h'
      };
    } catch (error) {
      throw new AppError(401, 'Invalid or expired refresh token');
    }
  }

  /**
   * Get current user profile
   */
  async getCurrentUser(userId: string) {
    const result = await query(
      `SELECT 
        u.user_id, u.username, u.email, u.is_email_verified,
        u.last_login, u.mfa_enabled,
        o.organization_id, o.organization_name, o.organization_code,
        o.subscription_plan, o.subscription_status,
        e.employee_id, e.employee_code, e.first_name, e.middle_name, e.last_name,
        e.phone_number, e.profile_picture_url, e.employee_status,
        d.department_id, d.department_name,
        des.designation_id, des.designation_name,
        l.location_id, l.location_name,
        COALESCE(
          json_agg(DISTINCT jsonb_build_object(
            'role_id', r.role_id,
            'role_name', r.role_name,
            'role_code', r.role_code
          )) FILTER (WHERE r.role_id IS NOT NULL),
          '[]'
        ) as roles,
        COALESCE(
          json_agg(DISTINCT p.permission_code) FILTER (WHERE p.permission_code IS NOT NULL),
          '[]'
        ) as permissions
      FROM users u
      JOIN organizations o ON u.organization_id = o.organization_id
      LEFT JOIN employees e ON u.employee_id = e.employee_id
      LEFT JOIN departments d ON e.department_id = d.department_id
      LEFT JOIN designations des ON e.designation_id = des.designation_id
      LEFT JOIN locations l ON e.location_id = l.location_id
      LEFT JOIN user_roles ur ON u.user_id = ur.user_id AND ur.is_active = TRUE
      LEFT JOIN roles r ON ur.role_id = r.role_id AND r.is_active = TRUE
      LEFT JOIN role_permissions rp ON r.role_id = rp.role_id
      LEFT JOIN permissions p ON rp.permission_id = p.permission_id
      WHERE u.user_id = $1
      GROUP BY u.user_id, o.organization_id, e.employee_id, d.department_id, 
               des.designation_id, l.location_id`,
      [userId]
    );

    if (result.rows.length === 0) {
      throw new AppError(404, 'User not found');
    }

    return result.rows[0];
  }

  /**
   * Logout user
   */
  async logout(userId: string) {
    // Update logout time in login history
    await query(
      `UPDATE login_history 
      SET logout_timestamp = NOW(),
          session_duration_seconds = EXTRACT(EPOCH FROM (NOW() - login_timestamp))
      WHERE user_id = $1 
      AND logout_timestamp IS NULL
      ORDER BY login_timestamp DESC
      LIMIT 1`,
      [userId]
    );

    return { message: 'Logged out successfully' };
  }

  private detectDeviceType(userAgent?: string): string {
    if (!userAgent) return 'unknown';
    
    if (/mobile/i.test(userAgent)) return 'mobile';
    if (/tablet/i.test(userAgent)) return 'tablet';
    return 'desktop';
  }
}

// ===== src/controllers/auth.controller.ts =====
import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { successResponse, errorResponse } from '../utils/response';

const authService = new AuthService();

export class AuthController {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await authService.register(req.body);
      return successResponse(res, result, 'Registration successful', undefined);
    } catch (error) {
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;
      const ipAddress = req.ip;
      const userAgent = req.headers['user-agent'];

      const result = await authService.login(email, password, ipAddress, userAgent);
      return successResponse(res, result, 'Login successful');
    } catch (error) {
      next(error);
    }
  }

  async forgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { email } = req.body;
      const result = await authService.forgotPassword(email);
      return successResponse(res, result);
    } catch (error) {
      next(error);
    }
  }

  async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { token, new_password } = req.body;
      const result = await authService.resetPassword(token, new_password);
      return successResponse(res, result);
    } catch (error) {
      next(error);
    }
  }

  async changePassword(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.user_id;
      const { current_password, new_password } = req.body;
      
      const result = await authService.changePassword(userId, current_password, new_password);
      return successResponse(res, result);
    } catch (error) {
      next(error);
    }
  }

  async refreshToken(req: Request, res: Response, next: NextFunction) {
    try {
      const { refresh_token } = req.body;
      const result = await authService.refreshToken(refresh_token);
      return successResponse(res, result);
    } catch (error) {
      next(error);
    }
  }

  async getCurrentUser(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.user_id;
      const result = await authService.getCurrentUser(userId);
      return successResponse(res, result);
    } catch (error) {
      next(error);
    }
  }

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.user_id;
      const result = await authService.logout(userId);
      return successResponse(res, result);
    } catch (error) {
      next(error);
    }
  }
}

// ===== src/routes/auth.routes.ts =====
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
router.post('/register', validate(registerSchema), authController.register);
router.post('/login', loginLimiter, validate(loginSchema), authController.login);
router.post('/forgot-password', validate(forgotPasswordSchema), authController.forgotPassword);
router.post('/reset-password', validate(resetPasswordSchema), authController.resetPassword);
router.post('/refresh-token', authController.refreshToken);

// Protected routes
router.get('/me', authenticate, authController.getCurrentUser);
router.post('/change-password', authenticate, validate(changePasswordSchema), authController.changePassword);
router.post('/logout', authenticate, authController.logout);

export default router;

// ===== src/utils/email.ts =====
import nodemailer from 'nodemailer';
import { logger } from './logger';

const transporter = nodemailer.createTransporter({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD
  }
});

interface EmailOptions {
  to: string;
  subject: string;
  template: string;
  data: any;
}

export const sendEmail = async (options: EmailOptions): Promise<void> => {
  try {
    const html = getEmailTemplate(options.template, options.data);

    await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'noreply@hrmanagement.com',
      to: options.to,
      subject: options.subject,
      html
    });

    logger.info(`Email sent to ${options.to}`);
  } catch (error) {
    logger.error('Email sending failed:', error);
    throw error;
  }
};

const getEmailTemplate = (template: string, data: any): string => {
  const templates: { [key: string]: (data: any) => string } = {
    welcome: (data) => `
      <h1>Welcome to HR Management System!</h1>
      <p>Hi ${data.name},</p>
      <p>Welcome to ${data.organization_name}! Your account has been created successfully.</p>
      <p>You can now login to your account:</p>
      <a href="${data.login_url}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Login Now</a>
      <p>Best regards,<br>HR Management Team</p>
    `,
    'reset-password': (data) => `
      <h1>Password Reset Request</h1>
      <p>You requested to reset your password.</p>
      <p>Click the button below to reset your password. This link will expire in ${data.expires_in}.</p>
      <a href="${data.reset_url}" style="background-color: #2196F3; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a>
      <p>If you didn't request this, please ignore this email.</p>
      <p>Best regards,<br>HR Management Team</p>
    `
  };

  return templates[template]?.(data) || '<p>Email content</p>';
};

// =====================================================
// This completes the Authentication Module
// =====================================================