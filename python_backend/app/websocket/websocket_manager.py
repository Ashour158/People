"""
WebSocket manager for real-time communication
"""
from fastapi import WebSocket, WebSocketDisconnect
from typing import Dict, List, Set
import json
import structlog
from datetime import datetime

logger = structlog.get_logger()


class ConnectionManager:
    """Manages WebSocket connections"""
    
    def __init__(self):
        # Active connections: {user_id: websocket}
        self.active_connections: Dict[str, WebSocket] = {}
        # Channel subscriptions: {channel: set(user_ids)}
        self.channel_subscriptions: Dict[str, Set[str]] = {}
        # User channels: {user_id: set(channels)}
        self.user_channels: Dict[str, Set[str]] = {}
    
    async def connect(self, websocket: WebSocket, user_id: str):
        """Accept WebSocket connection"""
        await websocket.accept()
        self.active_connections[user_id] = websocket
        
        # Subscribe to user-specific channel
        await self.subscribe_user_to_channel(user_id, f"user:{user_id}")
        
        logger.info(f"User {user_id} connected")
    
    async def disconnect(self, user_id: str):
        """Handle WebSocket disconnection"""
        if user_id in self.active_connections:
            del self.active_connections[user_id]
        
        # Unsubscribe from all channels
        if user_id in self.user_channels:
            for channel in self.user_channels[user_id]:
                await self.unsubscribe_user_from_channel(user_id, channel)
            del self.user_channels[user_id]
        
        logger.info(f"User {user_id} disconnected")
    
    async def subscribe_user_to_channel(self, user_id: str, channel: str):
        """Subscribe user to a channel"""
        if channel not in self.channel_subscriptions:
            self.channel_subscriptions[channel] = set()
        
        self.channel_subscriptions[channel].add(user_id)
        
        if user_id not in self.user_channels:
            self.user_channels[user_id] = set()
        self.user_channels[user_id].add(channel)
        
        logger.info(f"User {user_id} subscribed to channel {channel}")
    
    async def unsubscribe_user_from_channel(self, user_id: str, channel: str):
        """Unsubscribe user from a channel"""
        if channel in self.channel_subscriptions:
            self.channel_subscriptions[channel].discard(user_id)
        
        if user_id in self.user_channels:
            self.user_channels[user_id].discard(channel)
        
        logger.info(f"User {user_id} unsubscribed from channel {channel}")
    
    async def send_to_user(self, user_id: str, message: dict):
        """Send message to specific user"""
        if user_id in self.active_connections:
            try:
                await self.active_connections[user_id].send_text(json.dumps(message))
                return True
            except Exception as e:
                logger.error(f"Failed to send message to user {user_id}: {e}")
                await self.disconnect(user_id)
                return False
        return False
    
    async def send_to_channel(self, channel: str, message: dict):
        """Send message to all users in a channel"""
        if channel not in self.channel_subscriptions:
            return
        
        disconnected_users = []
        for user_id in self.channel_subscriptions[channel]:
            if not await self.send_to_user(user_id, message):
                disconnected_users.append(user_id)
        
        # Clean up disconnected users
        for user_id in disconnected_users:
            self.channel_subscriptions[channel].discard(user_id)
    
    async def broadcast_to_organization(self, organization_id: str, message: dict):
        """Broadcast message to all users in an organization"""
        channel = f"organization:{organization_id}"
        await self.send_to_channel(channel, message)
    
    async def send_notification(self, user_id: str, notification: dict):
        """Send notification to user"""
        message = {
            "type": "notification",
            "data": notification,
            "timestamp": datetime.utcnow().isoformat()
        }
        await self.send_to_user(user_id, message)
    
    async def send_employee_update(self, employee_id: str, update_data: dict):
        """Send employee update to relevant users"""
        message = {
            "type": "employee.updated",
            "data": {
                "employee_id": employee_id,
                "update": update_data,
                "timestamp": datetime.utcnow().isoformat()
            }
        }
        
        # Send to employee's manager and HR
        await self.send_to_channel(f"employee:{employee_id}", message)
    
    async def send_attendance_update(self, employee_id: str, attendance_data: dict):
        """Send attendance update"""
        message = {
            "type": "attendance.updated",
            "data": {
                "employee_id": employee_id,
                "attendance": attendance_data,
                "timestamp": datetime.utcnow().isoformat()
            }
        }
        
        await self.send_to_channel(f"employee:{employee_id}", message)
    
    async def send_leave_update(self, employee_id: str, leave_data: dict):
        """Send leave request update"""
        message = {
            "type": "leave.updated",
            "data": {
                "employee_id": employee_id,
                "leave": leave_data,
                "timestamp": datetime.utcnow().isoformat()
            }
        }
        
        await self.send_to_channel(f"employee:{employee_id}", message)
    
    def get_connection_count(self) -> int:
        """Get number of active connections"""
        return len(self.active_connections)
    
    def get_channel_subscribers(self, channel: str) -> int:
        """Get number of subscribers to a channel"""
        return len(self.channel_subscriptions.get(channel, set()))


# Global connection manager instance
connection_manager = ConnectionManager()
