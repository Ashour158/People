# 🚀 DigitalOcean Deployment Guide
## Complete HRMS System Deployment on DigitalOcean

This comprehensive guide will help you deploy the HRMS system on DigitalOcean using multiple deployment options.

---

## 📋 **Deployment Options**

### 1. **DigitalOcean App Platform** (Recommended for beginners)
- ✅ **Easiest setup** - No server management
- ✅ **Automatic scaling** - Handles traffic spikes
- ✅ **Built-in SSL** - Automatic HTTPS
- ✅ **Managed databases** - No database administration
- ✅ **Git integration** - Auto-deploy from GitHub

### 2. **DigitalOcean Droplets** (Recommended for full control)
- ✅ **Full control** - Complete server access
- ✅ **Cost effective** - Lower costs for high traffic
- ✅ **Custom configuration** - Optimize for your needs
- ✅ **Docker support** - Containerized deployment

---

## 🎯 **Option 1: DigitalOcean App Platform (Easiest)**

### **Step 1: Prepare Your Repository**

1. **Push your code to GitHub:**
```bash
git add .
git commit -m "Initial HRMS system"
git push origin main
```

2. **Create a `.do/app.yaml` file in your repository:**
```yaml
name: hrms-system
region: nyc
services:
  - name: hrms-backend
    source_dir: /python_backend
    github:
      repo: your-username/hrms-system
      branch: main
      deploy_on_push: true
    run_command: uvicorn main:app --host 0.0.0.0 --port 8080
    environment_slug: python
    instance_count: 2
    instance_size_slug: basic-xxs
    http_port: 8080
    envs:
      - key: DATABASE_URL
        scope: RUN_TIME
        type: SECRET
      - key: REDIS_URL
        scope: RUN_TIME
        type: SECRET
      - key: JWT_SECRET
        scope: RUN_TIME
        type: SECRET

  - name: hrms-frontend
    source_dir: /frontend
    github:
      repo: your-username/hrms-system
      branch: main
      deploy_on_push: true
    run_command: npm run build && npx serve -s build -l 3000
    environment_slug: node-js
    instance_count: 2
    instance_size_slug: basic-xxs
    http_port: 3000
    envs:
      - key: REACT_APP_API_URL
        value: ${hrms-backend.PUBLIC_URL}
        scope: RUN_TIME

databases:
  - name: hrms-postgres
    engine: PG
    version: "14"
    size: db-s-1vcpu-1gb
    num_nodes: 1

  - name: hrms-redis
    engine: REDIS
    version: "7"
    size: db-s-1vcpu-1gb
    num_nodes: 1
```

### **Step 2: Deploy on DigitalOcean App Platform**

1. **Go to DigitalOcean App Platform:**
   - Visit: https://cloud.digitalocean.com/apps
   - Click "Create App"

2. **Connect your GitHub repository:**
   - Select your HRMS repository
   - Choose the main branch
   - DigitalOcean will auto-detect the configuration

3. **Configure environment variables:**
   - Add your database URLs
   - Set JWT secrets
   - Configure other environment variables

4. **Deploy:**
   - Click "Create Resources"
   - Wait for deployment (5-10 minutes)
   - Your app will be available at the provided URL

---

## 🎯 **Option 2: DigitalOcean Droplets (Full Control)**

### **Step 1: Create a DigitalOcean Droplet**

1. **Choose Droplet Configuration:**
   - **Size**: 4GB RAM, 2 vCPUs (minimum for production)
   - **OS**: Ubuntu 22.04 LTS
   - **Region**: Choose closest to your users
   - **Authentication**: SSH keys (recommended)

2. **Create the Droplet:**
   - Go to DigitalOcean Control Panel
   - Click "Create" → "Droplets"
   - Select configuration
   - Add SSH key
   - Create droplet

### **Step 2: Connect to Your Droplet**

```bash
# Connect via SSH
ssh root@YOUR_DROPLET_IP

# Update system
apt update && apt upgrade -y
```

### **Step 3: Run the Automated Setup Script**

```bash
# Download and run the setup script
curl -fsSL https://raw.githubusercontent.com/your-username/hrms-system/main/deploy/digitalocean-setup.sh | bash

# Or clone the repository and run manually
git clone https://github.com/your-username/hrms-system.git
cd hrms-system
chmod +x deploy/digitalocean-setup.sh
./deploy/digitalocean-setup.sh
```

### **Step 4: Configure Environment Variables**

```bash
# Edit the environment file
nano /opt/hrms/.env

# Set your configuration
POSTGRES_PASSWORD=your_secure_password
REDIS_PASSWORD=your_redis_password
JWT_SECRET=your_jwt_secret_key
DOMAIN=your-domain.com
EMAIL=your-email@domain.com
```

### **Step 5: Start the Services**

```bash
# Start all services
docker-compose -f docker-compose.digitalocean.yml up -d

# Check status
docker-compose -f docker-compose.digitalocean.yml ps

# View logs
docker-compose -f docker-compose.digitalocean.yml logs -f
```

---

## 🔧 **Configuration Details**

### **Environment Variables**

```bash
# Database Configuration
POSTGRES_DB=hrms_db
POSTGRES_USER=hrms_user
POSTGRES_PASSWORD=your_secure_password

# Redis Configuration
REDIS_PASSWORD=your_redis_password

# JWT Configuration
JWT_SECRET=your_jwt_secret_key

# Application Configuration
ENVIRONMENT=production
LOG_LEVEL=INFO
DEBUG=False

# Domain Configuration
DOMAIN=your-domain.com
ALLOWED_HOSTS=your-domain.com,www.your-domain.com

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
```

### **SSL Certificate Setup**

```bash
# Install Certbot
apt install -y certbot python3-certbot-nginx

# Generate SSL certificate
certbot certonly --standalone -d your-domain.com -d www.your-domain.com

# Copy certificates to nginx directory
cp /etc/letsencrypt/live/your-domain.com/fullchain.pem nginx/ssl/cert.pem
cp /etc/letsencrypt/live/your-domain.com/privkey.pem nginx/ssl/key.pem
```

---

## 📊 **Recommended Droplet Sizes**

| Use Case | Droplet Size | RAM | vCPUs | Storage | Monthly Cost |
|----------|--------------|-----|-------|---------|--------------|
| **Development** | Basic | 1GB | 1 | 25GB | $6 |
| **Small Business** | Basic | 2GB | 1 | 50GB | $12 |
| **Medium Business** | Basic | 4GB | 2 | 80GB | $24 |
| **Large Business** | Basic | 8GB | 4 | 160GB | $48 |
| **Enterprise** | Basic | 16GB | 8 | 320GB | $96 |

### **Database Recommendations**

| Use Case | Database Size | RAM | vCPUs | Storage | Monthly Cost |
|----------|---------------|-----|-------|---------|--------------|
| **Small** | db-s-1vcpu-1gb | 1GB | 1 | 10GB | $15 |
| **Medium** | db-s-1vcpu-2gb | 2GB | 1 | 25GB | $30 |
| **Large** | db-s-2vcpu-4gb | 4GB | 2 | 115GB | $60 |
| **Enterprise** | db-s-4vcpu-8gb | 8GB | 4 | 230GB | $120 |

---

## 🚀 **Performance Optimization**

### **1. Enable Redis Caching**
```bash
# Redis is already configured in docker-compose
# Check Redis status
docker-compose -f docker-compose.digitalocean.yml exec redis redis-cli ping
```

### **2. Configure Nginx Caching**
```nginx
# Add to nginx.conf
location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

### **3. Database Optimization**
```sql
-- Add indexes for better performance
CREATE INDEX idx_employee_email ON employees(email);
CREATE INDEX idx_attendance_date ON attendance_records(date);
CREATE INDEX idx_leave_employee ON leave_requests(employee_id);
```

### **4. Enable Gzip Compression**
```nginx
# Already configured in nginx.conf
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_comp_level 6;
```

---

## 🔒 **Security Configuration**

### **1. Firewall Setup**
```bash
# Configure UFW firewall
ufw enable
ufw allow ssh
ufw allow 80
ufw allow 443
ufw deny 22  # If not using SSH
```

### **2. Fail2Ban Configuration**
```bash
# Install and configure fail2ban
apt install -y fail2ban

# Configure jail.local
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
```

### **3. SSL/TLS Configuration**
```nginx
# Strong SSL configuration
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
ssl_prefer_server_ciphers off;
```

---

## 📈 **Monitoring and Maintenance**

### **1. Health Checks**
```bash
# Check service status
docker-compose -f docker-compose.digitalocean.yml ps

# Check logs
docker-compose -f docker-compose.digitalocean.yml logs -f backend

# Check database
docker-compose -f docker-compose.digitalocean.yml exec postgres psql -U hrms_user -d hrms_db -c "SELECT 1;"
```

### **2. Backup Strategy**
```bash
# Automated daily backups
0 2 * * * /opt/hrms/backup.sh

# Manual backup
/opt/hrms/backup.sh
```

### **3. Log Monitoring**
```bash
# View application logs
tail -f /opt/hrms/logs/app.log

# View nginx logs
tail -f /opt/hrms/nginx/logs/access.log
tail -f /opt/hrms/nginx/logs/error.log
```

---

## 🎯 **Deployment Checklist**

### **Pre-Deployment**
- [ ] Domain name configured
- [ ] DNS records set up
- [ ] SSL certificate ready
- [ ] Environment variables configured
- [ ] Database credentials set
- [ ] Email configuration ready

### **Deployment**
- [ ] Droplet created and configured
- [ ] Docker and Docker Compose installed
- [ ] Application deployed
- [ ] Database migrations run
- [ ] SSL certificate installed
- [ ] Firewall configured
- [ ] Monitoring set up

### **Post-Deployment**
- [ ] Application accessible via domain
- [ ] SSL certificate working
- [ ] Database connections working
- [ ] Email functionality tested
- [ ] Backup system working
- [ ] Monitoring alerts configured

---

## 🆘 **Troubleshooting**

### **Common Issues**

1. **Services not starting:**
```bash
# Check logs
docker-compose -f docker-compose.digitalocean.yml logs

# Restart services
docker-compose -f docker-compose.digitalocean.yml restart
```

2. **Database connection issues:**
```bash
# Check database status
docker-compose -f docker-compose.digitalocean.yml exec postgres pg_isready

# Check database logs
docker-compose -f docker-compose.digitalocean.yml logs postgres
```

3. **SSL certificate issues:**
```bash
# Renew certificate
certbot renew --force-renewal

# Check certificate status
certbot certificates
```

4. **Performance issues:**
```bash
# Check resource usage
htop
docker stats

# Check disk space
df -h
```

---

## 📞 **Support and Resources**

### **DigitalOcean Resources**
- [DigitalOcean Documentation](https://docs.digitalocean.com/)
- [App Platform Guide](https://docs.digitalocean.com/products/app-platform/)
- [Droplet Management](https://docs.digitalocean.com/products/droplets/)

### **HRMS System Resources**
- [API Documentation](https://your-domain.com/api/docs)
- [Admin Panel](https://your-domain.com/admin)
- [User Guide](https://your-domain.com/docs)

### **Community Support**
- [GitHub Issues](https://github.com/your-username/hrms-system/issues)
- [Discord Community](https://discord.gg/hrms)
- [Documentation](https://docs.hrms-system.com)

---

## 🎉 **Success!**

Your HRMS system is now deployed on DigitalOcean! 

**Access your application:**
- **Frontend**: https://your-domain.com
- **API**: https://your-domain.com/api
- **Admin**: https://your-domain.com/admin
- **API Docs**: https://your-domain.com/api/docs

**Next steps:**
1. Configure your domain DNS
2. Set up monitoring alerts
3. Configure backups
4. Test all functionality
5. Set up user accounts

**Happy HR Management! 🚀**
