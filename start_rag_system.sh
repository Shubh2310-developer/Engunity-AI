#!/bin/bash

# RAG System Startup Script
# =========================
# Complete startup script for the RAG-powered document analysis system

set -e

echo "🚀 Starting RAG-Powered Document Analysis System"
echo "================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

# Check if required directories exist
check_directories() {
    print_info "Checking directory structure..."
    
    if [ ! -d "backend" ]; then
        print_error "Backend directory not found!"
        exit 1
    fi
    
    if [ ! -d "frontend" ]; then
        print_error "Frontend directory not found!"
        exit 1
    fi
    
    print_status "Directory structure verified"
}

# Check Python environment
check_python() {
    print_info "Checking Python environment..."
    
    if ! command -v python3 &> /dev/null; then
        print_error "Python 3 not found! Please install Python 3.8+"
        exit 1
    fi
    
    PYTHON_VERSION=$(python3 -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')")
    print_status "Python $PYTHON_VERSION found"
    
    # Check if virtual environment exists
    if [ ! -d "backend/venv" ]; then
        print_warning "Virtual environment not found, creating..."
        cd backend
        python3 -m venv venv
        source venv/bin/activate
        pip install --upgrade pip
        cd ..
        print_status "Virtual environment created"
    else
        print_status "Virtual environment found"
    fi
}

# Install backend dependencies
install_backend_deps() {
    print_info "Installing backend dependencies..."
    
    cd backend
    source venv/bin/activate
    
    if [ -f "requirements_rag.txt" ]; then
        pip install -r requirements_rag.txt
        print_status "RAG requirements installed"
    else
        print_error "requirements_rag.txt not found!"
        cd ..
        exit 1
    fi
    
    cd ..
}

# Check Node.js and install frontend dependencies
install_frontend_deps() {
    print_info "Checking Node.js and installing frontend dependencies..."
    
    if ! command -v node &> /dev/null; then
        print_error "Node.js not found! Please install Node.js 18+"
        exit 1
    fi
    
    NODE_VERSION=$(node -v)
    print_status "Node.js $NODE_VERSION found"
    
    cd frontend
    
    if [ ! -d "node_modules" ]; then
        print_info "Installing frontend dependencies..."
        npm install
        print_status "Frontend dependencies installed"
    else
        print_status "Frontend dependencies already installed"
    fi
    
    cd ..
}

# Setup RAG system
setup_rag() {
    print_info "Setting up RAG system..."
    
    cd backend
    source venv/bin/activate
    
    # Run RAG setup script
    if [ -f "setup_rag_system.py" ]; then
        python setup_rag_system.py --check-requirements
        print_status "RAG system requirements checked"
        
        # Initialize models (this might take time)
        print_info "Initializing RAG models (this may take a few minutes)..."
        python setup_rag_system.py --setup-models
        print_status "RAG models initialized"
    else
        print_error "setup_rag_system.py not found!"
        cd ..
        exit 1
    fi
    
    cd ..
}

# Create environment files
setup_env() {
    print_info "Setting up environment files..."
    
    # Backend environment
    if [ ! -f "backend/.env" ]; then
        cat > backend/.env << EOF
# RAG System Environment
PYTHONPATH=\${PYTHONPATH}:\$(pwd)
RAG_MODEL_PATH=./models
RAG_DATA_PATH=./data
RAG_LOG_LEVEL=INFO
EOF
        print_status "Backend .env created"
    fi
    
    # Frontend environment
    if [ ! -f "frontend/.env.local" ]; then
        if [ -f "frontend/.env.local.example" ]; then
            cp frontend/.env.local.example frontend/.env.local
            print_warning "Frontend .env.local created from example - please update with your values"
        else
            cat > frontend/.env.local << EOF
# RAG Integration Environment
RAG_API_BASE=http://localhost:8000
NEXT_PUBLIC_RAG_DEBUG=false
EOF
            print_status "Frontend .env.local created"
        fi
    fi
}

# Start backend server
start_backend() {
    print_info "Starting RAG backend server..."
    
    cd backend
    source venv/bin/activate
    
    # Start FastAPI server in background
    if [ -f "app/main.py" ]; then
        nohup uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload > backend.log 2>&1 &
        BACKEND_PID=$!
        echo $BACKEND_PID > backend.pid
        print_status "Backend server started (PID: $BACKEND_PID)"
    else
        print_error "Backend main.py not found!"
        cd ..
        exit 1
    fi
    
    cd ..
    
    # Wait for backend to start
    print_info "Waiting for backend to start..."
    sleep 5
    
    # Check if backend is running
    if curl -s http://localhost:8000/health > /dev/null 2>&1; then
        print_status "Backend health check passed"
    else
        print_warning "Backend health check failed - server may still be starting"
    fi
}

# Start frontend server
start_frontend() {
    print_info "Starting frontend development server..."
    
    cd frontend
    
    # Start Next.js in background
    nohup npm run dev > frontend.log 2>&1 &
    FRONTEND_PID=$!
    echo $FRONTEND_PID > frontend.pid
    print_status "Frontend server started (PID: $FRONTEND_PID)"
    
    cd ..
    
    # Wait for frontend to start
    print_info "Waiting for frontend to start..."
    sleep 10
}

# Stop servers
stop_servers() {
    print_info "Stopping servers..."
    
    if [ -f "backend/backend.pid" ]; then
        BACKEND_PID=$(cat backend/backend.pid)
        if kill -0 $BACKEND_PID 2>/dev/null; then
            kill $BACKEND_PID
            print_status "Backend server stopped"
        fi
        rm -f backend/backend.pid
    fi
    
    if [ -f "frontend/frontend.pid" ]; then
        FRONTEND_PID=$(cat frontend/frontend.pid)
        if kill -0 $FRONTEND_PID 2>/dev/null; then
            kill $FRONTEND_PID
            print_status "Frontend server stopped"
        fi
        rm -f frontend/frontend.pid
    fi
}

# Show system status
show_status() {
    echo ""
    echo -e "${BLUE}=== RAG System Status ===${NC}"
    
    # Check backend
    if curl -s http://localhost:8000/health > /dev/null 2>&1; then
        print_status "Backend: Running (http://localhost:8000)"
    else
        print_error "Backend: Not running"
    fi
    
    # Check frontend
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        print_status "Frontend: Running (http://localhost:3000)"
    else
        print_error "Frontend: Not running"
    fi
    
    echo ""
    echo -e "${GREEN}🎉 RAG-Powered Document Analysis System is ready!${NC}"
    echo ""
    echo "📚 Access your application at: http://localhost:3000"
    echo "🔧 Backend API available at: http://localhost:8000"
    echo "📊 API docs available at: http://localhost:8000/docs"
    echo ""
    echo "🧠 Features available:"
    echo "  • BGE-small semantic document retrieval"
    echo "  • Phi-2 intelligent response generation"
    echo "  • Multi-format document processing"
    echo "  • Structured Q&A with source attribution"
    echo ""
    echo "📝 Logs:"
    echo "  • Backend: backend/backend.log"
    echo "  • Frontend: frontend/frontend.log"
    echo ""
    echo "⏹ To stop the system: $0 stop"
}

# Main script logic
case "${1:-start}" in
    "start")
        check_directories
        check_python
        install_backend_deps
        install_frontend_deps
        setup_env
        setup_rag
        start_backend
        start_frontend
        show_status
        ;;
    "stop")
        stop_servers
        print_status "RAG system stopped"
        ;;
    "restart")
        stop_servers
        sleep 2
        $0 start
        ;;
    "status")
        show_status
        ;;
    "setup-only")
        check_directories
        check_python
        install_backend_deps
        install_frontend_deps
        setup_env
        setup_rag
        print_status "RAG system setup completed"
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status|setup-only}"
        echo ""
        echo "Commands:"
        echo "  start       - Start the complete RAG system"
        echo "  stop        - Stop all running services"
        echo "  restart     - Restart all services"
        echo "  status      - Show system status"
        echo "  setup-only  - Only setup dependencies and models"
        exit 1
        ;;
esac