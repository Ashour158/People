"""
Biometric and Geofencing Service
Handles biometric device integration and geofence-based attendance verification
"""
import httpx
import math
from typing import Optional, Dict, Any, List, Tuple
from uuid import UUID
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.models.integrations import BiometricDevice, GeofenceLocation, IntegrationLog
from app.schemas.integrations import (
    BiometricDeviceCreate, BiometricDeviceUpdate,
    GeofenceLocationCreate, GeofenceLocationUpdate
)
from app.core.exceptions import NotFoundException, IntegrationError, ValidationError


class BiometricService:
    """Service for biometric device integration"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    # ==================== Device Configuration ====================
    
    async def create_device(self, device_data: BiometricDeviceCreate) -> BiometricDevice:
        """Register a new biometric device"""
        device = BiometricDevice(**device_data.dict())
        self.db.add(device)
        await self.db.commit()
        await self.db.refresh(device)
        return device
    
    async def get_device(self, device_id: UUID) -> Optional[BiometricDevice]:
        """Get biometric device by ID"""
        query = select(BiometricDevice).where(BiometricDevice.device_id == device_id)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()
    
    async def get_devices_by_organization(
        self,
        organization_id: UUID,
        is_active: Optional[bool] = None,
        is_online: Optional[bool] = None
    ) -> List[BiometricDevice]:
        """Get all biometric devices for an organization"""
        query = select(BiometricDevice).where(
            BiometricDevice.organization_id == organization_id
        )
        
        if is_active is not None:
            query = query.where(BiometricDevice.is_active == is_active)
        
        if is_online is not None:
            query = query.where(BiometricDevice.is_online == is_online)
        
        result = await self.db.execute(query)
        return result.scalars().all()
    
    async def update_device(
        self,
        device_id: UUID,
        device_data: BiometricDeviceUpdate
    ) -> BiometricDevice:
        """Update biometric device configuration"""
        device = await self.get_device(device_id)
        
        if not device:
            raise NotFoundException(f"Biometric device {device_id} not found")
        
        for key, value in device_data.dict(exclude_unset=True).items():
            setattr(device, key, value)
        
        await self.db.commit()
        await self.db.refresh(device)
        return device
    
    async def ping_device(self, device_id: UUID) -> Dict[str, Any]:
        """Check if biometric device is online"""
        device = await self.get_device(device_id)
        
        if not device:
            raise NotFoundException(f"Device {device_id} not found")
        
        try:
            # Ping device endpoint
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"http://{device.ip_address}:{device.port or 80}/status",
                    timeout=5.0
                )
                
                is_online = response.status_code == 200
                
                device.is_online = is_online
                device.last_ping_at = datetime.utcnow()
                await self.db.commit()
                
                return {
                    "device_id": str(device_id),
                    "is_online": is_online,
                    "last_ping": device.last_ping_at
                }
        
        except Exception as e:
            device.is_online = False
            device.last_ping_at = datetime.utcnow()
            await self.db.commit()
            
            return {
                "device_id": str(device_id),
                "is_online": False,
                "error": str(e)
            }
    
    # ==================== Attendance Recording ====================
    
    async def record_attendance(
        self,
        device_id: UUID,
        employee_id: UUID,
        biometric_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Record attendance from biometric device"""
        device = await self.get_device(device_id)
        
        if not device:
            raise NotFoundException(f"Device {device_id} not found")
        
        # Verify biometric data (in production, this would involve actual verification)
        verification_result = await self._verify_biometric_data(
            device,
            employee_id,
            biometric_data
        )
        
        if not verification_result["verified"]:
            raise ValidationError("Biometric verification failed")
        
        # Create attendance record
        attendance_data = {
            "device_id": str(device_id),
            "employee_id": str(employee_id),
            "device_type": device.device_type,
            "location": device.location_name,
            "latitude": device.latitude,
            "longitude": device.longitude,
            "timestamp": datetime.utcnow(),
            "verification_score": verification_result["score"]
        }
        
        # Log the attendance
        await self._log_device_event(
            integration_id=device.integration_id,
            organization_id=device.organization_id,
            event_type="attendance_recorded",
            request_data={"employee_id": str(employee_id)},
            response_data=attendance_data,
            is_success=True
        )
        
        return attendance_data
    
    async def sync_attendance_data(self, device_id: UUID) -> List[Dict[str, Any]]:
        """Sync attendance data from biometric device"""
        device = await self.get_device(device_id)
        
        if not device:
            raise NotFoundException(f"Device {device_id} not found")
        
        try:
            # Fetch attendance logs from device
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"http://{device.ip_address}:{device.port or 80}/attendance/logs",
                    headers={"Authorization": f"Bearer {device.api_key}"},
                    params={"since": device.last_sync_at.isoformat() if device.last_sync_at else None},
                    timeout=30.0
                )
                
                if response.status_code != 200:
                    raise IntegrationError(f"Failed to sync from device: {response.text}")
                
                data = response.json()
                attendance_logs = data.get("logs", [])
                
                # Update last sync time
                device.last_sync_at = datetime.utcnow()
                await self.db.commit()
                
                return attendance_logs
        
        except httpx.HTTPError as e:
            raise IntegrationError(f"Device sync error: {str(e)}")
    
    async def enroll_employee(
        self,
        device_id: UUID,
        employee_id: UUID,
        biometric_template: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Enroll employee's biometric data on device"""
        device = await self.get_device(device_id)
        
        if not device:
            raise NotFoundException(f"Device {device_id} not found")
        
        payload = {
            "employee_id": str(employee_id),
            "template_type": device.device_type,
            "template_data": biometric_template
        }
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"http://{device.ip_address}:{device.port or 80}/enrollment",
                    headers={"Authorization": f"Bearer {device.api_key}"},
                    json=payload,
                    timeout=30.0
                )
                
                if response.status_code not in [200, 201]:
                    raise IntegrationError("Failed to enroll employee")
                
                result = response.json()
                
                # Log enrollment
                await self._log_device_event(
                    integration_id=device.integration_id,
                    organization_id=device.organization_id,
                    event_type="employee_enrolled",
                    request_data=payload,
                    response_data=result,
                    is_success=True
                )
                
                return result
        
        except httpx.HTTPError as e:
            raise IntegrationError(f"Enrollment error: {str(e)}")
    
    # ==================== Helper Methods ====================
    
    async def _verify_biometric_data(
        self,
        device: BiometricDevice,
        employee_id: UUID,
        biometric_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Verify biometric data against stored template"""
        # In production, this would call the actual biometric verification API
        # For now, simulate verification
        return {
            "verified": True,
            "score": 0.95,
            "device_type": device.device_type
        }
    
    async def _log_device_event(
        self,
        integration_id: UUID,
        organization_id: UUID,
        event_type: str,
        request_data: Optional[Dict] = None,
        response_data: Optional[Dict] = None,
        is_success: bool = True,
        error_message: Optional[str] = None
    ):
        """Log biometric device event"""
        log = IntegrationLog(
            integration_id=integration_id,
            organization_id=organization_id,
            event_type=event_type,
            request_data=request_data,
            response_data=response_data,
            is_success=is_success,
            error_message=error_message
        )
        
        self.db.add(log)
        await self.db.commit()


class GeofencingService:
    """Service for geofence-based attendance verification"""
    
    # Earth radius in meters
    EARTH_RADIUS = 6371000
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    # ==================== Geofence Configuration ====================
    
    async def create_geofence(
        self,
        geofence_data: GeofenceLocationCreate
    ) -> GeofenceLocation:
        """Create a new geofence location"""
        geofence = GeofenceLocation(**geofence_data.dict())
        self.db.add(geofence)
        await self.db.commit()
        await self.db.refresh(geofence)
        return geofence
    
    async def get_geofence(self, geofence_id: UUID) -> Optional[GeofenceLocation]:
        """Get geofence by ID"""
        query = select(GeofenceLocation).where(
            GeofenceLocation.geofence_id == geofence_id
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()
    
    async def get_geofences_by_organization(
        self,
        organization_id: UUID,
        is_active: Optional[bool] = None
    ) -> List[GeofenceLocation]:
        """Get all geofences for an organization"""
        query = select(GeofenceLocation).where(
            GeofenceLocation.organization_id == organization_id
        )
        
        if is_active is not None:
            query = query.where(GeofenceLocation.is_active == is_active)
        
        result = await self.db.execute(query)
        return result.scalars().all()
    
    async def update_geofence(
        self,
        geofence_id: UUID,
        geofence_data: GeofenceLocationUpdate
    ) -> GeofenceLocation:
        """Update geofence configuration"""
        geofence = await self.get_geofence(geofence_id)
        
        if not geofence:
            raise NotFoundException(f"Geofence {geofence_id} not found")
        
        for key, value in geofence_data.dict(exclude_unset=True).items():
            setattr(geofence, key, value)
        
        await self.db.commit()
        await self.db.refresh(geofence)
        return geofence
    
    # ==================== Location Verification ====================
    
    async def verify_location(
        self,
        organization_id: UUID,
        latitude: float,
        longitude: float,
        location_type: Optional[str] = None
    ) -> Dict[str, Any]:
        """Verify if coordinates are within any geofence"""
        geofences = await self.get_geofences_by_organization(organization_id, is_active=True)
        
        if location_type:
            geofences = [g for g in geofences if g.location_type == location_type]
        
        results = []
        
        for geofence in geofences:
            distance = self.calculate_distance(
                latitude,
                longitude,
                float(geofence.latitude),
                float(geofence.longitude)
            )
            
            within_geofence = distance <= geofence.radius_meters
            
            results.append({
                "geofence_id": str(geofence.geofence_id),
                "location_name": geofence.location_name,
                "location_type": geofence.location_type,
                "distance_meters": round(distance, 2),
                "radius_meters": geofence.radius_meters,
                "within_geofence": within_geofence,
                "strict_mode": geofence.strict_mode
            })
        
        # Find the closest geofence
        closest = min(results, key=lambda x: x["distance_meters"]) if results else None
        
        return {
            "verified": any(r["within_geofence"] for r in results),
            "closest_location": closest,
            "all_locations": results
        }
    
    async def verify_check_in(
        self,
        organization_id: UUID,
        employee_id: UUID,
        latitude: float,
        longitude: float
    ) -> Dict[str, Any]:
        """Verify employee check-in location"""
        verification = await self.verify_location(organization_id, latitude, longitude)
        
        if not verification["verified"]:
            closest = verification["closest_location"]
            if closest and closest["strict_mode"]:
                raise ValidationError(
                    f"Check-in location outside geofence. "
                    f"You are {closest['distance_meters']}m from {closest['location_name']}"
                )
        
        return {
            "employee_id": str(employee_id),
            "latitude": latitude,
            "longitude": longitude,
            "verified": verification["verified"],
            "location": verification["closest_location"],
            "timestamp": datetime.utcnow()
        }
    
    async def verify_check_out(
        self,
        organization_id: UUID,
        employee_id: UUID,
        latitude: float,
        longitude: float
    ) -> Dict[str, Any]:
        """Verify employee check-out location"""
        return await self.verify_check_in(organization_id, employee_id, latitude, longitude)
    
    def calculate_distance(
        self,
        lat1: float,
        lon1: float,
        lat2: float,
        lon2: float
    ) -> float:
        """
        Calculate distance between two coordinates using Haversine formula
        Returns distance in meters
        """
        # Convert to radians
        lat1_rad = math.radians(lat1)
        lat2_rad = math.radians(lat2)
        delta_lat = math.radians(lat2 - lat1)
        delta_lon = math.radians(lon2 - lon1)
        
        # Haversine formula
        a = (
            math.sin(delta_lat / 2) ** 2 +
            math.cos(lat1_rad) * math.cos(lat2_rad) *
            math.sin(delta_lon / 2) ** 2
        )
        
        c = 2 * math.asin(math.sqrt(a))
        
        # Distance in meters
        distance = self.EARTH_RADIUS * c
        
        return distance
    
    async def get_nearby_geofences(
        self,
        organization_id: UUID,
        latitude: float,
        longitude: float,
        max_distance: int = 1000  # meters
    ) -> List[Dict[str, Any]]:
        """Get geofences within a certain distance"""
        geofences = await self.get_geofences_by_organization(organization_id, is_active=True)
        
        nearby = []
        
        for geofence in geofences:
            distance = self.calculate_distance(
                latitude,
                longitude,
                float(geofence.latitude),
                float(geofence.longitude)
            )
            
            if distance <= max_distance:
                nearby.append({
                    "geofence_id": str(geofence.geofence_id),
                    "location_name": geofence.location_name,
                    "location_type": geofence.location_type,
                    "address": geofence.address,
                    "distance_meters": round(distance, 2),
                    "radius_meters": geofence.radius_meters,
                    "can_check_in": distance <= geofence.radius_meters and geofence.enable_check_in,
                    "can_check_out": distance <= geofence.radius_meters and geofence.enable_check_out
                })
        
        # Sort by distance
        nearby.sort(key=lambda x: x["distance_meters"])
        
        return nearby
    
    async def track_employee_movement(
        self,
        organization_id: UUID,
        employee_id: UUID,
        coordinates: List[Tuple[float, float, datetime]]
    ) -> Dict[str, Any]:
        """Track employee movement through geofences"""
        geofences = await self.get_geofences_by_organization(organization_id, is_active=True)
        
        movement_log = []
        
        for lat, lon, timestamp in coordinates:
            for geofence in geofences:
                distance = self.calculate_distance(
                    lat, lon,
                    float(geofence.latitude),
                    float(geofence.longitude)
                )
                
                if distance <= geofence.radius_meters:
                    movement_log.append({
                        "timestamp": timestamp,
                        "latitude": lat,
                        "longitude": lon,
                        "geofence_id": str(geofence.geofence_id),
                        "location_name": geofence.location_name,
                        "distance_meters": round(distance, 2)
                    })
        
        return {
            "employee_id": str(employee_id),
            "total_points": len(coordinates),
            "geofence_entries": len(movement_log),
            "movement_log": movement_log
        }
