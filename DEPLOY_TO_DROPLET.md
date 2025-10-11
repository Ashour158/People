# 🚀 Deploy HRMS to DigitalOcean Droplet
## IP: 143.110.227.18

**Follow these exact steps to deploy your HRMS system on your DigitalOcean droplet.**

---

## 📋 **Prerequisites**

- ✅ DigitalOcean Droplet created (IP: 143.110.227.18)
- ✅ SSH access to the droplet
- ✅ Domain name (optional but recommended)
- ✅ Your HRMS code ready

---

## 🎯 **Step 1: Connect to Your Droplet**

```bash
# Connect to your droplet
ssh root@143.110.227.18

# If you get a connection error, try:
ssh -i your-ssh-key root@143.110.227.18
```

---

## 🎯 **Step 2: Update System and Install Dependencies**

```bash
# Update the system
apt update && apt upgrade -y

# Install required packages
apt install -y \
    curl \
    wget \
    git \
    unzip \
    software-properties-common \
    apt-transport-https \
    ca-certificates \
    gnupg \
    lsb-release \
    ufw \
    fail2ban \
    htop \
    nano \
    vim \
    certbot \
    python3-certbot-nginx
```

---

## 🎯 **Step 3: Install Docker and Docker Compose**

```bash
# Install Docker
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose

# Start and enable Docker
systemctl start docker
systemctl enable docker
```

---

## 🎯 **Step 4: Configure Firewall**

```bash
# Configure UFW firewall
ufw --force enable
ufw allow ssh
ufw allow 80
ufw allow 443
ufw allow 22

# Configure fail2ban
cat > /etc/fail2ban/jail.local << EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3

[sshd]
enabled = true
port = ssh
logpath = /var/log/auth.log
maxretry = 3
EOF

systemctl restart fail2ban
systemctl enable fail2ban
```

---

## 🎯 **Step 5: Create Application Directory**

```bash
# Create application directory
mkdir -p /opt/hrms
cd /opt/hrms

# Clone your repository (replace with your actual repository URL)
git clone https://github.com/your-username/hrms-system.git .

# If you don't have a repository yet, create the directory structure
mkdir -p python_backend frontend nginx/ssl nginx/logs uploads logs
```

---

## 🎯 **Step 6: Create Environment Configuration**

```bash
# Create environment file
cat > .env << 'EOF'
# Database Configuration
POSTGRES_DB=hrms_db
POSTGRES_USER=hrms_user
POSTGRES_PASSWORD=your_secure_password_here

# Redis Configuration
REDIS_PASSWORD=your_redis_password_here

# JWT Configuration
JWT_SECRET=your_jwt_secret_key_here

# Application Configuration
ENVIRONMENT=production
LOG_LEVEL=INFO
DEBUG=False

# Domain Configuration (replace with your domain)
DOMAIN=your-domain.com
ALLOWED_HOSTS=your-domain.com,www.your-domain.com,143.110.227.18

# Email Configuration (configure with your SMTP settings)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password

# File Upload Configuration
MAX_UPLOAD_SIZE=50MB
UPLOAD_PATH=/opt/hrms/uploads

# Security Configuration
SECRET_KEY=your_jwt_secret_key_here
CORS_ALLOWED_ORIGINS=https://your-domain.com,https://www.your-domain.com,http://143.110.227.18
EOF

# Generate secure passwords
echo "POSTGRES_PASSWORD=$(openssl rand -base64 32)" >> .env
echo "REDIS_PASSWORD=$(openssl rand -base64 32)" >> .env
echo "JWT_SECRET=$(openssl rand -base64 64)" >> .env
```

---

## 🎯 **Step 7: Create Docker Compose Configuration**

```bash
# Create docker-compose.yml
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  # PostgreSQL Database
  postgres:
    image: postgres:15-alpine
    container_name: hrms-postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: ${POSTGRES_DB:-hrms_db}
      POSTGRES_USER: ${POSTGRES_USER:-hrms_user}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database/init:/docker-entrypoint-initdb.d
    ports:
      - "127.0.0.1:5432:5432"
    networks:
      - hrms-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-hrms_user} -d ${POSTGRES_DB:-hrms_db}"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Redis Cache
  redis:
    image: redis:7-alpine
    container_name: hrms-redis
    restart: unless-stopped
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    ports:
      - "127.0.0.1:6379:6379"
    networks:
      - hrms-network
    healthcheck:
      test: ["CMD", "redis-cli", "--no-auth-warning", "-a", "${REDIS_PASSWORD}", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Backend API
  backend:
    build:
      context: ./python_backend
      dockerfile: Dockerfile
    container_name: hrms-backend
    restart: unless-stopped
    environment:
      - DATABASE_URL=postgresql://${POSTGRES_USER:-hrms_user}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB:-hrms_db}
      - REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379/0
      - JWT_SECRET=${JWT_SECRET}
      - ENVIRONMENT=production
      - LOG_LEVEL=INFO
    ports:
      - "127.0.0.1:8000:8000"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - hrms-network
    volumes:
      - ./uploads:/app/uploads
      - ./logs:/app/logs

  # Frontend React App
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: hrms-frontend
    restart: unless-stopped
    environment:
      - REACT_APP_API_URL=http://143.110.227.18:8000
      - REACT_APP_ENVIRONMENT=production
    ports:
      - "127.0.0.1:3000:3000"
    depends_on:
      - backend
    networks:
      - hrms-network

  # Nginx Reverse Proxy
  nginx:
    image: nginx:alpine
    container_name: hrms-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./nginx/ssl:/etc/nginx/ssl
      - ./nginx/logs:/var/log/nginx
    depends_on:
      - frontend
      - backend
    networks:
      - hrms-network

volumes:
  postgres_data:
  redis_data:

networks:
  hrms-network:
    driver: bridge
EOF
```

---

## 🎯 **Step 8: Create Nginx Configuration**

```bash
# Create nginx configuration
cat > nginx/nginx.conf << 'EOF'
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
    use epoll;
    multi_accept on;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;

    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    client_max_body_size 50M;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml
        image/svg+xml;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=login:10m rate=5r/m;

    # Upstream servers
    upstream backend {
        server backend:8000;
        keepalive 32;
    }

    upstream frontend {
        server frontend:3000;
        keepalive 32;
    }

    # HTTP to HTTPS redirect (if SSL is configured)
    server {
        listen 80;
        server_name _;
        return 301 https://$host$request_uri;
    }

    # Main HTTPS server
    server {
        listen 443 ssl http2;
        server_name _;

        # SSL Configuration (will be updated when certificates are installed)
        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
        ssl_prefer_server_ciphers off;
        ssl_session_cache shared:SSL:10m;
        ssl_session_timeout 10m;

        # Security headers
        add_header X-Frame-Options DENY;
        add_header X-Content-Type-Options nosniff;
        add_header X-XSS-Protection "1; mode=block";
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

        # API routes
        location /api/ {
            limit_req zone=api burst=20 nodelay;
            
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
            
            proxy_connect_timeout 60s;
            proxy_send_timeout 60s;
            proxy_read_timeout 60s;
        }

        # Authentication routes
        location /api/auth/ {
            limit_req zone=login burst=5 nodelay;
            
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # WebSocket support
        location /ws/ {
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Static files
        location /static/ {
            alias /var/www/static/;
            expires 1y;
            add_header Cache-Control "public, immutable";
        }

        location /media/ {
            alias /var/www/media/;
            expires 1y;
            add_header Cache-Control "public";
        }

        # Frontend React app
        location / {
            proxy_pass http://frontend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }

        # Health check
        location /health {
            access_log off;
            return 200 "healthy\n";
            add_header Content-Type text/plain;
        }
    }
}
EOF
```

---

## 🎯 **Step 9: Create Basic Application Files**

```bash
# Create basic Python backend structure
mkdir -p python_backend
cat > python_backend/Dockerfile << 'EOF'
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        build-essential \
        libpq-dev \
        curl \
        && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN adduser --disabled-password --gecos '' appuser \
    && chown -R appuser:appuser /app
USER appuser

RUN mkdir -p /app/logs /app/uploads /app/backups

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
EOF

# Create basic requirements.txt
cat > python_backend/requirements.txt << 'EOF'
fastapi==0.104.1
uvicorn[standard]==0.24.0
sqlalchemy==2.0.23
psycopg2-binary==2.9.9
redis==5.0.1
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-multipart==0.0.6
pydantic==2.5.0
pydantic-settings==2.1.0
alembic==1.13.1
celery==5.3.4
python-dotenv==1.0.0
EOF

# Create basic main.py
cat > python_backend/main.py << 'EOF'
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

app = FastAPI(title="HRMS API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "HRMS API is running!"}

@app.get("/health")
async def health():
    return {"status": "healthy"}

@app.get("/api/health")
async def api_health():
    return {"status": "healthy", "service": "HRMS API"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
EOF

# Create basic frontend structure
mkdir -p frontend
cat > frontend/Dockerfile << 'EOF'
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
EOF

# Create basic package.json
cat > frontend/package.json << 'EOF'
{
  "name": "hrms-frontend",
  "version": "1.0.0",
  "private": true,
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-scripts": "5.0.1",
    "axios": "^1.6.0",
    "@mui/material": "^5.14.0",
    "@mui/icons-material": "^5.14.0",
    "@emotion/react": "^11.11.0",
    "@emotion/styled": "^11.11.0"
  },
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test",
    "eject": "react-scripts eject"
  },
  "eslintConfig": {
    "extends": [
      "react-app",
      "react-app/jest"
    ]
  },
  "browserslist": {
    "production": [
      ">0.2%",
      "not dead",
      "not op_mini all"
    ],
    "development": [
      "last 1 chrome version",
      "last 1 firefox version",
      "last 1 safari version"
    ]
  }
}
EOF

# Create basic React app
mkdir -p frontend/src
cat > frontend/src/App.js << 'EOF'
import React from 'react';
import { Container, Typography, Box, Button } from '@mui/material';

function App() {
  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Typography variant="h2" component="h1" gutterBottom>
          HR Management System
        </Typography>
        <Typography variant="h5" component="h2" gutterBottom>
          Welcome to your HRMS Dashboard
        </Typography>
        <Typography variant="body1">
          Your HRMS system is successfully deployed on DigitalOcean!
        </Typography>
        <Box sx={{ mt: 3 }}>
          <Button variant="contained" color="primary" href="/api">
            View API
          </Button>
        </Box>
      </Box>
    </Container>
  );
}

export default App;
EOF

cat > frontend/src/index.js << 'EOF'
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
EOF

cat > frontend/public/index.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#000000" />
    <meta name="description" content="HR Management System" />
    <title>HRMS - Human Resource Management System</title>
  </head>
  <body>
    <noscript>You need to enable JavaScript to run this app.</noscript>
    <div id="root"></div>
  </body>
</html>
EOF
```

---

## 🎯 **Step 10: Build and Start Services**

```bash
# Set permissions
chown -R $USER:$USER /opt/hrms
chmod -R 755 /opt/hrms

# Build and start services
docker-compose build
docker-compose up -d

# Check status
docker-compose ps
```

---

## 🎯 **Step 11: Test Your Deployment**

```bash
# Check if services are running
docker-compose ps

# Check logs
docker-compose logs -f

# Test API
curl http://143.110.227.18/api/health

# Test frontend
curl http://143.110.227.18/
```

---

## 🎯 **Step 12: Configure SSL (Optional but Recommended)**

```bash
# If you have a domain name, configure SSL
# Replace your-domain.com with your actual domain

# Generate SSL certificate
certbot certonly --standalone -d your-domain.com -d www.your-domain.com

# Copy certificates
cp /etc/letsencrypt/live/your-domain.com/fullchain.pem nginx/ssl/cert.pem
cp /etc/letsencrypt/live/your-domain.com/privkey.pem nginx/ssl/key.pem

# Restart nginx
docker-compose restart nginx
```

---

## 🎯 **Step 13: Set Up Monitoring and Backups**

```bash
# Create backup script
cat > backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/opt/hrms/backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup database
docker-compose exec -T postgres pg_dump -U hrms_user hrms_db > $BACKUP_DIR/database_$DATE.sql

# Backup uploads
tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz uploads/

# Keep only last 7 days of backups
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete
EOF

chmod +x backup.sh

# Set up daily backups
echo "0 2 * * * /opt/hrms/backup.sh" | crontab -

# Create monitoring script
cat > monitor.sh << 'EOF'
#!/bin/bash
# Simple health check script

if ! docker-compose ps | grep -q "Up"; then
    echo "Services are down, restarting..."
    docker-compose restart
fi

DISK_USAGE=$(df /opt/hrms | awk 'NR==2 {print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 80 ]; then
    echo "Warning: Disk usage is ${DISK_USAGE}%"
fi
EOF

chmod +x monitor.sh

# Set up monitoring cron job
echo "*/5 * * * * /opt/hrms/monitor.sh" | crontab -
```

---

## 🎯 **Step 14: Create Systemd Service (Auto-start)**

```bash
# Create systemd service
cat > /etc/systemd/system/hrms.service << 'EOF'
[Unit]
Description=HRMS System
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/hrms
ExecStart=/usr/bin/docker-compose up -d
ExecStop=/usr/bin/docker-compose down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable hrms.service
```

---

## 🎉 **Deployment Complete!**

Your HRMS system is now deployed on DigitalOcean!

### **Access Your Application:**

- **Frontend**: http://143.110.227.18
- **API**: http://143.110.227.18/api
- **Health Check**: http://143.110.227.18/health

### **Useful Commands:**

```bash
# View logs
docker-compose logs -f

# Restart services
docker-compose restart

# Stop services
docker-compose down

# Update system
git pull && docker-compose up -d --build

# Check status
docker-compose ps

# Access database
docker-compose exec postgres psql -U hrms_user -d hrms_db
```

### **Next Steps:**

1. **Configure your domain** (if you have one)
2. **Set up SSL certificates**
3. **Configure email settings**
4. **Set up monitoring alerts**
5. **Test all functionality**

**Your HRMS system is now live on DigitalOcean! 🚀**
