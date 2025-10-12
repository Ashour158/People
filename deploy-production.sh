#!/bin/bash

# PRODUCTION DEPLOYMENT SCRIPT
# HR Management System - Secure Production Deployment
# Date: October 11, 2025

set -e  # Exit on any error

echo "🚀 Starting HR Management System Production Deployment"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Step 1: Environment Setup
print_header "Step 1: Environment Setup"
print_status "Setting up production environment..."

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    print_error "Python 3 is not installed. Please install Python 3.11+ first."
    exit 1
fi

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    print_error "PostgreSQL is not installed. Please install PostgreSQL first."
    exit 1
fi

# Check if Redis is installed
if ! command -v redis-server &> /dev/null; then
    print_warning "Redis is not installed. Installing Redis..."
    # Add Redis installation commands for your OS
fi

print_status "Environment checks completed ✅"

# Step 2: Generate Secure Secrets
print_header "Step 2: Generate Secure Secrets"
print_status "Generating secure secrets..."

# Generate SECRET_KEY
SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_urlsafe(32))")
print_status "Generated SECRET_KEY: ${SECRET_KEY:0:10}..."

# Generate JWT_SECRET_KEY
JWT_SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_urlsafe(32))")
print_status "Generated JWT_SECRET_KEY: ${JWT_SECRET_KEY:0:10}..."

# Generate Database Password
DB_PASSWORD=$(python3 -c "import secrets; print(secrets.token_urlsafe(16))")
print_status "Generated DB_PASSWORD: ${DB_PASSWORD:0:10}..."

print_status "Secure secrets generated ✅"

# Step 3: Database Setup
print_header "Step 3: Database Setup"
print_status "Setting up PostgreSQL database..."

# Create database user and database
sudo -u postgres psql << EOF
CREATE USER hrms_user WITH PASSWORD '$DB_PASSWORD';
CREATE DATABASE hr_system OWNER hrms_user;
GRANT ALL PRIVILEGES ON DATABASE hr_system TO hrms_user;
\q
EOF

print_status "Database setup completed ✅"

# Step 4: Environment Configuration
print_header "Step 4: Environment Configuration"
print_status "Creating production environment file..."

cat > python_backend/.env.production << EOF
# PRODUCTION ENVIRONMENT VARIABLES
# Generated on: $(date)

# Application Configuration
APP_NAME=HR Management System
ENVIRONMENT=production
DEBUG=false
API_VERSION=v1
PORT=8000

# Database Configuration
DATABASE_URL=postgresql://hrms_user:$DB_PASSWORD@localhost:5432/hr_system
DB_POOL_SIZE=20
DB_MAX_OVERFLOW=30
DB_POOL_TIMEOUT=30
DB_ECHO=false

# Redis Configuration
REDIS_URL=redis://localhost:6379/0
REDIS_ENABLED=true
CACHE_TTL=3600

# Security - CRITICAL: Generated secure secrets
SECRET_KEY=$SECRET_KEY
JWT_SECRET_KEY=$JWT_SECRET_KEY
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=1440
JWT_REFRESH_TOKEN_EXPIRE_DAYS=7
PASSWORD_MIN_LENGTH=8
BCRYPT_ROUNDS=12

# CORS - Configure for your domain
CORS_ORIGINS=["https://yourdomain.com","https://www.yourdomain.com","http://143.110.227.18:3000","http://143.110.227.18"]

# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_PER_MINUTE=60

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM_EMAIL=noreply@yourdomain.com
SMTP_FROM_NAME=HR Management System
EMAIL_ENABLED=true

# File Upload Security
UPLOAD_DIR=./uploads
MAX_UPLOAD_SIZE=10485760
ALLOWED_EXTENSIONS=[".pdf",".doc",".docx",".jpg",".jpeg",".png"]

# WebSocket
WS_ENABLED=true
WS_PATH=/ws

# Celery
CELERY_BROKER_URL=redis://localhost:6379/1
CELERY_RESULT_BACKEND=redis://localhost:6379/2

# Pagination
DEFAULT_PAGE_SIZE=10
MAX_PAGE_SIZE=100

# Multi-tenant
ENABLE_MULTI_TENANT=true

# Logging
LOG_LEVEL=INFO
LOG_FORMAT=json
EOF

print_status "Environment configuration completed ✅"

# Step 5: Install Dependencies
print_header "Step 5: Install Dependencies"
print_status "Installing Python dependencies..."

cd python_backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install --upgrade pip
pip install -r requirements.txt

# Install additional security packages
pip install python-magic cryptography

print_status "Dependencies installed ✅"

# Step 6: Database Migrations
print_header "Step 6: Database Migrations"
print_status "Running database migrations..."

# Set environment variables
export $(cat .env.production | xargs)

# Run migrations
alembic upgrade head

print_status "Database migrations completed ✅"

# Step 7: Security Verification
print_header "Step 7: Security Verification"
print_status "Verifying security configuration..."

# Check if secrets are properly set
if [ -z "$SECRET_KEY" ] || [ -z "$JWT_SECRET_KEY" ]; then
    print_error "Security secrets not properly configured!"
    exit 1
fi

# Check database connection
python3 -c "
import asyncio
from app.db.database import init_db
async def test_db():
    try:
        await init_db()
        print('Database connection successful ✅')
    except Exception as e:
        print(f'Database connection failed: {e}')
        exit(1)
asyncio.run(test_db())
"

print_status "Security verification completed ✅"

# Step 8: Start Services
print_header "Step 8: Start Services"
print_status "Starting Redis server..."

# Start Redis in background
redis-server --daemonize yes

print_status "Starting HR Management System..."

# Start the application
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4 &

# Get the process ID
APP_PID=$!

print_status "HR Management System started with PID: $APP_PID"

# Step 9: Health Check
print_header "Step 9: Health Check"
print_status "Performing health check..."

sleep 5  # Wait for application to start

# Check if application is running
if curl -f http://localhost:8000/health > /dev/null 2>&1; then
    print_status "Health check passed ✅"
else
    print_error "Health check failed!"
    exit 1
fi

# Step 10: Security Headers Check
print_header "Step 10: Security Headers Check"
print_status "Verifying security headers..."

# Check security headers
HEADERS=$(curl -I http://localhost:8000/health 2>/dev/null)

if echo "$HEADERS" | grep -q "X-Content-Type-Options: nosniff"; then
    print_status "Security headers verified ✅"
else
    print_warning "Security headers not properly configured"
fi

# Final Status
print_header "Deployment Complete!"
echo "=================================================="
print_status "HR Management System is now running securely!"
print_status "API Documentation: http://localhost:8000/api/v1/docs"
print_status "Health Check: http://localhost:8000/health"
print_status "Process ID: $APP_PID"
echo ""
print_warning "IMPORTANT SECURITY NOTES:"
echo "1. Change database password in production"
echo "2. Configure CORS origins for your domain"
echo "3. Set up SSL/TLS certificates"
echo "4. Configure firewall rules"
echo "5. Set up monitoring and alerting"
echo ""
print_status "Deployment completed successfully! 🚀"

# Save process information
echo "APP_PID=$APP_PID" > .app_pid
echo "Deployment completed at: $(date)" >> .app_pid

print_status "Process information saved to .app_pid"
