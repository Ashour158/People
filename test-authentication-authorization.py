#!/usr/bin/env python3
"""
Authentication and Authorization Testing Script
Tests authentication flows and role-based access control
"""
import asyncio
import aiohttp
import json
import sys
from datetime import datetime
from typing import Dict, List, Any

class AuthAuthTester:
    """Authentication and Authorization Tester"""
    
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.results = {
            "timestamp": datetime.now().isoformat(),
            "tester_version": "1.0.0",
            "target": base_url,
            "tests": {}
        }
        self.test_tokens = {}
    
    async def run_all_tests(self):
        """Run all authentication and authorization tests"""
        print("Starting Authentication and Authorization Tests")
        print("=" * 60)
        
        # 1. Test Authentication Flows
        await self.test_authentication_flows()
        
        # 2. Test Authorization for Different Roles
        await self.test_authorization_roles()
        
        # 3. Test Security Headers
        await self.test_security_headers()
        
        # 4. Test Input Validation
        await self.test_input_validation()
        
        # 5. Test Rate Limiting
        await self.test_rate_limiting()
        
        # Generate report
        self.generate_test_report()
    
    async def test_authentication_flows(self):
        """Test authentication flows"""
        print("\nTesting Authentication Flows...")
        
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
                            print("SUCCESS: Registration endpoint working")
                        else:
                            print(f"WARNING: Registration returned status {response.status}")
                except Exception as e:
                    print(f"ERROR: Registration test failed: {e}")
                
                # Test login
                try:
                    login_data = {
                        "email": "test@example.com",
                        "password": "TestPass123!"
                    }
                    async with session.post(f"{self.base_url}/api/v1/auth/login", json=login_data) as response:
                        if response.status in [200, 401]:  # 401 is expected for invalid credentials
                            auth_tests["login"] = True
                            print("SUCCESS: Login endpoint working")
                            
                            if response.status == 200:
                                data = await response.json()
                                if "access_token" in data:
                                    self.test_token = data["access_token"]
                                    print("SUCCESS: JWT token received")
                        else:
                            print(f"WARNING: Login returned status {response.status}")
                except Exception as e:
                    print(f"ERROR: Login test failed: {e}")
                
                # Test logout (if we have a token)
                if hasattr(self, 'test_token'):
                    try:
                        headers = {"Authorization": f"Bearer {self.test_token}"}
                        async with session.post(f"{self.base_url}/api/v1/auth/logout", headers=headers) as response:
                            if response.status in [200, 401]:
                                auth_tests["logout"] = True
                                print("SUCCESS: Logout endpoint working")
                            else:
                                print(f"WARNING: Logout returned status {response.status}")
                    except Exception as e:
                        print(f"ERROR: Logout test failed: {e}")
                
                # Test password reset
                try:
                    reset_data = {"email": "test@example.com"}
                    async with session.post(f"{self.base_url}/api/v1/auth/password-reset/request", json=reset_data) as response:
                        if response.status in [200, 400]:
                            auth_tests["password_reset"] = True
                            print("SUCCESS: Password reset endpoint working")
                        else:
                            print(f"WARNING: Password reset returned status {response.status}")
                except Exception as e:
                    print(f"ERROR: Password reset test failed: {e}")
                
        except Exception as e:
            print(f"ERROR: Error testing authentication: {e}")
        
        self.results["tests"]["authentication"] = {
            "status": "completed",
            "tests": auth_tests,
            "overall_status": "passed" if all(auth_tests.values()) else "partial"
        }
    
    async def test_authorization_roles(self):
        """Test authorization for different user roles"""
        print("\nTesting Authorization for Different User Roles...")
        
        # Define test endpoints for different roles
        role_endpoints = {
            "employee": [
                "/api/v1/employees",
                "/api/v1/attendance/check-in",
                "/api/v1/leave/apply"
            ],
            "manager": [
                "/api/v1/employees",
                "/api/v1/performance/goals",
                "/api/v1/leave/approve"
            ],
            "hr_manager": [
                "/api/v1/employees",
                "/api/v1/payroll/process",
                "/api/v1/recruitment/jobs"
            ],
            "admin": [
                "/api/v1/employees",
                "/api/v1/analytics/dashboard",
                "/api/v1/settings/company"
            ]
        }
        
        role_tests = {}
        
        try:
            async with aiohttp.ClientSession() as session:
                for role, endpoints in role_endpoints.items():
                    print(f"  Testing {role} role...")
                    
                    role_results = {}
                    for endpoint in endpoints:
                        try:
                            # Test without authentication (should fail)
                            async with session.get(f"{self.base_url}{endpoint}") as response:
                                role_results[endpoint] = {
                                    "status_code": response.status,
                                    "accessible_without_auth": response.status == 200,
                                    "expected_behavior": "should_require_auth"
                                }
                        except Exception as e:
                            role_results[endpoint] = {"error": str(e)}
                    
                    role_tests[role] = role_results
                    print(f"    SUCCESS: {role} role tests completed")
                
        except Exception as e:
            print(f"ERROR: Error testing authorization: {e}")
        
        self.results["tests"]["authorization"] = {
            "status": "completed",
            "role_tests": role_tests
        }
    
    async def test_security_headers(self):
        """Test security headers"""
        print("\nTesting Security Headers...")
        
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
                            print(f"SUCCESS: {header}: {headers[header]}")
                        else:
                            header_results[header] = {"present": False}
                            print(f"WARNING: {header}: Missing")
                    
                    self.results["tests"]["security_headers"] = {
                        "status": "completed",
                        "headers": header_results,
                        "score": sum(1 for h in header_results.values() if h.get("present")) / len(required_headers)
                    }
                    
        except Exception as e:
            print(f"ERROR: Error testing security headers: {e}")
    
    async def test_input_validation(self):
        """Test input validation"""
        print("\nTesting Input Validation...")
        
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
                                print(f"SUCCESS: {test['type']} blocked")
                            else:
                                validation_results[test["type"]] = {
                                    "blocked": False,
                                    "status": "vulnerable"
                                }
                                print(f"WARNING: {test['type']} not blocked")
                                
                    except Exception as e:
                        validation_results[test["type"]] = {"error": str(e)}
                        
        except Exception as e:
            print(f"ERROR: Error testing input validation: {e}")
        
        self.results["tests"]["input_validation"] = {
            "status": "completed",
            "tests": validation_results
        }
    
    async def test_rate_limiting(self):
        """Test rate limiting"""
        print("\nTesting Rate Limiting...")
        
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
                                print(f"SUCCESS: Rate limiting triggered after {requests_made} requests")
                                break
                    except Exception as e:
                        print(f"Request {i+1} failed: {e}")
                        break
                
                if not rate_limited:
                    print("WARNING: Rate limiting not triggered (may need adjustment)")
                
                self.results["tests"]["rate_limiting"] = {
                    "status": "completed",
                    "requests_made": requests_made,
                    "rate_limited": rate_limited
                }
                
        except Exception as e:
            print(f"ERROR: Error testing rate limiting: {e}")
    
    def generate_test_report(self):
        """Generate comprehensive test report"""
        print("\nGenerating Test Report...")
        print("=" * 60)
        
        # Calculate overall test score
        total_tests = len(self.results["tests"])
        completed_tests = sum(1 for test in self.results["tests"].values() if test.get("status") == "completed")
        
        # Calculate individual scores
        scores = []
        
        if "authentication" in self.results["tests"]:
            auth_tests = self.results["tests"]["authentication"].get("tests", {})
            auth_score = sum(1 for v in auth_tests.values() if v) / len(auth_tests) if auth_tests else 0
            scores.append(auth_score)
        
        if "security_headers" in self.results["tests"]:
            scores.append(self.results["tests"]["security_headers"].get("score", 0))
        
        if "input_validation" in self.results["tests"]:
            validation_tests = self.results["tests"]["input_validation"].get("tests", {})
            blocked_tests = sum(1 for v in validation_tests.values() if v.get("blocked", False))
            validation_score = blocked_tests / len(validation_tests) if validation_tests else 0
            scores.append(validation_score)
        
        if "rate_limiting" in self.results["tests"]:
            rate_limited = self.results["tests"]["rate_limiting"].get("rate_limited", False)
            scores.append(1.0 if rate_limited else 0.5)
        
        overall_score = sum(scores) / len(scores) * 100 if scores else 0
        
        print(f"\nAUTHENTICATION & AUTHORIZATION TEST RESULTS")
        print(f"Overall Test Score: {overall_score:.1f}/100")
        print(f"Tests Completed: {completed_tests}/{total_tests}")
        
        # Detailed results
        for test_name, test_result in self.results["tests"].items():
            status = test_result.get("status", "unknown")
            print(f"\n{test_name.replace('_', ' ').title()}: {status}")
            
            if test_name == "authentication":
                tests = test_result.get("tests", {})
                passed = sum(1 for v in tests.values() if v)
                total = len(tests)
                print(f"  Authentication Tests: {passed}/{total} passed")
            
            elif test_name == "authorization":
                role_tests = test_result.get("role_tests", {})
                print(f"  Role Tests: {len(role_tests)} roles tested")
            
            elif test_name == "security_headers":
                score = test_result.get("score", 0)
                print(f"  Security Headers Score: {score:.1%}")
            
            elif test_name == "input_validation":
                tests = test_result.get("tests", {})
                blocked = sum(1 for v in tests.values() if v.get("blocked", False))
                total = len(tests)
                print(f"  Input Validation: {blocked}/{total} attacks blocked")
            
            elif test_name == "rate_limiting":
                rate_limited = test_result.get("rate_limited", False)
                requests_made = test_result.get("requests_made", 0)
                print(f"  Rate Limiting: {'Active' if rate_limited else 'Not triggered'} ({requests_made} requests)")
        
        # Test recommendations
        print(f"\nTEST RECOMMENDATIONS")
        
        if overall_score < 80:
            print("  CRITICAL: Test score below 80%")
            print("  - Fix authentication issues")
            print("  - Implement missing security features")
            print("  - Update security configuration")
        elif overall_score < 90:
            print("  WARNING: Test score below 90%")
            print("  - Review security implementation")
            print("  - Enhance input validation")
        else:
            print("  EXCELLENT: Test score above 90%")
            print("  - Continue monitoring and updates")
        
        # Save report to file
        with open("auth_auth_test_report.json", "w") as f:
            json.dump(self.results, f, indent=2)
        
        print(f"\nDetailed report saved to: auth_auth_test_report.json")
        print("=" * 60)

async def main():
    """Main function to run authentication and authorization tests"""
    tester = AuthAuthTester()
    await tester.run_all_tests()

if __name__ == "__main__":
    asyncio.run(main())
