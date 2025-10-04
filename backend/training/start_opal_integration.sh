#!/bin/bash

# Opal AI Integration Quick Start Script
# =====================================
# 
# This script helps you get started with Opal AI integration quickly
# by setting up dependencies and starting the agent service.

set -e  # Exit on any error

echo "🤖 Engunity AI - Opal Integration Setup"
echo "======================================="

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check Python version
check_python() {
    echo "🐍 Checking Python version..."
    
    if command -v python3 &> /dev/null; then
        PYTHON_VERSION=$(python3 -c 'import sys; print(".".join(map(str, sys.version_info[:2])))')
        print_status "Python $PYTHON_VERSION found"
        
        # Check if version is 3.8 or higher
        if python3 -c 'import sys; exit(0 if sys.version_info >= (3, 8) else 1)'; then
            print_status "Python version is compatible"
        else
            print_error "Python 3.8+ required. Current version: $PYTHON_VERSION"
            exit 1
        fi
    else
        print_error "Python 3 not found. Please install Python 3.8 or higher."
        exit 1
    fi
}

# Install dependencies
install_dependencies() {
    echo ""
    echo "📦 Installing dependencies..."
    
    if [ -f "opal_requirements.txt" ]; then
        print_status "Installing from opal_requirements.txt"
        pip3 install --user -r opal_requirements.txt
    else
        print_warning "opal_requirements.txt not found. Installing basic requirements..."
        pip3 install --user fastapi uvicorn pydantic
    fi
    
    print_status "Dependencies installed"
}

# Check if service is already running
check_service() {
    echo ""
    echo "🔍 Checking if service is already running..."
    
    if curl -s http://localhost:8001/health > /dev/null 2>&1; then
        print_warning "Service is already running on port 8001"
        echo "Visit http://localhost:8001/docs to see the API documentation"
        return 0
    else
        print_status "Port 8001 is available"
        return 1
    fi
}

# Start the service
start_service() {
    echo ""
    echo "🚀 Starting Opal AI Agent Service..."
    
    if [ ! -f "opal_agent_wrapper.py" ]; then
        print_error "opal_agent_wrapper.py not found in current directory"
        echo "Please run this script from /home/ghost/engunity-ai/backend/training/"
        exit 1
    fi
    
    print_status "Starting service on http://localhost:8001"
    echo ""
    echo "📊 API Documentation: http://localhost:8001/docs"
    echo "🤖 Available Agents: http://localhost:8001/agents"
    echo "⚡ Health Check: http://localhost:8001/health"
    echo ""
    echo "Press Ctrl+C to stop the service"
    echo ""
    
    # Start the service
    python3 opal_agent_wrapper.py
}

# Test the service
test_service() {
    echo ""
    echo "🧪 Testing the service..."
    
    if [ -f "test_opal_integration.py" ]; then
        python3 test_opal_integration.py
    else
        print_warning "Test script not found. Manual testing required."
        echo "Visit http://localhost:8001/docs to test the API manually"
    fi
}

# Main execution
main() {
    echo "Starting Opal AI integration setup..."
    echo ""
    
    # Check current directory
    if [ ! -f "opal_agent_wrapper.py" ]; then
        print_error "Please run this script from the training directory:"
        echo "cd /home/ghost/engunity-ai/backend/training/"
        echo "./start_opal_integration.sh"
        exit 1
    fi
    
    # Setup steps
    check_python
    
    # Ask user what they want to do
    echo ""
    echo "What would you like to do?"
    echo "1. Install dependencies and start service"
    echo "2. Just start service (dependencies already installed)"
    echo "3. Test existing service"
    echo "4. Full setup + testing"
    echo ""
    read -p "Enter choice (1-4): " choice
    
    case $choice in
        1)
            install_dependencies
            if ! check_service; then
                start_service
            fi
            ;;
        2)
            if ! check_service; then
                start_service
            fi
            ;;
        3)
            test_service
            ;;
        4)
            install_dependencies
            if ! check_service; then
                echo "Starting service in background for testing..."
                python3 opal_agent_wrapper.py &
                SERVICE_PID=$!
                sleep 5  # Wait for service to start
                test_service
                kill $SERVICE_PID 2>/dev/null || true
                echo ""
                echo "Starting service in foreground..."
                start_service
            else
                test_service
            fi
            ;;
        *)
            print_error "Invalid choice. Please run the script again."
            exit 1
            ;;
    esac
}

# Run main function
main "$@"