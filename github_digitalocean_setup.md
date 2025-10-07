# 🚀 GitHub + DigitalOcean Deployment Guide

## Perfect! Here's your complete setup for GitHub + DigitalOcean

---

## 📋 Prerequisites

- GitHub account
- DigitalOcean account
- Domain name (optional but recommended)
- Local machine with Git installed

---

## 🎯 Step 1: Setup GitHub Repository

### Create Repository Structure

```bash
# Create project directory
mkdir hr-management-system
cd hr-management-system

# Initialize git
git init

# Create directory structure
mkdir -p backend/src
mkdir -p frontend/src
mkdir -p database
mkdir -p .github/workflows
```

### Create `.gitignore`

```bash
# Create .gitignore in project root
cat > .gitignore << 'EOF'
# Node modules
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Environment files
.env
.env.local
.env.production
.env.*.local

# Build outputs
dist/
build/
*.tsbuildinfo

# Logs
logs/
*.log

# OS files
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/
*.swp
*.swo

# Uploads
uploads/
!uploads/.gitkeep

# Database
*.sqlite
*.db

# Misc
coverage/
.cache/
EOF
```

### Setup GitHub Repository

```bash
# 1. Create repository on GitHub (via web interface)
# Repository name: hr-management-system
# Make it Private initially

# 2. Add remote
git remote add origin https://github.com/YOUR_USERNAME/hr-management-system.git

# 3. Create initial commit
git add .
git commit -m "Initial commit: HR Management System"
git branch -M main
git push -u origin main
```

---

## 🌊 Step 2: Setup DigitalOcean

### Option A: Using DigitalOcean App Platform (Easiest - Recommended)

This is the **EASIEST** option - DigitalOcean handles everything!

#### 2.1 Create PostgreSQL Database

1. Go to DigitalOcean Dashboard
2. Click **Databases** → **Create Database**
3. Select:
   - **Database Engine**: PostgreSQL 15
   - **Plan**: Basic ($15/month for development)
   - **Datacenter**: Choose nearest to your users
4. Name: `hr-system-db`
5. Click **Create Database**
6. Wait for provisioning (2-3 minutes)
7. Copy **Connection Details**:
   - Host
   - Port
   - Database name
   - Username
   - Password

#### 2.2 Create Redis Database (Optional but recommended)

1. Click **Databases** → **Create Database**
2. Select:
   - **Database Engine**: Redis
   - **Plan**: Basic ($15/month)
3. Name: `hr-system-redis`
4. Copy connection details

#### 2.3 Create App Platform Apps

**For Backend:**
1. Go to **Apps** → **Create App**
2. Choose **GitHub** as source
3. Authorize GitHub and select your repository
4. Configure:
   - **Source Directory**: `/backend`
   - **Branch**: `main`
   - **Autodeploy**: ✅ Enabled
   - **Build Command**: `npm run build`
   - **Run Command**: `node dist/server.js`
5. Environment Variables (add these):
   ```
   NODE_ENV=production
   PORT=8080
   DB_HOST=<from database connection details>
   DB_PORT=25060
   DB_NAME=hr_system
   DB_USER=<from database>
   DB_PASSWORD=<from database>
   REDIS_HOST=<from redis connection>
   REDIS_PORT=25061
   REDIS_PASSWORD=<from redis>
   JWT_SECRET=<generate strong secret>
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=<your email>
   SMTP_PASSWORD=<your app password>
   EMAIL_FROM=noreply@yourdomain.com
   APP_URL=https://your-app.ondigitalocean.app
   ```
6. Click **Next** → **Create Resources**

**For Frontend:**
1. Go to **Apps** → **Create App** (or add component to existing app)
2. Choose **GitHub** as source
3. Configure:
   - **Source Directory**: `/frontend`
   - **Type**: Static Site
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Environment Variables:
   ```
   VITE_API_BASE_URL=https://your-backend-app.ondigitalocean.app/api/v1
   ```
5. Click **Create**

#### 2.4 Setup Database Schema

```bash
# Connect to your database from local machine
psql "postgresql://username:password@host:25060/hr_system?sslmode=require"

# Copy and paste the complete schema from the artifacts
\i path/to/schema.sql

# Exit
\q
```

---

### Option B: Using DigitalOcean Droplet (More Control)

This gives you a VPS for full control.

#### 2.1 Create Droplet

1. Go to **Droplets** → **Create Droplet**
2. Choose:
   - **Image**: Ubuntu 22.04 LTS
   - **Plan**: Basic ($12/month - 2GB RAM, 50GB SSD)
   - **Datacenter**: Choose nearest region
   - **Authentication**: SSH Key (add your public key)
   - **Hostname**: hr-system
3. Click **Create Droplet**
4. Note the IP address

#### 2.2 Setup Droplet

```bash
# SSH into droplet
ssh root@YOUR_DROPLET_IP

# Update system
apt update && apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Install PostgreSQL
apt install -y postgresql postgresql-contrib

# Install Redis
apt install -y redis-server

# Install Nginx
apt install -y nginx

# Install PM2 (Process Manager)
npm install -g pm2

# Install Git
apt install -y git

# Create application directory
mkdir -p /var/www/hr-system
cd /var/www/hr-system

# Clone repository
git clone https://github.com/YOUR_USERNAME/hr-management-system.git .

# Setup PostgreSQL
sudo -u postgres createuser hruser --pwprompt
sudo -u postgres createdb hr_system -O hruser

# Import schema
sudo -u postgres psql hr_system < database/schema.sql

# Configure Redis
nano /etc/redis/redis.conf
# Find and set: requirepass YOUR_REDIS_PASSWORD
# Save and exit
systemctl restart redis

# Setup backend
cd /var/www/hr-system/backend
npm ci --only=production
npm run build

# Create .env file
cat > .env << 'EOF'
NODE_ENV=production
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=hr_system
DB_USER=hruser
DB_PASSWORD=YOUR_DB_PASSWORD
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=YOUR_REDIS_PASSWORD
JWT_SECRET=YOUR_SUPER_SECRET_JWT_KEY_MIN_32_CHARS
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password
EMAIL_FROM=noreply@yourdomain.com
APP_URL=https://yourdomain.com
EOF

# Start backend with PM2
pm2 start dist/server.js --name hr-backend
pm2 save
pm2 startup

# Setup frontend
cd /var/www/hr-system/frontend
npm ci
npm run build

# Configure Nginx
cat > /etc/nginx/sites-available/hr-system << 'EOF'
server {
    listen 80;
    server_name YOUR_DOMAIN_OR_IP;

    client_max_body_size 10M;

    # API
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Frontend
    location / {
        root /var/www/hr-system/frontend/dist;
        try_files $uri $uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
}
EOF

# Enable site
ln -s /etc/nginx/sites-available/hr-system /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx

# Setup SSL with Let's Encrypt (if you have domain)
apt install -y certbot python3-certbot-nginx
certbot --nginx -d yourdomain.com
```

---

## 🔄 Step 3: Setup GitHub Actions for CI/CD

### Create Deployment Workflow

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to DigitalOcean

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  NODE_VERSION: '18'

jobs:
  test-backend:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: hr_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          cache-dependency-path: backend/package-lock.json
          
      - name: Install dependencies
        working-directory: ./backend
        run: npm ci
        
      - name: Build
        working-directory: ./backend
        run: npm run build
        
      - name: Run tests
        working-directory: ./backend
        run: npm test
        env:
          DB_HOST: localhost
          DB_PORT: 5432
          DB_NAME: hr_test
          DB_USER: postgres
          DB_PASSWORD: postgres

  test-frontend:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json
          
      - name: Install dependencies
        working-directory: ./frontend
        run: npm ci
        
      - name: Build
        working-directory: ./frontend
        run: npm run build
        env:
          VITE_API_BASE_URL: ${{ secrets.API_BASE_URL }}

  # For App Platform (Option A)
  deploy-app-platform:
    needs: [test-backend, test-frontend]
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
      - name: Deploy to DigitalOcean App Platform
        uses: digitalocean/app_action@v1.1.5
        with:
          app_name: hr-system
          token: ${{ secrets.DIGITALOCEAN_ACCESS_TOKEN }}

  # For Droplet (Option B)
  deploy-droplet:
    needs: [test-backend, test-frontend]
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
      - name: Deploy to Droplet
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.DROPLET_IP }}
          username: root
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd /var/www/hr-system
            git pull origin main
            
            # Backend
            cd backend
            npm ci --only=production
            npm run build
            pm2 restart hr-backend
            
            # Frontend
            cd ../frontend
            npm ci
            npm run build
            
            # Reload nginx
            systemctl reload nginx
            
            echo "Deployment completed!"
```

### Setup GitHub Secrets

Go to your repository → **Settings** → **Secrets and variables** → **Actions**

Add these secrets:

**For App Platform:**
- `DIGITALOCEAN_ACCESS_TOKEN` - Get from DigitalOcean → API → Generate Token
- `API_BASE_URL` - Your backend URL

**For Droplet:**
- `DROPLET_IP` - Your droplet IP address
- `SSH_PRIVATE_KEY` - Your private SSH key
- `API_BASE_URL` - http://your-droplet-ip/api/v1

---

## 📦 Step 4: Project Structure for GitHub

Your repository should look like this:

```
hr-management-system/
├── .github/
│   └── workflows/
│       └── deploy.yml
├── backend/
│   ├── src/
│   │   ├── api/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── utils/
│   │   ├── validators/
│   │   ├── app.ts
│   │   └── server.ts
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── store/
│   │   ├── utils/
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   ├── vite.config.ts
│   └── .env.example
├── database/
│   ├── schema.sql
│   ├── migrations/
│   └── seeds/
├── docs/
│   ├── API.md
│   ├── DEPLOYMENT.md
│   └── SETUP.md
├── .gitignore
├── docker-compose.yml
├── README.md
└── LICENSE
```

---

## 📝 Step 5: Create Essential Files

### `README.md`

```markdown
# HR Management System

A complete, multi-tenant HR management platform built with Node.js, React, and PostgreSQL.

## Features

- ✅ Multi-tenant architecture with complete data isolation
- ✅ Multi-company support within organizations
- ✅ Employee management
- ✅ Attendance tracking with geo-location
- ✅ Leave management with approval workflows
- ✅ Performance reviews
- ✅ Recruitment & onboarding
- ✅ And much more...

## Tech Stack

- **Backend**: Node.js, TypeScript, Express, PostgreSQL, Redis
- **Frontend**: React, TypeScript, Material-UI, React Query
- **Deployment**: DigitalOcean, GitHub Actions

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 15+
- Redis 7+

### Installation

1. Clone repository:
```bash
git clone https://github.com/YOUR_USERNAME/hr-management-system.git
cd hr-management-system
```

2. Setup backend:
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your settings
npm run dev
```

3. Setup frontend:
```bash
cd frontend
npm install
cp .env.example .env
# Edit .env with your API URL
npm run dev
```

4. Setup database:
```bash
createdb hr_system
psql hr_system < database/schema.sql
```

## Deployment

See [DEPLOYMENT.md](docs/DEPLOYMENT.md) for detailed deployment instructions.

## Documentation

- [API Documentation](docs/API.md)
- [Setup Guide](docs/SETUP.md)
- [Deployment Guide](docs/DEPLOYMENT.md)

## License

MIT License - see LICENSE file

## Support

For issues, please create a GitHub issue.
```

### `backend/.env.example`

```env
NODE_ENV=development
PORT=5000

DB_HOST=localhost
DB_PORT=5432
DB_NAME=hr_system
DB_USER=postgres
DB_PASSWORD=

REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

JWT_SECRET=change_this_to_a_secure_random_string_min_32_chars
JWT_EXPIRES_IN=24h

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
EMAIL_FROM=noreply@yourdomain.com

APP_URL=http://localhost:3000
```

### `frontend/.env.example`

```env
VITE_API_BASE_URL=http://localhost:5000/api/v1
```

---

## 🚀 Step 6: Deploy!

### For App Platform (Option A):

```bash
# 1. Commit and push all code
git add .
git commit -m "Ready for deployment"
git push origin main

# 2. DigitalOcean will automatically deploy!
# Check App Platform dashboard for build progress

# 3. Once deployed, get your URLs:
# - Backend: https://hr-backend-xxxxx.ondigitalocean.app
# - Frontend: https://hr-frontend-xxxxx.ondigitalocean.app

# 4. Update frontend env var with backend URL
# Go to App Platform → Frontend → Environment Variables
# Update VITE_API_BASE_URL

# 5. Redeploy frontend
```

### For Droplet (Option B):

```bash
# 1. Commit and push
git add .
git commit -m "Ready for deployment"
git push origin main

# 2. GitHub Actions will automatically deploy!
# Check Actions tab for progress

# 3. Access your app at:
# http://YOUR_DROPLET_IP
# or https://yourdomain.com (if SSL configured)
```

---

## 💰 Cost Estimate (DigitalOcean)

### Option A: App Platform
- PostgreSQL Database: $15/month
- Redis: $15/month
- Backend App: $12/month
- Frontend App: $3/month
- **Total: ~$45/month**

### Option B: Droplet
- Droplet (2GB): $12/month
- PostgreSQL Managed: $15/month (or $0 if self-hosted)
- Redis Managed: $15/month (or $0 if self-hosted)
- **Total: $12-42/month**

**Recommendation**: Start with **Option A (App Platform)** - easier to manage, auto-scaling, automatic HTTPS!

---

## 🔒 Security Checklist

- [ ] Change all default passwords
- [ ] Setup SSH keys (no password authentication)
- [ ] Enable firewall (ufw)
- [ ] Setup SSL certificate
- [ ] Enable automatic security updates
- [ ] Setup backups
- [ ] Configure fail2ban (for droplet)
- [ ] Use strong JWT secret
- [ ] Enable Redis password
- [ ] Restrict database access

---

## 📊 Monitoring

### Setup DigitalOcean Monitoring (Free):

1. Go to **Monitoring** in DigitalOcean
2. Create alerts for:
   - CPU usage > 80%
   - Memory usage > 90%
   - Disk usage > 85%
   - High network traffic

### Setup Uptime Monitoring:

Use free services like:
- UptimeRobot (https://uptimerobot.com)
- Pingdom (https://pingdom.com)
- StatusCake (https://statuscake.com)

---

## 🔄 Update & Maintenance

### Update Application:

```bash
# 1. Make changes locally
# 2. Test locally
# 3. Commit and push
git add .
git commit -m "Your update message"
git push origin main

# GitHub Actions will automatically deploy!
```

### Database Backups:

**For Managed Database:**
- Automatic daily backups included
- Manual backup: Dashboard → Database → Backups → Create Backup

**For Droplet:**
```bash
# Create backup script
cat > /root/backup-db.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump hr_system > /root/backups/hr_system_$DATE.sql
# Keep only last 7 days
find /root/backups -name "*.sql" -mtime +7 -delete
EOF

chmod +x /root/backup-db.sh

# Add to crontab (daily at 2 AM)
crontab -e
# Add: 0 2 * * * /root/backup-db.sh
```

---

## ✅ Final Checklist

- [ ] GitHub repository created and code pushed
- [ ] DigitalOcean account setup
- [ ] Database created and schema imported
- [ ] Environment variables configured
- [ ] GitHub Actions configured
- [ ] Application deployed successfully
- [ ] SSL certificate setup (if using custom domain)
- [ ] Backups configured
- [ ] Monitoring enabled
- [ ] Test application thoroughly

---

## 🎉 You're Done!

Your HR Management System is now live on GitHub + DigitalOcean!

**Access your application:**
- App Platform: Check your app URLs in DigitalOcean dashboard
- Droplet: http://YOUR_DROPLET_IP or https://yourdomain.com

**Next steps:**
1. Test all features
2. Add your first users
3. Customize branding
4. Setup email notifications
5. Configure backups

Need help? Create an issue on GitHub!