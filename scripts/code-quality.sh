#!/bin/bash

# Code Quality Check Script for HRMS Project
# This script runs all code quality checks for both frontend and backend

set -e

echo "🔍 Starting Code Quality Checks..."
echo "=================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Check if we're in the project root
if [ ! -f "docker-compose.yml" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

# Initialize counters
FRONTEND_ERRORS=0
BACKEND_ERRORS=0
TOTAL_ERRORS=0

echo ""
print_status "🎯 Frontend Code Quality Checks"
echo "=================================="

# Frontend checks
if [ -d "frontend" ]; then
    cd frontend
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        print_status "Installing frontend dependencies..."
        npm ci
    fi
    
    # ESLint check
    print_status "Running ESLint..."
    if npm run lint; then
        print_success "ESLint passed"
    else
        print_error "ESLint failed"
        FRONTEND_ERRORS=$((FRONTEND_ERRORS + 1))
    fi
    
    # Prettier check
    print_status "Running Prettier check..."
    if npm run format:check; then
        print_success "Prettier formatting is correct"
    else
        print_warning "Prettier formatting issues found"
        print_status "Run 'npm run format' to fix formatting issues"
        FRONTEND_ERRORS=$((FRONTEND_ERRORS + 1))
    fi
    
    # TypeScript check
    print_status "Running TypeScript check..."
    if npm run typecheck; then
        print_success "TypeScript check passed"
    else
        print_error "TypeScript check failed"
        FRONTEND_ERRORS=$((FRONTEND_ERRORS + 1))
    fi
    
    # Tests
    print_status "Running frontend tests..."
    if npm run test; then
        print_success "Frontend tests passed"
    else
        print_error "Frontend tests failed"
        FRONTEND_ERRORS=$((FRONTEND_ERRORS + 1))
    fi
    
    cd ..
else
    print_warning "Frontend directory not found, skipping frontend checks"
fi

echo ""
print_status "🐍 Backend Code Quality Checks"
echo "=================================="

# Backend checks
if [ -d "python_backend" ]; then
    cd python_backend
    
    # Install dependencies if needed
    if [ ! -d ".venv" ]; then
        print_status "Creating Python virtual environment..."
        python -m venv .venv
        source .venv/bin/activate
        pip install -r requirements.txt
        pip install black ruff mypy pytest-cov
    else
        source .venv/bin/activate
    fi
    
    # Black formatting check
    print_status "Running Black formatting check..."
    if black --check app/ tests/; then
        print_success "Black formatting is correct"
    else
        print_warning "Black formatting issues found"
        print_status "Run 'black app/ tests/' to fix formatting issues"
        BACKEND_ERRORS=$((BACKEND_ERRORS + 1))
    fi
    
    # Ruff linting
    print_status "Running Ruff linting..."
    if ruff check app/ tests/; then
        print_success "Ruff linting passed"
    else
        print_error "Ruff linting failed"
        BACKEND_ERRORS=$((BACKEND_ERRORS + 1))
    fi
    
    # MyPy type checking
    print_status "Running MyPy type checking..."
    if mypy app/; then
        print_success "MyPy type checking passed"
    else
        print_warning "MyPy type checking issues found"
        BACKEND_ERRORS=$((BACKEND_ERRORS + 1))
    fi
    
    # Pytest tests
    print_status "Running backend tests..."
    if pytest tests/ -v --tb=short; then
        print_success "Backend tests passed"
    else
        print_error "Backend tests failed"
        BACKEND_ERRORS=$((BACKEND_ERRORS + 1))
    fi
    
    cd ..
else
    print_warning "Python backend directory not found, skipping backend checks"
fi

# Calculate total errors
TOTAL_ERRORS=$((FRONTEND_ERRORS + BACKEND_ERRORS))

echo ""
echo "=================================="
print_status "📊 Code Quality Summary"
echo "=================================="

if [ $FRONTEND_ERRORS -eq 0 ]; then
    print_success "Frontend: All checks passed ✅"
else
    print_error "Frontend: $FRONTEND_ERRORS issues found ❌"
fi

if [ $BACKEND_ERRORS -eq 0 ]; then
    print_success "Backend: All checks passed ✅"
else
    print_error "Backend: $BACKEND_ERRORS issues found ❌"
fi

echo ""
if [ $TOTAL_ERRORS -eq 0 ]; then
    print_success "🎉 All code quality checks passed!"
    echo ""
    print_status "Code Quality Score: 10/10 ⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐"
    exit 0
else
    print_error "❌ Code quality issues found: $TOTAL_ERRORS total"
    echo ""
    print_status "Code Quality Score: $((10 - TOTAL_ERRORS))/10"
    echo ""
    print_status "🔧 To fix issues:"
    echo "  Frontend: cd frontend && npm run lint:fix && npm run format"
    echo "  Backend: cd python_backend && black app/ tests/ && ruff check --fix app/ tests/"
    exit 1
fi
