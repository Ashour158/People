/**
 * Password Security Utilities
 * Provides password strength validation and security checks
 */

export interface PasswordStrengthResult {
  isValid: boolean;
  score: number; // 0-4
  feedback: string[];
}

/**
 * Validate password strength
 * @param password - The password to validate
 * @returns Password strength result with score and feedback
 */
export const validatePasswordStrength = (password: string): PasswordStrengthResult => {
  const feedback: string[] = [];
  let score = 0;

  // Check minimum length
  if (password.length < 8) {
    feedback.push('Password must be at least 8 characters long');
    return { isValid: false, score, feedback };
  }

  // Check length
  if (password.length >= 12) {
    score += 1;
  } else {
    feedback.push('Use at least 12 characters for better security');
  }

  // Check for lowercase letters
  if (/[a-z]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Include lowercase letters');
  }

  // Check for uppercase letters
  if (/[A-Z]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Include uppercase letters');
  }

  // Check for numbers
  if (/\d/.test(password)) {
    score += 1;
  } else {
    feedback.push('Include numbers');
  }

  // Check for special characters
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Include special characters');
  }

  // Check for common patterns
  const commonPatterns = [
    /^(?=.*password)/i,
    /^(?=.*123456)/,
    /^(?=.*qwerty)/i,
    /^(?=.*abc)/i,
    /^(?=.*111111)/,
  ];

  const hasCommonPattern = commonPatterns.some((pattern) => pattern.test(password));
  if (hasCommonPattern) {
    feedback.push('Avoid common patterns like "password", "123456", "qwerty"');
    score = Math.max(0, score - 2);
  }

  // Check for sequential characters
  if (/(.)\1{2,}/.test(password)) {
    feedback.push('Avoid repeated characters');
    score = Math.max(0, score - 1);
  }

  // Determine if password is valid (minimum score of 3)
  const isValid = score >= 3 && feedback.length <= 2;

  if (isValid && feedback.length === 0) {
    feedback.push('Strong password');
  }

  return { isValid, score: Math.min(score, 4), feedback };
};

/**
 * Check if password contains personal information
 * @param password - The password to check
 * @param userData - Object containing user's personal information
 * @returns true if password contains personal info
 */
export const containsPersonalInfo = (
  password: string,
  userData: { 
    username?: string; 
    email?: string; 
    firstName?: string; 
    lastName?: string;
  }
): boolean => {
  const lowerPassword = password.toLowerCase();
  
  if (userData.username && lowerPassword.includes(userData.username.toLowerCase())) {
    return true;
  }
  
  if (userData.email) {
    const parts = userData.email.split('@');
    if (parts.length > 0 && parts[0]) {
      const emailPart = parts[0].toLowerCase();
      if (lowerPassword.includes(emailPart)) {
        return true;
      }
    }
  }
  
  if (userData.firstName && lowerPassword.includes(userData.firstName.toLowerCase())) {
    return true;
  }
  
  if (userData.lastName && lowerPassword.includes(userData.lastName.toLowerCase())) {
    return true;
  }
  
  return false;
};

/**
 * Generate a secure random password
 * @param length - Length of the password (minimum 12)
 * @returns A secure random password
 */
export const generateSecurePassword = (length: number = 16): string => {
  const minLength = 12;
  const passwordLength = Math.max(length, minLength);
  
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  
  const allChars = lowercase + uppercase + numbers + special;
  
  // Ensure at least one character from each set
  let password = '';
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];
  
  // Fill the rest randomly
  for (let i = password.length; i < passwordLength; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
};

/**
 * Common passwords list (top 100 most common)
 * In production, this should be loaded from a file or database
 */
const COMMON_PASSWORDS = [
  'password', '123456', '12345678', 'qwerty', 'abc123',
  'monkey', '1234567', 'letmein', 'trustno1', 'dragon',
  'baseball', '111111', 'iloveyou', 'master', 'sunshine',
  'ashley', 'bailey', 'passw0rd', 'shadow', '123123',
  '654321', 'superman', 'qazwsx', 'michael', 'football',
];

/**
 * Check if password is in common passwords list
 * @param password - The password to check
 * @returns true if password is common
 */
export const isCommonPassword = (password: string): boolean => {
  return COMMON_PASSWORDS.includes(password.toLowerCase());
};
