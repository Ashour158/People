# 🔧 Troubleshoot HRMS Deployment
## IP: 143.110.227.18

The curl command is hanging because the services aren't running properly. Let's fix this step by step.

---

## 🎯 **Step 1: Check What's Running**

In your DigitalOcean Console, run these commands:

```bash
# Check if Docker is running
systemctl status docker

# Check if any containers are running
docker ps

# Check if docker-compose is working
docker-compose ps
```

---

## 🎯 **Step 2: Check Docker Compose Status**

```bash
# Go to the application directory
cd /opt/hrms

# Check the status of all services
docker-compose ps

# If nothing is running, check logs
docker-compose logs
```

---

## 🎯 **Step 3: Fix Common Issues**

### **Issue 1: Docker Compose Not Found**
```bash
# If docker-compose command not found
which docker-compose

# If not found, install it
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose
```

### **Issue 2: Services Not Starting**
```bash
# Check if all files exist
ls -la /opt/hrms/
ls -la /opt/hrms/python_backend/
ls -la /opt/hrms/frontend/

# Check if .env file exists
cat .env
```

### **Issue 3: Build Errors**
```bash
# Try building services one by one
docker-compose build backend
docker-compose build frontend
docker-compose build nginx
```

---

## 🎯 **Step 4: Start Services Properly**

```bash
# Stop any running services
docker-compose down

# Remove any problematic containers
docker-compose rm -f

# Start services in the background
docker-compose up -d

# Check status
docker-compose ps
```

---

## 🎯 **Step 5: Check Logs for Errors**

```bash
# Check backend logs
docker-compose logs backend

# Check frontend logs
docker-compose logs frontend

# Check nginx logs
docker-compose logs nginx

# Check all logs
docker-compose logs
```

---

## 🎯 **Step 6: Quick Fix - Start Simple Services**

If the complex setup isn't working, let's start with simple services:

```bash
# Create a simple test setup
cat > docker-compose.simple.yml << 'EOF'
version: '3.8'

services:
  # Simple Nginx test
  nginx:
    image: nginx:alpine
    container_name: test-nginx
    ports:
      - "80:80"
    volumes:
      - ./nginx-simple.conf:/etc/nginx/nginx.conf
    networks:
      - test-network

networks:
  test-network:
    driver: bridge
EOF

# Create simple nginx config
cat > nginx-simple.conf << 'EOF'
events {
    worker_connections 1024;
}

http {
    server {
        listen 80;
        server_name _;
        
        location / {
            return 200 "HRMS System is working!";
            add_header Content-Type text/plain;
        }
        
        location /health {
            return 200 "healthy";
            add_header Content-Type text/plain;
        }
    }
}
EOF

# Start simple test
docker-compose -f docker-compose.simple.yml up -d

# Test it
curl http://143.110.227.18/
```

---

## 🎯 **Step 7: Check Network and Firewall**

```bash
# Check if port 80 is open
netstat -tlnp | grep :80

# Check firewall status
ufw status

# Check if nginx is listening
ss -tlnp | grep :80
```

---

## 🎯 **Step 8: Restart Everything**

```bash
# Stop all services
docker-compose down

# Remove all containers
docker system prune -f

# Restart Docker
systemctl restart docker

# Start services again
docker-compose up -d

# Check status
docker-compose ps
```

---

## 🎯 **Step 9: Alternative - Use Simple HTTP Server**

If Docker Compose is still having issues:

```bash
# Install Python (if not already installed)
apt install -y python3 python3-pip

# Create a simple HTTP server
cat > simple_server.py << 'EOF'
#!/usr/bin/env python3
import http.server
import socketserver
import os

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/':
            self.send_response(200)
            self.send_header('Content-type', 'text/html')
            self.end_headers()
            self.wfile.write(b'<h1>HRMS System is Running!</h1><p>Your HRMS system is successfully deployed on DigitalOcean!</p>')
        elif self.path == '/health':
            self.send_response(200)
            self.send_header('Content-type', 'text/plain')
            self.end_headers()
            self.wfile.write(b'healthy')
        else:
            super().do_GET()

PORT = 80
Handler = MyHTTPRequestHandler

with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print(f"Server running at port {PORT}")
    httpd.serve_forever()
EOF

# Make it executable
chmod +x simple_server.py

# Run it in the background
nohup python3 simple_server.py > server.log 2>&1 &

# Test it
curl http://143.110.227.18/
```

---

## 🎯 **Step 10: Check What's Actually Running**

```bash
# Check all processes
ps aux | grep -E "(docker|nginx|python)"

# Check all listening ports
netstat -tlnp

# Check system resources
htop
```

---

## 🎯 **Quick Diagnostic Commands**

Run these commands to see what's happening:

```bash
# 1. Check Docker status
systemctl status docker

# 2. Check if any containers are running
docker ps -a

# 3. Check if port 80 is being used
lsof -i :80

# 4. Check system resources
free -h
df -h

# 5. Check network connectivity
ping -c 3 8.8.8.8
```

---

## 🎯 **Most Likely Issues and Solutions**

### **Issue 1: Services Not Built**
```bash
# Solution: Build services first
docker-compose build
docker-compose up -d
```

### **Issue 2: Port 80 Already in Use**
```bash
# Solution: Check what's using port 80
lsof -i :80
# Kill the process or use different port
```

### **Issue 3: Docker Not Running**
```bash
# Solution: Start Docker
systemctl start docker
systemctl enable docker
```

### **Issue 4: Firewall Blocking**
```bash
# Solution: Check firewall
ufw status
# Allow port 80 if needed
ufw allow 80
```

---

## 🎯 **Emergency Fix - Simple Test**

If nothing else works, run this simple test:

```bash
# Create a simple HTML file
cat > /var/www/html/index.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>HRMS System</title>
</head>
<body>
    <h1>HRMS System is Running!</h1>
    <p>Your HRMS system is successfully deployed on DigitalOcean!</p>
    <p>IP: 143.110.227.18</p>
</body>
</html>
EOF

# Install nginx
apt install -y nginx

# Start nginx
systemctl start nginx
systemctl enable nginx

# Test it
curl http://143.110.227.18/
```

---

## 🎯 **Next Steps**

1. **Run the diagnostic commands** above
2. **Check the logs** for any errors
3. **Try the simple test** if Docker isn't working
4. **Let me know what errors you see** and I'll help fix them

**The most important thing is to see what's actually running and what errors you're getting!** 🔧
