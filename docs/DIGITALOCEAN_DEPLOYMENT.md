# Deployment Guide for DigitalOcean

## Overview
This guide provides step-by-step instructions for deploying the HR Management System to DigitalOcean for staging and production environments.

## Prerequisites

### Required Accounts
- [ ] GitHub account with repository access
- [ ] DigitalOcean account
- [ ] Docker Hub account (optional, for custom images)

### Required Tools
- [ ] Git
- [ ] Docker and Docker Compose
- [ ] DigitalOcean CLI (doctl) - optional
- [ ] SSH client

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     DigitalOcean                        │
│                                                         │
│  ┌──────────────┐      ┌──────────────┐               │
│  │   Staging    │      │  Production  │               │
│  │   Droplet    │      │   Droplet    │               │
│  │              │      │              │               │
│  │  - Backend   │      │  - Backend   │               │
│  │  - Frontend  │      │  - Frontend  │               │
│  │  - Nginx     │      │  - Nginx     │               │
│  └──────┬───────┘      └──────┬───────┘               │
│         │                      │                       │
│  ┌──────┴───────┐      ┌──────┴───────┐               │
│  │  PostgreSQL  │      │  PostgreSQL  │               │
│  │   Database   │      │   Database   │               │
│  └──────────────┘      └──────────────┘               │
│         │                      │                       │
│  ┌──────┴───────┐      ┌──────┴───────┐               │
│  │    Redis     │      │    Redis     │               │
│  │    Cache     │      │    Cache     │               │
│  └──────────────┘      └──────────────┘               │
└─────────────────────────────────────────────────────────┘
```

## Step 1: Setup DigitalOcean Infrastructure

### 1.1 Create Droplets

**For Staging:**
```bash
# Recommended: $12/month - 2GB RAM, 1 vCPU, 50GB SSD
# Region: Choose closest to your users
# OS: Ubuntu 22.04 LTS
```

**For Production:**
```bash
# Recommended: $24/month - 4GB RAM, 2 vCPU, 80GB SSD
# Region: Choose closest to your users
# OS: Ubuntu 22.04 LTS
```

### 1.2 Create Managed PostgreSQL Database

1. Go to **Databases** → **Create Database**
2. Choose PostgreSQL 15
3. Select plan:
   - Staging: Basic - $15/month
   - Production: Basic - $30/month or higher
4. Choose same region as droplet
5. Note down connection details

### 1.3 Create Managed Redis

1. Go to **Databases** → **Create Database**
2. Choose Redis 7
3. Select plan:
   - Staging: Basic - $15/month
   - Production: Basic - $30/month
4. Choose same region as droplet
5. Note down connection details

## Step 2: Configure Droplets

### 2.1 SSH into Droplet

```bash
ssh root@YOUR_DROPLET_IP
```

### 2.2 Install Required Software

```bash
# Update system
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
apt install docker-compose -y

# Install Nginx
apt install nginx -y

# Install Git
apt install git -y
```

### 2.3 Setup Application Directory

**For Staging:**
```bash
mkdir -p /var/www/hr-staging
cd /var/www/hr-staging
git clone https://github.com/Ashour158/People.git .
```

**For Production:**
```bash
mkdir -p /var/www/hr-production
cd /var/www/hr-production
git clone https://github.com/Ashour158/People.git .
```

## Step 3: Configure Environment Variables

### 3.1 Backend Environment (.env)

**For Staging:**
```bash
cd /var/www/hr-staging
cat > backend/.env << 'EOF'
NODE_ENV=staging
PORT=5000

# Database
DB_HOST=your-staging-db-host.db.ondigitalocean.com
DB_PORT=25060
DB_NAME=hr_system_staging
DB_USER=doadmin
DB_PASSWORD=your_staging_db_password

# Redis
REDIS_HOST=your-staging-redis-host.db.ondigitalocean.com
REDIS_PORT=25061
REDIS_PASSWORD=your_staging_redis_password

# JWT
JWT_SECRET=your_super_secret_jwt_key_at_least_32_characters_long
JWT_EXPIRES_IN=24h

# Email (using SendGrid, Mailgun, or Gmail)
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=your_sendgrid_api_key
EMAIL_FROM=noreply@staging.your-domain.com

# Frontend URL
FRONTEND_URL=https://staging.your-domain.com

# Logging
LOG_LEVEL=info
EOF
```

**For Production:**
```bash
cd /var/www/hr-production
cat > backend/.env << 'EOF'
NODE_ENV=production
PORT=5000

# Database
DB_HOST=your-prod-db-host.db.ondigitalocean.com
DB_PORT=25060
DB_NAME=hr_system_production
DB_USER=doadmin
DB_PASSWORD=your_production_db_password

# Redis
REDIS_HOST=your-prod-redis-host.db.ondigitalocean.com
REDIS_PORT=25061
REDIS_PASSWORD=your_production_redis_password

# JWT
JWT_SECRET=different_super_secret_jwt_key_for_production_at_least_32_chars
JWT_EXPIRES_IN=24h

# Email
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=your_sendgrid_api_key
EMAIL_FROM=noreply@your-domain.com

# Frontend URL
FRONTEND_URL=https://your-domain.com

# Logging
LOG_LEVEL=warn
EOF
```

### 3.2 Frontend Environment (.env)

**For Staging:**
```bash
cd /var/www/hr-staging
cat > frontend/.env << 'EOF'
VITE_API_BASE_URL=https://staging-api.your-domain.com/api/v1
EOF
```

**For Production:**
```bash
cd /var/www/hr-production
cat > frontend/.env << 'EOF'
VITE_API_BASE_URL=https://api.your-domain.com/api/v1
EOF
```

## Step 4: Setup Docker Compose

### 4.1 Create docker-compose.yml

```bash
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: hr_backend
    restart: unless-stopped
    ports:
      - "5000:5000"
    env_file:
      - ./backend/.env
    volumes:
      - ./uploads:/app/uploads
      - ./logs:/app/logs
    networks:
      - hr_network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5000/api/v1/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: hr_frontend
    restart: unless-stopped
    ports:
      - "3000:80"
    depends_on:
      - backend
    networks:
      - hr_network

networks:
  hr_network:
    driver: bridge
EOF
```

## Step 5: Setup Nginx Reverse Proxy

### 5.1 Configure Nginx for Staging

```bash
cat > /etc/nginx/sites-available/hr-staging << 'EOF'
server {
    listen 80;
    server_name staging.your-domain.com staging-api.your-domain.com;

    client_max_body_size 50M;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://localhost:5000/api/v1/health;
        access_log off;
    }
}
EOF

# Enable site
ln -s /etc/nginx/sites-available/hr-staging /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

### 5.2 Setup SSL with Let's Encrypt

```bash
# Install Certbot
apt install certbot python3-certbot-nginx -y

# Obtain SSL certificate for staging
certbot --nginx -d staging.your-domain.com -d staging-api.your-domain.com

# Auto-renewal is configured automatically
```

## Step 6: Configure GitHub Secrets

Add the following secrets to your GitHub repository:

1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Add the following secrets:

```
# Docker Hub (if using custom images)
DOCKER_USERNAME=your_docker_username
DOCKER_PASSWORD=your_docker_password

# Staging Environment
STAGING_DROPLET_IP=your_staging_droplet_ip
STAGING_SSH_USERNAME=root
STAGING_SSH_PRIVATE_KEY=your_staging_ssh_private_key

# Production Environment  
PRODUCTION_DROPLET_IP=your_production_droplet_ip
PRODUCTION_SSH_USERNAME=root
PRODUCTION_SSH_PRIVATE_KEY=your_production_ssh_private_key
```

## Step 7: Initial Deployment

### 7.1 Deploy Staging

```bash
cd /var/www/hr-staging

# Build and start containers
docker-compose build
docker-compose up -d

# Check logs
docker-compose logs -f

# Verify health
curl http://localhost:5000/api/v1/health
```

### 7.2 Run Database Migrations

```bash
cd /var/www/hr-staging/backend
docker-compose exec backend npm run migrate
```

### 7.3 Verify Deployment

1. Check backend: `https://staging-api.your-domain.com/api/v1/health`
2. Check frontend: `https://staging.your-domain.com`
3. Test login functionality
4. Verify database connection

## Step 8: Setup Monitoring

### 8.1 Setup Log Rotation

```bash
cat > /etc/logrotate.d/hr-system << 'EOF'
/var/www/hr-staging/logs/*.log
/var/www/hr-production/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 root root
    sharedscripts
}
EOF
```

### 8.2 Setup Health Check Monitoring

```bash
# Create health check script
cat > /usr/local/bin/hr-health-check.sh << 'EOF'
#!/bin/bash

STAGING_URL="https://staging-api.your-domain.com/api/v1/health"
PRODUCTION_URL="https://api.your-domain.com/api/v1/health"

check_health() {
    local url=$1
    local env=$2
    
    if ! curl -f -s "$url" > /dev/null; then
        echo "❌ $env health check failed at $(date)"
        # Send alert (implement your notification method)
    else
        echo "✅ $env health check passed at $(date)"
    fi
}

check_health "$STAGING_URL" "Staging"
check_health "$PRODUCTION_URL" "Production"
EOF

chmod +x /usr/local/bin/hr-health-check.sh

# Add to crontab (every 5 minutes)
(crontab -l 2>/dev/null; echo "*/5 * * * * /usr/local/bin/hr-health-check.sh >> /var/log/hr-health-check.log 2>&1") | crontab -
```

## Step 9: Backup Strategy

### 9.1 Database Backups

```bash
# Create backup script
cat > /usr/local/bin/hr-backup.sh << 'EOF'
#!/bin/bash

BACKUP_DIR="/var/backups/hr-system"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Staging backup
cd /var/www/hr-staging
docker-compose exec -T postgres pg_dump -U doadmin hr_system_staging > "$BACKUP_DIR/staging_$DATE.sql"

# Production backup
cd /var/www/hr-production
docker-compose exec -T postgres pg_dump -U doadmin hr_system_production > "$BACKUP_DIR/production_$DATE.sql"

# Compress backups
gzip "$BACKUP_DIR/staging_$DATE.sql"
gzip "$BACKUP_DIR/production_$DATE.sql"

# Delete backups older than 30 days
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete

echo "✅ Backup completed at $(date)"
EOF

chmod +x /usr/local/bin/hr-backup.sh

# Run daily at 2 AM
(crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/hr-backup.sh >> /var/log/hr-backup.log 2>&1") | crontab -
```

## Step 10: Continuous Deployment

Once GitHub Actions workflows are configured:

1. **Staging Deployment**: Push to `develop` or `staging` branch
2. **Production Deployment**: Push to `main` branch (requires approval)

The CI/CD pipeline will automatically:
- Run tests
- Build Docker images
- Deploy to appropriate environment
- Run smoke tests
- Send notifications

## Troubleshooting

### Common Issues

1. **Container won't start**
   ```bash
   docker-compose logs backend
   docker-compose logs frontend
   ```

2. **Database connection issues**
   ```bash
   # Check database credentials in .env
   # Verify database is accessible
   nc -zv your-db-host.db.ondigitalocean.com 25060
   ```

3. **SSL certificate issues**
   ```bash
   certbot renew --dry-run
   ```

4. **Nginx configuration errors**
   ```bash
   nginx -t
   systemctl status nginx
   ```

## Rollback Procedure

If deployment fails:

```bash
cd /var/www/hr-production

# Stop current containers
docker-compose down

# Restore from backup
gunzip /var/backups/hr-system/production_LATEST.sql.gz
docker-compose exec -T postgres psql -U doadmin hr_system_production < /var/backups/hr-system/production_LATEST.sql

# Start with previous image
docker-compose up -d

# Verify
curl https://api.your-domain.com/api/v1/health
```

## Post-Deployment Checklist

- [ ] Verify all endpoints are accessible
- [ ] Test user authentication
- [ ] Check database connectivity
- [ ] Verify email sending functionality
- [ ] Test file upload functionality
- [ ] Review application logs
- [ ] Monitor resource usage (CPU, Memory, Disk)
- [ ] Verify SSL certificates are valid
- [ ] Test backup and restore procedures
- [ ] Document any environment-specific configurations

## Support

For issues or questions:
- Check application logs: `/var/www/hr-{env}/logs/`
- Review Docker logs: `docker-compose logs`
- Contact: support@your-domain.com

## Security Recommendations

1. **Change default passwords** for all services
2. **Enable firewall** (ufw) and allow only necessary ports
3. **Setup fail2ban** to prevent brute-force attacks
4. **Regular security updates**: `apt update && apt upgrade`
5. **Use strong JWT secrets** (minimum 32 characters)
6. **Enable 2FA** for critical user accounts
7. **Regular security audits** of dependencies
8. **Implement rate limiting** on API endpoints
9. **Regular backup testing** and restore procedures
10. **Monitor access logs** for suspicious activity
