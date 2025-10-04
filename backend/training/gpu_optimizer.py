#!/usr/bin/env python3
"""
GPU Optimization and CUDA Initialization Script
===============================================

Handles robust GPU initialization for PyTorch applications
with fallback mechanisms and memory management.
"""

import os
import sys
import torch
import subprocess
import logging
from typing import Optional, Dict, Any

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class GPUOptimizer:
    """GPU optimization and CUDA initialization"""
    
    def __init__(self):
        self.cuda_available = False
        self.device = None
        self.gpu_info = {}
        
    def check_nvidia_gpu(self) -> bool:
        """Check if NVIDIA GPU is available via nvidia-smi"""
        try:
            result = subprocess.run(['nvidia-smi'], 
                                 capture_output=True, text=True, timeout=10)
            return result.returncode == 0
        except Exception as e:
            logger.warning(f"nvidia-smi check failed: {e}")
            return False
    
    def get_gpu_info(self) -> Dict[str, Any]:
        """Get detailed GPU information"""
        gpu_info = {
            "nvidia_gpu_available": False,
            "cuda_available": False,
            "device_count": 0,
            "current_device": None,
            "device_name": None,
            "memory_total": 0,
            "memory_allocated": 0,
            "memory_reserved": 0,
            "cuda_version": None,
            "pytorch_cuda_version": None
        }
        
        # Check NVIDIA GPU
        gpu_info["nvidia_gpu_available"] = self.check_nvidia_gpu()
        
        # Check PyTorch CUDA
        gpu_info["cuda_available"] = torch.cuda.is_available()
        gpu_info["pytorch_cuda_version"] = torch.version.cuda
        
        if gpu_info["cuda_available"]:
            try:
                gpu_info["device_count"] = torch.cuda.device_count()
                gpu_info["current_device"] = torch.cuda.current_device()
                gpu_info["device_name"] = torch.cuda.get_device_name(0)
                
                props = torch.cuda.get_device_properties(0)
                gpu_info["memory_total"] = props.total_memory / 1024**3  # GB
                gpu_info["memory_allocated"] = torch.cuda.memory_allocated(0) / 1024**3
                gpu_info["memory_reserved"] = torch.cuda.memory_reserved(0) / 1024**3
                
            except Exception as e:
                logger.error(f"Failed to get CUDA device info: {e}")
        
        return gpu_info
    
    def fix_cuda_environment(self) -> bool:
        """Attempt to fix common CUDA environment issues"""
        logger.info("Attempting to fix CUDA environment...")
        
        try:
            # Clear CUDA cache
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
            
            # Set environment variables
            os.environ['CUDA_VISIBLE_DEVICES'] = '0'
            os.environ['CUDA_LAUNCH_BLOCKING'] = '1'
            
            # Force re-initialization
            if hasattr(torch.cuda, 'init'):
                torch.cuda.init()
            
            # Try manual device setting
            if torch.cuda.is_available():
                torch.cuda.set_device(0)
                return True
                
        except Exception as e:
            logger.error(f"CUDA fix attempt failed: {e}")
        
        return False
    
    def optimize_memory(self):
        """Optimize GPU memory usage"""
        if torch.cuda.is_available():
            try:
                # Clear cache
                torch.cuda.empty_cache()
                
                # Set memory fraction if needed
                torch.cuda.set_per_process_memory_fraction(0.8, device=0)
                
                logger.info("GPU memory optimized")
                
            except Exception as e:
                logger.warning(f"Memory optimization failed: {e}")
    
    def initialize_gpu(self, force_cpu: bool = False) -> str:
        """
        Initialize GPU with robust error handling
        Returns: device string ('cuda' or 'cpu')
        """
        if force_cpu:
            self.device = 'cpu'
            logger.info("Forcing CPU mode")
            return self.device
        
        # Get initial GPU info
        self.gpu_info = self.get_gpu_info()
        
        if not self.gpu_info["nvidia_gpu_available"]:
            logger.warning("No NVIDIA GPU detected")
            self.device = 'cpu'
            return self.device
        
        if not self.gpu_info["cuda_available"]:
            logger.warning("CUDA not available in PyTorch - attempting fix...")
            
            if self.fix_cuda_environment():
                # Re-check after fix
                self.gpu_info = self.get_gpu_info()
                
                if torch.cuda.is_available():
                    logger.info("✅ CUDA fixed successfully!")
                    self.cuda_available = True
                    self.device = 'cuda'
                    self.optimize_memory()
                    return self.device
                else:
                    logger.error("❌ CUDA fix failed - using CPU")
                    self.device = 'cpu'
                    return self.device
            else:
                logger.error("❌ Could not fix CUDA - using CPU")
                self.device = 'cpu'
                return self.device
        else:
            logger.info("✅ CUDA available - using GPU")
            self.cuda_available = True
            self.device = 'cuda'
            self.optimize_memory()
            return self.device
    
    def get_device(self) -> torch.device:
        """Get PyTorch device object"""
        if self.device is None:
            self.initialize_gpu()
        
        return torch.device(self.device)
    
    def print_gpu_status(self):
        """Print detailed GPU status"""
        print("🔍 GPU Status Report:")
        print("=" * 50)
        
        info = self.get_gpu_info()
        
        print(f"NVIDIA GPU Available: {'✅' if info['nvidia_gpu_available'] else '❌'}")
        print(f"PyTorch CUDA Available: {'✅' if info['cuda_available'] else '❌'}")
        print(f"PyTorch CUDA Version: {info['pytorch_cuda_version']}")
        print(f"Device Count: {info['device_count']}")
        
        if info['cuda_available']:
            print(f"Current Device: {info['current_device']}")
            print(f"Device Name: {info['device_name']}")
            print(f"Total Memory: {info['memory_total']:.1f} GB")
            print(f"Allocated Memory: {info['memory_allocated']:.2f} GB")
            print(f"Reserved Memory: {info['memory_reserved']:.2f} GB")
            
            # Check utilization
            try:
                result = subprocess.run(['nvidia-smi', '--query-gpu=utilization.gpu,memory.used,memory.total', 
                                       '--format=csv,noheader,nounits'], 
                                      capture_output=True, text=True, timeout=5)
                if result.returncode == 0:
                    gpu_util, mem_used, mem_total = result.stdout.strip().split(', ')
                    print(f"GPU Utilization: {gpu_util}%")
                    print(f"Memory Used: {mem_used} MB / {mem_total} MB")
            except:
                pass
        
        print("=" * 50)

# Global GPU optimizer instance
_gpu_optimizer = None

def get_gpu_optimizer() -> GPUOptimizer:
    """Get global GPU optimizer instance"""
    global _gpu_optimizer
    if _gpu_optimizer is None:
        _gpu_optimizer = GPUOptimizer()
    return _gpu_optimizer

def setup_optimal_device(force_cpu: bool = False) -> torch.device:
    """Setup optimal device for PyTorch operations"""
    optimizer = get_gpu_optimizer()
    device_str = optimizer.initialize_gpu(force_cpu=force_cpu)
    return torch.device(device_str)

if __name__ == "__main__":
    # Test GPU optimization
    optimizer = GPUOptimizer()
    optimizer.print_gpu_status()
    
    device = optimizer.initialize_gpu()
    print(f"\nInitialized device: {device}")
    
    optimizer.print_gpu_status()