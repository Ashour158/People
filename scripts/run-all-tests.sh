#!/bin/bash

# Test Execution Script for HR Management System
# This script runs all tests and generates comprehensive reports

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print colored output
print_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}→ $1${NC}"
}

# Start time
START_TIME=$(date +%s)

print_header "HR Management System - Full Test Suite"

# Python Backend Tests
print_header "Running Python Backend Tests"
cd python_backend

if [ -d "venv" ]; then
    print_info "Activating Python virtual environment..."
    source venv/bin/activate
else
    print_info "Creating Python virtual environment..."
    python3 -m venv venv
    source venv/bin/activate
    pip install --upgrade pip
    pip install -r requirements.txt
fi

print_info "Running pytest with coverage..."
pytest --cov=app --cov-report=html --cov-report=xml --cov-report=term-missing -v --tb=short

if [ $? -eq 0 ]; then
    print_success "Python backend tests passed!"
else
    print_error "Python backend tests failed!"
    exit 1
fi

# Count test results
TOTAL_TESTS=$(pytest --collect-only -q 2>/dev/null | tail -1 | awk '{print $1}')
print_info "Total Python tests: $TOTAL_TESTS"

cd ..

# Frontend Tests
print_header "Running Frontend Tests"
cd frontend

if [ ! -d "node_modules" ]; then
    print_info "Installing frontend dependencies..."
    npm install
fi

print_info "Running Vitest with coverage..."
npm run test:coverage

if [ $? -eq 0 ]; then
    print_success "Frontend tests passed!"
else
    print_error "Frontend tests failed!"
    exit 1
fi

cd ..

# Generate Summary Report
print_header "Test Execution Summary"

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo "Execution Time: ${DURATION}s"
echo ""
echo "Backend Coverage Report: python_backend/htmlcov/index.html"
echo "Frontend Coverage Report: frontend/coverage/index.html"
echo ""

print_success "All tests completed successfully!"

# Optional: Open coverage reports in browser
if command -v xdg-open &> /dev/null; then
    print_info "Opening coverage reports in browser..."
    xdg-open python_backend/htmlcov/index.html 2>/dev/null || true
    xdg-open frontend/coverage/index.html 2>/dev/null || true
elif command -v open &> /dev/null; then
    print_info "Opening coverage reports in browser..."
    open python_backend/htmlcov/index.html 2>/dev/null || true
    open frontend/coverage/index.html 2>/dev/null || true
fi

print_header "Test Suite Completed Successfully"
