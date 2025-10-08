/**
 * Password Security Tests
 * Tests for password validation and security functions
 */

import {
  validatePasswordStrength,
  containsPersonalInfo,
  generateSecurePassword,
  isCommonPassword,
} from '../../utils/passwordSecurity';

describe('Password Security', () => {
  describe('Password Strength Validation', () => {
    it('should reject password shorter than 8 characters', () => {
      const result = validatePasswordStrength('short');
      expect(result.isValid).toBe(false);
      expect(result.feedback).toContain('Password must be at least 8 characters long');
    });

    it('should accept strong password', () => {
      const result = validatePasswordStrength('MyP@ssw0rd123!');
      expect(result.isValid).toBe(true);
      expect(result.score).toBeGreaterThanOrEqual(3);
    });

    it('should score password based on complexity', () => {
      const weak = validatePasswordStrength('password123');
      const strong = validatePasswordStrength('MyP@ssw0rd123!');
      
      expect(strong.score).toBeGreaterThan(weak.score);
    });

    it('should detect common patterns', () => {
      const result = validatePasswordStrength('password123456');
      expect(result.feedback.some(f => f.includes('common patterns'))).toBe(true);
    });

    it('should detect repeated characters', () => {
      const result = validatePasswordStrength('aaabbbccc111');
      expect(result.feedback.some(f => f.includes('repeated characters'))).toBe(true);
    });

    it('should provide feedback for missing elements', () => {
      const result = validatePasswordStrength('alllowercase');
      expect(result.feedback.length).toBeGreaterThan(0);
    });

    it('should reward longer passwords', () => {
      const short = validatePasswordStrength('P@ssw0rd');
      const long = validatePasswordStrength('P@ssw0rdLonger123');
      
      // Long password should have at least as good or better score
      expect(long.score).toBeGreaterThanOrEqual(short.score);
    });
  });

  describe('Personal Information Detection', () => {
    const userData = {
      username: 'johndoe',
      email: 'john.doe@example.com',
      firstName: 'John',
      lastName: 'Doe',
    };

    it('should detect username in password', () => {
      expect(containsPersonalInfo('johndoe123', userData)).toBe(true);
      expect(containsPersonalInfo('JohnDoe123', userData)).toBe(true);
    });

    it('should detect email prefix in password', () => {
      expect(containsPersonalInfo('john.doe123', userData)).toBe(true);
    });

    it('should detect first name in password', () => {
      expect(containsPersonalInfo('john123456', userData)).toBe(true);
    });

    it('should detect last name in password', () => {
      expect(containsPersonalInfo('doe1234567', userData)).toBe(true);
    });

    it('should not flag password without personal info', () => {
      expect(containsPersonalInfo('MySecureP@ss123', userData)).toBe(false);
    });

    it('should handle missing user data gracefully', () => {
      expect(containsPersonalInfo('password123', {})).toBe(false);
    });
  });

  describe('Secure Password Generation', () => {
    it('should generate password with default length', () => {
      const password = generateSecurePassword();
      expect(password.length).toBe(16);
    });

    it('should generate password with custom length', () => {
      const password = generateSecurePassword(20);
      expect(password.length).toBe(20);
    });

    it('should enforce minimum length of 12', () => {
      const password = generateSecurePassword(8);
      expect(password.length).toBe(12);
    });

    it('should include lowercase letters', () => {
      const password = generateSecurePassword();
      expect(/[a-z]/.test(password)).toBe(true);
    });

    it('should include uppercase letters', () => {
      const password = generateSecurePassword();
      expect(/[A-Z]/.test(password)).toBe(true);
    });

    it('should include numbers', () => {
      const password = generateSecurePassword();
      expect(/\d/.test(password)).toBe(true);
    });

    it('should include special characters', () => {
      const password = generateSecurePassword();
      expect(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)).toBe(true);
    });

    it('should generate unique passwords', () => {
      const password1 = generateSecurePassword();
      const password2 = generateSecurePassword();
      expect(password1).not.toBe(password2);
    });

    it('should pass strength validation', () => {
      const password = generateSecurePassword();
      const result = validatePasswordStrength(password);
      expect(result.isValid).toBe(true);
      expect(result.score).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Common Password Detection', () => {
    it('should detect common passwords', () => {
      expect(isCommonPassword('password')).toBe(true);
      expect(isCommonPassword('123456')).toBe(true);
      expect(isCommonPassword('qwerty')).toBe(true);
    });

    it('should be case-insensitive', () => {
      expect(isCommonPassword('PASSWORD')).toBe(true);
      expect(isCommonPassword('PaSsWoRd')).toBe(true);
    });

    it('should not flag uncommon passwords', () => {
      expect(isCommonPassword('MySecureP@ss123')).toBe(false);
    });
  });

  describe('Integration Tests', () => {
    it('should reject common password with personal info', () => {
      const userData = {
        username: 'johndoe',
        email: 'john@example.com',
      };

      const password = 'johndoe123';
      
      expect(isCommonPassword(password)).toBe(false); // Not in common list
      expect(containsPersonalInfo(password, userData)).toBe(true);
      
      const strength = validatePasswordStrength(password);
      expect(strength.isValid).toBe(false); // Should fail strength check
    });

    it('should accept strong unique password', () => {
      const password = generateSecurePassword();
      
      expect(isCommonPassword(password)).toBe(false);
      
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
      };
      expect(containsPersonalInfo(password, userData)).toBe(false);
      
      const strength = validatePasswordStrength(password);
      expect(strength.isValid).toBe(true);
    });
  });
});
