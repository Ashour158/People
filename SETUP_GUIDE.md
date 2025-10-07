# 🚀 Complete Setup Guide - HR Management System

This guide will walk you through setting up and running the complete HR Management System.

## 📋 Table of Contents
1. [Prerequisites](#prerequisites)
2. [Quick Start with Docker](#quick-start-with-docker)
3. [Manual Setup](#manual-setup)
4. [Database Setup](#database-setup)
5. [Configuration](#configuration)
6. [Running the Application](#running-the-application)
7. [Testing the System](#testing-the-system)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software
- **Node.js** 18 or higher - [Download](https://nodejs.org/)
- **PostgreSQL** 15 or higher - [Download](https://www.postgresql.org/download/)
- **Redis** 7 or higher (optional, for caching) - [Download](https://redis.io/download/)
- **Docker** (optional, for containerized deployment) - [Download](https://www.docker.com/products/docker-desktop/)

### Verify Installations
```bash
node --version  # Should be 18+
npm --version
psql --version  # Should be 15+
redis-server --version  # Should be 7+
docker --version  # If using Docker
```

---

## 🐳 Quick Start with Docker

This is the **easiest** way to get started!

### Step 1: Clone the Repository
```bash
git clone https://github.com/Ashour158/People.git
cd People
```

### Step 2: Configure Environment
```bash
cp .env.example .env
```

Edit `.env` and update these critical values:
```env
DB_PASSWORD=your_secure_password
JWT_SECRET=your_super_secret_jwt_key_here
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_email_app_password
```

### Step 3: Start All Services
```bash
docker-compose up -d
```

This will start:
- PostgreSQL database (port 5432)
- Redis cache (port 6379)
- Backend API (port 5000)
- Frontend UI (port 3000)

### Step 4: Access the Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **Health Check**: http://localhost:5000/health

### Step 5: View Logs (Optional)
```bash
# View all logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Step 6: Stop Services
```bash
docker-compose down
```

---

## 🔧 Manual Setup

For development or if you prefer not to use Docker.

### Step 1: Clone and Install Backend

```bash
# Clone repository
git clone https://github.com/Ashour158/People.git
cd People

# Setup backend
cd backend
npm install

# Create environment file
cp .env.example .env
```

Edit `backend/.env`:
```env
NODE_ENV=development
PORT=5000
API_VERSION=v1

DB_HOST=localhost
DB_PORT=5432
DB_NAME=hr_system
DB_USER=postgres
DB_PASSWORD=your_password
DB_POOL_MIN=2
DB_POOL_MAX=10

REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

JWT_SECRET=your_super_secret_key_change_in_production
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

BCRYPT_ROUNDS=12
MAX_LOGIN_ATTEMPTS=5
LOCKOUT_DURATION_MINUTES=30

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password
EMAIL_FROM=noreply@yourdomain.com

UPLOAD_DIR=./uploads
MAX_FILE_SIZE_MB=10
ALLOWED_FILE_TYPES=pdf,doc,docx,jpg,jpeg,png

LOG_LEVEL=info
LOG_DIR=./logs
```

### Step 2: Setup Database

```bash
# Create database
createdb hr_system

# Or using psql
psql -U postgres
CREATE DATABASE hr_system;
\q

# Import schema
psql -U postgres -d hr_system -f ../enhanced_hr_schema.sql
```

### Step 3: Install Frontend

```bash
cd ../frontend
npm install

# Create environment file
cp .env.example .env
```

Edit `frontend/.env`:
```env
VITE_API_BASE_URL=http://localhost:5000/api/v1
```

### Step 4: Build Backend (Optional for Development)

```bash
cd ../backend
npm run build
```

---

## 🗄️ Database Setup

### Option 1: Using the Provided Schema

The repository includes a complete PostgreSQL schema with all tables, indexes, and relationships.

```bash
psql -U postgres -d hr_system -f enhanced_hr_schema.sql
```

### Option 2: Manual Database Creation

If you need to create tables manually or customize the schema:

1. Connect to your database:
```bash
psql -U postgres -d hr_system
```

2. The schema includes:
   - Organizations and Companies
   - Users and Authentication
   - Employees and Departments
   - Attendance Management
   - Leave Management
   - Roles and Permissions
   - And many more...

### Verify Database Setup

```bash
psql -U postgres -d hr_system -c "\dt"
```

You should see 100+ tables listed.

---

## ⚙️ Configuration

### Email Setup (Gmail)

1. Enable 2-factor authentication on your Gmail account
2. Generate an App Password:
   - Go to Google Account Settings
   - Security → 2-Step Verification → App passwords
   - Generate a new app password
3. Use this app password in your `.env` file

### JWT Secret

Generate a strong JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Use the output in your `.env` file.

---

## 🏃 Running the Application

### Development Mode

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

The backend will start on http://localhost:5000

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

The frontend will start on http://localhost:3000

**Terminal 3 - Redis (Optional):**
```bash
redis-server
```

### Production Mode

**Backend:**
```bash
cd backend
npm run build
npm start
```

**Frontend:**
```bash
cd frontend
npm run build
# Serve the dist/ folder with a web server like nginx
```

---

## 🧪 Testing the System

### 1. Register a New Organization

1. Open http://localhost:3000
2. Click "Register"
3. Fill in the form:
   - Organization Name: "My Company"
   - Organization Code: "MYCOMP"
   - First Name: "John"
   - Last Name: "Doe"
   - Username: "admin"
   - Email: "admin@example.com"
   - Password: "Password123!"
4. Click "Register"

### 2. Login

After registration, you'll be automatically logged in. Or:
1. Go to http://localhost:3000/login
2. Enter email and password
3. Click "Login"

### 3. Test Features

#### Dashboard
- View statistics
- See quick actions

#### Employees
- Navigate to "Employees"
- View employee list
- Add new employee (if you have permissions)

#### Attendance
- Navigate to "Attendance"
- Click "Check In"
- Later, click "Check Out"

#### Leave
- Navigate to "Leave"
- Click "Apply for Leave"
- Select leave type, dates, and reason
- Submit application

### 4. Test API Directly

```bash
# Health check
curl http://localhost:5000/health

# Login
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"Password123!"}'

# Get current user (replace TOKEN with actual token)
curl http://localhost:5000/api/v1/auth/me \
  -H "Authorization: Bearer TOKEN"
```

---

## 🐛 Troubleshooting

### Backend Won't Start

**Problem:** "Cannot connect to database"
```bash
# Check if PostgreSQL is running
pg_isready -U postgres

# Start PostgreSQL (on Ubuntu/Debian)
sudo service postgresql start

# On macOS with Homebrew
brew services start postgresql@15
```

**Problem:** "Redis connection failed"
- The app will work without Redis (caching will be disabled)
- To start Redis: `redis-server`

### Frontend Won't Start

**Problem:** "Module not found"
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
```

**Problem:** "Cannot connect to backend"
- Check if backend is running on port 5000
- Verify `VITE_API_BASE_URL` in `frontend/.env`

### Database Issues

**Problem:** "relation does not exist"
```bash
# Re-import the schema
psql -U postgres -d hr_system -f enhanced_hr_schema.sql
```

**Problem:** "password authentication failed"
- Update `DB_PASSWORD` in `backend/.env`
- Ensure it matches your PostgreSQL user password

### Docker Issues

**Problem:** "Port already in use"
```bash
# Check what's using the port
lsof -i :5000  # or :3000, :5432, etc.

# Kill the process or change ports in docker-compose.yml
```

**Problem:** "Cannot connect to Docker daemon"
```bash
# Make sure Docker is running
docker info
```

### Email Not Sending

**Problem:** "SMTP authentication failed"
- Verify SMTP credentials in `.env`
- Check if 2FA is enabled and app password is correct
- For development, you can comment out email sending in the code

---

## 📊 Monitoring

### View Logs

**Backend logs:**
```bash
tail -f backend/logs/combined.log
tail -f backend/logs/error.log
```

**Docker logs:**
```bash
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Database Queries

```bash
# Connect to database
psql -U postgres -d hr_system

# View recent users
SELECT * FROM users ORDER BY created_at DESC LIMIT 10;

# View attendance today
SELECT * FROM attendance WHERE attendance_date = CURRENT_DATE;
```

---

## 🎯 Next Steps

1. **Customize the System**
   - Add your company logo
   - Customize color scheme
   - Add more leave types
   - Configure work shifts

2. **Add More Features**
   - Implement remaining modules (Payroll, Performance, etc.)
   - Add reporting and analytics
   - Integrate with third-party services

3. **Deploy to Production**
   - Set up proper domain and SSL
   - Configure production database
   - Set up backup and monitoring
   - Use environment-specific configurations

4. **Security Hardening**
   - Change all default passwords
   - Set up firewall rules
   - Enable database encryption
   - Implement regular security audits

---

## 📞 Getting Help

- **GitHub Issues**: [Create an issue](https://github.com/Ashour158/People/issues)
- **Documentation**: Check the README.md
- **Email**: support@yourdomain.com

---

## ✅ Checklist

- [ ] Prerequisites installed
- [ ] Repository cloned
- [ ] Database created and schema imported
- [ ] Backend `.env` configured
- [ ] Frontend `.env` configured
- [ ] Backend running successfully
- [ ] Frontend running successfully
- [ ] Can access http://localhost:3000
- [ ] Successfully registered/logged in
- [ ] Tested basic features

**Congratulations! Your HR Management System is now up and running! 🎉**
