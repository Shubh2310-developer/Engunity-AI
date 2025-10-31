#!/bin/bash

# Engunity AI - Service Verification Script
# Quick health check for all services

echo "╔════════════════════════════════════════════════════════════╗"
echo "║         Engunity AI - Service Verification                 ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to check service
check_service() {
    local name=$1
    local url=$2
    local expected=$3

    echo -n "Checking $name... "

    if response=$(curl -s --max-time 5 "$url" 2>&1); then
        if [[ "$response" == *"$expected"* ]]; then
            echo -e "${GREEN}✅ OK${NC}"
            return 0
        else
            echo -e "${YELLOW}⚠️  Unexpected response${NC}"
            return 1
        fi
    else
        echo -e "${RED}❌ Failed${NC}"
        return 1
    fi
}

# Function to check port
check_port() {
    local port=$1
    local name=$2

    if lsof -i:$port > /dev/null 2>&1; then
        echo -e "  ${GREEN}✅${NC} Port $port ($name) is active"
        return 0
    else
        echo -e "  ${RED}❌${NC} Port $port ($name) is not active"
        return 1
    fi
}

echo -e "${BLUE}═══ Port Status ═══${NC}"
check_port 3000 "Frontend"
check_port 8000 "Backend"
check_port 8002 "Hybrid RAG"
check_port 4001 "Code Executor"
check_port 27017 "MongoDB"
echo ""

echo -e "${BLUE}═══ Service Health ═══${NC}"
check_service "Frontend (3000)" "http://localhost:3000" "<!DOCTYPE html>"
check_service "Backend (8000)" "http://localhost:8000/api/health" '"status":"ok"'
check_service "Hybrid RAG (8002)" "http://localhost:8002/health" '"status":"healthy"'
check_service "Code Executor (4001)" "http://localhost:4001/health" '"status":"ok"'
echo ""

# MongoDB check
echo -e "${BLUE}═══ MongoDB Status ═══${NC}"
if systemctl is-active --quiet mongod 2>/dev/null || mongosh --quiet --eval "db.adminCommand('ping')" > /dev/null 2>&1; then
    echo -e "  ${GREEN}✅${NC} MongoDB is running"
else
    echo -e "  ${RED}❌${NC} MongoDB is not running"
fi
echo ""

# Docker check
echo -e "${BLUE}═══ Docker Status ═══${NC}"
if docker info > /dev/null 2>&1; then
    echo -e "  ${GREEN}✅${NC} Docker is available"
    echo -e "  ${GREEN}✅${NC} Code execution enabled"
else
    echo -e "  ${YELLOW}⚠️${NC}  Docker is not available"
    echo -e "  ${YELLOW}⚠️${NC}  Code execution limited"
fi
echo ""

# Memory check
echo -e "${BLUE}═══ Memory Status ═══${NC}"
TOTAL_RAM=$(free -m | awk 'NR==2{print $2}')
USED_RAM=$(free -m | awk 'NR==2{print $3}')
AVAILABLE_RAM=$(free -m | awk 'NR==2{print $7}')
PERCENT_USED=$((USED_RAM * 100 / TOTAL_RAM))

echo "  Total RAM: ${TOTAL_RAM}MB"
echo "  Used RAM: ${USED_RAM}MB (${PERCENT_USED}%)"
echo "  Available: ${AVAILABLE_RAM}MB"

if [ "$AVAILABLE_RAM" -lt 1000 ]; then
    echo -e "  ${RED}⚠️${NC}  Low memory - consider lightweight mode"
elif [ "$AVAILABLE_RAM" -lt 2000 ]; then
    echo -e "  ${YELLOW}⚠️${NC}  Memory getting low"
else
    echo -e "  ${GREEN}✅${NC} Memory OK"
fi
echo ""

# Process check
echo -e "${BLUE}═══ Process Status ═══${NC}"
FRONTEND_PID=$(lsof -ti:3000 2>/dev/null | head -1)
BACKEND_PID=$(lsof -ti:8000 2>/dev/null | head -1)
CODE_EXEC_PID=$(lsof -ti:4001 2>/dev/null | head -1)

if [ ! -z "$FRONTEND_PID" ]; then
    echo -e "  ${GREEN}✅${NC} Frontend PID: $FRONTEND_PID"
fi

if [ ! -z "$BACKEND_PID" ]; then
    echo -e "  ${GREEN}✅${NC} Backend PID: $BACKEND_PID"
fi

if [ ! -z "$CODE_EXEC_PID" ]; then
    echo -e "  ${GREEN}✅${NC} Code Executor PID: $CODE_EXEC_PID"
fi
echo ""

# Summary
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                    Quick Access Links                      ║"
echo "╠════════════════════════════════════════════════════════════╣"
echo "║  Frontend:       http://localhost:3000                     ║"
echo "║  Backend API:    http://localhost:8000/api                 ║"
echo "║  API Health:     http://localhost:8000/api/health          ║"
echo "║  Code Executor:  http://localhost:4001/api                 ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo -e "${BLUE}Logs:${NC}"
echo "  - Frontend:      tail -f frontend/frontend.log"
echo "  - Backend:       tail -f backend/main_backend.log"
echo "  - Code Executor: tail -f code-executor/code-executor.log"
echo ""
echo -e "${BLUE}Management:${NC}"
echo "  - Stop all:      ./stop-all-services.sh"
echo "  - Restart all:   ./stop-all-services.sh && ./start-all-services.sh"
echo ""
