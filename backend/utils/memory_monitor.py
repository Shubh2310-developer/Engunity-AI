"""
Memory monitoring and optimization utilities
"""
import psutil
import gc
import logging
from functools import wraps
import time

logger = logging.getLogger(__name__)

def get_memory_usage():
    """Get current memory usage in MB"""
    process = psutil.Process()
    mem_info = process.memory_info()
    return {
        'rss_mb': mem_info.rss / 1024 / 1024,
        'vms_mb': mem_info.vms / 1024 / 1024,
        'percent': process.memory_percent()
    }

def log_memory_usage(prefix=""):
    """Log current memory usage"""
    usage = get_memory_usage()
    logger.info(f"{prefix} Memory: RSS={usage['rss_mb']:.2f}MB, VMS={usage['vms_mb']:.2f}MB, {usage['percent']:.1f}%")

def memory_limit_mb(max_memory_mb=800):
    """Decorator to enforce memory limits on functions"""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            before = get_memory_usage()
            result = func(*args, **kwargs)
            after = get_memory_usage()

            if after['rss_mb'] > max_memory_mb:
                logger.warning(f"Memory limit exceeded: {after['rss_mb']:.2f}MB > {max_memory_mb}MB")
                gc.collect()

            return result
        return wrapper
    return decorator

def periodic_gc(interval_seconds=300):
    """Run garbage collection periodically"""
    import threading

    def gc_worker():
        while True:
            time.sleep(interval_seconds)
            before = get_memory_usage()
            collected = gc.collect()
            after = get_memory_usage()
            freed_mb = before['rss_mb'] - after['rss_mb']
            logger.info(f"GC: Collected {collected} objects, freed {freed_mb:.2f}MB")

    thread = threading.Thread(target=gc_worker, daemon=True)
    thread.start()
    logger.info(f"Started periodic GC thread (interval={interval_seconds}s)")

def optimize_gc():
    """Optimize garbage collection settings"""
    gc.set_threshold(700, 10, 10)  # More aggressive GC
    gc.enable()
    logger.info("Optimized GC settings: threshold=(700, 10, 10)")

class MemoryMonitor:
    """Context manager for monitoring memory usage"""

    def __init__(self, operation_name="Operation"):
        self.operation_name = operation_name
        self.start_memory = None
        self.start_time = None

    def __enter__(self):
        self.start_memory = get_memory_usage()
        self.start_time = time.time()
        logger.info(f"{self.operation_name} started - Memory: {self.start_memory['rss_mb']:.2f}MB")
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        end_memory = get_memory_usage()
        duration = time.time() - self.start_time
        memory_delta = end_memory['rss_mb'] - self.start_memory['rss_mb']

        logger.info(
            f"{self.operation_name} completed in {duration:.2f}s - "
            f"Memory: {end_memory['rss_mb']:.2f}MB (Δ {memory_delta:+.2f}MB)"
        )

        # Trigger GC if memory increased significantly
        if memory_delta > 50:  # More than 50MB increase
            logger.warning(f"Significant memory increase detected, running GC...")
            gc.collect()

# Initialize on import
optimize_gc()
