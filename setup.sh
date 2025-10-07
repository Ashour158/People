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

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
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
    echo "Please install PostgreSQL 15+ from https://www.postgresql.org/"
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
    echo "  Backend:  http://localhost:5000"
    echo "  Health:   http://localhost:5000/health"
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
    echo "Setting up Backend"
    echo "=================================="
    cd backend
    
    if [ ! -f .env ]; then
        echo "Creating backend .env file..."
        cp .env.example .env
        echo -e "${YELLOW}⚠ Please edit backend/.env with your configuration${NC}"
        read -p "Press enter to continue..."
    fi
    
    echo "Installing backend dependencies..."
    npm install
    
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
    echo "Please run the following commands manually:"
    echo ""
    echo "  createdb hr_system"
    echo "  psql hr_system < enhanced_hr_schema.sql"
    echo ""
    
    echo "=================================="
    echo "Starting the Application"
    echo "=================================="
    echo ""
    echo "To start the application, open 3 terminals:"
    echo ""
    echo "Terminal 1 - Backend:"
    echo "  cd backend && npm run dev"
    echo ""
    echo "Terminal 2 - Frontend:"
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
