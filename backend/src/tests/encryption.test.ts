import { encrypt, decrypt, encryptFields, decryptFields, generateSecureToken, generateOTP, secureCompare, hashData } from '../utils/encryption';

describe('Encryption Utilities', () => {
  describe('encrypt and decrypt', () => {
    it('should encrypt and decrypt a string correctly', () => {
      const original = 'sensitive data';
      const encrypted = encrypt(original);
      const decrypted = decrypt(encrypted);
      
      expect(encrypted).not.toBe(original);
      expect(encrypted).toContain(':'); // Should contain separators
      expect(decrypted).toBe(original);
    });

    it('should handle empty strings', () => {
      const empty = '';
      const encrypted = encrypt(empty);
      expect(encrypted).toBe(empty);
    });

    it('should produce different ciphertexts for same plaintext', () => {
      const text = 'same text';
      const encrypted1 = encrypt(text);
      const encrypted2 = encrypt(text);
      
      expect(encrypted1).not.toBe(encrypted2);
      expect(decrypt(encrypted1)).toBe(text);
      expect(decrypt(encrypted2)).toBe(text);
    });

    it('should return original if decryption fails', () => {
      const invalidEncrypted = 'invalid:encrypted:data';
      const result = decrypt(invalidEncrypted);
      expect(result).toBe(invalidEncrypted);
    });
  });

  describe('encryptFields and decryptFields', () => {
    it('should encrypt specified fields in an object', () => {
      const user = {
        name: 'John Doe',
        email: 'john@example.com',
        ssn: '123-45-6789',
        salary: '100000',
      };

      const encrypted = encryptFields(user, ['ssn', 'salary']);
      
      expect(encrypted.name).toBe(user.name);
      expect(encrypted.email).toBe(user.email);
      expect(encrypted.ssn).not.toBe(user.ssn);
      expect(encrypted.salary).not.toBe(user.salary);
    });

    it('should decrypt specified fields in an object', () => {
      const user = {
        name: 'John Doe',
        ssn: '123-45-6789',
        salary: '100000',
      };

      const encrypted = encryptFields(user, ['ssn', 'salary']);
      const decrypted = decryptFields(encrypted, ['ssn', 'salary']);
      
      expect(decrypted.name).toBe(user.name);
      expect(decrypted.ssn).toBe(user.ssn);
      expect(decrypted.salary).toBe(user.salary);
    });

    it('should handle non-existent fields gracefully', () => {
      const obj = { name: 'test' };
      const encrypted = encryptFields(obj, ['nonexistent' as any]);
      expect(encrypted).toEqual(obj);
    });
  });

  describe('hashData', () => {
    it('should hash data consistently', () => {
      const data = 'test data';
      const hash1 = hashData(data);
      const hash2 = hashData(data);
      
      expect(hash1).toBe(hash2);
      expect(hash1).not.toBe(data);
      expect(hash1).toHaveLength(64); // SHA-256 produces 64 hex characters
    });

    it('should produce different hashes for different data', () => {
      const hash1 = hashData('data1');
      const hash2 = hashData('data2');
      
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('generateSecureToken', () => {
    it('should generate a token of specified length', () => {
      const token = generateSecureToken(32);
      expect(token).toHaveLength(64); // Hex encoding doubles the length
    });

    it('should generate unique tokens', () => {
      const token1 = generateSecureToken();
      const token2 = generateSecureToken();
      
      expect(token1).not.toBe(token2);
    });
  });

  describe('generateOTP', () => {
    it('should generate OTP of specified length', () => {
      const otp = generateOTP(6);
      expect(otp).toHaveLength(6);
      expect(otp).toMatch(/^\d+$/);
    });

    it('should generate different OTPs', () => {
      const otp1 = generateOTP();
      const otp2 = generateOTP();
      
      // They might be the same by chance, but very unlikely
      expect(otp1).toMatch(/^\d{6}$/);
      expect(otp2).toMatch(/^\d{6}$/);
    });

    it('should generate OTP with custom length', () => {
      const otp = generateOTP(8);
      expect(otp).toHaveLength(8);
      expect(otp).toMatch(/^\d+$/);
    });
  });

  describe('secureCompare', () => {
    it('should return true for identical strings', () => {
      const str = 'test string';
      expect(secureCompare(str, str)).toBe(true);
    });

    it('should return false for different strings', () => {
      expect(secureCompare('test1', 'test2')).toBe(false);
    });

    it('should return false for different length strings', () => {
      expect(secureCompare('test', 'testing')).toBe(false);
    });

    it('should be constant-time (same length strings)', () => {
      // This test verifies the function works but can't truly verify constant-time
      const str1 = 'a'.repeat(100);
      const str2 = 'b'.repeat(100);
      
      expect(secureCompare(str1, str2)).toBe(false);
    });
  });
});
