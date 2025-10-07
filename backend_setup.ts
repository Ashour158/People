// =====================================================
// HR MANAGEMENT SYSTEM - BACKEND API
// Node.js + TypeScript + Express + PostgreSQL
// =====================================================

// ===== package.json =====
/*
{
  "name": "hr-management-api",
  "version": "1.0.0",
  "description": "Multi-tenant HR Management System API",
  "main": "dist/server.js",
  "scripts": {
    "dev": "nodemon --exec ts-node src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "migrate": "node dist/database/migrate.js",
    "seed": "node dist/database/seed.js",
    "test": "jest",
    "lint": "eslint src/**/*.ts"
  },
  "dependencies": {
    "express": "^4.18.2",
    "pg": "^8.11.3",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.2",
    "dotenv": "^16.3.1",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "express-rate-limit": "^7.1.5",
    "joi": "^17.11.0",
    "winston": "^3.11.0",
    "multer": "^1.4.5-lts.1",
    "uuid": "^9.0.1",
    "date-fns": "^3.0.6",
    "nodemailer": "^6.9.7",
    "redis": "^4.6.12",
    "bull": "^4.12.0"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/node": "^20.10.6",
    "@types/bcryptjs": "^2.4.6",
    "@types/jsonwebtoken": "^9.0.5",
    "@types/cors": "^2.8.17",
    "@types/multer": "^1.4.11",
    "@types/nodemailer": "^6.4.14",
    "typescript": "^5.3.3",
    "ts-node": "^10.9.2",
    "nodemon": "^3.0.2",
    "@typescript-eslint/eslint-plugin": "^6.17.0",
    "@typescript-eslint/parser": "^6.17.0",
    "eslint": "^8.56.0",
    "jest": "^29.7.0",
    "@types/jest": "^29.5.11"
  }
}
*/

// ===== tsconfig.json =====
/*
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
*/

// ===== .env.example =====
/*
# Server
NODE_ENV=development
PORT=5000
API_VERSION=v1

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=hr_system
DB_USER=postgres
DB_PASSWORD=your_password
DB_POOL_MIN=2
DB_POOL_MAX=10

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT
JWT_SECRET=your_super_secret_key_change_in_production
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# Security
BCRYPT_ROUNDS=12
MAX_LOGIN_ATTEMPTS=5
LOCKOUT_DURATION_MINUTES=30

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password
EMAIL_FROM=noreply@yourdomain.com

# File Upload
UPLOAD_DIR=./uploads
MAX_FILE_SIZE_MB=10
ALLOWED_FILE_TYPES=pdf,doc,docx,jpg,jpeg,png

# AWS S3 (Optional)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_S3_BUCKET=

# Logging
LOG_LEVEL=info
LOG_DIR=./logs
*/

// ===== src/config/database.ts =====
import { Pool, PoolConfig } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const poolConfig: PoolConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'hr_system',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  min: parseInt(process.env.DB_POOL_MIN || '2'),
  max: parseInt(process.env.DB_POOL_MAX || '10'),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

export const pool = new Pool(poolConfig);

// Test connection
pool.on('connect', () => {
  console.log('✅ Database connected');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected database error:', err);
  process.exit(-1);
});

// Query helper with logging
export const query = async (text: string, params?: any[]) => {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Query executed', { text, duration, rows: result.rowCount });
    return result;
  } catch (error) {
    console.error('Query error:', { text, error });
    throw error;
  }
};

// Transaction helper
export const transaction = async (callback: (client: any) => Promise<any>) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// ===== src/config/redis.ts =====
import { createClient } from 'redis';

export const redisClient = createClient({
  socket: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
  },
  password: process.env.REDIS_PASSWORD || undefined,
});

redisClient.on('error', (err) => console.error('Redis Client Error', err));
redisClient.on('connect', () => console.log('✅ Redis connected'));

export const connectRedis = async () => {
  await redisClient.connect();
};

// Cache helpers
export const cacheGet = async (key: string): Promise<any> => {
  const data = await redisClient.get(key);
  return data ? JSON.parse(data) : null;
};

export const cacheSet = async (key: string, value: any, ttl: number = 3600) => {
  await redisClient.setEx(key, ttl, JSON.stringify(value));
};

export const cacheDel = async (key: string) => {
  await redisClient.del(key);
};

// ===== src/types/index.ts =====
export interface IUser {
  user_id: string;
  organization_id: string;
  employee_id?: string;
  username: string;
  email: string;
  is_active: boolean;
  roles?: string[];
  permissions?: string[];
}

export interface IEmployee {
  employee_id: string;
  organization_id: string;
  company_id: string;
  employee_code: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  full_name: string;
  email: string;
  employee_status: string;
  hire_date: Date;
  department_id?: string;
  designation_id?: string;
  location_id?: string;
  reporting_manager_id?: string;
}

export interface IOrganization {
  organization_id: string;
  organization_name: string;
  organization_code: string;
  subscription_plan: string;
  subscription_status: string;
  is_active: boolean;
}

export interface AuthRequest extends Request {
  user?: IUser;
  organization?: IOrganization;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

export interface FilterParams {
  search?: string;
  status?: string;
  department_id?: string;
  location_id?: string;
  from_date?: Date;
  to_date?: Date;
  [key: string]: any;
}

// ===== src/middleware/auth.ts =====
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { query } from '../config/database';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const decoded: any = jwt.verify(token, JWT_SECRET);

    // Get user details with roles and permissions
    const userResult = await query(
      `SELECT 
        u.user_id, u.organization_id, u.employee_id, u.username, u.email,
        u.is_active, u.is_locked,
        o.organization_name, o.subscription_status,
        COALESCE(
          json_agg(DISTINCT r.role_name) FILTER (WHERE r.role_name IS NOT NULL),
          '[]'
        ) as roles,
        COALESCE(
          json_agg(DISTINCT p.permission_code) FILTER (WHERE p.permission_code IS NOT NULL),
          '[]'
        ) as permissions
      FROM users u
      JOIN organizations o ON u.organization_id = o.organization_id
      LEFT JOIN user_roles ur ON u.user_id = ur.user_id AND ur.is_active = TRUE
      LEFT JOIN roles r ON ur.role_id = r.role_id AND r.is_active = TRUE
      LEFT JOIN role_permissions rp ON r.role_id = rp.role_id
      LEFT JOIN permissions p ON rp.permission_id = p.permission_id
      WHERE u.user_id = $1 AND u.is_active = TRUE
      GROUP BY u.user_id, o.organization_id, o.organization_name, o.subscription_status`,
      [decoded.userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
    }

    const user = userResult.rows[0];

    if (user.is_locked) {
      return res.status(403).json({
        success: false,
        error: 'Account is locked'
      });
    }

    if (user.subscription_status !== 'active') {
      return res.status(403).json({
        success: false,
        error: 'Organization subscription is not active'
      });
    }

    (req as any).user = user;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired token'
    });
  }
};

// ===== src/middleware/authorize.ts =====
export const authorize = (...permissions: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const userPermissions = user.permissions || [];

    // Check if user has any of the required permissions
    const hasPermission = permissions.some(permission =>
      userPermissions.includes(permission)
    );

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      });
    }

    next();
  };
};

// ===== src/middleware/validation.ts =====
import Joi from 'joi';

export const validate = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(400).json({
        success: false,
        error: 'Validation error',
        errors
      });
    }

    req.body = value;
    next();
  };
};

// ===== src/middleware/errorHandler.ts =====
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('Error:', err);

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: err.message
    });
  }

  // PostgreSQL errors
  if ((err as any).code) {
    const pgError = err as any;
    
    switch (pgError.code) {
      case '23505': // Unique violation
        return res.status(409).json({
          success: false,
          error: 'Duplicate entry. Record already exists.'
        });
      case '23503': // Foreign key violation
        return res.status(400).json({
          success: false,
          error: 'Invalid reference. Related record not found.'
        });
      case '23502': // Not null violation
        return res.status(400).json({
          success: false,
          error: 'Required field missing.'
        });
      default:
        break;
    }
  }

  return res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message
  });
};

// ===== src/middleware/rateLimiter.ts =====
import rateLimit from 'express-rate-limit';

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  message: {
    success: false,
    error: 'Too many login attempts. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    error: 'Too many requests. Please try again later.'
  }
});

// ===== src/utils/logger.ts =====
import winston from 'winston';
import path from 'path';

const logDir = process.env.LOG_DIR || 'logs';

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error'
    }),
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log')
    })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  );
}

// ===== src/utils/pagination.ts =====
export const getPagination = (page?: number, limit?: number): PaginationParams => {
  const currentPage = Math.max(1, page || 1);
  const pageSize = Math.min(100, Math.max(1, limit || 10));
  const offset = (currentPage - 1) * pageSize;

  return {
    page: currentPage,
    limit: pageSize,
    offset
  };
};

export const getPaginationMeta = (
  total: number,
  page: number,
  limit: number
) => {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit)
  };
};

// ===== src/utils/password.ts =====
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12');

export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, SALT_ROUNDS);
};

export const comparePassword = async (
  password: string,
  hash: string
): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

// ===== src/utils/token.ts =====
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

export const generateAccessToken = (userId: string, organizationId: string): string => {
  return jwt.sign(
    { userId, organizationId, type: 'access' },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

export const generateRefreshToken = (userId: string, organizationId: string): string => {
  return jwt.sign(
    { userId, organizationId, type: 'refresh' },
    JWT_SECRET,
    { expiresIn: JWT_REFRESH_EXPIRES_IN }
  );
};

export const verifyToken = (token: string): any => {
  return jwt.verify(token, JWT_SECRET);
};

// ===== src/utils/response.ts =====
export const successResponse = <T>(
  res: Response,
  data: T,
  message?: string,
  meta?: any
): Response => {
  return res.json({
    success: true,
    message,
    data,
    meta
  });
};

export const errorResponse = (
  res: Response,
  error: string,
  statusCode: number = 400
): Response => {
  return res.status(statusCode).json({
    success: false,
    error
  });
};

// ===== src/app.ts =====
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { authenticate } from './middleware/auth';
import { errorHandler } from './middleware/errorHandler';
import { apiLimiter } from './middleware/rateLimiter';

// Import routes (will be created next)
import authRoutes from './routes/auth.routes';
import employeeRoutes from './routes/employee.routes';
import attendanceRoutes from './routes/attendance.routes';
import leaveRoutes from './routes/leave.routes';

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
app.use('/api', apiLimiter);

// Health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is healthy',
    timestamp: new Date().toISOString()
  });
});

// Routes
const API_VERSION = process.env.API_VERSION || 'v1';
app.use(`/api/${API_VERSION}/auth`, authRoutes);
app.use(`/api/${API_VERSION}/employees`, authenticate, employeeRoutes);
app.use(`/api/${API_VERSION}/attendance`, authenticate, attendanceRoutes);
app.use(`/api/${API_VERSION}/leave`, authenticate, leaveRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

// Error handler
app.use(errorHandler);

export default app;

// ===== src/server.ts =====
import app from './app';
import { pool } from './config/database';
import { connectRedis } from './config/redis';
import { logger } from './utils/logger';

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Test database connection
    await pool.query('SELECT NOW()');
    logger.info('✅ Database connected');

    // Connect to Redis
    await connectRedis();
    logger.info('✅ Redis connected');

    // Start server
    app.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
      logger.info(`📝 Environment: ${process.env.NODE_ENV}`);
      logger.info(`🔗 API URL: http://localhost:${PORT}/api/v1`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  await pool.end();
  process.exit(0);
});

startServer();

// =====================================================
// This provides the complete backend structure.
// Next files will contain the actual route implementations.
// =====================================================