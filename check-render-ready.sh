#!/bin/bash

# Quick Render.com deployment check script
# This script validates that the repository is ready for Render deployment

set -e

echo "================================================"
echo "  Render.com Deployment Readiness Check"
echo "================================================"
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check functions
check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} Found: $1"
        return 0
    else
        echo -e "${RED}✗${NC} Missing: $1"
        return 1
    fi
}

check_executable() {
    if [ -x "$1" ]; then
        echo -e "${GREEN}✓${NC} Executable: $1"
        return 0
    else
        echo -e "${YELLOW}!${NC} Not executable: $1 (fixing...)"
        chmod +x "$1"
        echo -e "${GREEN}✓${NC} Fixed: $1"
        return 0
    fi
}

# Track overall status
ERRORS=0

echo "Checking backend files..."
echo "------------------------"
check_file "python_backend/Dockerfile" || ((ERRORS++))
check_file "python_backend/requirements.txt" || ((ERRORS++))
check_file "python_backend/build.sh" || ((ERRORS++))
check_executable "python_backend/build.sh" || ((ERRORS++))
check_file "python_backend/app/main.py" || ((ERRORS++))
check_file "python_backend/.env.example" || ((ERRORS++))
echo ""

echo "Checking frontend files..."
echo "------------------------"
check_file "frontend/package.json" || ((ERRORS++))
check_file "frontend/vite.config.ts" || ((ERRORS++))
check_file "frontend/build.sh" || ((ERRORS++))
check_executable "frontend/build.sh" || ((ERRORS++))
check_file "frontend/.env.example" || ((ERRORS++))
echo ""

echo "Checking deployment configuration..."
echo "-----------------------------------"
check_file "render.yaml" || ((ERRORS++))
check_file "RENDER_SETUP_GUIDE.md" || ((ERRORS++))
echo ""

# Validate render.yaml syntax
echo "Validating render.yaml..."
if command -v python3 &> /dev/null; then
    python3 -c "import yaml; yaml.safe_load(open('render.yaml'))" 2>/dev/null && \
        echo -e "${GREEN}✓${NC} render.yaml is valid YAML" || \
        echo -e "${YELLOW}!${NC} render.yaml may have syntax issues"
fi
echo ""

# Check for required Python packages
echo "Checking backend dependencies..."
echo "------------------------------"
if [ -f "python_backend/requirements.txt" ]; then
    REQUIRED_PACKAGES=("fastapi" "uvicorn" "sqlalchemy" "pydantic")
    for pkg in "${REQUIRED_PACKAGES[@]}"; do
        if grep -q "$pkg" python_backend/requirements.txt; then
            echo -e "${GREEN}✓${NC} Found package: $pkg"
        else
            echo -e "${RED}✗${NC} Missing package: $pkg"
            ((ERRORS++))
        fi
    done
fi
echo ""

# Check for required npm packages
echo "Checking frontend dependencies..."
echo "--------------------------------"
if [ -f "frontend/package.json" ]; then
    REQUIRED_PACKAGES=("react" "vite" "typescript")
    for pkg in "${REQUIRED_PACKAGES[@]}"; do
        if grep -q "\"$pkg\"" frontend/package.json; then
            echo -e "${GREEN}✓${NC} Found package: $pkg"
        else
            echo -e "${RED}✗${NC} Missing package: $pkg"
            ((ERRORS++))
        fi
    done
fi
echo ""

# Summary
echo "================================================"
echo "  Deployment Readiness Summary"
echo "================================================"
if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed!${NC}"
    echo ""
    echo "Your repository is ready for Render.com deployment."
    echo ""
    echo "Next steps:"
    echo "1. Commit and push all changes to GitHub"
    echo "2. Follow the guide in RENDER_SETUP_GUIDE.md"
    echo "3. Deploy using Render Blueprint or manual setup"
    echo ""
else
    echo -e "${RED}✗ Found $ERRORS issue(s)${NC}"
    echo ""
    echo "Please fix the issues above before deploying."
    echo ""
    exit 1
fi

echo "================================================"
echo ""

# Offer to show deployment guide
read -p "Would you like to see the deployment guide? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if command -v less &> /dev/null; then
        less RENDER_SETUP_GUIDE.md
    else
        cat RENDER_SETUP_GUIDE.md
    fi
fi
