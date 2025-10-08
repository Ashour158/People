import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { authenticate } from './middleware/auth';
import { errorHandler } from './middleware/errorHandler';
import { apiLimiter } from './middleware/rateLimiter';

// Import routes
import authRoutes from './routes/auth.routes';
import employeeRoutes from './routes/employee.routes';
import attendanceRoutes from './routes/attendance.routes';
import leaveRoutes from './routes/leave.routes';
import healthRoutes from './routes/health.routes';

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
app.use('/api', apiLimiter);

// Health check routes (no authentication required)
app.use('/', healthRoutes);

// API Routes
const API_VERSION = process.env.API_VERSION || 'v1';
app.use(`/api/${API_VERSION}/auth`, authRoutes);
app.use(`/api/${API_VERSION}/employees`, employeeRoutes);
app.use(`/api/${API_VERSION}/attendance`, attendanceRoutes);
app.use(`/api/${API_VERSION}/leave`, leaveRoutes);

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
