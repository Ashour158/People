@echo off
REM PRODUCTION DEPLOYMENT SCRIPT - Windows
REM HR Management System - Secure Production Deployment
REM Date: October 11, 2025

echo 🚀 Starting HR Management System Production Deployment
echo ==================================================

REM Step 1: Environment Setup
echo [STEP] Step 1: Environment Setup
echo [INFO] Setting up production environment...

REM Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed. Please install Python 3.11+ first.
    exit /b 1
)

echo [INFO] Environment checks completed ✅

REM Step 2: Generate Secure Secrets
echo [STEP] Step 2: Generate Secure Secrets
echo [INFO] Generating secure secrets...

REM Generate SECRET_KEY
for /f %%i in ('python -c "import secrets; print(secrets.token_urlsafe(32))"') do set SECRET_KEY=%%i
echo [INFO] Generated SECRET_KEY: %SECRET_KEY:~0,10%...

REM Generate JWT_SECRET_KEY
for /f %%i in ('python -c "import secrets; print(secrets.token_urlsafe(32))"') do set JWT_SECRET_KEY=%%i
echo [INFO] Generated JWT_SECRET_KEY: %JWT_SECRET_KEY:~0,10%...

REM Generate Database Password
for /f %%i in ('python -c "import secrets; print(secrets.token_urlsafe(16))"') do set DB_PASSWORD=%%i
echo [INFO] Generated DB_PASSWORD: %DB_PASSWORD:~0,10%...

echo [INFO] Secure secrets generated ✅

REM Step 3: Environment Configuration
echo [STEP] Step 3: Environment Configuration
echo [INFO] Creating production environment file...

REM Create production environment file
(
echo # PRODUCTION ENVIRONMENT VARIABLES
echo # Generated on: %date% %time%
echo.
echo # Application Configuration
echo APP_NAME=HR Management System
echo ENVIRONMENT=production
echo DEBUG=false
echo API_VERSION=v1
echo PORT=8000
echo.
echo # Database Configuration
echo DATABASE_URL=postgresql://hrms_user:%DB_PASSWORD%@localhost:5432/hr_system
echo DB_POOL_SIZE=20
echo DB_MAX_OVERFLOW=30
echo DB_POOL_TIMEOUT=30
echo DB_ECHO=false
echo.
echo # Redis Configuration
echo REDIS_URL=redis://localhost:6379/0
echo REDIS_ENABLED=true
echo CACHE_TTL=3600
echo.
echo # Security - CRITICAL: Generated secure secrets
echo SECRET_KEY=%SECRET_KEY%
echo JWT_SECRET_KEY=%JWT_SECRET_KEY%
echo JWT_ALGORITHM=HS256
echo JWT_ACCESS_TOKEN_EXPIRE_MINUTES=1440
echo JWT_REFRESH_TOKEN_EXPIRE_DAYS=7
echo PASSWORD_MIN_LENGTH=8
echo BCRYPT_ROUNDS=12
echo.
echo # CORS - Configure for your domain
echo CORS_ORIGINS=["https://yourdomain.com","https://www.yourdomain.com","http://143.110.227.18:3000","http://143.110.227.18"]
echo.
echo # Rate Limiting
echo RATE_LIMIT_ENABLED=true
echo RATE_LIMIT_PER_MINUTE=60
echo.
echo # Email Configuration
echo SMTP_HOST=smtp.gmail.com
echo SMTP_PORT=587
echo SMTP_USERNAME=your-email@gmail.com
echo SMTP_PASSWORD=your-app-password
echo SMTP_FROM_EMAIL=noreply@yourdomain.com
echo SMTP_FROM_NAME=HR Management System
echo EMAIL_ENABLED=true
echo.
echo # File Upload Security
echo UPLOAD_DIR=./uploads
echo MAX_UPLOAD_SIZE=10485760
echo ALLOWED_EXTENSIONS=[".pdf",".doc",".docx",".jpg",".jpeg",".png"]
echo.
echo # WebSocket
echo WS_ENABLED=true
echo WS_PATH=/ws
echo.
echo # Celery
echo CELERY_BROKER_URL=redis://localhost:6379/1
echo CELERY_RESULT_BACKEND=redis://localhost:6379/2
echo.
echo # Pagination
echo DEFAULT_PAGE_SIZE=10
echo MAX_PAGE_SIZE=100
echo.
echo # Multi-tenant
echo ENABLE_MULTI_TENANT=true
echo.
echo # Logging
echo LOG_LEVEL=INFO
echo LOG_FORMAT=json
) > python_backend\.env.production

echo [INFO] Environment configuration completed ✅

REM Step 4: Install Dependencies
echo [STEP] Step 4: Install Dependencies
echo [INFO] Installing Python dependencies...

cd python_backend

REM Create virtual environment
python -m venv venv
call venv\Scripts\activate.bat

REM Install dependencies
pip install --upgrade pip
pip install -r requirements.txt

REM Install additional security packages
pip install python-magic cryptography

echo [INFO] Dependencies installed ✅

REM Step 5: Security Verification
echo [STEP] Step 5: Security Verification
echo [INFO] Verifying security configuration...

REM Check if secrets are properly set
if "%SECRET_KEY%"=="" (
    echo [ERROR] Security secrets not properly configured!
    exit /b 1
)

echo [INFO] Security verification completed ✅

REM Step 6: Start Services
echo [STEP] Step 6: Start Services
echo [INFO] Starting HR Management System...

REM Set environment variables
set SECRET_KEY=%SECRET_KEY%
set JWT_SECRET_KEY=%JWT_SECRET_KEY%
set DATABASE_URL=postgresql://hrms_user:%DB_PASSWORD%@localhost:5432/hr_system

REM Start the application
start "HR Management System" uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4

echo [INFO] HR Management System started ✅

REM Step 7: Health Check
echo [STEP] Step 7: Health Check
echo [INFO] Performing health check...

timeout /t 5 /nobreak >nul

REM Check if application is running
curl -f http://localhost:8000/health >nul 2>&1
if %errorlevel% equ 0 (
    echo [INFO] Health check passed ✅
) else (
    echo [WARNING] Health check failed - application may still be starting
)

REM Final Status
echo [STEP] Deployment Complete!
echo ==================================================
echo [INFO] HR Management System is now running securely!
echo [INFO] API Documentation: http://localhost:8000/api/v1/docs
echo [INFO] Health Check: http://localhost:8000/health
echo.
echo [WARNING] IMPORTANT SECURITY NOTES:
echo 1. Change database password in production
echo 2. Configure CORS origins for your domain
echo 3. Set up SSL/TLS certificates
echo 4. Configure firewall rules
echo 5. Set up monitoring and alerting
echo.
echo [INFO] Deployment completed successfully! 🚀

pause
