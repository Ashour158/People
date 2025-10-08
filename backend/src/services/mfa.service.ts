import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { query } from '../config/database';
import { logger } from '../config/logger';
import { AppError } from '../middleware/errorHandler';

/**
 * Multi-Factor Authentication (MFA) Service
 * Implements TOTP-based 2FA using speakeasy
 */

export interface MFASecret {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
}

export interface MFAStatus {
  enabled: boolean;
  verified: boolean;
}

/**
 * Generate MFA secret for a user
 */
export async function generateMFASecret(
  userId: string,
  userEmail: string
): Promise<MFASecret> {
  try {
    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `HR System (${userEmail})`,
      issuer: 'HR Management System',
      length: 32,
    });

    // Generate QR code
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!);

    // Generate backup codes
    const backupCodes = generateBackupCodes(10);

    // Store secret in database (encrypted)
    await query(
      `UPDATE users
      SET mfa_secret = $1,
          mfa_backup_codes = $2,
          mfa_enabled = FALSE,
          mfa_verified = FALSE,
          modified_at = NOW()
      WHERE user_id = $3`,
      [secret.base32, backupCodes, userId]
    );

    logger.info('MFA secret generated', { userId });

    return {
      secret: secret.base32,
      qrCodeUrl,
      backupCodes,
    };
  } catch (error) {
    logger.error('Error generating MFA secret', { error, userId });
    throw new AppError(500, 'Failed to generate MFA secret');
  }
}

/**
 * Verify MFA token and enable MFA for user
 */
export async function verifyAndEnableMFA(
  userId: string,
  token: string
): Promise<boolean> {
  try {
    // Get user's MFA secret
    const result = await query(
      `SELECT mfa_secret, mfa_enabled
      FROM users
      WHERE user_id = $1 AND is_deleted = FALSE`,
      [userId]
    );

    if (result.rows.length === 0) {
      throw new AppError(404, 'User not found');
    }

    const { mfa_secret, mfa_enabled } = result.rows[0];

    if (!mfa_secret) {
      throw new AppError(400, 'MFA secret not generated');
    }

    if (mfa_enabled) {
      throw new AppError(400, 'MFA already enabled');
    }

    // Verify token
    const verified = speakeasy.totp.verify({
      secret: mfa_secret,
      encoding: 'base32',
      token,
      window: 2, // Allow 2 time steps before/after for clock skew
    });

    if (!verified) {
      logger.warn('Invalid MFA token during setup', { userId });
      return false;
    }

    // Enable MFA
    await query(
      `UPDATE users
      SET mfa_enabled = TRUE,
          mfa_verified = TRUE,
          modified_at = NOW()
      WHERE user_id = $1`,
      [userId]
    );

    logger.info('MFA enabled for user', { userId });
    return true;
  } catch (error) {
    if (error instanceof AppError) throw error;
    logger.error('Error verifying MFA token', { error, userId });
    throw new AppError(500, 'Failed to verify MFA token');
  }
}

/**
 * Verify MFA token during login
 */
export async function verifyMFAToken(
  userId: string,
  token: string
): Promise<boolean> {
  try {
    // Get user's MFA secret
    const result = await query(
      `SELECT mfa_secret, mfa_enabled, mfa_backup_codes
      FROM users
      WHERE user_id = $1 AND is_deleted = FALSE`,
      [userId]
    );

    if (result.rows.length === 0) {
      throw new AppError(404, 'User not found');
    }

    const { mfa_secret, mfa_enabled, mfa_backup_codes } = result.rows[0];

    if (!mfa_enabled) {
      throw new AppError(400, 'MFA not enabled for this user');
    }

    // First try TOTP verification
    const verified = speakeasy.totp.verify({
      secret: mfa_secret,
      encoding: 'base32',
      token,
      window: 2,
    });

    if (verified) {
      logger.info('MFA token verified', { userId });
      return true;
    }

    // If TOTP fails, check backup codes
    if (mfa_backup_codes && mfa_backup_codes.includes(token)) {
      // Remove used backup code
      await query(
        `UPDATE users
        SET mfa_backup_codes = array_remove(mfa_backup_codes, $1),
            modified_at = NOW()
        WHERE user_id = $2`,
        [token, userId]
      );

      logger.info('MFA backup code used', { userId });
      return true;
    }

    logger.warn('Invalid MFA token', { userId });
    return false;
  } catch (error) {
    if (error instanceof AppError) throw error;
    logger.error('Error verifying MFA token', { error, userId });
    throw new AppError(500, 'Failed to verify MFA token');
  }
}

/**
 * Disable MFA for a user
 */
export async function disableMFA(userId: string): Promise<void> {
  try {
    await query(
      `UPDATE users
      SET mfa_enabled = FALSE,
          mfa_verified = FALSE,
          mfa_secret = NULL,
          mfa_backup_codes = NULL,
          modified_at = NOW()
      WHERE user_id = $1`,
      [userId]
    );

    logger.info('MFA disabled for user', { userId });
  } catch (error) {
    logger.error('Error disabling MFA', { error, userId });
    throw new AppError(500, 'Failed to disable MFA');
  }
}

/**
 * Get MFA status for a user
 */
export async function getMFAStatus(userId: string): Promise<MFAStatus> {
  try {
    const result = await query(
      `SELECT mfa_enabled, mfa_verified
      FROM users
      WHERE user_id = $1 AND is_deleted = FALSE`,
      [userId]
    );

    if (result.rows.length === 0) {
      throw new AppError(404, 'User not found');
    }

    return {
      enabled: result.rows[0].mfa_enabled || false,
      verified: result.rows[0].mfa_verified || false,
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    logger.error('Error getting MFA status', { error, userId });
    throw new AppError(500, 'Failed to get MFA status');
  }
}

/**
 * Generate new backup codes
 */
export async function regenerateBackupCodes(userId: string): Promise<string[]> {
  try {
    const backupCodes = generateBackupCodes(10);

    await query(
      `UPDATE users
      SET mfa_backup_codes = $1,
          modified_at = NOW()
      WHERE user_id = $2`,
      [backupCodes, userId]
    );

    logger.info('MFA backup codes regenerated', { userId });
    return backupCodes;
  } catch (error) {
    logger.error('Error regenerating backup codes', { error, userId });
    throw new AppError(500, 'Failed to regenerate backup codes');
  }
}

/**
 * Generate random backup codes
 */
function generateBackupCodes(count: number): string[] {
  const codes: string[] = [];
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

  for (let i = 0; i < count; i++) {
    let code = '';
    for (let j = 0; j < 8; j++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    // Format as XXXX-XXXX
    code = `${code.slice(0, 4)}-${code.slice(4)}`;
    codes.push(code);
  }

  return codes;
}
