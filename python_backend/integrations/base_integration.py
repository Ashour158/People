"""
Base Integration Class
Provides common functionality for all third-party integrations
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, List
import logging
from datetime import datetime
import json

logger = logging.getLogger(__name__)


class BaseIntegration(ABC):
    """
    Abstract base class for all integrations
    """
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.is_connected = False
        self.last_sync = None
        self.sync_status = "idle"
        self.error_count = 0
        self.max_retries = 3
        
    @abstractmethod
    def connect(self) -> bool:
        """
        Establish connection to the service
        Returns: bool - True if successful
        """
        pass
    
    @abstractmethod
    def disconnect(self) -> bool:
        """
        Disconnect from the service
        Returns: bool - True if successful
        """
        pass
    
    @abstractmethod
    def test_connection(self) -> bool:
        """
        Test the connection to the service
        Returns: bool - True if successful
        """
        pass
    
    @abstractmethod
    def sync_data(self, data_type: str, data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Sync data with the service
        Args:
            data_type: Type of data being synced
            data: List of data records
        Returns: Dict with sync results
        """
        pass
    
    def get_status(self) -> Dict[str, Any]:
        """
        Get integration status
        Returns: Dict with status information
        """
        return {
            "is_connected": self.is_connected,
            "last_sync": self.last_sync,
            "sync_status": self.sync_status,
            "error_count": self.error_count,
            "config": self._mask_sensitive_data()
        }
    
    def _mask_sensitive_data(self) -> Dict[str, Any]:
        """
        Mask sensitive data in config for logging
        Returns: Dict with masked sensitive data
        """
        masked_config = self.config.copy()
        sensitive_keys = ['password', 'token', 'secret', 'key', 'api_key']
        
        for key in sensitive_keys:
            if key in masked_config:
                masked_config[key] = "***MASKED***"
        
        return masked_config
    
    def _log_sync_result(self, data_type: str, result: Dict[str, Any]):
        """
        Log sync result
        Args:
            data_type: Type of data synced
            result: Sync result
        """
        logger.info(f"Sync completed for {data_type}: {result}")
        
        if result.get('success'):
            self.sync_status = "success"
            self.error_count = 0
        else:
            self.sync_status = "failed"
            self.error_count += 1
    
    def _should_retry(self) -> bool:
        """
        Check if we should retry the operation
        Returns: bool - True if should retry
        """
        return self.error_count < self.max_retries
    
    def _update_last_sync(self):
        """
        Update last sync timestamp
        """
        self.last_sync = datetime.now().isoformat()
    
    def __str__(self):
        return f"{self.__class__.__name__}(connected={self.is_connected})"
    
    def __repr__(self):
        return f"{self.__class__.__name__}(config={self._mask_sensitive_data()})"
