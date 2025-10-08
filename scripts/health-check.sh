#!/bin/bash

# =====================================================
# Service Health Check Script
# Tests all infrastructure services
# =====================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="${BASE_URL:-http://localhost:5000}"
TIMEOUT=5

echo "=========================================="
echo "HR System - Service Health Check"
echo "=========================================="
echo "Base URL: $BASE_URL"
echo ""

# Function to check a service
check_service() {
    local service_name=$1
    local endpoint=$2
    
    echo -n "Checking $service_name... "
    
    response=$(curl -s -w "\n%{http_code}" --connect-timeout $TIMEOUT "$BASE_URL$endpoint" 2>/dev/null || echo "000")
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" = "200" ]; then
        echo -e "${GREEN}✓ Healthy${NC}"
        return 0
    elif [ "$http_code" = "503" ]; then
        echo -e "${YELLOW}⚠ Degraded${NC}"
        return 1
    elif [ "$http_code" = "000" ]; then
        echo -e "${RED}✗ Not Responding${NC}"
        return 2
    else
        echo -e "${YELLOW}⚠ Status: $http_code${NC}"
        return 1
    fi
}

# Check overall health
echo "Overall System Health:"
echo "------------------------------"
check_service "System" "/health"
echo ""

# Check individual services
echo "Individual Services:"
echo "------------------------------"
check_service "Database" "/health/database"
check_service "Cache (Redis)" "/health/cache"
check_service "Email" "/health/email"
check_service "WebSocket" "/health/websocket"
echo ""

# Check Kubernetes probes
echo "Kubernetes Probes:"
echo "------------------------------"
check_service "Readiness" "/ready"
check_service "Liveness" "/live"
echo ""

# Summary
echo "=========================================="
echo "Health Check Complete"
echo "=========================================="
echo ""
echo "For detailed information:"
echo "  curl $BASE_URL/health"
echo ""
echo "For service documentation:"
echo "  See docs/SERVICES.md"
echo "  See docs/QUICKSTART.md"
echo ""
