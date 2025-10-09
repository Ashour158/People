"""
Holiday Calendar Service
Manages holiday calendars for different countries/regions with API integration support
"""
import httpx
from typing import Optional, Dict, Any, List
from uuid import UUID
from datetime import datetime, date
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, extract

from app.models.integrations import HolidayCalendar, Holiday, Integration
from app.schemas.integrations import (
    HolidayCalendarCreate, HolidayCalendarUpdate,
    HolidayCreate
)
from app.core.exceptions import NotFoundException, IntegrationError


class HolidayCalendarService:
    """Service for holiday calendar management"""
    
    # Public holiday APIs
    CALENDARIFIC_API_BASE = "https://calendarific.com/api/v2"
    ABSTRACTAPI_BASE = "https://holidays.abstractapi.com/v1"
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    # ==================== Calendar Management ====================
    
    async def create_calendar(
        self,
        calendar_data: HolidayCalendarCreate
    ) -> HolidayCalendar:
        """Create a new holiday calendar"""
        # If setting as default, unset other defaults
        if calendar_data.is_default:
            await self._unset_default_calendars(calendar_data.organization_id)
        
        calendar = HolidayCalendar(**calendar_data.dict())
        self.db.add(calendar)
        await self.db.commit()
        await self.db.refresh(calendar)
        return calendar
    
    async def get_calendar(self, calendar_id: UUID) -> Optional[HolidayCalendar]:
        """Get holiday calendar by ID"""
        query = select(HolidayCalendar).where(
            HolidayCalendar.calendar_id == calendar_id
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()
    
    async def get_default_calendar(
        self,
        organization_id: UUID
    ) -> Optional[HolidayCalendar]:
        """Get default holiday calendar for organization"""
        query = select(HolidayCalendar).where(
            and_(
                HolidayCalendar.organization_id == organization_id,
                HolidayCalendar.is_default == True,
                HolidayCalendar.is_active == True
            )
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()
    
    async def get_calendars_by_organization(
        self,
        organization_id: UUID,
        is_active: Optional[bool] = None
    ) -> List[HolidayCalendar]:
        """Get all holiday calendars for an organization"""
        query = select(HolidayCalendar).where(
            HolidayCalendar.organization_id == organization_id
        )
        
        if is_active is not None:
            query = query.where(HolidayCalendar.is_active == is_active)
        
        result = await self.db.execute(query)
        return result.scalars().all()
    
    async def update_calendar(
        self,
        calendar_id: UUID,
        calendar_data: HolidayCalendarUpdate
    ) -> HolidayCalendar:
        """Update holiday calendar"""
        calendar = await self.get_calendar(calendar_id)
        
        if not calendar:
            raise NotFoundException(f"Calendar {calendar_id} not found")
        
        # If setting as default, unset other defaults
        if calendar_data.is_default and calendar_data.is_default != calendar.is_default:
            await self._unset_default_calendars(calendar.organization_id)
        
        for key, value in calendar_data.dict(exclude_unset=True).items():
            setattr(calendar, key, value)
        
        await self.db.commit()
        await self.db.refresh(calendar)
        return calendar
    
    # ==================== Holiday Management ====================
    
    async def add_holiday(self, holiday_data: HolidayCreate) -> Holiday:
        """Add a holiday to a calendar"""
        holiday = Holiday(**holiday_data.dict())
        self.db.add(holiday)
        await self.db.commit()
        await self.db.refresh(holiday)
        return holiday
    
    async def get_holiday(self, holiday_id: UUID) -> Optional[Holiday]:
        """Get holiday by ID"""
        query = select(Holiday).where(Holiday.holiday_id == holiday_id)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()
    
    async def get_holidays_by_calendar(
        self,
        calendar_id: UUID,
        year: Optional[int] = None,
        month: Optional[int] = None
    ) -> List[Holiday]:
        """Get holidays for a specific calendar"""
        query = select(Holiday).where(Holiday.calendar_id == calendar_id)
        
        if year:
            query = query.where(extract('year', Holiday.holiday_date) == year)
        
        if month:
            query = query.where(extract('month', Holiday.holiday_date) == month)
        
        query = query.order_by(Holiday.holiday_date)
        
        result = await self.db.execute(query)
        return result.scalars().all()
    
    async def get_holidays_by_date_range(
        self,
        organization_id: UUID,
        start_date: datetime,
        end_date: datetime,
        calendar_id: Optional[UUID] = None
    ) -> List[Holiday]:
        """Get holidays within a date range"""
        if calendar_id:
            query = select(Holiday).where(Holiday.calendar_id == calendar_id)
        else:
            # Get default calendar holidays
            calendar = await self.get_default_calendar(organization_id)
            if not calendar:
                return []
            query = select(Holiday).where(Holiday.calendar_id == calendar.calendar_id)
        
        query = query.where(
            and_(
                Holiday.holiday_date >= start_date,
                Holiday.holiday_date <= end_date
            )
        ).order_by(Holiday.holiday_date)
        
        result = await self.db.execute(query)
        return result.scalars().all()
    
    async def is_holiday(
        self,
        organization_id: UUID,
        check_date: date,
        calendar_id: Optional[UUID] = None
    ) -> Dict[str, Any]:
        """Check if a specific date is a holiday"""
        if calendar_id:
            calendar = await self.get_calendar(calendar_id)
        else:
            calendar = await self.get_default_calendar(organization_id)
        
        if not calendar:
            return {"is_holiday": False, "holiday": None}
        
        query = select(Holiday).where(
            and_(
                Holiday.calendar_id == calendar.calendar_id,
                extract('year', Holiday.holiday_date) == check_date.year,
                extract('month', Holiday.holiday_date) == check_date.month,
                extract('day', Holiday.holiday_date) == check_date.day
            )
        )
        
        result = await self.db.execute(query)
        holiday = result.scalar_one_or_none()
        
        return {
            "is_holiday": holiday is not None,
            "holiday": {
                "holiday_id": str(holiday.holiday_id),
                "name": holiday.holiday_name,
                "type": holiday.holiday_type,
                "is_mandatory": holiday.is_mandatory,
                "is_paid": holiday.is_paid
            } if holiday else None
        }
    
    async def delete_holiday(self, holiday_id: UUID) -> bool:
        """Delete a holiday"""
        holiday = await self.get_holiday(holiday_id)
        
        if not holiday:
            raise NotFoundException(f"Holiday {holiday_id} not found")
        
        await self.db.delete(holiday)
        await self.db.commit()
        return True
    
    # ==================== API Integration ====================
    
    async def sync_from_api(
        self,
        calendar_id: UUID,
        api_key: str,
        year: int
    ) -> Dict[str, Any]:
        """Sync holidays from public API"""
        calendar = await self.get_calendar(calendar_id)
        
        if not calendar:
            raise NotFoundException(f"Calendar {calendar_id} not found")
        
        try:
            # Fetch holidays from Calendarific API
            holidays_data = await self._fetch_holidays_from_calendarific(
                api_key,
                calendar.country_code,
                year
            )
            
            # Import holidays
            imported_count = 0
            for holiday_data in holidays_data:
                # Check if holiday already exists
                existing = await self._check_holiday_exists(
                    calendar_id,
                    holiday_data["date"],
                    holiday_data["name"]
                )
                
                if not existing:
                    holiday = Holiday(
                        calendar_id=calendar_id,
                        organization_id=calendar.organization_id,
                        holiday_name=holiday_data["name"],
                        holiday_date=datetime.strptime(holiday_data["date"], "%Y-%m-%d"),
                        holiday_type=holiday_data.get("type", "national"),
                        is_mandatory=True,
                        is_paid=True,
                        description=holiday_data.get("description"),
                        is_recurring=True
                    )
                    self.db.add(holiday)
                    imported_count += 1
            
            await self.db.commit()
            
            # Update last sync time
            calendar.last_sync_at = datetime.utcnow()
            await self.db.commit()
            
            return {
                "success": True,
                "calendar_id": str(calendar_id),
                "year": year,
                "imported": imported_count,
                "total_fetched": len(holidays_data)
            }
        
        except Exception as e:
            raise IntegrationError(f"Failed to sync holidays: {str(e)}")
    
    async def sync_multiple_years(
        self,
        calendar_id: UUID,
        api_key: str,
        start_year: int,
        end_year: int
    ) -> Dict[str, Any]:
        """Sync holidays for multiple years"""
        results = []
        
        for year in range(start_year, end_year + 1):
            try:
                result = await self.sync_from_api(calendar_id, api_key, year)
                results.append(result)
            except Exception as e:
                results.append({
                    "success": False,
                    "year": year,
                    "error": str(e)
                })
        
        return {
            "calendar_id": str(calendar_id),
            "years_synced": len([r for r in results if r.get("success")]),
            "total_years": len(results),
            "results": results
        }
    
    # ==================== Country-Specific Calendars ====================
    
    async def create_us_calendar(
        self,
        organization_id: UUID,
        calendar_name: str = "US Federal Holidays"
    ) -> HolidayCalendar:
        """Create US federal holiday calendar"""
        calendar_data = HolidayCalendarCreate(
            organization_id=organization_id,
            calendar_name=calendar_name,
            country_code="USA",
            source="manual",
            is_default=True
        )
        
        calendar = await self.create_calendar(calendar_data)
        
        # Add common US federal holidays
        us_holidays = [
            ("New Year's Day", "01-01", "national"),
            ("Martin Luther King Jr. Day", "01-15", "national"),  # 3rd Monday
            ("Presidents' Day", "02-20", "national"),  # 3rd Monday
            ("Memorial Day", "05-29", "national"),  # Last Monday
            ("Independence Day", "07-04", "national"),
            ("Labor Day", "09-04", "national"),  # 1st Monday
            ("Columbus Day", "10-09", "national"),  # 2nd Monday
            ("Veterans Day", "11-11", "national"),
            ("Thanksgiving", "11-23", "national"),  # 4th Thursday
            ("Christmas Day", "12-25", "national"),
        ]
        
        current_year = datetime.utcnow().year
        
        for name, date_str, holiday_type in us_holidays:
            holiday = Holiday(
                calendar_id=calendar.calendar_id,
                organization_id=organization_id,
                holiday_name=name,
                holiday_date=datetime.strptime(f"{current_year}-{date_str}", "%Y-%m-%d"),
                holiday_type=holiday_type,
                is_mandatory=True,
                is_paid=True,
                is_recurring=True
            )
            self.db.add(holiday)
        
        await self.db.commit()
        return calendar
    
    async def create_uk_calendar(
        self,
        organization_id: UUID,
        calendar_name: str = "UK Public Holidays"
    ) -> HolidayCalendar:
        """Create UK public holiday calendar"""
        calendar_data = HolidayCalendarCreate(
            organization_id=organization_id,
            calendar_name=calendar_name,
            country_code="GBR",
            source="manual",
            is_default=True
        )
        
        calendar = await self.create_calendar(calendar_data)
        
        # Add common UK public holidays
        uk_holidays = [
            ("New Year's Day", "01-01", "national"),
            ("Good Friday", "04-14", "national"),
            ("Easter Monday", "04-17", "national"),
            ("Early May Bank Holiday", "05-01", "national"),
            ("Spring Bank Holiday", "05-29", "national"),
            ("Summer Bank Holiday", "08-28", "national"),
            ("Christmas Day", "12-25", "national"),
            ("Boxing Day", "12-26", "national"),
        ]
        
        current_year = datetime.utcnow().year
        
        for name, date_str, holiday_type in uk_holidays:
            holiday = Holiday(
                calendar_id=calendar.calendar_id,
                organization_id=organization_id,
                holiday_name=name,
                holiday_date=datetime.strptime(f"{current_year}-{date_str}", "%Y-%m-%d"),
                holiday_type=holiday_type,
                is_mandatory=True,
                is_paid=True,
                is_recurring=True
            )
            self.db.add(holiday)
        
        await self.db.commit()
        return calendar
    
    async def create_india_calendar(
        self,
        organization_id: UUID,
        calendar_name: str = "India Public Holidays"
    ) -> HolidayCalendar:
        """Create India public holiday calendar"""
        calendar_data = HolidayCalendarCreate(
            organization_id=organization_id,
            calendar_name=calendar_name,
            country_code="IND",
            source="manual",
            is_default=True
        )
        
        calendar = await self.create_calendar(calendar_data)
        
        # Add common India public holidays
        india_holidays = [
            ("Republic Day", "01-26", "national"),
            ("Holi", "03-08", "religious"),
            ("Good Friday", "04-14", "religious"),
            ("Independence Day", "08-15", "national"),
            ("Gandhi Jayanti", "10-02", "national"),
            ("Diwali", "10-24", "religious"),
            ("Christmas", "12-25", "religious"),
        ]
        
        current_year = datetime.utcnow().year
        
        for name, date_str, holiday_type in india_holidays:
            holiday = Holiday(
                calendar_id=calendar.calendar_id,
                organization_id=organization_id,
                holiday_name=name,
                holiday_date=datetime.strptime(f"{current_year}-{date_str}", "%Y-%m-%d"),
                holiday_type=holiday_type,
                is_mandatory=True,
                is_paid=True,
                is_recurring=True
            )
            self.db.add(holiday)
        
        await self.db.commit()
        return calendar
    
    # ==================== Helper Methods ====================
    
    async def _fetch_holidays_from_calendarific(
        self,
        api_key: str,
        country_code: str,
        year: int
    ) -> List[Dict[str, Any]]:
        """Fetch holidays from Calendarific API"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.CALENDARIFIC_API_BASE}/holidays",
                    params={
                        "api_key": api_key,
                        "country": country_code,
                        "year": year
                    },
                    timeout=30.0
                )
                
                if response.status_code != 200:
                    raise IntegrationError("Failed to fetch holidays from API")
                
                data = response.json()
                holidays = data.get("response", {}).get("holidays", [])
                
                # Format holidays
                formatted = []
                for h in holidays:
                    formatted.append({
                        "name": h.get("name"),
                        "date": h.get("date", {}).get("iso"),
                        "type": h.get("type", ["national"])[0] if h.get("type") else "national",
                        "description": h.get("description")
                    })
                
                return formatted
        
        except httpx.HTTPError as e:
            raise IntegrationError(f"API request failed: {str(e)}")
    
    async def _check_holiday_exists(
        self,
        calendar_id: UUID,
        date_str: str,
        name: str
    ) -> bool:
        """Check if holiday already exists"""
        holiday_date = datetime.strptime(date_str, "%Y-%m-%d")
        
        query = select(Holiday).where(
            and_(
                Holiday.calendar_id == calendar_id,
                extract('year', Holiday.holiday_date) == holiday_date.year,
                extract('month', Holiday.holiday_date) == holiday_date.month,
                extract('day', Holiday.holiday_date) == holiday_date.day,
                Holiday.holiday_name == name
            )
        )
        
        result = await self.db.execute(query)
        return result.scalar_one_or_none() is not None
    
    async def _unset_default_calendars(self, organization_id: UUID):
        """Unset all default calendars for organization"""
        query = select(HolidayCalendar).where(
            and_(
                HolidayCalendar.organization_id == organization_id,
                HolidayCalendar.is_default == True
            )
        )
        result = await self.db.execute(query)
        calendars = result.scalars().all()
        
        for calendar in calendars:
            calendar.is_default = False
        
        await self.db.commit()
