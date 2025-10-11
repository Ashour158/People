"""
QuickBooks Integration
Handles integration with QuickBooks Online/Desktop
"""

import requests
import json
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
import logging

from .base_integration import BaseIntegration

logger = logging.getLogger(__name__)


class QuickBooksIntegration(BaseIntegration):
    """
    QuickBooks Online/Desktop integration
    """
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.base_url = config.get('base_url', 'https://sandbox-quickbooks.api.intuit.com')
        self.access_token = config.get('access_token')
        self.refresh_token = config.get('refresh_token')
        self.company_id = config.get('company_id')
        self.client_id = config.get('client_id')
        self.client_secret = config.get('client_secret')
        self.realm_id = config.get('realm_id')
        
    def connect(self) -> bool:
        """
        Connect to QuickBooks API
        """
        try:
            if not self.access_token:
                # Get new access token
                if not self._refresh_access_token():
                    return False
            
            # Test connection
            response = requests.get(
                f"{self.base_url}/v3/company/{self.realm_id}/companyinfo/{self.realm_id}",
                headers=self._get_headers()
            )
            
            if response.status_code == 200:
                self.is_connected = True
                logger.info("Successfully connected to QuickBooks")
                return True
            else:
                logger.error(f"Failed to connect to QuickBooks: {response.status_code}")
                return False
                
        except Exception as e:
            logger.error(f"Error connecting to QuickBooks: {str(e)}")
            return False
    
    def disconnect(self) -> bool:
        """
        Disconnect from QuickBooks
        """
        self.is_connected = False
        return True
    
    def test_connection(self) -> bool:
        """
        Test QuickBooks connection
        """
        try:
            response = requests.get(
                f"{self.base_url}/v3/company/{self.realm_id}/companyinfo/{self.realm_id}",
                headers=self._get_headers()
            )
            return response.status_code == 200
        except Exception as e:
            logger.error(f"QuickBooks connection test failed: {str(e)}")
            return False
    
    def sync_data(self, data_type: str, data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Sync data with QuickBooks
        """
        try:
            if not self.is_connected:
                if not self.connect():
                    return {"success": False, "error": "Failed to connect to QuickBooks"}
            
            result = {"success": True, "synced": 0, "errors": []}
            
            if data_type == "employees":
                result = self._sync_employees(data)
            elif data_type == "payroll":
                result = self._sync_payroll(data)
            elif data_type == "expenses":
                result = self._sync_expenses(data)
            else:
                return {"success": False, "error": f"Unsupported data type: {data_type}"}
            
            self._log_sync_result(data_type, result)
            self._update_last_sync()
            
            return result
            
        except Exception as e:
            logger.error(f"Error syncing {data_type} to QuickBooks: {str(e)}")
            return {"success": False, "error": str(e)}
    
    def _sync_employees(self, employees: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Sync employees to QuickBooks as vendors or customers
        """
        result = {"success": True, "synced": 0, "errors": []}
        
        for employee in employees:
            try:
                # Create vendor for employee
                vendor_data = {
                    "Name": f"{employee.get('first_name')} {employee.get('last_name')}",
                    "GivenName": employee.get('first_name'),
                    "FamilyName": employee.get('last_name'),
                    "PrimaryEmailAddr": {"Address": employee.get('email')},
                    "PrimaryPhone": {"FreeFormNumber": employee.get('phone')},
                    "Active": employee.get('is_active', True)
                }
                
                response = requests.post(
                    f"{self.base_url}/v3/company/{self.realm_id}/vendors",
                    headers=self._get_headers(),
                    json=vendor_data
                )
                
                if response.status_code == 200:
                    result["synced"] += 1
                else:
                    result["errors"].append(f"Failed to sync employee {employee.get('id')}: {response.text}")
                    
            except Exception as e:
                result["errors"].append(f"Error syncing employee {employee.get('id')}: {str(e)}")
        
        return result
    
    def _sync_payroll(self, payroll_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Sync payroll data to QuickBooks
        """
        result = {"success": True, "synced": 0, "errors": []}
        
        for payroll in payroll_data:
            try:
                # Create journal entry for payroll
                journal_entry = {
                    "DocNumber": f"PAYROLL-{payroll.get('id')}",
                    "TxnDate": payroll.get('pay_period'),
                    "Line": [
                        {
                            "DetailType": "JournalEntryLineDetail",
                            "Amount": payroll.get('net_salary'),
                            "JournalEntryLineDetail": {
                                "PostingType": "Debit",
                                "AccountRef": {"value": "Payroll Expense Account"}
                            }
                        },
                        {
                            "DetailType": "JournalEntryLineDetail",
                            "Amount": payroll.get('net_salary'),
                            "JournalEntryLineDetail": {
                                "PostingType": "Credit",
                                "AccountRef": {"value": "Cash Account"}
                            }
                        }
                    ]
                }
                
                response = requests.post(
                    f"{self.base_url}/v3/company/{self.realm_id}/journalentries",
                    headers=self._get_headers(),
                    json=journal_entry
                )
                
                if response.status_code == 200:
                    result["synced"] += 1
                else:
                    result["errors"].append(f"Failed to sync payroll {payroll.get('id')}: {response.text}")
                    
            except Exception as e:
                result["errors"].append(f"Error syncing payroll {payroll.get('id')}: {str(e)}")
        
        return result
    
    def _sync_expenses(self, expenses: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Sync expense data to QuickBooks
        """
        result = {"success": True, "synced": 0, "errors": []}
        
        for expense in expenses:
            try:
                # Create expense transaction
                expense_data = {
                    "DocNumber": f"EXP-{expense.get('id')}",
                    "TxnDate": expense.get('date'),
                    "Line": [
                        {
                            "DetailType": "AccountBasedExpenseLineDetail",
                            "Amount": expense.get('amount'),
                            "AccountBasedExpenseLineDetail": {
                                "AccountRef": {"value": "Expense Account"}
                            }
                        }
                    ]
                }
                
                response = requests.post(
                    f"{self.base_url}/v3/company/{self.realm_id}/purchases",
                    headers=self._get_headers(),
                    json=expense_data
                )
                
                if response.status_code == 200:
                    result["synced"] += 1
                else:
                    result["errors"].append(f"Failed to sync expense {expense.get('id')}: {response.text}")
                    
            except Exception as e:
                result["errors"].append(f"Error syncing expense {expense.get('id')}: {str(e)}")
        
        return result
    
    def _get_headers(self) -> Dict[str, str]:
        """
        Get headers for QuickBooks API requests
        """
        return {
            "Authorization": f"Bearer {self.access_token}",
            "Accept": "application/json",
            "Content-Type": "application/json"
        }
    
    def _refresh_access_token(self) -> bool:
        """
        Refresh QuickBooks access token
        """
        try:
            response = requests.post(
                "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer",
                data={
                    "grant_type": "refresh_token",
                    "refresh_token": self.refresh_token,
                    "client_id": self.client_id,
                    "client_secret": self.client_secret
                }
            )
            
            if response.status_code == 200:
                token_data = response.json()
                self.access_token = token_data.get('access_token')
                self.refresh_token = token_data.get('refresh_token')
                return True
            else:
                logger.error(f"Failed to refresh QuickBooks token: {response.text}")
                return False
                
        except Exception as e:
            logger.error(f"Error refreshing QuickBooks token: {str(e)}")
            return False
