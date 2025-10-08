import rateLimit from 'express-rate-limit';

// API rate limiter - very high limit for unlimited user scalability
// This allows approximately 10,000 requests per 15 minutes per IP
// For truly unlimited scaling, consider removing this entirely or using per-user limits
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10000, // Very high limit to support unlimited users
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks and internal requests
    return req.path === '/health' || req.path === '/ready';
  },
});

// Login rate limiter - keep this for security purposes
// This prevents brute force attacks while still allowing legitimate users
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Slightly increased from 5 to 10 for better UX
  message: 'Too many login attempts, please try again later.',
  skipSuccessfulRequests: true,
});
