// =====================================================
// Email Service - Nodemailer Integration
// Handles all email sending operations
// =====================================================

import nodemailer, { Transporter } from 'nodemailer';
import { env } from '../config/env';
import { logger } from '../config/logger';

interface EmailOptions {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    path?: string;
    content?: Buffer | string;
  }>;
}

interface WelcomeEmailData {
  name: string;
  email: string;
  temporaryPassword: string;
  loginUrl: string;
}

interface PasswordResetData {
  name: string;
  resetToken: string;
  resetUrl: string;
  expiresIn: string;
}

interface LeaveNotificationData {
  employeeName: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  numberOfDays: number;
  status: string;
  reason?: string;
}

export class EmailService {
  private transporter: Transporter | null = null;
  private isEnabled: boolean = false;

  constructor() {
    this.initialize();
  }

  /**
   * Initialize email transporter
   */
  private initialize(): void {
    try {
      // Check if email configuration is available
      if (!env.email.host || !env.email.port) {
        logger.warn('Email service not configured. Email functionality will be disabled.');
        return;
      }

      this.transporter = nodemailer.createTransport({
        host: env.email.host,
        port: env.email.port,
        secure: env.email.port === 465, // true for 465, false for other ports
        auth: env.email.user && env.email.password ? {
          user: env.email.user,
          pass: env.email.password,
        } : undefined,
      });

      this.isEnabled = true;
      logger.info('Email service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize email service:', error);
      this.isEnabled = false;
    }
  }

  /**
   * Send generic email
   */
  async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!this.isEnabled || !this.transporter) {
      logger.warn('Email service is disabled. Email not sent.');
      return false;
    }

    try {
      const mailOptions = {
        from: env.email.from || 'noreply@hrms.com',
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
        attachments: options.attachments,
      };

      const info = await this.transporter.sendMail(mailOptions);
      logger.info(`Email sent successfully: ${info.messageId}`);
      return true;
    } catch (error) {
      logger.error('Failed to send email:', error);
      return false;
    }
  }

  /**
   * Send welcome email to new employee
   */
  async sendWelcomeEmail(data: WelcomeEmailData): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #1976d2; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .credentials { background-color: #fff; padding: 15px; border-left: 4px solid #1976d2; margin: 20px 0; }
          .button { display: inline-block; padding: 12px 24px; background-color: #1976d2; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to HR Management System</h1>
          </div>
          <div class="content">
            <h2>Hello ${data.name},</h2>
            <p>Welcome to our HR Management System! We're excited to have you on board.</p>
            
            <div class="credentials">
              <h3>Your Login Credentials</h3>
              <p><strong>Email:</strong> ${data.email}</p>
              <p><strong>Temporary Password:</strong> ${data.temporaryPassword}</p>
              <p><em>Please change your password after your first login.</em></p>
            </div>
            
            <p style="text-align: center;">
              <a href="${data.loginUrl}" class="button">Login to Your Account</a>
            </p>
            
            <p>If you have any questions or need assistance, please don't hesitate to contact your HR department.</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} HR Management System. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: data.email,
      subject: 'Welcome to HR Management System',
      html,
    });
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(data: PasswordResetData): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #1976d2; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .warning { background-color: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 20px 0; }
          .button { display: inline-block; padding: 12px 24px; background-color: #1976d2; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Password Reset Request</h1>
          </div>
          <div class="content">
            <h2>Hello ${data.name},</h2>
            <p>We received a request to reset your password for your HR Management System account.</p>
            
            <p style="text-align: center;">
              <a href="${data.resetUrl}" class="button">Reset Your Password</a>
            </p>
            
            <div class="warning">
              <p><strong>Important:</strong></p>
              <ul>
                <li>This link will expire in ${data.expiresIn}</li>
                <li>If you didn't request this reset, please ignore this email</li>
                <li>Your password will remain unchanged until you create a new one</li>
              </ul>
            </div>
            
            <p>If the button doesn't work, copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #1976d2;">${data.resetUrl}</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} HR Management System. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: data.resetToken, // This should be the email address
      subject: 'Password Reset Request',
      html,
    });
  }

  /**
   * Send leave request notification
   */
  async sendLeaveNotification(to: string, data: LeaveNotificationData): Promise<boolean> {
    const statusColors: Record<string, string> = {
      pending: '#ffc107',
      approved: '#4caf50',
      rejected: '#f44336',
    };

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #1976d2; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .leave-details { background-color: #fff; padding: 15px; border-radius: 4px; margin: 20px 0; }
          .status-badge { display: inline-block; padding: 6px 12px; border-radius: 4px; color: white; font-weight: bold; background-color: ${statusColors[data.status] || '#666'}; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Leave Request Update</h1>
          </div>
          <div class="content">
            <p>A leave request has been updated:</p>
            
            <div class="leave-details">
              <p><strong>Employee:</strong> ${data.employeeName}</p>
              <p><strong>Leave Type:</strong> ${data.leaveType}</p>
              <p><strong>Start Date:</strong> ${data.startDate}</p>
              <p><strong>End Date:</strong> ${data.endDate}</p>
              <p><strong>Number of Days:</strong> ${data.numberOfDays}</p>
              <p><strong>Status:</strong> <span class="status-badge">${data.status.toUpperCase()}</span></p>
              ${data.reason ? `<p><strong>Reason:</strong> ${data.reason}</p>` : ''}
            </div>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} HR Management System. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to,
      subject: `Leave Request ${data.status.charAt(0).toUpperCase() + data.status.slice(1)} - ${data.employeeName}`,
      html,
    });
  }

  /**
   * Verify email configuration
   */
  async verifyConnection(): Promise<boolean> {
    if (!this.isEnabled || !this.transporter) {
      return false;
    }

    try {
      await this.transporter.verify();
      logger.info('Email service connection verified');
      return true;
    } catch (error) {
      logger.error('Email service connection verification failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const emailService = new EmailService();
