// =====================================================
// Environment Configuration with Zod Validation
// Type-safe configuration with runtime validation
// =====================================================

import { z } from 'zod';
import * as dotenv from 'dotenv';

dotenv.config();

// =====================================================
// CONFIGURATION SCHEMA
// =====================================================

const envSchema = z.object({
  // Node Environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('5000'),
  API_VERSION: z.string().default('v1'),

  // Database
  DB_HOST: z.string().default('localhost'),
  DB_PORT: z.string().transform(Number).default('5432'),
  DB_NAME: z.string().default('hr_system'),
  DB_USER: z.string().default('postgres'),
  DB_PASSWORD: z.string().optional(),
  DB_POOL_MIN: z.string().transform(Number).default('2'),
  DB_POOL_MAX: z.string().transform(Number).default('10'),
  DB_URL: z.string().optional(),

  // Redis
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.string().transform(Number).default('6379'),
  REDIS_PASSWORD: z.string().optional(),

  // JWT
  JWT_SECRET: z.string().min(32, 'JWT secret must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('24h'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  // Security
  BCRYPT_ROUNDS: z.string().transform(Number).default('12'),
  MAX_LOGIN_ATTEMPTS: z.string().transform(Number).default('5'),
  LOCKOUT_DURATION_MINUTES: z.string().transform(Number).default('30'),

  // MENA Configuration
  DEFAULT_CURRENCY: z.string().default('USD'),
  MENA_COUNTRY_CODES: z.string().default('AE,SA,KW,QA,OM,BH,JO,EG,MA,TN,LB,IQ,YE,SY'),

  // Multi-Tenancy
  ENABLE_RLS: z.string().transform((val) => val === 'true').default('false'),
  
  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  LOG_DIR: z.string().default('./logs'),

  // Email
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().transform(Number).optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  EMAIL_FROM: z.string().email().optional(),
});

// =====================================================
// PARSE AND VALIDATE
// =====================================================

let config: z.infer<typeof envSchema>;

try {
  config = envSchema.parse(process.env);
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error('❌ Invalid environment configuration:');
    error.errors.forEach((err) => {
      console.error(`  - ${err.path.join('.')}: ${err.message}`);
    });
    process.exit(1);
  }
  throw error;
}

// =====================================================
// EXPORT CONFIGURATION
// =====================================================

export const env = {
  // Node
  nodeEnv: config.NODE_ENV,
  port: config.PORT,
  apiVersion: config.API_VERSION,
  isDevelopment: config.NODE_ENV === 'development',
  isProduction: config.NODE_ENV === 'production',
  isTest: config.NODE_ENV === 'test',

  // Database
  database: {
    host: config.DB_HOST,
    port: config.DB_PORT,
    name: config.DB_NAME,
    user: config.DB_USER,
    password: config.DB_PASSWORD,
    poolMin: config.DB_POOL_MIN,
    poolMax: config.DB_POOL_MAX,
    url: config.DB_URL,
  },

  // Redis
  redis: {
    host: config.REDIS_HOST,
    port: config.REDIS_PORT,
    password: config.REDIS_PASSWORD,
  },

  // JWT
  jwt: {
    secret: config.JWT_SECRET,
    expiresIn: config.JWT_EXPIRES_IN,
    refreshExpiresIn: config.JWT_REFRESH_EXPIRES_IN,
  },

  // Security
  security: {
    bcryptRounds: config.BCRYPT_ROUNDS,
    maxLoginAttempts: config.MAX_LOGIN_ATTEMPTS,
    lockoutDurationMinutes: config.LOCKOUT_DURATION_MINUTES,
  },

  // MENA
  mena: {
    defaultCurrency: config.DEFAULT_CURRENCY,
    countryCodes: config.MENA_COUNTRY_CODES.split(',').map((c) => c.trim()),
  },

  // Multi-Tenancy
  multiTenancy: {
    enableRLS: config.ENABLE_RLS,
  },

  // Logging
  logging: {
    level: config.LOG_LEVEL,
    dir: config.LOG_DIR,
  },

  // Email
  email: {
    host: config.SMTP_HOST,
    port: config.SMTP_PORT,
    user: config.SMTP_USER,
    password: config.SMTP_PASSWORD,
    from: config.EMAIL_FROM,
  },
};

export type Config = typeof env;
