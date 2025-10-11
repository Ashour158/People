"""
ADP Integration
Handles integration with ADP Workforce Now
"""

import requests
import json
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
import logging
import base64

from .base_integration import BaseIntegration

logger = logging.getLogger(__name__)


class ADPIntegration(BaseIntegration):
    """
    ADP Workforce Now integration
    """
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.base_url = config.get('base_url', 'https://api.adp.com')
        self.client_id = config.get('client_id')
        self.client_secret = config.get('client_secret')
        self.access_token = config.get('access_token')
        self.refresh_token = config.get('refresh_token')
        self.company_id = config.get('company_id')
        
    def connect(self) -> bool:
        """
        Connect to ADP API
        """
        try:
            if not self.access_token:
                if not self._get_access_token():
                    return False
            
            # Test connection
            response = requests.get(
                f"{self.base_url}/hr/v2/workers",
                headers=self._get_headers()
            )
            
            if response.status_code == 200:
                self.is_connected = True
                logger.info("Successfully connected to ADP")
                return True
            else:
                logger.error(f"Failed to connect to ADP: {response.status_code}")
                return False
                
        except Exception as e:
            logger.error(f"Error connecting to ADP: {str(e)}")
            return False
    
    def disconnect(self) -> bool:
        """
        Disconnect from ADP
        """
        self.is_connected = False
        return True
    
    def test_connection(self) -> bool:
        """
        Test ADP connection
        """
        try:
            response = requests.get(
                f"{self.base_url}/hr/v2/workers",
                headers=self._get_headers()
            )
            return response.status_code == 200
        except Exception as e:
            logger.error(f"ADP connection test failed: {str(e)}")
            return False
    
    def sync_data(self, data_type: str, data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Sync data with ADP
        """
        try:
            if not self.is_connected:
                if not self.connect():
                    return {"success": False, "error": "Failed to connect to ADP"}
            
            result = {"success": True, "synced": 0, "errors": []}
            
            if data_type == "employees":
                result = self._sync_employees(data)
            elif data_type == "payroll":
                result = self._sync_payroll(data)
            elif data_type == "attendance":
                result = self._sync_attendance(data)
            else:
                return {"success": False, "error": f"Unsupported data type: {data_type}"}
            
            self._log_sync_result(data_type, result)
            self._update_last_sync()
            
            return result
            
        except Exception as e:
            logger.error(f"Error syncing {data_type} to ADP: {str(e)}")
            return {"success": False, "error": str(e)}
    
    def _sync_employees(self, employees: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Sync employees to ADP
        """
        result = {"success": True, "synced": 0, "errors": []}
        
        for employee in employees:
            try:
                # Create worker in ADP
                worker_data = {
                    "person": {
                        "legalName": {
                            "givenName": employee.get('first_name'),
                            "familyName1": employee.get('last_name')
                        },
                        "communication": {
                            "emails": [
                                {
                                    "emailUri": employee.get('email'),
                                    "emailTypeCode": "WORK"
                                }
                            ],
                            "phones": [
                                {
                                    "phoneNumber": employee.get('phone'),
                                    "phoneTypeCode": "WORK"
                                }
                            ]
                        }
                    },
                    "workAssignments": [
                        {
                            "jobTitle": employee.get('position'),
                            "department": employee.get('department'),
                            "hireDate": employee.get('hire_date'),
                            "workerStatus": {
                                "statusCode": "ACTIVE" if employee.get('is_active') else "INACTIVE"
                            }
                        }
                    ]
                }
                
                response = requests.post(
                    f"{self.base_url}/hr/v2/workers",
                    headers=self._get_headers(),
                    json=worker_data
                )
                
                if response.status_code in [200, 201]:
                    result["synced"] += 1
                else:
                    result["errors"].append(f"Failed to sync employee {employee.get('id')}: {response.text}")
                    
            except Exception as e:
                result["errors"].append(f"Error syncing employee {employee.get('id')}: {str(e)}")
        
        return result
    
    def _sync_payroll(self, payroll_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Sync payroll data to ADP
        """
        result = {"success": True, "synced": 0, "errors": []}
        
        for payroll in payroll_data:
            try:
                # Create payroll transaction
                payroll_transaction = {
                    "workerId": payroll.get('employee_id'),
                    "payPeriod": payroll.get('pay_period'),
                    "grossPay": payroll.get('gross_salary'),
                    "netPay": payroll.get('net_salary'),
                    "deductions": payroll.get('deductions', []),
                    "allowances": payroll.get('allowances', [])
                }
                
                response = requests.post(
                    f"{self.base_url}/payroll/v1/payroll-transactions",
                    headers=self._get_headers(),
                    json=payroll_transaction
                )
                
                if response.status_code in [200, 201]:
                    result["synced"] += 1
                else:
                    result["errors"].append(f"Failed to sync payroll {payroll.get('id')}: {response.text}")
                    
            except Exception as e:
                result["errors"].append(f"Error syncing payroll {payroll.get('id')}: {str(e)}")
        
        return result
    
    def _sync_attendance(self, attendance_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Sync attendance data to ADP
        """
        result = {"success": True, "synced": 0, "errors": []}
        
        for attendance in attendance_data:
            try:
                # Create time entry
                time_entry = {
                    "workerId": attendance.get('employee_id'),
                    "date": attendance.get('date'),
                    "checkIn": attendance.get('check_in_time'),
                    "checkOut": attendance.get('check_out_time'),
                    "hours": attendance.get('hours_worked'),
                    "location": attendance.get('location')
                }
                
                response = requests.post(
                    f"{self.base_url}/time/v1/time-entries",
                    headers=self._get_headers(),
                    json=time_entry
                )
                
                if response.status_code in [200, 201]:
                    result["synced"] += 1
                else:
                    result["errors"].append(f"Failed to sync attendance {attendance.get('id')}: {response.text}")
                    
            except Exception as e:
                result["errors"].append(f"Error syncing attendance {attendance.get('id')}: {str(e)}")
        
        return result
    
    def _get_headers(self) -> Dict[str, str]:
        """
        Get headers for ADP API requests
        """
        return {
            "Authorization": f"Bearer {self.access_token}",
            "Accept": "application/json",
            "Content-Type": "application/json"
        }
    
    def _get_access_token(self) -> bool:
        """
        Get ADP access token
        """
        try:
            # Encode client credentials
            credentials = base64.b64encode(f"{self.client_id}:{self.client_secret}".encode()).decode()
            
            response = requests.post(
                f"{self.base_url}/auth/oauth/v2/token",
                headers={
                    "Authorization": f"Basic {credentials}",
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                data={
                    "grant_type": "client_credentials",
                    "scope": "api"
                }
            )
            
            if response.status_code == 200:
                token_data = response.json()
                self.access_token = token_data.get('access_token')
                return True
            else:
                logger.error(f"Failed to get ADP token: {response.text}")
                return False
                
        except Exception as e:
            logger.error(f"Error getting ADP token: {str(e)}")
            return False
