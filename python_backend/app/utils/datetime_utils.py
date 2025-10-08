"""Utility functions for date and time operations"""
from datetime import datetime, date, timedelta
from typing import Optional, Tuple


def get_month_range(year: int, month: int) -> Tuple[date, date]:
    """Get start and end dates for a month"""
    start_date = date(year, month, 1)
    
    if month == 12:
        end_date = date(year + 1, 1, 1) - timedelta(days=1)
    else:
        end_date = date(year, month + 1, 1) - timedelta(days=1)
    
    return start_date, end_date


def get_current_month_range() -> Tuple[date, date]:
    """Get start and end dates for current month"""
    today = date.today()
    return get_month_range(today.year, today.month)


def calculate_work_hours(
    check_in: datetime,
    check_out: datetime
) -> float:
    """Calculate work hours between check-in and check-out"""
    if not check_in or not check_out:
        return 0.0
    
    duration = check_out - check_in
    hours = duration.total_seconds() / 3600
    return round(hours, 2)


def calculate_business_days(
    start_date: date,
    end_date: date,
    exclude_weekends: bool = True
) -> int:
    """Calculate business days between two dates"""
    if start_date > end_date:
        return 0
    
    days = 0
    current = start_date
    
    while current <= end_date:
        if not exclude_weekends or current.weekday() < 5:  # Monday = 0, Sunday = 6
            days += 1
        current += timedelta(days=1)
    
    return days


def format_datetime(dt: Optional[datetime], fmt: str = "%Y-%m-%d %H:%M:%S") -> Optional[str]:
    """Format datetime to string"""
    if not dt:
        return None
    return dt.strftime(fmt)


def parse_datetime(dt_str: str, fmt: str = "%Y-%m-%d %H:%M:%S") -> Optional[datetime]:
    """Parse datetime from string"""
    try:
        return datetime.strptime(dt_str, fmt)
    except (ValueError, TypeError):
        return None


def is_within_time_range(
    time_to_check: datetime,
    start_time: datetime,
    end_time: datetime
) -> bool:
    """Check if time is within range"""
    return start_time <= time_to_check <= end_time


def get_time_difference_minutes(
    time1: datetime,
    time2: datetime
) -> int:
    """Get time difference in minutes"""
    if not time1 or not time2:
        return 0
    
    diff = abs(time2 - time1)
    return int(diff.total_seconds() / 60)
