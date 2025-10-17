"""
Service Manager API
Handles lazy loading of backend services on-demand
"""
import subprocess
import psutil
import time
import requests
from typing import Dict, Optional, List
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import os
import signal

router = APIRouter(prefix="/api/services", tags=["services"])

# Service Configuration
SERVICE_CONFIG = {
    "hybrid_rag": {
        "name": "Hybrid RAG v3",
        "port": 8002,
        "script": "servers/hybrid_rag_v3_server.py",
        "health_endpoint": "/health",
        "startup_time": 10,
        "python_path": "/home/ghost/anaconda3/envs/engunity/bin/python",
        "log_file": "hybrid_rag_v3_server.log",
        "required_for": ["documents", "document_qa"],
        "memory_mb": 800
    },
    "citation_classifier": {
        "name": "Citation Classifier",
        "port": 8003,
        "script": "servers/citation_classification_server.py",
        "health_endpoint": "/health",
        "startup_time": 15,
        "python_path": "/home/ghost/anaconda3/envs/engunity/bin/python",
        "log_file": "citation_classification_server.log",
        "required_for": ["research"],
        "memory_mb": 600
    },
    "agentic_rag": {
        "name": "Agentic RAG",
        "port": 8001,
        "script": "agentic_rag_server.py",
        "health_endpoint": "/health",
        "startup_time": 12,
        "python_path": "/home/ghost/anaconda3/envs/engunity/bin/python",
        "log_file": "agentic_rag_server.log",
        "required_for": ["advanced_chat", "chatandcode"],
        "memory_mb": 700
    },
    "code_executor": {
        "name": "Code Executor",
        "port": 4001,
        "script": None,  # npm run dev
        "health_endpoint": "/health",
        "startup_time": 8,
        "command": "npm run dev",
        "working_dir": "../code-executor",
        "log_file": "../code-executor/code-executor.log",
        "required_for": ["editor"],
        "memory_mb": 400
    }
}

# Track running services
running_services: Dict[str, dict] = {}


class ServiceStatus(BaseModel):
    service_id: str
    name: str
    status: str  # "running", "stopped", "starting", "error"
    port: Optional[int]
    pid: Optional[int]
    uptime: Optional[int]
    memory_mb: Optional[int]


class ServiceStartRequest(BaseModel):
    feature: str  # e.g., "documents", "research", "editor"


def is_port_in_use(port: int) -> bool:
    """Check if a port is already in use"""
    for conn in psutil.net_connections():
        if conn.laddr.port == port and conn.status == 'LISTEN':
            return True
    return False


def get_process_by_port(port: int) -> Optional[psutil.Process]:
    """Get process using a specific port"""
    for conn in psutil.net_connections():
        if conn.laddr.port == port and conn.status == 'LISTEN':
            try:
                return psutil.Process(conn.pid)
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                return None
    return None


def check_service_health(port: int, endpoint: str) -> bool:
    """Check if service is healthy"""
    try:
        response = requests.get(f"http://localhost:{port}{endpoint}", timeout=2)
        return response.status_code == 200
    except:
        return False


def start_python_service(service_id: str, config: dict) -> dict:
    """Start a Python-based service"""
    script_path = os.path.join(os.path.dirname(__file__), config["script"])
    log_path = os.path.join(os.path.dirname(__file__), config["log_file"])

    # Open log file
    log_file = open(log_path, "a")

    # Start process
    process = subprocess.Popen(
        [config["python_path"], "-u", script_path],
        stdout=log_file,
        stderr=subprocess.STDOUT,
        env={**os.environ, "PYTHONUNBUFFERED": "1"},
        preexec_fn=os.setsid  # Create new process group
    )

    return {
        "process": process,
        "pid": process.pid,
        "log_file": log_file,
        "started_at": time.time()
    }


def start_node_service(service_id: str, config: dict) -> dict:
    """Start a Node.js-based service"""
    working_dir = os.path.join(os.path.dirname(__file__), config["working_dir"])
    log_path = os.path.join(os.path.dirname(__file__), config["log_file"])

    # Open log file
    log_file = open(log_path, "a")

    # Start process
    process = subprocess.Popen(
        config["command"].split(),
        stdout=log_file,
        stderr=subprocess.STDOUT,
        cwd=working_dir,
        env={**os.environ, "NODE_OPTIONS": "--max-old-space-size=512"},
        preexec_fn=os.setsid
    )

    return {
        "process": process,
        "pid": process.pid,
        "log_file": log_file,
        "started_at": time.time()
    }


@router.get("/status", response_model=List[ServiceStatus])
async def get_services_status():
    """Get status of all services"""
    statuses = []

    for service_id, config in SERVICE_CONFIG.items():
        port = config["port"]
        process = get_process_by_port(port)

        if process:
            try:
                memory_mb = process.memory_info().rss / 1024 / 1024
                uptime = int(time.time() - process.create_time())
                status = "running" if check_service_health(port, config["health_endpoint"]) else "starting"
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                memory_mb = None
                uptime = None
                status = "error"
        else:
            memory_mb = None
            uptime = None
            status = "stopped"

        statuses.append(ServiceStatus(
            service_id=service_id,
            name=config["name"],
            status=status,
            port=port if process else None,
            pid=process.pid if process else None,
            uptime=uptime,
            memory_mb=int(memory_mb) if memory_mb else None
        ))

    return statuses


@router.post("/start/{service_id}")
async def start_service(service_id: str):
    """Start a specific service"""
    if service_id not in SERVICE_CONFIG:
        raise HTTPException(status_code=404, detail=f"Service '{service_id}' not found")

    config = SERVICE_CONFIG[service_id]
    port = config["port"]

    # Check if already running
    if is_port_in_use(port):
        if check_service_health(port, config["health_endpoint"]):
            return {"status": "already_running", "service": config["name"], "port": port}
        else:
            return {"status": "starting", "service": config["name"], "port": port, "message": "Service is starting up"}

    # Check available memory
    available_memory = psutil.virtual_memory().available / 1024 / 1024
    if available_memory < config["memory_mb"] + 500:  # 500MB buffer
        raise HTTPException(
            status_code=503,
            detail=f"Insufficient memory. Need {config['memory_mb']}MB, only {int(available_memory)}MB available"
        )

    try:
        # Start service based on type
        if "script" in config and config["script"]:
            service_info = start_python_service(service_id, config)
        else:
            service_info = start_node_service(service_id, config)

        running_services[service_id] = service_info

        # Wait briefly and check if started
        time.sleep(2)

        return {
            "status": "started",
            "service": config["name"],
            "port": port,
            "pid": service_info["pid"],
            "estimated_ready_time": config["startup_time"],
            "message": f"Service started. Will be ready in ~{config['startup_time']}s"
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start service: {str(e)}")


@router.post("/stop/{service_id}")
async def stop_service(service_id: str):
    """Stop a specific service"""
    if service_id not in SERVICE_CONFIG:
        raise HTTPException(status_code=404, detail=f"Service '{service_id}' not found")

    config = SERVICE_CONFIG[service_id]
    process = get_process_by_port(config["port"])

    if not process:
        return {"status": "not_running", "service": config["name"]}

    try:
        # Terminate process group
        os.killpg(os.getpgid(process.pid), signal.SIGTERM)

        # Wait for graceful shutdown
        time.sleep(2)

        # Force kill if still running
        if process.is_running():
            os.killpg(os.getpgid(process.pid), signal.SIGKILL)

        # Clean up
        if service_id in running_services:
            running_services[service_id]["log_file"].close()
            del running_services[service_id]

        return {"status": "stopped", "service": config["name"]}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to stop service: {str(e)}")


@router.post("/start-for-feature")
async def start_services_for_feature(request: ServiceStartRequest):
    """Start all services required for a specific feature"""
    feature = request.feature
    services_to_start = []

    # Find services required for this feature
    for service_id, config in SERVICE_CONFIG.items():
        if feature in config["required_for"]:
            services_to_start.append(service_id)

    if not services_to_start:
        return {
            "feature": feature,
            "services_started": [],
            "message": "No additional services required"
        }

    results = []
    for service_id in services_to_start:
        try:
            result = await start_service(service_id)
            results.append({"service_id": service_id, **result})
        except HTTPException as e:
            results.append({
                "service_id": service_id,
                "status": "error",
                "error": e.detail
            })

    return {
        "feature": feature,
        "services": results
    }


@router.get("/required-for/{feature}")
async def get_required_services(feature: str):
    """Get list of services required for a feature"""
    required = []

    for service_id, config in SERVICE_CONFIG.items():
        if feature in config["required_for"]:
            port = config["port"]
            is_running = is_port_in_use(port)
            is_healthy = check_service_health(port, config["health_endpoint"]) if is_running else False

            required.append({
                "service_id": service_id,
                "name": config["name"],
                "port": port,
                "is_running": is_running,
                "is_healthy": is_healthy,
                "estimated_startup_time": config["startup_time"]
            })

    return {
        "feature": feature,
        "required_services": required
    }
