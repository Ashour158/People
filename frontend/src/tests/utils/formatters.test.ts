import { describe, it, expect } from 'vitest';

describe('Form Validation Utilities', () => {
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password: string): boolean => {
    return password.length >= 8;
  };

  const validatePhone = (phone: string): boolean => {
    const phoneRegex = /^\+?[\d\s-()]+$/;
    return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10;
  };

  describe('Email Validation', () => {
    it('validates correct email format', () => {
      expect(validateEmail('test@example.com')).toBe(true);
      expect(validateEmail('user.name@example.co.uk')).toBe(true);
    });

    it('rejects invalid email format', () => {
      expect(validateEmail('invalid')).toBe(false);
      expect(validateEmail('@example.com')).toBe(false);
      expect(validateEmail('test@')).toBe(false);
    });
  });

  describe('Password Validation', () => {
    it('validates password with minimum length', () => {
      expect(validatePassword('Password123!')).toBe(true);
      expect(validatePassword('12345678')).toBe(true);
    });

    it('rejects short passwords', () => {
      expect(validatePassword('short')).toBe(false);
      expect(validatePassword('123')).toBe(false);
    });
  });

  describe('Phone Validation', () => {
    it('validates correct phone formats', () => {
      expect(validatePhone('+1234567890')).toBe(true);
      expect(validatePhone('(123) 456-7890')).toBe(true);
    });

    it('rejects invalid phone formats', () => {
      expect(validatePhone('123')).toBe(false);
      expect(validatePhone('abc')).toBe(false);
    });
  });
});

describe('Date Formatting Utilities', () => {
  const formatDate = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  const parseDate = (dateString: string): Date => {
    return new Date(dateString);
  };

  it('formats date correctly', () => {
    const date = new Date('2024-01-15');
    expect(formatDate(date)).toBe('2024-01-15');
  });

  it('parses date string', () => {
    const dateString = '2024-01-15';
    const parsed = parseDate(dateString);
    expect(parsed instanceof Date).toBe(true);
  });
});

describe('String Utilities', () => {
  const capitalize = (str: string): string => {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  };

  const truncate = (str: string, length: number): string => {
    return str.length > length ? `${str.substring(0, length)  }...` : str;
  };

  it('capitalizes string', () => {
    expect(capitalize('hello')).toBe('Hello');
    expect(capitalize('WORLD')).toBe('World');
  });

  it('truncates long strings', () => {
    expect(truncate('This is a long string', 10)).toBe('This is a ...');
    expect(truncate('Short', 10)).toBe('Short');
  });
});

describe('Number Formatting Utilities', () => {
  const formatCurrency = (amount: number, currency: string = 'USD'): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  };

  const formatPercentage = (value: number): string => {
    return `${(value * 100).toFixed(2)}%`;
  };

  it('formats currency', () => {
    const formatted = formatCurrency(1234.56);
    expect(formatted).toContain('1,234.56');
  });

  it('formats percentage', () => {
    expect(formatPercentage(0.756)).toBe('75.60%');
    expect(formatPercentage(0.1)).toBe('10.00%');
  });
});
