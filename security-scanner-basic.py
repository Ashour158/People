#!/usr/bin/env python3
"""
Basic Security Scanner for HR Management System
Scans for vulnerabilities and validates security configuration
"""
import json
import subprocess
import sys
import os
from datetime import datetime
from typing import Dict, List, Any

class BasicSecurityScanner:
    """Basic security scanner for HRMS"""
    
    def __init__(self):
        self.results = {
            "timestamp": datetime.now().isoformat(),
            "scanner_version": "1.0.0",
            "tests": {}
        }
    
    def run_all_tests(self):
        """Run all security tests"""
        print("Starting Basic Security Scanner")
        print("=" * 60)
        
        # 1. Dependency Vulnerability Scan
        self.test_dependency_vulnerabilities()
        
        # 2. Security Configuration Check
        self.test_security_configuration()
        
        # 3. Environment Security Check
        self.test_environment_security()
        
        # Generate report
        self.generate_security_report()
    
    def test_dependency_vulnerabilities(self):
        """Test for dependency vulnerabilities"""
        print("\nTesting Dependency Vulnerabilities...")
        
        # Test frontend dependencies
        try:
            result = subprocess.run(
                ["npm", "audit", "--json"], 
                cwd="frontend", 
                capture_output=True, 
                text=True,
                timeout=30
            )
            
            if result.returncode == 0:
                try:
                    audit_data = json.loads(result.stdout)
                    vulnerabilities = audit_data.get("vulnerabilities", {})
                    
                    self.results["tests"]["frontend_dependencies"] = {
                        "status": "completed",
                        "vulnerabilities": len(vulnerabilities),
                        "critical": sum(1 for v in vulnerabilities.values() if v.get("severity") == "critical"),
                        "high": sum(1 for v in vulnerabilities.values() if v.get("severity") == "high"),
                        "moderate": sum(1 for v in vulnerabilities.values() if v.get("severity") == "moderate"),
                        "low": sum(1 for v in vulnerabilities.values() if v.get("severity") == "low"),
                    }
                    
                    if vulnerabilities:
                        print(f"WARNING: Found {len(vulnerabilities)} frontend vulnerabilities")
                        for vuln_id, vuln_data in list(vulnerabilities.items())[:3]:  # Show first 3
                            print(f"    - {vuln_id}: {vuln_data.get('severity', 'unknown')}")
                    else:
                        print("SUCCESS: No frontend vulnerabilities found")
                        
                except json.JSONDecodeError:
                    print("WARNING: Could not parse npm audit output")
                    self.results["tests"]["frontend_dependencies"] = {"status": "error", "error": "JSON parse error"}
            else:
                print("ERROR: Failed to run npm audit")
                self.results["tests"]["frontend_dependencies"] = {"status": "error", "error": "npm audit failed"}
                
        except subprocess.TimeoutExpired:
            print("TIMEOUT: npm audit timed out")
            self.results["tests"]["frontend_dependencies"] = {"status": "timeout"}
        except Exception as e:
            print(f"ERROR: Error testing frontend dependencies: {e}")
            self.results["tests"]["frontend_dependencies"] = {"status": "error", "error": str(e)}
        
        # Test Python dependencies
        try:
            result = subprocess.run(
                ["safety", "check", "--json"], 
                cwd="python_backend", 
                capture_output=True, 
                text=True,
                timeout=30
            )
            
            if result.returncode == 0:
                try:
                    safety_data = json.loads(result.stdout)
                    vulnerabilities = safety_data.get("vulnerabilities", [])
                    
                    self.results["tests"]["python_dependencies"] = {
                        "status": "completed",
                        "vulnerabilities": len(vulnerabilities),
                        "vulnerabilities_list": vulnerabilities
                    }
                    
                    if vulnerabilities:
                        print(f"WARNING: Found {len(vulnerabilities)} Python vulnerabilities")
                        for vuln in vulnerabilities[:3]:  # Show first 3
                            print(f"    - {vuln.get('package_name', 'unknown')}: {vuln.get('vulnerability_id', 'unknown')}")
                    else:
                        print("SUCCESS: No Python vulnerabilities found")
                        
                except json.JSONDecodeError:
                    print("WARNING: Could not parse safety output")
                    self.results["tests"]["python_dependencies"] = {"status": "error", "error": "JSON parse error"}
            else:
                print("WARNING: Python dependency scan completed with warnings")
                self.results["tests"]["python_dependencies"] = {"status": "warning", "output": result.stdout}
                
        except subprocess.TimeoutExpired:
            print("TIMEOUT: safety check timed out")
            self.results["tests"]["python_dependencies"] = {"status": "timeout"}
        except Exception as e:
            print(f"ERROR: Error testing Python dependencies: {e}")
            self.results["tests"]["python_dependencies"] = {"status": "error", "error": str(e)}
    
    def test_security_configuration(self):
        """Test security configuration files"""
        print("\nTesting Security Configuration...")
        
        config_files = [
            "python_backend/app/core/config.py",
            "python_backend/app/middleware/security.py",
            "python_backend/app/middleware/auth.py",
            "frontend/nginx.conf",
            "docker-compose.yml"
        ]
        
        config_results = {}
        
        for config_file in config_files:
            if os.path.exists(config_file):
                try:
                    with open(config_file, 'r', encoding='utf-8') as f:
                        content = f.read()
                    
                    # Check for security-related configurations
                    security_checks = {
                        "has_secret_key": "SECRET_KEY" in content,
                        "has_jwt_config": "JWT_SECRET_KEY" in content,
                        "has_cors_config": "CORS_ORIGINS" in content,
                        "has_rate_limiting": "RateLimit" in content,
                        "has_security_headers": "SecurityHeaders" in content,
                        "has_input_validation": "InputValidation" in content,
                        "has_csrf_protection": "CSRF" in content,
                        "has_encryption": "encrypt" in content.lower(),
                        "has_authentication": "AuthMiddleware" in content,
                        "has_authorization": "require_role" in content
                    }
                    
                    config_results[config_file] = {
                        "exists": True,
                        "security_checks": security_checks,
                        "security_score": sum(security_checks.values()) / len(security_checks)
                    }
                    
                    score = config_results[config_file]["security_score"]
                    print(f"SUCCESS: {config_file}: {score:.1%} security features")
                    
                except Exception as e:
                    config_results[config_file] = {"exists": True, "error": str(e)}
                    print(f"ERROR: Error reading {config_file}: {e}")
            else:
                config_results[config_file] = {"exists": False}
                print(f"WARNING: {config_file}: Not found")
        
        self.results["tests"]["security_configuration"] = {
            "status": "completed",
            "config_files": config_results
        }
    
    def test_environment_security(self):
        """Test environment security"""
        print("\nTesting Environment Security...")
        
        env_checks = {
            "has_secret_key": "SECRET_KEY" in os.environ,
            "has_jwt_secret": "JWT_SECRET_KEY" in os.environ,
            "has_database_url": "DATABASE_URL" in os.environ,
            "has_redis_url": "REDIS_URL" in os.environ,
            "debug_mode": os.environ.get("DEBUG", "false").lower() == "true",
            "production_mode": os.environ.get("ENVIRONMENT", "").lower() == "production"
        }
        
        # Check for hardcoded secrets in code
        hardcoded_secrets = []
        
        try:
            # Check config files for hardcoded secrets
            config_file = "python_backend/app/core/config.py"
            if os.path.exists(config_file):
                with open(config_file, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # Look for hardcoded secrets (simple check)
                if "your-secret-key-change-this" in content:
                    hardcoded_secrets.append("Default SECRET_KEY found")
                if "your-jwt-secret-key-change-this" in content:
                    hardcoded_secrets.append("Default JWT_SECRET_KEY found")
                if "hrms_secure_password_123" in content:
                    hardcoded_secrets.append("Default database password found")
        
        except Exception as e:
            print(f"ERROR: Error checking for hardcoded secrets: {e}")
        
        env_results = {
            "environment_variables": env_checks,
            "hardcoded_secrets": hardcoded_secrets,
            "security_score": sum(1 for v in env_checks.values() if v) / len(env_checks)
        }
        
        print(f"Environment Security Score: {env_results['security_score']:.1%}")
        
        if hardcoded_secrets:
            print("WARNING: Hardcoded secrets found:")
            for secret in hardcoded_secrets:
                print(f"    - {secret}")
        else:
            print("SUCCESS: No hardcoded secrets found")
        
        self.results["tests"]["environment_security"] = {
            "status": "completed",
            "results": env_results
        }
    
    def generate_security_report(self):
        """Generate comprehensive security report"""
        print("\nGenerating Security Report...")
        print("=" * 60)
        
        # Calculate overall security score
        total_tests = len(self.results["tests"])
        completed_tests = sum(1 for test in self.results["tests"].values() if test.get("status") == "completed")
        
        # Calculate individual scores
        scores = []
        
        if "frontend_dependencies" in self.results["tests"]:
            frontend_vulns = self.results["tests"]["frontend_dependencies"].get("vulnerabilities", 0)
            frontend_score = max(0, 1 - (frontend_vulns / 10))  # Penalize for vulnerabilities
            scores.append(frontend_score)
        
        if "python_dependencies" in self.results["tests"]:
            python_vulns = self.results["tests"]["python_dependencies"].get("vulnerabilities", 0)
            python_score = max(0, 1 - (python_vulns / 5))  # Penalize for vulnerabilities
            scores.append(python_score)
        
        if "security_configuration" in self.results["tests"]:
            config_scores = [f["security_score"] for f in self.results["tests"]["security_configuration"]["config_files"].values() if "security_score" in f]
            if config_scores:
                scores.append(sum(config_scores) / len(config_scores))
        
        if "environment_security" in self.results["tests"]:
            scores.append(self.results["tests"]["environment_security"]["results"]["security_score"])
        
        overall_score = sum(scores) / len(scores) * 100 if scores else 0
        
        print(f"\nSECURITY SCAN RESULTS")
        print(f"Overall Security Score: {overall_score:.1f}/100")
        print(f"Tests Completed: {completed_tests}/{total_tests}")
        
        # Detailed results
        for test_name, test_result in self.results["tests"].items():
            status = test_result.get("status", "unknown")
            print(f"\n{test_name.replace('_', ' ').title()}: {status}")
            
            if test_name == "frontend_dependencies" and "vulnerabilities" in test_result:
                vulns = test_result["vulnerabilities"]
                if vulns > 0:
                    print(f"  WARNING: {vulns} vulnerabilities found")
                else:
                    print("  SUCCESS: No vulnerabilities found")
            
            elif test_name == "python_dependencies" and "vulnerabilities" in test_result:
                vulns = test_result["vulnerabilities"]
                if vulns > 0:
                    print(f"  WARNING: {vulns} vulnerabilities found")
                else:
                    print("  SUCCESS: No vulnerabilities found")
            
            elif test_name == "security_configuration":
                config_files = test_result.get("config_files", {})
                secure_files = sum(1 for f in config_files.values() if f.get("security_score", 0) > 0.7)
                total_files = len(config_files)
                print(f"  Security Configuration: {secure_files}/{total_files} files secure")
            
            elif test_name == "environment_security":
                results = test_result.get("results", {})
                hardcoded = results.get("hardcoded_secrets", [])
                if hardcoded:
                    print(f"  WARNING: {len(hardcoded)} hardcoded secrets found")
                else:
                    print("  SUCCESS: No hardcoded secrets found")
        
        # Security recommendations
        print(f"\nSECURITY RECOMMENDATIONS")
        
        if overall_score < 80:
            print("  CRITICAL: Security score below 80%")
            print("  - Update vulnerable dependencies")
            print("  - Fix hardcoded secrets")
            print("  - Implement missing security features")
        elif overall_score < 90:
            print("  WARNING: Security score below 90%")
            print("  - Review and update dependencies")
            print("  - Enhance security configuration")
        else:
            print("  EXCELLENT: Security score above 90%")
            print("  - Continue monitoring and updates")
        
        # Save report to file
        with open("security_scan_report.json", "w") as f:
            json.dump(self.results, f, indent=2)
        
        print(f"\nDetailed report saved to: security_scan_report.json")
        print("=" * 60)

def main():
    """Main function to run security scanner"""
    scanner = BasicSecurityScanner()
    scanner.run_all_tests()

if __name__ == "__main__":
    main()
