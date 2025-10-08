#!/bin/bash

# HR Management System - Quick Setup Script
# This script helps set up the application quickly

set -e

echo "=================================="
echo "HR Management System Setup"
echo "=================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check prerequisites
echo "Checking prerequisites..."

# Check Python
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ Python 3 is not installed${NC}"
    echo "Please install Python 3.9+ from https://www.python.org/"
    exit 1
fi

PYTHON_VERSION=$(python3 -c 'import sys; print(".".join(map(str, sys.version_info[:2])))')
PYTHON_MAJOR=$(echo $PYTHON_VERSION | cut -d'.' -f1)
PYTHON_MINOR=$(echo $PYTHON_VERSION | cut -d'.' -f2)

if [ "$PYTHON_MAJOR" -lt 3 ] || ([ "$PYTHON_MAJOR" -eq 3 ] && [ "$PYTHON_MINOR" -lt 9 ]); then
    echo -e "${RED}❌ Python version is too old (need 3.9+), found $PYTHON_VERSION${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Python $PYTHON_VERSION${NC}"

# Check pip
if ! command -v pip3 &> /dev/null; then
    echo -e "${RED}❌ pip3 is not installed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ pip3 $(pip3 --version | awk '{print $2}')${NC}"

# Check Node.js (for frontend)
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed (required for frontend)${NC}"
    echo "Please install Node.js 18+ from https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}❌ Node.js version is too old (need 18+)${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Node.js $(node -v)${NC}"

# Check npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is not installed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ npm $(npm -v)${NC}"

# Check PostgreSQL
if ! command -v psql &> /dev/null; then
    echo -e "${YELLOW}⚠ PostgreSQL is not installed${NC}"
    echo "Please install PostgreSQL 13+ from https://www.postgresql.org/"
    read -p "Continue without PostgreSQL check? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
else
    echo -e "${GREEN}✓ PostgreSQL$(NC}"
fi

echo ""
echo "=================================="
echo "Installation Options"
echo "=================================="
echo "1. Docker Setup (Recommended - Easiest)"
echo "2. Manual Setup (For development)"
echo ""
read -p "Choose option (1 or 2): " OPTION

if [ "$OPTION" == "1" ]; then
    # Docker setup
    echo ""
    echo "Setting up with Docker..."
    
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}❌ Docker is not installed${NC}"
        echo "Please install Docker from https://www.docker.com/products/docker-desktop/"
        exit 1
    fi
    
    echo -e "${GREEN}✓ Docker$(docker --version)${NC}"
    
    # Create .env if not exists
    if [ ! -f .env ]; then
        echo "Creating .env file..."
        cp .env.example .env
        echo -e "${YELLOW}⚠ Please edit .env file with your configuration${NC}"
        read -p "Press enter to continue..."
    fi
    
    echo ""
    echo "Starting services with Docker..."
    docker-compose up -d
    
    echo ""
    echo -e "${GREEN}✓ Services started!${NC}"
    echo ""
    echo "Access the application:"
    echo "  Frontend: http://localhost:3000"
    echo "  Backend:  http://localhost:8000"
    echo "  Django Admin: http://localhost:8000/admin"
    echo "  API Docs:   http://localhost:8000/api/docs"
    echo "  Health:   http://localhost:8000/health"
    echo ""
    echo "View logs: docker-compose logs -f"
    echo "Stop services: docker-compose down"
    
elif [ "$OPTION" == "2" ]; then
    # Manual setup
    echo ""
    echo "Manual setup selected..."
    
    # Backend setup
    echo ""
    echo "=================================="
    echo "Setting up Backend (Django)"
    echo "=================================="
    cd backend
    
    if [ ! -f .env ]; then
        echo "Creating backend .env file..."
        cp .env.example .env
        echo -e "${YELLOW}⚠ Please edit backend/.env with your configuration${NC}"
        read -p "Press enter to continue..."
    fi
    
    echo "Creating Python virtual environment..."
    python3 -m venv venv
    
    echo "Activating virtual environment..."
    source venv/bin/activate
    
    echo "Installing backend dependencies..."
    pip install -r requirements.txt
    
    echo "Running Django migrations..."
    python manage.py migrate
    
    echo -e "${GREEN}✓ Backend setup complete${NC}"
    
    # Frontend setup
    echo ""
    echo "=================================="
    echo "Setting up Frontend"
    echo "=================================="
    cd ../frontend
    
    if [ ! -f .env ]; then
        echo "Creating frontend .env file..."
        cp .env.example .env
    fi
    
    echo "Installing frontend dependencies..."
    npm install
    
    echo -e "${GREEN}✓ Frontend setup complete${NC}"
    
    cd ..
    
    # Database setup
    echo ""
    echo "=================================="
    echo "Database Setup"
    echo "=================================="
    echo "Please ensure you have created the PostgreSQL database:"
    echo ""
    echo "  createdb hr_system"
    echo ""
    echo "Django migrations were already run during backend setup."
    echo ""
    
    echo "=================================="
    echo "Starting the Application"
    echo "=================================="
    echo ""
    echo "To start the application, open 3 terminals:"
    echo ""
    echo "Terminal 1 - Backend (Django):"
    echo "  cd backend && source venv/bin/activate && python manage.py runserver"
    echo ""
    echo "Terminal 2 - Frontend (React):"
    echo "  cd frontend && npm run dev"
    echo ""
    echo "Terminal 3 - Redis (optional):"
    echo "  redis-server"
    echo ""
    
else
    echo -e "${RED}Invalid option${NC}"
    exit 1
fi

echo ""
echo "=================================="
echo "Setup Complete! 🎉"
echo "=================================="
echo ""
echo "Next steps:"
echo "1. Access http://localhost:3000"
echo "2. Register a new organization"
echo "3. Start using the system!"
echo ""
echo "For detailed instructions, see SETUP_GUIDE.md"
echo ""
