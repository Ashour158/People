// Test setup file for Jest
// Add any global test configuration here

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_NAME = 'hr_system_test';
process.env.DB_USER = 'postgres';
process.env.DB_PASSWORD = 'postgres';

// Increase timeout for integration tests
jest.setTimeout(10000);
