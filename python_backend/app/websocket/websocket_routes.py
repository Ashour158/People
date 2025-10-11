"""
WebSocket routes for real-time communication
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException
from fastapi.security import HTTPBearer
import structlog
import json

from app.websocket.websocket_manager import connection_manager
from app.middleware.auth import AuthMiddleware
from app.core.security import decode_token

router = APIRouter()
security = HTTPBearer()
logger = structlog.get_logger()


async def get_user_from_token(token: str):
    """Extract user information from JWT token"""
    try:
        payload = decode_token(token)
        if not payload:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        return {
            "user_id": payload.get("sub"),
            "organization_id": payload.get("organization_id"),
            "employee_id": payload.get("employee_id"),
            "role": payload.get("role")
        }
    except Exception as e:
        logger.error(f"Token validation error: {e}")
        raise HTTPException(status_code=401, detail="Invalid token")


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: str = None):
    """Main WebSocket endpoint"""
    if not token:
        await websocket.close(code=1008, reason="No token provided")
        return
    
    try:
        # Validate token and get user info
        user_info = await get_user_from_token(token)
        user_id = user_info["user_id"]
        
        # Connect user
        await connection_manager.connect(websocket, user_id)
        
        # Subscribe to organization channel
        org_id = user_info["organization_id"]
        if org_id:
            await connection_manager.subscribe_user_to_channel(
                user_id, f"organization:{org_id}"
            )
        
        # Subscribe to employee channel if user is employee
        employee_id = user_info.get("employee_id")
        if employee_id:
            await connection_manager.subscribe_user_to_channel(
                user_id, f"employee:{employee_id}"
            )
        
        logger.info(f"WebSocket connection established for user {user_id}")
        
        try:
            while True:
                # Listen for messages from client
                data = await websocket.receive_text()
                message = json.loads(data)
                
                # Handle different message types
                await handle_client_message(user_id, message)
                
        except WebSocketDisconnect:
            logger.info(f"WebSocket disconnected for user {user_id}")
        except Exception as e:
            logger.error(f"WebSocket error for user {user_id}: {e}")
        finally:
            await connection_manager.disconnect(user_id)
            
    except HTTPException as e:
        await websocket.close(code=1008, reason=str(e.detail))
    except Exception as e:
        logger.error(f"WebSocket connection error: {e}")
        await websocket.close(code=1011, reason="Internal server error")


async def handle_client_message(user_id: str, message: dict):
    """Handle messages from client"""
    message_type = message.get("type")
    
    if message_type == "subscribe":
        channels = message.get("channels", [])
        for channel in channels:
            await connection_manager.subscribe_user_to_channel(user_id, channel)
    
    elif message_type == "unsubscribe":
        channels = message.get("channels", [])
        for channel in channels:
            await connection_manager.unsubscribe_user_from_channel(user_id, channel)
    
    elif message_type == "ping":
        # Respond to ping with pong
        await connection_manager.send_to_user(user_id, {
            "type": "pong",
            "timestamp": message.get("timestamp")
        })
    
    else:
        logger.warning(f"Unknown message type: {message_type}")


@router.get("/ws/status")
async def websocket_status():
    """Get WebSocket connection status"""
    return {
        "active_connections": connection_manager.get_connection_count(),
        "channels": {
            channel: connection_manager.get_channel_subscribers(channel)
            for channel in connection_manager.channel_subscriptions.keys()
        }
    }
