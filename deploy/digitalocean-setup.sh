#!/bin/bash

# DigitalOcean HRMS Deployment Script
# This script sets up the HRMS system on a DigitalOcean Droplet

set -e

echo "🚀 Starting HRMS deployment on DigitalOcean..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DROPLET_IP=""
DOMAIN=""
EMAIL=""
DB_PASSWORD=""
REDIS_PASSWORD=""
JWT_SECRET=""

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    print_error "Please run as root (use sudo)"
    exit 1
fi

# Update system
print_status "Updating system packages..."
apt update && apt upgrade -y

# Install required packages
print_status "Installing required packages..."
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
    vim

# Install Docker
print_status "Installing Docker..."
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Install Docker Compose
print_status "Installing Docker Compose..."
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose

# Start and enable Docker
systemctl start docker
systemctl enable docker

# Add user to docker group
usermod -aG docker $USER

# Configure firewall
print_status "Configuring firewall..."
ufw --force enable
ufw allow ssh
ufw allow 80
ufw allow 443
ufw allow 22

# Configure fail2ban
print_status "Configuring fail2ban..."
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

# Create application directory
print_status "Creating application directory..."
mkdir -p /opt/hrms
cd /opt/hrms

# Clone repository (replace with your repository URL)
print_status "Cloning repository..."
git clone https://github.com/your-username/hrms-system.git .

# Create environment file
print_status "Creating environment configuration..."
cat > .env << EOF
# Database Configuration
POSTGRES_DB=hrms_db
POSTGRES_USER=hrms_user
POSTGRES_PASSWORD=${DB_PASSWORD}

# Redis Configuration
REDIS_PASSWORD=${REDIS_PASSWORD}

# JWT Configuration
JWT_SECRET=${JWT_SECRET}

# Application Configuration
ENVIRONMENT=production
LOG_LEVEL=INFO
DEBUG=False

# Domain Configuration
DOMAIN=${DOMAIN}
ALLOWED_HOSTS=${DOMAIN},www.${DOMAIN}

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
SECRET_KEY=${JWT_SECRET}
CORS_ALLOWED_ORIGINS=https://${DOMAIN},https://www.${DOMAIN}
EOF

# Create necessary directories
print_status "Creating necessary directories..."
mkdir -p uploads logs nginx/ssl nginx/logs

# Set permissions
chown -R $USER:$USER /opt/hrms
chmod -R 755 /opt/hrms

# Generate SSL certificates (using Let's Encrypt)
print_status "Setting up SSL certificates..."
if [ ! -z "$DOMAIN" ] && [ ! -z "$EMAIL" ]; then
    # Install Certbot
    apt install -y certbot python3-certbot-nginx
    
    # Generate certificates
    certbot certonly --standalone -d $DOMAIN -d www.$DOMAIN --email $EMAIL --agree-tos --non-interactive
    
    # Copy certificates to nginx directory
    cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem nginx/ssl/cert.pem
    cp /etc/letsencrypt/live/$DOMAIN/privkey.pem nginx/ssl/key.pem
    
    # Set up auto-renewal
    echo "0 12 * * * /usr/bin/certbot renew --quiet" | crontab -
fi

# Build and start services
print_status "Building and starting services..."
docker-compose -f docker-compose.digitalocean.yml build
docker-compose -f docker-compose.digitalocean.yml up -d

# Wait for services to be ready
print_status "Waiting for services to start..."
sleep 30

# Run database migrations
print_status "Running database migrations..."
docker-compose -f docker-compose.digitalocean.yml exec backend python manage.py migrate

# Create superuser (optional)
print_status "Creating superuser..."
docker-compose -f docker-compose.digitalocean.yml exec backend python manage.py createsuperuser --noinput --username admin --email admin@${DOMAIN}

# Set up log rotation
print_status "Setting up log rotation..."
cat > /etc/logrotate.d/hrms << EOF
/opt/hrms/logs/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 $USER $USER
}
EOF

# Create systemd service for auto-start
print_status "Creating systemd service..."
cat > /etc/systemd/system/hrms.service << EOF
[Unit]
Description=HRMS System
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/hrms
ExecStart=/usr/bin/docker-compose -f docker-compose.digitalocean.yml up -d
ExecStop=/usr/bin/docker-compose -f docker-compose.digitalocean.yml down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable hrms.service

# Create backup script
print_status "Creating backup script..."
cat > /opt/hrms/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/opt/hrms/backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup database
docker-compose -f docker-compose.digitalocean.yml exec -T postgres pg_dump -U hrms_user hrms_db > $BACKUP_DIR/database_$DATE.sql

# Backup uploads
tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz uploads/

# Keep only last 7 days of backups
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete
EOF

chmod +x /opt/hrms/backup.sh

# Set up daily backups
echo "0 2 * * * /opt/hrms/backup.sh" | crontab -

# Create monitoring script
print_status "Creating monitoring script..."
cat > /opt/hrms/monitor.sh << 'EOF'
#!/bin/bash
# Simple health check script

# Check if services are running
if ! docker-compose -f docker-compose.digitalocean.yml ps | grep -q "Up"; then
    echo "Services are down, restarting..."
    docker-compose -f docker-compose.digitalocean.yml restart
fi

# Check disk space
DISK_USAGE=$(df /opt/hrms | awk 'NR==2 {print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 80 ]; then
    echo "Warning: Disk usage is ${DISK_USAGE}%"
fi

# Check memory usage
MEM_USAGE=$(free | awk 'NR==2{printf "%.2f", $3*100/$2}')
if (( $(echo "$MEM_USAGE > 80" | bc -l) )); then
    echo "Warning: Memory usage is ${MEM_USAGE}%"
fi
EOF

chmod +x /opt/hrms/monitor.sh

# Set up monitoring cron job
echo "*/5 * * * * /opt/hrms/monitor.sh" | crontab -

print_success "HRMS system deployed successfully!"
print_success "Access your application at: https://${DOMAIN}"
print_success "Admin panel: https://${DOMAIN}/admin"
print_success "API documentation: https://${DOMAIN}/api/docs"

print_status "Useful commands:"
echo "  - View logs: docker-compose -f docker-compose.digitalocean.yml logs -f"
echo "  - Restart services: docker-compose -f docker-compose.digitalocean.yml restart"
echo "  - Stop services: docker-compose -f docker-compose.digitalocean.yml down"
echo "  - Update system: git pull && docker-compose -f docker-compose.digitalocean.yml up -d --build"

print_warning "Don't forget to:"
echo "  1. Configure your domain DNS to point to this server"
echo "  2. Update the .env file with your actual configuration"
echo "  3. Set up proper email configuration"
echo "  4. Configure your firewall rules"
echo "  5. Set up monitoring and alerting"

print_success "Deployment completed! 🎉"
