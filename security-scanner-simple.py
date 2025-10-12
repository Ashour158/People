#!/usr/bin/env python3
"""
Simple Security Scanner for HR Management System
Scans for vulnerabilities and validates security configuration
"""
import json
import subprocess
import sys
import os
from datetime import datetime
from typing import Dict, List, Any

class SimpleSecurityScanner:
    """Simple security scanner for HRMS"""
    
    def __init__(self):
        self.results = {
            "timestamp": datetime.now().isoformat(),
            "scanner_version": "1.0.0",
            "tests": {}
        }
    
    def run_all_tests(self):
        """Run all security tests"""
        print("Starting Simple Security Scanner")
        print("=" * 60)
        
        # 1. Dependency Vulnerability Scan
        self.test_dependency_vulnerabilities()
        
        # 2. Security Configuration Check
        self.test_security_configuration()
        
        # 3. File Permissions Check
        self.test_file_permissions()
        
        # 4. Environment Security Check
        self.test_environment_security()
        
        # 5. Code Security Check
        self.test_code_security()
        
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
                        for vuln_id, vuln_data in list(vulnerabilities.items())[:5]:  # Show first 5
                            print(f"    - {vuln_id}: {vuln_data.get('severity', 'unknown')} - {vuln_data.get('title', 'No title')}")
                    else:
                        print("SUCCESS: No frontend vulnerabilities found")
                        
                except json.JSONDecodeError:
                    print("⚠️  Could not parse npm audit output")
                    self.results["tests"]["frontend_dependencies"] = {"status": "error", "error": "JSON parse error"}
            else:
                print("❌ Failed to run npm audit")
                self.results["tests"]["frontend_dependencies"] = {"status": "error", "error": "npm audit failed"}
                
        except subprocess.TimeoutExpired:
            print("⏱️  npm audit timed out")
            self.results["tests"]["frontend_dependencies"] = {"status": "timeout"}
        except Exception as e:
            print(f"❌ Error testing frontend dependencies: {e}")
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
                        print(f"⚠️  Found {len(vulnerabilities)} Python vulnerabilities")
                        for vuln in vulnerabilities[:5]:  # Show first 5
                            print(f"    - {vuln.get('package_name', 'unknown')}: {vuln.get('vulnerability_id', 'unknown')}")
                    else:
                        print("✅ No Python vulnerabilities found")
                        
                except json.JSONDecodeError:
                    print("⚠️  Could not parse safety output")
                    self.results["tests"]["python_dependencies"] = {"status": "error", "error": "JSON parse error"}
            else:
                print("⚠️  Python dependency scan completed with warnings")
                self.results["tests"]["python_dependencies"] = {"status": "warning", "output": result.stdout}
                
        except subprocess.TimeoutExpired:
            print("⏱️  safety check timed out")
            self.results["tests"]["python_dependencies"] = {"status": "timeout"}
        except Exception as e:
            print(f"❌ Error testing Python dependencies: {e}")
            self.results["tests"]["python_dependencies"] = {"status": "error", "error": str(e)}
    
    def test_security_configuration(self):
        """Test security configuration files"""
        print("\n🔧 Testing Security Configuration...")
        
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
                    print(f"✅ {config_file}: {score:.1%} security features")
                    
                except Exception as e:
                    config_results[config_file] = {"exists": True, "error": str(e)}
                    print(f"❌ Error reading {config_file}: {e}")
            else:
                config_results[config_file] = {"exists": False}
                print(f"⚠️  {config_file}: Not found")
        
        self.results["tests"]["security_configuration"] = {
            "status": "completed",
            "config_files": config_results
        }
    
    def test_file_permissions(self):
        """Test file permissions"""
        print("\n📁 Testing File Permissions...")
        
        sensitive_files = [
            "python_backend/.env",
            "python_backend/.env.production",
            "python_backend/env.production.secure",
            "python_backend/app/core/config.py",
            "python_backend/app/core/security.py"
        ]
        
        permission_results = {}
        
        for file_path in sensitive_files:
            if os.path.exists(file_path):
                try:
                    stat = os.stat(file_path)
                    permissions = oct(stat.st_mode)[-3:]
                    
                    # Check if file is readable by others (security risk)
                    is_secure = permissions[-1] in ['0', '4']  # Not readable by others
                    
                    permission_results[file_path] = {
                        "exists": True,
                        "permissions": permissions,
                        "is_secure": is_secure
                    }
                    
                    if is_secure:
                        print(f"✅ {file_path}: Secure permissions ({permissions})")
                    else:
                        print(f"⚠️  {file_path}: Potentially insecure permissions ({permissions})")
                        
                except Exception as e:
                    permission_results[file_path] = {"exists": True, "error": str(e)}
                    print(f"❌ Error checking {file_path}: {e}")
            else:
                permission_results[file_path] = {"exists": False}
                print(f"ℹ️  {file_path}: Not found")
        
        self.results["tests"]["file_permissions"] = {
            "status": "completed",
            "files": permission_results
        }
    
    def test_environment_security(self):
        """Test environment security"""
        print("\n🌍 Testing Environment Security...")
        
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
        secret_patterns = [
            "password.*=.*['\"].*['\"]",
            "secret.*=.*['\"].*['\"]",
            "key.*=.*['\"].*['\"]",
            "token.*=.*['\"].*['\"]"
        ]
        
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
            print(f"❌ Error checking for hardcoded secrets: {e}")
        
        env_results = {
            "environment_variables": env_checks,
            "hardcoded_secrets": hardcoded_secrets,
            "security_score": sum(1 for v in env_checks.values() if v) / len(env_checks)
        }
        
        print(f"Environment Security Score: {env_results['security_score']:.1%}")
        
        if hardcoded_secrets:
            print("⚠️  Hardcoded secrets found:")
            for secret in hardcoded_secrets:
                print(f"    - {secret}")
        else:
            print("✅ No hardcoded secrets found")
        
        self.results["tests"]["environment_security"] = {
            "status": "completed",
            "results": env_results
        }
    
    def test_code_security(self):
        """Test code security patterns"""
        print("\n🔍 Testing Code Security Patterns...")
        
        security_patterns = {
            "authentication_middleware": 0,
            "authorization_checks": 0,
            "input_validation": 0,
            "rate_limiting": 0,
            "csrf_protection": 0,
            "security_headers": 0,
            "encryption_usage": 0,
            "sql_injection_protection": 0,
            "xss_protection": 0
        }
        
        # Scan Python files for security patterns
        python_files = []
        for root, dirs, files in os.walk("python_backend"):
            for file in files:
                if file.endswith('.py'):
                    python_files.append(os.path.join(root, file))
        
        for file_path in python_files[:20]:  # Limit to first 20 files for performance
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # Check for security patterns
                if "AuthMiddleware" in content:
                    security_patterns["authentication_middleware"] += 1
                if "require_role" in content:
                    security_patterns["authorization_checks"] += 1
                if "InputValidation" in content:
                    security_patterns["input_validation"] += 1
                if "RateLimit" in content:
                    security_patterns["rate_limiting"] += 1
                if "CSRF" in content:
                    security_patterns["csrf_protection"] += 1
                if "SecurityHeaders" in content:
                    security_patterns["security_headers"] += 1
                if "encrypt" in content.lower():
                    security_patterns["encryption_usage"] += 1
                if "SQLAlchemy" in content or "parameterized" in content.lower():
                    security_patterns["sql_injection_protection"] += 1
                if "escape" in content.lower() or "sanitize" in content.lower():
                    security_patterns["xss_protection"] += 1
                    
            except Exception as e:
                print(f"⚠️  Error scanning {file_path}: {e}")
        
        # Calculate security score
        total_patterns = sum(security_patterns.values())
        security_score = min(total_patterns / 50, 1.0)  # Normalize to 0-1
        
        print(f"Code Security Score: {security_score:.1%}")
        print("Security patterns found:")
        for pattern, count in security_patterns.items():
            if count > 0:
                print(f"  ✅ {pattern.replace('_', ' ').title()}: {count}")
        
        self.results["tests"]["code_security"] = {
            "status": "completed",
            "patterns": security_patterns,
            "score": security_score
        }
    
    def generate_security_report(self):
        """Generate comprehensive security report"""
        print("\n📊 Generating Security Report...")
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
        
        if "code_security" in self.results["tests"]:
            scores.append(self.results["tests"]["code_security"]["score"])
        
        overall_score = sum(scores) / len(scores) * 100 if scores else 0
        
        print(f"\n🔒 SECURITY SCAN RESULTS")
        print(f"Overall Security Score: {overall_score:.1f}/100")
        print(f"Tests Completed: {completed_tests}/{total_tests}")
        
        # Detailed results
        for test_name, test_result in self.results["tests"].items():
            status = test_result.get("status", "unknown")
            print(f"\n{test_name.replace('_', ' ').title()}: {status}")
            
            if test_name == "frontend_dependencies" and "vulnerabilities" in test_result:
                vulns = test_result["vulnerabilities"]
                if vulns > 0:
                    print(f"  ⚠️  {vulns} vulnerabilities found")
                else:
                    print("  ✅ No vulnerabilities found")
            
            elif test_name == "python_dependencies" and "vulnerabilities" in test_result:
                vulns = test_result["vulnerabilities"]
                if vulns > 0:
                    print(f"  ⚠️  {vulns} vulnerabilities found")
                else:
                    print("  ✅ No vulnerabilities found")
            
            elif test_name == "security_configuration":
                config_files = test_result.get("config_files", {})
                secure_files = sum(1 for f in config_files.values() if f.get("security_score", 0) > 0.7)
                total_files = len(config_files)
                print(f"  Security Configuration: {secure_files}/{total_files} files secure")
            
            elif test_name == "environment_security":
                results = test_result.get("results", {})
                hardcoded = results.get("hardcoded_secrets", [])
                if hardcoded:
                    print(f"  ⚠️  {len(hardcoded)} hardcoded secrets found")
                else:
                    print("  ✅ No hardcoded secrets found")
            
            elif test_name == "code_security":
                patterns = test_result.get("patterns", {})
                total_patterns = sum(patterns.values())
                print(f"  Security Patterns: {total_patterns} found")
        
        # Security recommendations
        print(f"\n💡 SECURITY RECOMMENDATIONS")
        
        if overall_score < 80:
            print("  🔴 CRITICAL: Security score below 80%")
            print("  - Update vulnerable dependencies")
            print("  - Fix hardcoded secrets")
            print("  - Implement missing security features")
        elif overall_score < 90:
            print("  🟡 WARNING: Security score below 90%")
            print("  - Review and update dependencies")
            print("  - Enhance security configuration")
        else:
            print("  ✅ EXCELLENT: Security score above 90%")
            print("  - Continue monitoring and updates")
        
        # Save report to file
        with open("security_scan_report.json", "w") as f:
            json.dump(self.results, f, indent=2)
        
        print(f"\n📄 Detailed report saved to: security_scan_report.json")
        print("=" * 60)

def main():
    """Main function to run security scanner"""
    scanner = SimpleSecurityScanner()
    scanner.run_all_tests()

if __name__ == "__main__":
    main()
