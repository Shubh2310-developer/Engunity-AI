#!/usr/bin/env python3
"""
Comprehensive Test Script for Reorganized Engunity AI Project
Verifies that all components work together after reorganization
"""

import os
import sys
import subprocess
import json
from pathlib import Path

def print_status(message, status="INFO"):
    colors = {
        "INFO": "\033[94m",
        "SUCCESS": "\033[92m",
        "ERROR": "\033[91m",
        "WARNING": "\033[93m"
    }
    print(f"{colors.get(status, '')}{status}: {message}\033[0m")

def test_directory_structure():
    """Test that the new directory structure exists"""
    print_status("Testing directory structure...")

    required_dirs = [
        "data/samples",
        "data/test_data",
        "data/ml_samples",
        "backend/servers",
        "scripts/development",
        "scripts/utilities",
        "config/database"
    ]

    missing_dirs = []
    for dir_path in required_dirs:
        if not os.path.exists(dir_path):
            missing_dirs.append(dir_path)

    if missing_dirs:
        print_status(f"Missing directories: {missing_dirs}", "ERROR")
        return False
    else:
        print_status("All required directories exist", "SUCCESS")
        return True

def test_data_files():
    """Test that data files were moved correctly"""
    print_status("Testing data file organization...")

    expected_files = {
        "data/samples/sales_data_sample.csv": "Sample sales data",
        "data/test_data/test_upload.csv": "Test upload data",
        "data/ml_samples/sample_ml_document.txt": "ML sample document"
    }

    missing_files = []
    for file_path, description in expected_files.items():
        if not os.path.exists(file_path):
            missing_files.append(f"{file_path} ({description})")

    if missing_files:
        print_status(f"Missing files: {missing_files}", "ERROR")
        return False
    else:
        print_status("All data files properly organized", "SUCCESS")
        return True

def test_backend_imports():
    """Test backend Python imports"""
    print_status("Testing backend imports...")

    try:
        # Add backend to path
        backend_path = Path("backend").absolute()
        if str(backend_path) not in sys.path:
            sys.path.insert(0, str(backend_path))

        # Test main app import
        from app.main import app
        print_status("Backend main app imports successfully", "SUCCESS")
        return True

    except ImportError as e:
        print_status(f"Backend import error: {e}", "ERROR")
        return False

def test_frontend_typescript():
    """Test frontend TypeScript compilation"""
    print_status("Testing frontend TypeScript...")

    try:
        os.chdir("frontend")
        result = subprocess.run(
            ["npm", "run", "type-check"],
            capture_output=True,
            text=True,
            timeout=60
        )
        os.chdir("..")

        if result.returncode == 0:
            print_status("Frontend TypeScript compiles successfully", "SUCCESS")
            return True
        else:
            print_status(f"TypeScript errors: {result.stdout}", "ERROR")
            return False

    except subprocess.TimeoutExpired:
        print_status("TypeScript check timed out", "ERROR")
        return False
    except Exception as e:
        print_status(f"TypeScript test failed: {e}", "ERROR")
        return False

def test_server_files():
    """Test that server files were moved correctly"""
    print_status("Testing server file organization...")

    server_files = [
        "backend/servers/minimal_server.py",
        "backend/servers/fake_rag_server.py",
        "backend/servers/enhanced_fake_rag_server.py"
    ]

    missing_servers = []
    for server_file in server_files:
        if not os.path.exists(server_file):
            missing_servers.append(server_file)

    if missing_servers:
        print_status(f"Missing server files: {missing_servers}", "ERROR")
        return False
    else:
        print_status("All server files properly organized", "SUCCESS")
        return True

def test_script_organization():
    """Test that scripts were moved correctly"""
    print_status("Testing script organization...")

    script_files = [
        "scripts/development/create_simple_test.py",
        "scripts/development/data_analysis_server.py",
        "scripts/utilities/demo_enhanced_rag_improvements.py"
    ]

    missing_scripts = []
    for script_file in script_files:
        if not os.path.exists(script_file):
            missing_scripts.append(script_file)

    if missing_scripts:
        print_status(f"Missing script files: {missing_scripts}", "ERROR")
        return False
    else:
        print_status("All script files properly organized", "SUCCESS")
        return True

def generate_test_report():
    """Generate a comprehensive test report"""
    print_status("Generating test report...")

    tests = [
        ("Directory Structure", test_directory_structure),
        ("Data Files", test_data_files),
        ("Backend Imports", test_backend_imports),
        ("Frontend TypeScript", test_frontend_typescript),
        ("Server Files", test_server_files),
        ("Script Organization", test_script_organization)
    ]

    results = {}
    total_tests = len(tests)
    passed_tests = 0

    print_status("Running comprehensive project tests...", "INFO")
    print("=" * 60)

    for test_name, test_func in tests:
        print(f"\nRunning: {test_name}")
        try:
            result = test_func()
            results[test_name] = "PASSED" if result else "FAILED"
            if result:
                passed_tests += 1
        except Exception as e:
            results[test_name] = f"ERROR: {e}"
            print_status(f"{test_name} failed with error: {e}", "ERROR")

    # Generate report
    print("\n" + "=" * 60)
    print_status("PROJECT REORGANIZATION TEST RESULTS", "INFO")
    print("=" * 60)

    for test_name, result in results.items():
        status = "SUCCESS" if result == "PASSED" else "ERROR"
        print_status(f"{test_name}: {result}", status)

    print(f"\nOverall Results: {passed_tests}/{total_tests} tests passed")

    if passed_tests == total_tests:
        print_status("🎉 ALL TESTS PASSED! Project reorganization successful!", "SUCCESS")
    else:
        print_status(f"❌ {total_tests - passed_tests} tests failed. See errors above.", "ERROR")

    return passed_tests == total_tests

if __name__ == "__main__":
    # Change to project root
    project_root = Path(__file__).parent
    os.chdir(project_root)

    success = generate_test_report()
    sys.exit(0 if success else 1)