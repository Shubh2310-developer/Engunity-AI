#!/usr/bin/env python3
"""
CUDA Environment Fix Script
===========================

Comprehensive CUDA environment diagnosis and repair.
"""

import os
import sys
import subprocess
import importlib
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def find_cuda_installations():
    """Find CUDA installations on the system"""
    possible_paths = [
        '/usr/local/cuda',
        '/usr/local/cuda-12.4',
        '/usr/local/cuda-12.1', 
        '/usr/local/cuda-11.8',
        '/opt/cuda',
        '/usr/cuda',
        '/snap/cuda-toolkit/current'
    ]
    
    found_paths = []
    for path in possible_paths:
        if os.path.exists(path) and os.path.exists(f"{path}/bin/nvcc"):
            found_paths.append(path)
    
    return found_paths

def get_system_cuda_version():
    """Get system CUDA version from nvcc"""
    try:
        result = subprocess.run(['nvcc', '--version'], capture_output=True, text=True)
        if result.returncode == 0:
            for line in result.stdout.split('\n'):
                if 'release' in line:
                    version = line.split('release')[1].split(',')[0].strip()
                    return version
    except:
        pass
    return None

def fix_cuda_environment():
    """Fix CUDA environment issues"""
    logger.info("🔧 Fixing CUDA environment...")
    
    # 1. Find CUDA installations
    cuda_paths = find_cuda_installations()
    logger.info(f"Found CUDA installations: {cuda_paths}")
    
    if not cuda_paths:
        logger.error("❌ No CUDA installations found!")
        return False
    
    # Use the first available CUDA installation
    cuda_home = cuda_paths[0]
    logger.info(f"Using CUDA_HOME: {cuda_home}")
    
    # 2. Set environment variables
    os.environ['CUDA_HOME'] = cuda_home
    os.environ['CUDA_ROOT'] = cuda_home
    os.environ['PATH'] = f"{cuda_home}/bin:{os.environ.get('PATH', '')}"
    
    # Set library paths
    lib64_path = f"{cuda_home}/lib64"
    lib_path = f"{cuda_home}/lib"
    
    existing_ld_path = os.environ.get('LD_LIBRARY_PATH', '')
    new_ld_paths = []
    
    if os.path.exists(lib64_path):
        new_ld_paths.append(lib64_path)
    if os.path.exists(lib_path):
        new_ld_paths.append(lib_path)
    
    if new_ld_paths:
        if existing_ld_path:
            os.environ['LD_LIBRARY_PATH'] = f"{':'.join(new_ld_paths)}:{existing_ld_path}"
        else:
            os.environ['LD_LIBRARY_PATH'] = ':'.join(new_ld_paths)
    
    logger.info(f"Set LD_LIBRARY_PATH: {os.environ.get('LD_LIBRARY_PATH', 'Not set')}")
    
    # 3. Set CUDA device visibility
    os.environ['CUDA_VISIBLE_DEVICES'] = '0'
    os.environ['CUDA_LAUNCH_BLOCKING'] = '1'
    
    # 4. Clear Python module cache
    if 'torch' in sys.modules:
        logger.info("Reloading PyTorch...")
        # This is tricky - we need to restart Python for clean reload
        logger.warning("⚠️  Environment variables set. Please restart Python/Streamlit for changes to take effect.")
    
    return True

def create_cuda_test():
    """Create a simple CUDA test"""
    test_code = '''
import torch
import os

print("🔍 CUDA Environment Test:")
print("=" * 40)
print(f"PyTorch version: {torch.__version__}")
print(f"CUDA compiled version: {torch.version.cuda}")
print(f"CUDA available: {torch.cuda.is_available()}")

if torch.cuda.is_available():
    print(f"Device count: {torch.cuda.device_count()}")
    print(f"Current device: {torch.cuda.current_device()}")
    print(f"Device name: {torch.cuda.get_device_name(0)}")
    print(f"Device capability: {torch.cuda.get_device_capability(0)}")
else:
    print("❌ CUDA not available")

print("\\nEnvironment variables:")
for var in ['CUDA_HOME', 'CUDA_ROOT', 'LD_LIBRARY_PATH', 'PATH']:
    value = os.environ.get(var, 'Not set')
    if len(value) > 100:
        value = value[:100] + "..."
    print(f"{var}: {value}")
'''
    
    with open('/tmp/cuda_test.py', 'w') as f:
        f.write(test_code)
    
    logger.info("Created CUDA test script at /tmp/cuda_test.py")
    return '/tmp/cuda_test.py'

def main():
    print("🚀 CUDA Environment Fix Script")
    print("=" * 50)
    
    # 1. Diagnose current state
    system_cuda = get_system_cuda_version()
    print(f"System CUDA version: {system_cuda}")
    
    # 2. Check current PyTorch state
    try:
        import torch
        print(f"PyTorch version: {torch.__version__}")
        print(f"PyTorch CUDA version: {torch.version.cuda}")
        print(f"CUDA available: {torch.cuda.is_available()}")
    except ImportError:
        print("❌ PyTorch not installed")
    
    # 3. Apply fixes
    if fix_cuda_environment():
        print("✅ Environment variables updated")
        
        # Create test script
        test_script = create_cuda_test()
        print(f"📝 Test script created: {test_script}")
        
        print("\n🔄 To apply changes:")
        print("1. Restart your Python session/Streamlit")
        print("2. Or run: python /tmp/cuda_test.py")
        print("\n💡 If issues persist, consider reinstalling PyTorch:")
        print("pip uninstall torch torchvision torchaudio")
        print("pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu124")
    else:
        print("❌ Could not fix CUDA environment")

if __name__ == "__main__":
    main()