#!/bin/bash
# Script to scan the entire repository for potential API keys and secrets

echo "🔍 Scanning repository for potential secrets..."
echo "================================================"

# Define patterns to search for
declare -A SECRET_PATTERNS=(
    ["Groq API Key"]="gsk_[a-zA-Z0-9]{52}"
    ["OpenAI API Key"]="sk-[a-zA-Z0-9]{48,51}"
    ["Public Key"]="pk_[a-zA-Z0-9]{42,48}"
    ["Generic API Key"]="\b[A-Za-z0-9]{32,}\b"
    ["Environment Variable"]="(GROQ_API_KEY|OPENAI_API_KEY|ANTHROPIC_API_KEY|SUPABASE.*KEY|FIREBASE.*KEY)\s*=\s*[\"'][^\"']+[\"']"
    ["Bearer Token"]="Bearer [A-Za-z0-9\-\._~\+\/]+="
    ["JWT Token"]="eyJ[A-Za-z0-9\-\._~\+\/]+="
)

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

violations=0

# Function to check files
check_files() {
    local file_pattern=$1
    local description=$2
    
    echo -e "${BLUE}Checking $description...${NC}"
    
    find . -name "$file_pattern" \
        -not -path "./node_modules/*" \
        -not -path "./.next/*" \
        -not -path "./.git/*" \
        -not -path "./backend/__pycache__/*" \
        -type f | while read -r file; do
        
        for pattern_name in "${!SECRET_PATTERNS[@]}"; do
            pattern="${SECRET_PATTERNS[$pattern_name]}"
            
            matches=$(grep -nE "$pattern" "$file" 2>/dev/null)
            if [ -n "$matches" ]; then
                echo -e "${RED}⚠️  $pattern_name found in: $file${NC}"
                echo -e "${YELLOW}$matches${NC}"
                echo ""
                violations=$((violations + 1))
            fi
        done
    done
}

# Check different file types
check_files "*.js" "JavaScript files"
check_files "*.ts" "TypeScript files"  
check_files "*.tsx" "TypeScript React files"
check_files "*.jsx" "JavaScript React files"
check_files "*.py" "Python files"
check_files "*.json" "JSON files"
check_files "*.yml" "YAML files"
check_files "*.yaml" "YAML files"
check_files ".env*" "Environment files"

echo "================================================"
if [ $violations -eq 0 ]; then
    echo -e "${GREEN}✅ No secrets found in the repository!${NC}"
else
    echo -e "${RED}🚨 Found $violations potential security issues!${NC}"
    echo -e "${YELLOW}Please review and remove any hardcoded secrets.${NC}"
fi
echo "================================================"

exit $violations