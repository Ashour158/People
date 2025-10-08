import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { authenticate } from './middleware/auth';
import { errorHandler } from './middleware/errorHandler';
import { apiLimiter } from './middleware/rateLimiter';
import { threatDetection } from './middleware/threatDetection';
import { ipWhitelist } from './middleware/ipWhitelist';

// Import routes
import authRoutes from './routes/auth.routes';
import employeeRoutes from './routes/employee.routes';
import attendanceRoutes from './routes/attendance.routes';
import leaveRoutes from './routes/leave.routes';
import securityRoutes from './routes/security.routes';

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
app.use('/api', apiLimiter);

// Security middleware (applied after authentication)
app.use('/api', threatDetection);

// Health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is healthy',
    timestamp: new Date().toISOString()
  });
});

// API Routes
const API_VERSION = process.env.API_VERSION || 'v1';
app.use(`/api/${API_VERSION}/auth`, authRoutes);
app.use(`/api/${API_VERSION}/employees`, authenticate, ipWhitelist, employeeRoutes);
app.use(`/api/${API_VERSION}/attendance`, authenticate, ipWhitelist, attendanceRoutes);
app.use(`/api/${API_VERSION}/leave`, authenticate, ipWhitelist, leaveRoutes);
app.use(`/api/${API_VERSION}/security`, authenticate, ipWhitelist, securityRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// Error handler (must be last)
app.use(errorHandler);

export default app;
