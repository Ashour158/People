import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { query, transaction } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { sendPasswordResetEmail, sendWelcomeEmail } from '../utils/email';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN: string | number = process.env.JWT_EXPIRES_IN || '24h';
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12');

export class AuthService {
  /**
   * Register new organization with first user
   */
  async register(data: any) {
    return transaction(async (client) => {
      // Check if organization code already exists
      const orgCheck = await client.query(
        'SELECT organization_id FROM organizations WHERE organization_code = $1',
        [data.organization_code]
      );

      if (orgCheck.rows.length > 0) {
        throw new AppError(400, 'Organization code already exists');
      }

      // Check if email already exists
      const emailCheck = await client.query(
        'SELECT user_id FROM users WHERE email = $1',
        [data.email]
      );

      if (emailCheck.rows.length > 0) {
        throw new AppError(400, 'Email already registered');
      }

      // Create organization
      const orgResult = await client.query(
        `INSERT INTO organizations (
          organization_name, organization_code, subscription_plan, 
          subscription_status, created_at, updated_at
        ) VALUES ($1, $2, 'free', 'active', NOW(), NOW())
        RETURNING organization_id, organization_name, organization_code`,
        [data.organization_name, data.organization_code]
      );

      const organization = orgResult.rows[0];

      // Create company (default)
      const companyResult = await client.query(
        `INSERT INTO companies (
          organization_id, company_name, company_code, is_primary,
          created_at, updated_at
        ) VALUES ($1, $2, $3, TRUE, NOW(), NOW())
        RETURNING company_id`,
        [organization.organization_id, data.organization_name, data.organization_code]
      );

      const company = companyResult.rows[0];

      // Hash password
      const password_hash = await bcrypt.hash(data.password, BCRYPT_ROUNDS);

      // Create user
      const userResult = await client.query(
        `INSERT INTO users (
          organization_id, username, email, password_hash,
          is_active, is_email_verified, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, TRUE, FALSE, NOW(), NOW())
        RETURNING user_id, username, email`,
        [organization.organization_id, data.username, data.email, password_hash]
      );

      const user = userResult.rows[0];

      // Create employee record
      const employeeResult = await client.query(
        `INSERT INTO employees (
          organization_id, company_id, employee_code, first_name, last_name,
          email, phone_number, employee_status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', NOW(), NOW())
        RETURNING employee_id`,
        [
          organization.organization_id,
          company.company_id,
          'EMP001',
          data.first_name,
          data.last_name,
          data.email,
          data.phone_number
        ]
      );

      const employee = employeeResult.rows[0];

      // Link user to employee
      await client.query(
        'UPDATE users SET employee_id = $1 WHERE user_id = $2',
        [employee.employee_id, user.user_id]
      );

      // Assign admin role
      const roleResult = await client.query(
        `INSERT INTO roles (
          organization_id, role_name, role_code, role_level, 
          created_at, updated_at
        ) VALUES ($1, 'Administrator', 'admin', 1, NOW(), NOW())
        RETURNING role_id`,
        [organization.organization_id]
      );

      await client.query(
        'INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)',
        [user.user_id, roleResult.rows[0].role_id]
      );

      // Send welcome email
      try {
        await sendWelcomeEmail(user.email, data.first_name);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Failed to send welcome email:', error);
      }

      // Generate token
      const token = jwt.sign(
        { userId: user.user_id, organizationId: organization.organization_id },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN as string }
      );

      return {
        token,
        user: {
          ...user,
          organization,
          employee_id: employee.employee_id
        }
      };
    });
  }

  /**
   * Login user
   */
  async login(email: string, password: string, _ipAddress?: string, _userAgent?: string): Promise<{
    user: Record<string, unknown>;
    token: string;
  }> {
    const result = await query(
      `SELECT 
        u.user_id, u.username, u.email, u.password_hash, u.is_active,
        u.organization_id, u.employee_id,
        o.organization_name, o.subscription_status
      FROM users u
      JOIN organizations o ON u.organization_id = o.organization_id
      WHERE u.email = $1 AND u.is_deleted = FALSE`,
      [email]
    );

    if (result.rows.length === 0) {
      throw new AppError(401, 'Invalid email or password');
    }

    const user = result.rows[0];

    if (!user.is_active) {
      throw new AppError(403, 'Account is inactive');
    }

    if (user.subscription_status !== 'active') {
      throw new AppError(403, 'Organization subscription is not active');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      throw new AppError(401, 'Invalid email or password');
    }

    // Update last login
    await query(
      'UPDATE users SET last_login = NOW() WHERE user_id = $1',
      [user.user_id]
    );

    // Generate token
    const token = jwt.sign(
      { userId: user.user_id, organizationId: user.organization_id },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN as string }
    );

    delete user.password_hash;

    return { token, user };
  }

  /**
   * Forgot password - send reset link
   */
  async forgotPassword(email: string) {
    const result = await query(
      'SELECT user_id, email, username FROM users WHERE email = $1 AND is_deleted = FALSE',
      [email]
    );

    if (result.rows.length === 0) {
      // Don't reveal if email exists
      return { message: 'If the email exists, a reset link will be sent' };
    }

    const user = result.rows[0];
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    const expiresAt = new Date(Date.now() + 3600000); // 1 hour

    await query(
      `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at, created_at)
       VALUES ($1, $2, $3, NOW())`,
      [user.user_id, resetTokenHash, expiresAt]
    );

    try {
      await sendPasswordResetEmail(user.email, resetToken);
    } catch (error) {
      console.error('Failed to send password reset email:', error);
    }

    return { message: 'If the email exists, a reset link will be sent' };
  }

  /**
   * Reset password with token
   */
  async resetPassword(token: string, newPassword: string) {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const result = await query(
      `SELECT prt.user_id, prt.expires_at
       FROM password_reset_tokens prt
       WHERE prt.token_hash = $1 AND prt.used_at IS NULL`,
      [tokenHash]
    );

    if (result.rows.length === 0) {
      throw new AppError(400, 'Invalid or expired reset token');
    }

    const resetRecord = result.rows[0];

    if (new Date() > new Date(resetRecord.expires_at)) {
      throw new AppError(400, 'Reset token has expired');
    }

    const password_hash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

    await transaction(async (client) => {
      await client.query(
        'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE user_id = $2',
        [password_hash, resetRecord.user_id]
      );

      await client.query(
        'UPDATE password_reset_tokens SET used_at = NOW() WHERE token_hash = $1',
        [tokenHash]
      );
    });

    return { message: 'Password reset successfully' };
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
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);

    if (!isPasswordValid) {
      throw new AppError(401, 'Current password is incorrect');
    }

    const password_hash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

    await query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE user_id = $2',
      [password_hash, userId]
    );

    return { message: 'Password changed successfully' };
  }

  /**
   * Get current user profile
   */
  async getCurrentUser(userId: string) {
    const result = await query(
      `SELECT 
        u.user_id, u.username, u.email, u.is_email_verified,
        u.last_login, u.organization_id,
        o.organization_name, o.organization_code,
        o.subscription_plan, o.subscription_status,
        e.employee_id, e.employee_code, e.first_name, e.middle_name, e.last_name,
        e.phone_number, e.profile_picture_url, e.employee_status
      FROM users u
      JOIN organizations o ON u.organization_id = o.organization_id
      LEFT JOIN employees e ON u.employee_id = e.employee_id
      WHERE u.user_id = $1 AND u.is_deleted = FALSE`,
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
  async logout(_userId: string): Promise<{ message: string }> {
    // In a real implementation, you might want to blacklist the token
    return { message: 'Logged out successfully' };
  }
}
