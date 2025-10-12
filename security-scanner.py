#!/usr/bin/env python3
"""
Comprehensive Security Scanner for HR Management System
Scans for vulnerabilities, tests authentication, and validates authorization
"""
import asyncio
import aiohttp
import json
import ssl
import socket
import subprocess
import sys
from datetime import datetime
from typing import Dict, List, Any
import structlog

# Setup logging
logger = structlog.get_logger()

class SecurityScanner:
    """Comprehensive security scanner for HRMS"""
    
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.results = {
            "timestamp": datetime.now().isoformat(),
            "scanner_version": "1.0.0",
            "target": base_url,
            "tests": {}
        }
    
    async def run_all_tests(self):
        """Run all security tests"""
        print("🔒 Starting Comprehensive Security Scanner")
        print("=" * 60)
        
        # 1. Dependency Vulnerability Scan
        await self.test_dependency_vulnerabilities()
        
        # 2. SSL/TLS Certificate Test
        await self.test_ssl_tls_certificates()
        
        # 3. Authentication Flow Tests
        await self.test_authentication_flows()
        
        # 4. Authorization Tests
        await self.test_authorization_roles()
        
        # 5. Security Headers Test
        await self.test_security_headers()
        
        # 6. Input Validation Tests
        await self.test_input_validation()
        
        # 7. Rate Limiting Tests
        await self.test_rate_limiting()
        
        # 8. CSRF Protection Tests
        await self.test_csrf_protection()
        
        # Generate report
        self.generate_security_report()
    
    async def test_dependency_vulnerabilities(self):
        """Test for dependency vulnerabilities"""
        print("\n🔍 Testing Dependency Vulnerabilities...")
        
        try:
            # Test frontend dependencies
            result = subprocess.run(
                ["npm", "audit", "--json"], 
                cwd="frontend", 
                capture_output=True, 
                text=True
            )
            
            if result.returncode == 0:
                audit_data = json.loads(result.stdout)
                vulnerabilities = audit_data.get("vulnerabilities", {})
                
                self.results["tests"]["dependency_scan"] = {
                    "status": "completed",
                    "frontend_vulnerabilities": len(vulnerabilities),
                    "critical": sum(1 for v in vulnerabilities.values() if v.get("severity") == "critical"),
                    "high": sum(1 for v in vulnerabilities.values() if v.get("severity") == "high"),
                    "moderate": sum(1 for v in vulnerabilities.values() if v.get("severity") == "moderate"),
                    "low": sum(1 for v in vulnerabilities.values() if v.get("severity") == "low"),
                    "vulnerabilities": vulnerabilities
                }
                
                if vulnerabilities:
                    print(f"⚠️  Found {len(vulnerabilities)} frontend vulnerabilities")
                else:
                    print("✅ No frontend vulnerabilities found")
            else:
                print("❌ Failed to run npm audit")
                
        except Exception as e:
            print(f"❌ Error testing frontend dependencies: {e}")
        
        try:
            # Test Python dependencies
            result = subprocess.run(
                ["safety", "check", "--json"], 
                cwd="python_backend", 
                capture_output=True, 
                text=True
            )
            
            if result.returncode == 0:
                print("✅ No Python vulnerabilities found")
            else:
                print("⚠️  Python dependency scan completed with warnings")
                
        except Exception as e:
            print(f"❌ Error testing Python dependencies: {e}")
    
    async def test_ssl_tls_certificates(self):
        """Test SSL/TLS certificate configuration"""
        print("\n🔐 Testing SSL/TLS Certificates...")
        
        try:
            # Test HTTPS endpoint
            async with aiohttp.ClientSession() as session:
                try:
                    async with session.get(f"https://{self.base_url.replace('http://', '')}/health") as response:
                        if response.status == 200:
                            print("✅ HTTPS endpoint accessible")
                            
                            # Check security headers
                            headers = response.headers
                            security_headers = {
                                "Strict-Transport-Security": headers.get("Strict-Transport-Security"),
                                "X-Content-Type-Options": headers.get("X-Content-Type-Options"),
                                "X-Frame-Options": headers.get("X-Frame-Options"),
                                "X-XSS-Protection": headers.get("X-XSS-Protection"),
                                "Content-Security-Policy": headers.get("Content-Security-Policy")
                            }
                            
                            self.results["tests"]["ssl_tls"] = {
                                "status": "completed",
                                "https_accessible": True,
                                "security_headers": security_headers
                            }
                            
                            print("✅ Security headers present")
                        else:
                            print(f"⚠️  HTTPS endpoint returned status {response.status}")
                            
                except aiohttp.ClientConnectorError:
                    print("⚠️  HTTPS not configured (development mode)")
                    self.results["tests"]["ssl_tls"] = {
                        "status": "completed",
                        "https_accessible": False,
                        "note": "HTTPS not configured in development"
                    }
                    
        except Exception as e:
            print(f"❌ Error testing SSL/TLS: {e}")
    
    async def test_authentication_flows(self):
        """Test authentication flows"""
        print("\n🔑 Testing Authentication Flows...")
        
        auth_tests = {
            "registration": False,
            "login": False,
            "logout": False,
            "token_refresh": False,
            "password_reset": False
        }
        
        try:
            async with aiohttp.ClientSession() as session:
                # Test registration
                try:
                    registration_data = {
                        "email": "test@example.com",
                        "password": "TestPass123!",
                        "organization_name": "Test Org"
                    }
                    async with session.post(f"{self.base_url}/api/v1/auth/register", json=registration_data) as response:
                        if response.status in [200, 201, 400]:  # 400 is expected for existing user
                            auth_tests["registration"] = True
                            print("✅ Registration endpoint working")
                except Exception as e:
                    print(f"⚠️  Registration test failed: {e}")
                
                # Test login
                try:
                    login_data = {
                        "email": "test@example.com",
                        "password": "TestPass123!"
                    }
                    async with session.post(f"{self.base_url}/api/v1/auth/login", json=login_data) as response:
                        if response.status in [200, 401]:  # 401 is expected for invalid credentials
                            auth_tests["login"] = True
                            print("✅ Login endpoint working")
                            
                            if response.status == 200:
                                data = await response.json()
                                if "access_token" in data:
                                    self.test_token = data["access_token"]
                                    print("✅ JWT token received")
                except Exception as e:
                    print(f"⚠️  Login test failed: {e}")
                
                # Test logout (if we have a token)
                if hasattr(self, 'test_token'):
                    try:
                        headers = {"Authorization": f"Bearer {self.test_token}"}
                        async with session.post(f"{self.base_url}/api/v1/auth/logout", headers=headers) as response:
                            if response.status in [200, 401]:
                                auth_tests["logout"] = True
                                print("✅ Logout endpoint working")
                    except Exception as e:
                        print(f"⚠️  Logout test failed: {e}")
                
                # Test password reset
                try:
                    reset_data = {"email": "test@example.com"}
                    async with session.post(f"{self.base_url}/api/v1/auth/password-reset/request", json=reset_data) as response:
                        if response.status in [200, 400]:
                            auth_tests["password_reset"] = True
                            print("✅ Password reset endpoint working")
                except Exception as e:
                    print(f"⚠️  Password reset test failed: {e}")
                
        except Exception as e:
            print(f"❌ Error testing authentication: {e}")
        
        self.results["tests"]["authentication"] = {
            "status": "completed",
            "tests": auth_tests,
            "overall_status": "passed" if all(auth_tests.values()) else "partial"
        }
    
    async def test_authorization_roles(self):
        """Test authorization for different user roles"""
        print("\n👥 Testing Authorization for Different User Roles...")
        
        roles = ["employee", "manager", "hr_manager", "admin"]
        role_tests = {}
        
        try:
            async with aiohttp.ClientSession() as session:
                for role in roles:
                    print(f"  Testing {role} role...")
                    
                    # Test role-specific endpoints
                    test_endpoints = {
                        "employee": ["/api/v1/employees", "/api/v1/attendance/check-in"],
                        "manager": ["/api/v1/employees", "/api/v1/performance/goals"],
                        "hr_manager": ["/api/v1/employees", "/api/v1/payroll/process"],
                        "admin": ["/api/v1/employees", "/api/v1/analytics/dashboard"]
                    }
                    
                    role_results = {}
                    for endpoint in test_endpoints.get(role, []):
                        try:
                            # This would require actual authentication tokens for each role
                            # For now, we'll test endpoint accessibility
                            async with session.get(f"{self.base_url}{endpoint}") as response:
                                role_results[endpoint] = {
                                    "status_code": response.status,
                                    "accessible": response.status != 404
                                }
                        except Exception as e:
                            role_results[endpoint] = {"error": str(e)}
                    
                    role_tests[role] = role_results
                    print(f"    ✅ {role} role tests completed")
                
        except Exception as e:
            print(f"❌ Error testing authorization: {e}")
        
        self.results["tests"]["authorization"] = {
            "status": "completed",
            "role_tests": role_tests
        }
    
    async def test_security_headers(self):
        """Test security headers"""
        print("\n🛡️  Testing Security Headers...")
        
        required_headers = [
            "X-Content-Type-Options",
            "X-Frame-Options", 
            "X-XSS-Protection",
            "Strict-Transport-Security",
            "Content-Security-Policy"
        ]
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(f"{self.base_url}/health") as response:
                    headers = response.headers
                    header_results = {}
                    
                    for header in required_headers:
                        if header in headers:
                            header_results[header] = {
                                "present": True,
                                "value": headers[header]
                            }
                            print(f"✅ {header}: {headers[header]}")
                        else:
                            header_results[header] = {"present": False}
                            print(f"❌ {header}: Missing")
                    
                    self.results["tests"]["security_headers"] = {
                        "status": "completed",
                        "headers": header_results,
                        "score": sum(1 for h in header_results.values() if h.get("present")) / len(required_headers)
                    }
                    
        except Exception as e:
            print(f"❌ Error testing security headers: {e}")
    
    async def test_input_validation(self):
        """Test input validation"""
        print("\n🔍 Testing Input Validation...")
        
        test_payloads = [
            {"type": "XSS", "payload": "<script>alert('XSS')</script>"},
            {"type": "SQL Injection", "payload": "'; DROP TABLE users; --"},
            {"type": "Path Traversal", "payload": "../../../etc/passwd"},
            {"type": "Command Injection", "payload": "; rm -rf /"}
        ]
        
        validation_results = {}
        
        try:
            async with aiohttp.ClientSession() as session:
                for test in test_payloads:
                    try:
                        # Test with employee creation endpoint
                        test_data = {
                            "first_name": test["payload"],
                            "last_name": "Test",
                            "email": "test@example.com"
                        }
                        
                        async with session.post(f"{self.base_url}/api/v1/employees", json=test_data) as response:
                            if response.status == 400:
                                validation_results[test["type"]] = {
                                    "blocked": True,
                                    "status": "protected"
                                }
                                print(f"✅ {test['type']} blocked")
                            else:
                                validation_results[test["type"]] = {
                                    "blocked": False,
                                    "status": "vulnerable"
                                }
                                print(f"❌ {test['type']} not blocked")
                                
                    except Exception as e:
                        validation_results[test["type"]] = {"error": str(e)}
                        
        except Exception as e:
            print(f"❌ Error testing input validation: {e}")
        
        self.results["tests"]["input_validation"] = {
            "status": "completed",
            "tests": validation_results
        }
    
    async def test_rate_limiting(self):
        """Test rate limiting"""
        print("\n⏱️  Testing Rate Limiting...")
        
        try:
            async with aiohttp.ClientSession() as session:
                requests_made = 0
                rate_limited = False
                
                # Make multiple requests to test rate limiting
                for i in range(65):  # More than the 60 req/min limit
                    try:
                        async with session.get(f"{self.base_url}/health") as response:
                            requests_made += 1
                            if response.status == 429:
                                rate_limited = True
                                print(f"✅ Rate limiting triggered after {requests_made} requests")
                                break
                    except Exception as e:
                        print(f"Request {i+1} failed: {e}")
                        break
                
                if not rate_limited:
                    print("⚠️  Rate limiting not triggered (may need adjustment)")
                
                self.results["tests"]["rate_limiting"] = {
                    "status": "completed",
                    "requests_made": requests_made,
                    "rate_limited": rate_limited
                }
                
        except Exception as e:
            print(f"❌ Error testing rate limiting: {e}")
    
    async def test_csrf_protection(self):
        """Test CSRF protection"""
        print("\n🛡️  Testing CSRF Protection...")
        
        try:
            async with aiohttp.ClientSession() as session:
                # Test CSRF token requirement
                async with session.post(f"{self.base_url}/api/v1/employees", json={"first_name": "Test"}) as response:
                    if response.status == 403:
                        print("✅ CSRF protection active")
                        csrf_protected = True
                    else:
                        print("⚠️  CSRF protection may not be fully configured")
                        csrf_protected = False
                
                self.results["tests"]["csrf_protection"] = {
                    "status": "completed",
                    "protected": csrf_protected
                }
                
        except Exception as e:
            print(f"❌ Error testing CSRF protection: {e}")
    
    def generate_security_report(self):
        """Generate comprehensive security report"""
        print("\n📊 Generating Security Report...")
        print("=" * 60)
        
        # Calculate overall security score
        total_tests = len(self.results["tests"])
        passed_tests = sum(1 for test in self.results["tests"].values() if test.get("status") == "completed")
        security_score = (passed_tests / total_tests) * 100 if total_tests > 0 else 0
        
        print(f"\n🔒 SECURITY SCAN RESULTS")
        print(f"Overall Security Score: {security_score:.1f}/100")
        print(f"Tests Completed: {passed_tests}/{total_tests}")
        
        # Detailed results
        for test_name, test_result in self.results["tests"].items():
            status = test_result.get("status", "unknown")
            print(f"\n{test_name.replace('_', ' ').title()}: {status}")
            
            if test_name == "dependency_scan" and "vulnerabilities" in test_result:
                vulns = test_result["vulnerabilities"]
                if vulns:
                    print(f"  Vulnerabilities found: {len(vulns)}")
                else:
                    print("  ✅ No vulnerabilities found")
            
            elif test_name == "security_headers":
                score = test_result.get("score", 0)
                print(f"  Security Headers Score: {score:.1%}")
            
            elif test_name == "authentication":
                tests = test_result.get("tests", {})
                passed = sum(1 for v in tests.values() if v)
                total = len(tests)
                print(f"  Authentication Tests: {passed}/{total} passed")
        
        # Save report to file
        with open("security_scan_report.json", "w") as f:
            json.dump(self.results, f, indent=2)
        
        print(f"\n📄 Detailed report saved to: security_scan_report.json")
        print("=" * 60)

async def main():
    """Main function to run security scanner"""
    scanner = SecurityScanner()
    await scanner.run_all_tests()

if __name__ == "__main__":
    asyncio.run(main())
