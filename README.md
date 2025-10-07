# HR Management System

A complete, enterprise-grade HR Management System with multi-tenant support, built with Node.js, TypeScript, React, and PostgreSQL.

## 🚀 Features

### Core Modules
- **Authentication & Authorization** - JWT-based auth with RBAC
- **Employee Management** - Complete CRUD operations
- **Attendance Management** - Check-in/out with regularization
- **Leave Management** - Apply, approve, and track leave balances
- **Multi-tenant Support** - Organization-level data isolation
- **Role-Based Access Control** - Fine-grained permissions

### Technical Features
- RESTful API with Express.js
- React frontend with Material-UI
- PostgreSQL database with comprehensive schema
- Redis caching
- Email notifications
- File upload support
- Comprehensive logging
- Docker support
- Security best practices (Helmet, rate limiting, input validation)

## 📋 Prerequisites

- Node.js 18+
- PostgreSQL 15+
- Redis 7+ (optional, for caching)
- Docker (optional)

## 🛠️ Installation

### Option 1: Manual Setup

#### 1. Clone the repository
```bash
git clone https://github.com/Ashour158/People.git
cd People
```

#### 2. Setup Backend
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your configuration
```

#### 3. Setup Database
```bash
# Create database
createdb hr_system

# Run schema
psql hr_system < ../enhanced_hr_schema.sql
```

#### 4. Setup Frontend
```bash
cd ../frontend
npm install
cp .env.example .env
# Edit .env with your configuration
```

#### 5. Start Services

Terminal 1 - Backend:
```bash
cd backend
npm run dev
```

Terminal 2 - Frontend:
```bash
cd frontend
npm run dev
```

Terminal 3 - Redis (optional):
```bash
redis-server
```

### Option 2: Docker Setup

#### 1. Configure environment
```bash
cp .env.example .env
# Edit .env with your configuration
```

#### 2. Start all services
```bash
docker-compose up -d
```

#### 3. View logs
```bash
docker-compose logs -f
```

#### 4. Stop services
```bash
docker-compose down
```

## 🌐 Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **API Health Check**: http://localhost:5000/health

## 📚 API Documentation

### Authentication Endpoints

- `POST /api/v1/auth/register` - Register new organization
- `POST /api/v1/auth/login` - Login
- `POST /api/v1/auth/logout` - Logout
- `GET /api/v1/auth/me` - Get current user
- `POST /api/v1/auth/change-password` - Change password
- `POST /api/v1/auth/forgot-password` - Request password reset
- `POST /api/v1/auth/reset-password` - Reset password with token

### Employee Endpoints

- `GET /api/v1/employees` - List employees
- `GET /api/v1/employees/:id` - Get employee details
- `POST /api/v1/employees` - Create employee
- `PUT /api/v1/employees/:id` - Update employee
- `DELETE /api/v1/employees/:id` - Delete employee

### Attendance Endpoints

- `POST /api/v1/attendance/check-in` - Check in
- `POST /api/v1/attendance/check-out` - Check out
- `GET /api/v1/attendance` - Get attendance records
- `POST /api/v1/attendance/regularization` - Request regularization

### Leave Endpoints

- `GET /api/v1/leave/types` - Get leave types
- `POST /api/v1/leave/apply` - Apply for leave
- `GET /api/v1/leave` - Get leave applications
- `POST /api/v1/leave/:id/action` - Approve/reject leave
- `GET /api/v1/leave/balance/:employeeId?` - Get leave balance

## 🔐 Default Credentials

After registration, you'll create your own admin account. The first user in an organization gets admin rights automatically.

## 📁 Project Structure

```
People/
├── backend/
│   ├── src/
│   │   ├── config/         # Configuration files
│   │   ├── controllers/    # Route controllers
│   │   ├── middleware/     # Express middleware
│   │   ├── routes/         # API routes
│   │   ├── services/       # Business logic
│   │   ├── types/          # TypeScript types
│   │   ├── utils/          # Utility functions
│   │   ├── validators/     # Input validation
│   │   ├── app.ts          # Express app
│   │   └── server.ts       # Server entry point
│   ├── package.json
│   ├── tsconfig.json
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── api/            # API client
│   │   ├── components/     # React components
│   │   ├── pages/          # Page components
│   │   ├── store/          # State management
│   │   ├── types/          # TypeScript types
│   │   └── main.tsx        # Entry point
│   ├── package.json
│   ├── vite.config.ts
│   └── Dockerfile
├── docker-compose.yml
├── enhanced_hr_schema.sql
└── README.md
```

## 🔧 Configuration

### Backend Environment Variables

```env
NODE_ENV=development
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=hr_system
DB_USER=postgres
DB_PASSWORD=your_password
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=your_secret_key
JWT_EXPIRES_IN=24h
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password
```

### Frontend Environment Variables

```env
VITE_API_BASE_URL=http://localhost:5000/api/v1
```

## 🧪 Testing

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test
```

## 🚀 Deployment

### Production Build

```bash
# Backend
cd backend
npm run build
npm start

# Frontend
cd frontend
npm run build
# Serve the dist/ folder with a web server
```

### Docker Production

```bash
docker-compose -f docker-compose.yml up -d
```

## 🔒 Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Rate limiting on API endpoints
- Input validation with Joi
- SQL injection protection
- XSS protection with Helmet
- CORS configuration
- Secure session management

## 📊 Database Schema

The system uses a comprehensive PostgreSQL schema with:
- 100+ tables
- Multi-tenant architecture
- Audit logging
- Soft deletes
- Proper indexing
- Foreign key constraints

## 🛡️ License

This project is licensed under the MIT License.

## 👥 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📧 Support

For support, email support@yourdomain.com or open an issue on GitHub.

## 🎯 Roadmap

- [ ] Payroll management
- [ ] Performance reviews
- [ ] Recruitment module
- [ ] Training management
- [ ] Asset management
- [ ] Mobile app
- [ ] Advanced reporting
- [ ] Integration with third-party services

## 📝 Changelog

### Version 1.0.0 (Current)
- Initial release
- Authentication & Authorization
- Employee Management
- Attendance Management
- Leave Management
- Multi-tenant support
- Docker support
