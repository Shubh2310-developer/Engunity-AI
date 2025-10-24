#!/bin/bash

echo "🔍 Engunity AI - Setup Verification"
echo "===================================="
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

check_passed=0
check_failed=0

# Function to check service
check_service() {
    local service_name=$1
    local check_command=$2
    
    echo -n "Checking $service_name... "
    if eval "$check_command" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ OK${NC}"
        ((check_passed++))
        return 0
    else
        echo -e "${RED}❌ FAILED${NC}"
        ((check_failed++))
        return 1
    fi
}

# Check Docker
check_service "Docker" "docker ps"

# Check MongoDB
check_service "MongoDB" "mongosh --eval 'db.version()'"

# Check MongoDB database
echo -n "Checking MongoDB database (engunity-ai-dev)... "
if mongosh --quiet --eval "use engunity-ai-dev; db.getCollectionNames().length" | grep -q "[0-9]"; then
    collections=$(mongosh --quiet --eval "use engunity-ai-dev; db.getCollectionNames().length")
    echo -e "${GREEN}✅ OK ($collections collections)${NC}"
    ((check_passed++))
else
    echo -e "${RED}❌ FAILED${NC}"
    ((check_failed++))
fi

# Check environment files
for env_file in "backend/.env" "frontend/.env.local" "code-executor/.env"; do
    echo -n "Checking $env_file... "
    if [ -f "/home/ghost/Engunity-AI/$env_file" ]; then
        echo -e "${GREEN}✅ EXISTS${NC}"
        ((check_passed++))
    else
        echo -e "${RED}❌ MISSING${NC}"
        ((check_failed++))
    fi
done

# Check Python environment
echo -n "Checking conda environment (engunity)... "
if conda env list | grep -q "engunity"; then
    echo -e "${GREEN}✅ OK${NC}"
    ((check_passed++))
else
    echo -e "${RED}❌ MISSING${NC}"
    ((check_failed++))
fi

# Check Node.js
check_service "Node.js" "node --version"

# Check npm packages (frontend)
echo -n "Checking frontend dependencies... "
if [ -d "/home/ghost/Engunity-AI/frontend/node_modules" ]; then
    echo -e "${GREEN}✅ INSTALLED${NC}"
    ((check_passed++))
else
    echo -e "${YELLOW}⚠️  NOT INSTALLED${NC}"
fi

# Check npm packages (code-executor)
echo -n "Checking code-executor dependencies... "
if [ -d "/home/ghost/Engunity-AI/code-executor/node_modules" ]; then
    echo -e "${GREEN}✅ INSTALLED${NC}"
    ((check_passed++))
else
    echo -e "${YELLOW}⚠️  NOT INSTALLED${NC}"
fi

echo ""
echo "===================================="
echo -e "Summary: ${GREEN}$check_passed passed${NC}, ${RED}$check_failed failed${NC}"
echo ""

if [ $check_failed -eq 0 ]; then
    echo -e "${GREEN}✅ All checks passed! Ready to start services.${NC}"
    exit 0
else
    echo -e "${RED}❌ Some checks failed. Please fix the issues above.${NC}"
    exit 1
fi
