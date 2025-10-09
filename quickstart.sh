#!/bin/bash

# Quick Start Script for HR Management System (Python Backend)
# This script helps you set up the entire application quickly

set -e  # Exit on error

echo "=========================================="
echo "HR Management System - Quick Start"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored messages
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}→ $1${NC}"
}

# Check if required commands exist
check_requirements() {
    print_info "Checking prerequisites..."
    
    local missing=0
    
    if ! command -v python3 &> /dev/null; then
        print_error "Python 3 is not installed"
        missing=1
    else
        print_success "Python 3 found: $(python3 --version)"
    fi
    
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed"
        missing=1
    else
        print_success "Node.js found: $(node --version)"
    fi
    
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed"
        missing=1
    else
        print_success "npm found: $(npm --version)"
    fi
    
    if ! command -v psql &> /dev/null; then
        print_error "PostgreSQL client (psql) is not installed"
        missing=1
    else
        print_success "PostgreSQL client found"
    fi
    
    if [ $missing -eq 1 ]; then
        print_error "Please install missing prerequisites first"
        exit 1
    fi
    
    echo ""
}

# Setup Python backend
setup_backend() {
    print_info "Setting up Python backend..."
    
    cd python_backend
    
    # Create virtual environment
    if [ ! -d "venv" ]; then
        print_info "Creating virtual environment..."
        python3 -m venv venv
        print_success "Virtual environment created"
    else
        print_success "Virtual environment already exists"
    fi
    
    # Activate virtual environment
    source venv/bin/activate
    
    # Install dependencies
    print_info "Installing Python dependencies (this may take a few minutes)..."
    pip install --upgrade pip -q
    pip install -r requirements.txt -q
    print_success "Python dependencies installed"
    
    # Setup environment file
    if [ ! -f ".env" ]; then
        print_info "Creating .env file from template..."
        cp .env.example .env
        print_success ".env file created"
        print_info "Please edit python_backend/.env with your database credentials"
    else
        print_success ".env file already exists"
    fi
    
    cd ..
    echo ""
}

# Setup database
setup_database() {
    print_info "Setting up database..."
    
    # Check if database exists
    if psql -lqt -U postgres 2>/dev/null | cut -d \| -f 1 | grep -qw hr_system; then
        print_success "Database 'hr_system' already exists"
    else
        print_info "Creating database 'hr_system'..."
        createdb -U postgres hr_system 2>/dev/null || {
            print_error "Could not create database. Please ensure PostgreSQL is running"
            print_info "You can create it manually: createdb -U postgres hr_system"
            return 1
        }
        print_success "Database created"
    fi
    
    # Run migrations
    print_info "Running database migrations..."
    cd python_backend
    source venv/bin/activate
    alembic upgrade head
    print_success "Migrations completed"
    cd ..
    
    echo ""
}

# Setup frontend
setup_frontend() {
    print_info "Setting up frontend..."
    
    cd frontend
    
    # Install dependencies
    if [ ! -d "node_modules" ]; then
        print_info "Installing frontend dependencies (this may take a few minutes)..."
        npm install
        print_success "Frontend dependencies installed"
    else
        print_success "Frontend dependencies already installed"
    fi
    
    # Setup environment file
    if [ ! -f ".env" ]; then
        print_info "Creating .env file from template..."
        cp .env.example .env
        print_success ".env file created"
    else
        print_success ".env file already exists"
    fi
    
    cd ..
    echo ""
}

# Start services
start_services() {
    echo ""
    print_success "Setup complete!"
    echo ""
    print_info "To start the application:"
    echo ""
    echo "Terminal 1 - Python Backend:"
    echo "  cd python_backend"
    echo "  source venv/bin/activate"
    echo "  uvicorn app.main:app --reload --port 5000"
    echo ""
    echo "Terminal 2 - Frontend:"
    echo "  cd frontend"
    echo "  npm run dev"
    echo ""
    echo "Then open: http://localhost:5173"
    echo ""
    print_info "API Documentation will be available at:"
    echo "  http://localhost:5000/api/v1/docs"
    echo ""
}

# Main execution
main() {
    check_requirements
    setup_backend
    
    # Ask if user wants to setup database
    read -p "Do you want to setup the database now? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        setup_database || print_error "Database setup failed. You can run migrations manually later."
    else
        print_info "Skipping database setup. Remember to run 'alembic upgrade head' later."
    fi
    
    setup_frontend
    start_services
}

# Run main function
main
