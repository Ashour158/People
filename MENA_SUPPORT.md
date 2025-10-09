# MENA Region Support Documentation

## Overview

This document describes the comprehensive support for Middle East and North Africa (MENA) region in the HR Management System, including tax calculations, holiday calendars, and geofencing support.

## MENA Tax Calculations

The system now supports tax calculations for 8 MENA countries with accurate tax brackets and rates.

### Supported Countries

#### 1. United Arab Emirates (UAE)
- **Country Code**: `AE` or `UAE`
- **Personal Income Tax**: 0% (no personal income tax)
- **Corporate Tax**: 9% (not calculated here)
- **VAT**: 5% (handled separately)

**Usage:**
```python
from app.api.v1.endpoints.payroll import TaxCalculator
from decimal import Decimal

annual_salary = Decimal('300000')  # AED
tax = TaxCalculator.calculate_tax(annual_salary, "AE")
# Returns: Decimal('0')
```

#### 2. Saudi Arabia (KSA)
- **Country Code**: `SA` or `SAU`
- **Personal Income Tax**: 
  - Saudi Nationals: 0%
  - Non-Saudis: 20% flat rate
- **Zakat**: 2.5% (for Saudi nationals, handled separately)

**Usage:**
```python
annual_salary = Decimal('200000')  # SAR
tax = TaxCalculator.calculate_saudi_tax(annual_salary, is_saudi=False)
# Returns: Decimal('40000')  # 20% for non-Saudis

tax_saudi = TaxCalculator.calculate_saudi_tax(annual_salary, is_saudi=True)
# Returns: Decimal('0')  # No tax for Saudi nationals
```

#### 3. Egypt
- **Country Code**: `EG` or `EGY`
- **Currency**: EGP (Egyptian Pound)
- **Progressive Tax Brackets**:
  - Up to 15,000 EGP: 0%
  - 15,001 - 30,000 EGP: 2.5%
  - 30,001 - 45,000 EGP: 10%
  - 45,001 - 60,000 EGP: 15%
  - 60,001 - 200,000 EGP: 20%
  - 200,001 - 400,000 EGP: 22.5%
  - Above 400,000 EGP: 25%

**Usage:**
```python
annual_salary = Decimal('100000')  # EGP
tax = TaxCalculator.calculate_egypt_tax(annual_salary)
# Returns: Decimal('12125')
```

#### 4. Qatar
- **Country Code**: `QA` or `QAT`
- **Personal Income Tax**: 0% (no personal income tax)
- **Note**: Only companies pay corporate tax (10%)

#### 5. Kuwait
- **Country Code**: `KW` or `KWT`
- **Personal Income Tax**: 0% (no personal income tax)
- **Note**: Companies pay corporate tax

#### 6. Oman
- **Country Code**: `OM` or `OMN`
- **Currency**: OMR (Omani Rial)
- **Progressive Tax Brackets** (introduced in 2022):
  - Up to 30,000 OMR: 0%
  - 30,001 - 45,000 OMR: 5%
  - 45,001 - 60,000 OMR: 8%
  - Above 60,000 OMR: 9%

**Usage:**
```python
annual_salary = Decimal('50000')  # OMR
tax = TaxCalculator.calculate_oman_tax(annual_salary)
# Returns: Decimal('1150')
```

#### 7. Bahrain
- **Country Code**: `BH` or `BHR`
- **Personal Income Tax**: 0% (no personal income tax)

#### 8. Jordan
- **Country Code**: `JO` or `JOR`
- **Currency**: JOD (Jordanian Dinar)
- **Progressive Tax Brackets**:
  - Up to 5,000 JOD: 0%
  - 5,001 - 10,000 JOD: 7%
  - 10,001 - 15,000 JOD: 14%
  - 15,001 - 20,000 JOD: 20%
  - Above 20,000 JOD: 25%

**Usage:**
```python
annual_salary = Decimal('18000')  # JOD
tax = TaxCalculator.calculate_jordan_tax(annual_salary)
# Returns: Decimal('1650')
```

## MENA Holiday Calendars

The system provides pre-configured holiday calendars for all MENA countries with major national and religious holidays.

### Available Calendar Methods

```python
from app.services.holiday_calendar_service import HolidayCalendarService
from uuid import UUID

service = HolidayCalendarService(db)

# Create UAE calendar
uae_calendar = await service.create_uae_calendar(
    organization_id=UUID("..."),
    calendar_name="UAE Public Holidays"
)

# Create Saudi calendar
saudi_calendar = await service.create_saudi_calendar(
    organization_id=UUID("..."),
    calendar_name="KSA Public Holidays"
)

# Create Egypt calendar
egypt_calendar = await service.create_egypt_calendar(
    organization_id=UUID("..."),
    calendar_name="Egypt Public Holidays"
)

# Create Qatar calendar
qatar_calendar = await service.create_qatar_calendar(
    organization_id=UUID("..."),
    calendar_name="Qatar Public Holidays"
)

# Create Kuwait calendar
kuwait_calendar = await service.create_kuwait_calendar(
    organization_id=UUID("..."),
    calendar_name="Kuwait Public Holidays"
)

# Create Oman calendar
oman_calendar = await service.create_oman_calendar(
    organization_id=UUID("..."),
    calendar_name="Oman Public Holidays"
)

# Create Bahrain calendar
bahrain_calendar = await service.create_bahrain_calendar(
    organization_id=UUID("..."),
    calendar_name="Bahrain Public Holidays"
)

# Create Jordan calendar
jordan_calendar = await service.create_jordan_calendar(
    organization_id=UUID("..."),
    calendar_name="Jordan Public Holidays"
)
```

### Key Holidays by Country

#### UAE
- New Year's Day (Jan 1)
- Eid Al Fitr (3 days, varies by lunar calendar)
- Eid Al Adha (3-4 days, varies by lunar calendar)
- Islamic New Year (varies)
- Prophet Muhammad's Birthday (varies)
- Commemoration Day (Dec 1)
- National Day (Dec 2-3)

#### Saudi Arabia
- Foundation Day (Feb 22)
- Saudi National Day (Sep 23)
- Eid Al Fitr (3-4 days, varies)
- Eid Al Adha (4-5 days, varies)

#### Egypt
- New Year's Day (Jan 1)
- Coptic Christmas (Jan 7)
- Revolution Day (Jan 25)
- Sinai Liberation Day (Apr 25)
- Labour Day (May 1)
- Revolution Day (June 30)
- Revolution Day (July 23)
- Armed Forces Day (Oct 6)
- Islamic holidays (Eid, Prophet's Birthday, etc.)

### Important Notes

1. **Islamic Holidays**: All Islamic holidays (Eid Al Fitr, Eid Al Adha, Islamic New Year, Prophet's Birthday) are based on the lunar calendar and vary by 10-12 days each year. The dates in the system are approximate and should be updated annually.

2. **Regional Variations**: Some holidays may vary by emirate/state/province within a country. The calendars provide national-level holidays.

3. **Government Declarations**: Some countries announce official holiday dates closer to the actual dates, especially for Islamic holidays.

## Geofencing Support

The geofencing service supports MENA region coordinates and can be used for attendance tracking across the region.

### Creating MENA Geofences

```python
from app.services.biometric_geofencing_service import GeofencingService
from app.schemas.integrations import GeofenceLocationCreate

service = GeofencingService(db)

# Example: Dubai office geofence
dubai_geofence = await service.create_geofence(
    GeofenceLocationCreate(
        organization_id=organization_id,
        location_name="Dubai Office",
        location_type="office",
        address="Business Bay, Dubai, UAE",
        latitude="25.1878",  # Dubai coordinates
        longitude="55.2754",
        radius_meters=100,
        enable_check_in=True,
        enable_check_out=True,
        strict_mode=True
    )
)

# Example: Riyadh office geofence
riyadh_geofence = await service.create_geofence(
    GeofenceLocationCreate(
        organization_id=organization_id,
        location_name="Riyadh Office",
        location_type="office",
        address="King Fahd Road, Riyadh, Saudi Arabia",
        latitude="24.7136",  # Riyadh coordinates
        longitude="46.6753",
        radius_meters=150,
        enable_check_in=True,
        enable_check_out=True
    )
)

# Example: Cairo office geofence
cairo_geofence = await service.create_geofence(
    GeofenceLocationCreate(
        organization_id=organization_id,
        location_name="Cairo Office",
        location_type="office",
        address="Maadi, Cairo, Egypt",
        latitude="29.9599",  # Cairo coordinates
        longitude="31.2708",
        radius_meters=100
    )
)
```

### Major MENA Cities Coordinates Reference

```python
MENA_CITIES = {
    # UAE
    "dubai": {"lat": "25.2048", "lon": "55.2708"},
    "abu_dhabi": {"lat": "24.4539", "lon": "54.3773"},
    "sharjah": {"lat": "25.3463", "lon": "55.4209"},
    
    # Saudi Arabia
    "riyadh": {"lat": "24.7136", "lon": "46.6753"},
    "jeddah": {"lat": "21.4858", "lon": "39.1925"},
    "dammam": {"lat": "26.4367", "lon": "50.1040"},
    
    # Egypt
    "cairo": {"lat": "30.0444", "lon": "31.2357"},
    "alexandria": {"lat": "31.2001", "lon": "29.9187"},
    "giza": {"lat": "30.0131", "lon": "31.2089"},
    
    # Qatar
    "doha": {"lat": "25.2854", "lon": "51.5310"},
    
    # Kuwait
    "kuwait_city": {"lat": "29.3759", "lon": "47.9774"},
    
    # Oman
    "muscat": {"lat": "23.5880", "lon": "58.3829"},
    
    # Bahrain
    "manama": {"lat": "26.0667", "lon": "50.5577"},
    
    # Jordan
    "amman": {"lat": "31.9454", "lon": "35.9284"},
}
```

## API Endpoints

### Tax Calculation API

```http
POST /api/v1/payroll/calculate-tax
Content-Type: application/json

{
  "gross_annual": 200000,
  "country_code": "AE",
  "regime": "new"
}

Response:
{
  "success": true,
  "data": {
    "gross_annual": 200000,
    "country_code": "AE",
    "tax_amount": 0,
    "net_annual": 200000
  }
}
```

### Holiday Calendar API

```http
GET /api/v1/integrations/holiday-calendars?country_code=ARE

Response:
{
  "success": true,
  "data": {
    "calendars": [
      {
        "calendar_id": "...",
        "calendar_name": "UAE Public Holidays",
        "country_code": "ARE",
        "holidays_count": 8
      }
    ]
  }
}
```

### Geofencing API

```http
POST /api/v1/integrations/geofences/verify-location
Content-Type: application/json

{
  "latitude": "25.2048",
  "longitude": "55.2708"
}

Response:
{
  "success": true,
  "data": {
    "is_within_geofence": true,
    "geofence": {
      "geofence_id": "...",
      "location_name": "Dubai Office",
      "distance_meters": 45.2
    }
  }
}
```

## Migration Notes

### For Existing Implementations

1. **Update Country Codes**: Ensure all country codes in your database match the supported formats (2-letter or 3-letter ISO codes).

2. **Update Tax Calculations**: If you have existing payroll calculations, re-run them with the new tax methods to ensure accuracy.

3. **Import Holiday Calendars**: Use the provided calendar creation methods to set up holidays for your MENA operations.

4. **Configure Geofences**: Set up geofences for all MENA office locations using the correct coordinates.

### Currency Handling

When working with MENA countries, ensure proper currency handling:

- UAE, Qatar, Oman, Bahrain, Kuwait: Use local currencies (AED, QAR, OMR, BHD, KWD)
- Saudi Arabia: SAR
- Egypt: EGP
- Jordan: JOD

All currency amounts should use `Decimal` type for precision.

## Testing

Test your MENA implementations with these sample scenarios:

```python
# Test UAE tax calculation
assert TaxCalculator.calculate_tax(Decimal('300000'), 'AE') == Decimal('0')

# Test Egypt tax calculation
assert TaxCalculator.calculate_tax(Decimal('100000'), 'EG') == Decimal('12125')

# Test geofence verification for Dubai
result = await geofencing_service.verify_location(
    organization_id,
    latitude=25.2048,
    longitude=55.2708
)
assert result['is_within_geofence'] == True
```

## Support

For questions or issues with MENA region support, please:
1. Check this documentation
2. Review the source code in `payroll.py` and `holiday_calendar_service.py`
3. Create a GitHub issue with the label "MENA"

## Compliance Notes

- Tax calculations are based on 2024 tax laws
- Always verify with local tax authorities for the most current rates
- Islamic holiday dates should be verified with local moon sighting authorities
- Some countries may have special tax treatments for certain industries or free zones
