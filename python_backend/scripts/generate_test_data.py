"""
Test Data Generator

This script generates test data for development and testing purposes.
It creates realistic employees, attendance records, leave requests, etc.

Usage:
    python generate_test_data.py --employees 100 --days 30
"""

import argparse
import random
from datetime import datetime, timedelta
from pathlib import Path

try:
    from faker import Faker
except ImportError:
    print("Required package not installed. Install with:")
    print("  pip install faker")
    exit(1)

fake = Faker()

# Sample data
DEPARTMENTS = ["Engineering", "HR", "Sales", "Marketing", "Finance", "Operations", "IT", "Legal"]
POSITIONS = ["Manager", "Senior Developer", "Developer", "Junior Developer", "Designer", "Analyst", "Specialist"]
LEAVE_TYPES = ["ANNUAL", "SICK", "CASUAL", "MATERNITY", "PATERNITY"]


class TestDataGenerator:
    """Generate test data for HR system"""
    
    def generate_employee_data(self, count: int = 10):
        """Generate employee data"""
        employees = []
        
        for i in range(count):
            first_name = fake.first_name()
            last_name = fake.last_name()
            email = f"{first_name.lower()}.{last_name.lower()}@test.com"
            
            employee = {
                "employee_id": f"EMP{1000 + i}",
                "first_name": first_name,
                "last_name": last_name,
                "email": email,
                "phone": fake.phone_number(),
                "date_of_birth": str(fake.date_of_birth(minimum_age=22, maximum_age=60)),
                "gender": random.choice(["MALE", "FEMALE", "OTHER"]),
                "department": random.choice(DEPARTMENTS),
                "position": random.choice(POSITIONS),
                "hire_date": str(fake.date_between(start_date="-3y", end_date="today")),
                "salary": random.randint(40000, 150000),
            }
            
            employees.append(employee)
        
        return employees
    
    def generate_attendance_data(self, employee_ids: list, days: int = 30):
        """Generate attendance records"""
        attendance_records = []
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        
        for employee_id in employee_ids:
            current_date = start_date
            
            while current_date <= end_date:
                if current_date.weekday() < 5:  # Weekdays only
                    if random.random() < 0.9:  # 90% attendance
                        check_in = current_date.replace(hour=random.randint(8, 9), minute=random.randint(0, 59))
                        check_out = check_in.replace(hour=random.randint(17, 19))
                        
                        attendance_records.append({
                            "employee_id": employee_id,
                            "date": current_date.date().isoformat(),
                            "check_in": check_in.isoformat(),
                            "check_out": check_out.isoformat(),
                            "status": random.choice(["PRESENT"] * 8 + ["LATE"]),
                        })
                
                current_date += timedelta(days=1)
        
        return attendance_records
    
    def generate_leave_data(self, employee_ids: list, count: int = 50):
        """Generate leave requests"""
        leave_requests = []
        
        for _ in range(count):
            employee_id = random.choice(employee_ids)
            start_date = fake.date_between(start_date="-60d", end_date="+60d")
            duration = random.randint(1, 10)
            end_date = start_date + timedelta(days=duration)
            
            leave_requests.append({
                "employee_id": employee_id,
                "leave_type": random.choice(LEAVE_TYPES),
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat(),
                "days_requested": duration,
                "reason": fake.text(max_nb_chars=200),
                "status": random.choice(["PENDING", "APPROVED", "REJECTED"]),
            })
        
        return leave_requests
    
    def export_to_json(self, data: dict, filename: str = "test_data.json"):
        """Export data to JSON file"""
        import json
        
        output_dir = Path(__file__).parent.parent / "test_data"
        output_dir.mkdir(exist_ok=True)
        
        output_file = output_dir / filename
        with open(output_file, 'w') as f:
            json.dump(data, f, indent=2)
        
        print(f"\n✓ Data exported to: {output_file}")


def main():
    parser = argparse.ArgumentParser(description="Generate test data for HR system")
    parser.add_argument("--employees", type=int, default=100, help="Number of employees")
    parser.add_argument("--days", type=int, default=30, help="Days of attendance")
    parser.add_argument("--leaves", type=int, default=50, help="Number of leave requests")
    
    args = parser.parse_args()
    
    print("\n" + "=" * 60)
    print("Test Data Generator")
    print("=" * 60)
    
    generator = TestDataGenerator()
    
    employees = generator.generate_employee_data(args.employees)
    employee_ids = [emp['employee_id'] for emp in employees]
    attendance = generator.generate_attendance_data(employee_ids, args.days)
    leaves = generator.generate_leave_data(employee_ids, args.leaves)
    
    data = {
        "employees": employees,
        "attendance": attendance,
        "leave_requests": leaves,
    }
    
    print(f"\n✓ Generated {len(employees)} employees")
    print(f"✓ Generated {len(attendance)} attendance records")
    print(f"✓ Generated {len(leaves)} leave requests")
    
    generator.export_to_json(data)
    print("\n✅ Complete!\n")


if __name__ == "__main__":
    main()
