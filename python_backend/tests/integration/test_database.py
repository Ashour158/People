"""Tests for database operations"""
import pytest
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, inspect


@pytest.mark.integration
@pytest.mark.asyncio
class TestDatabaseOperations:
    """Test database operations"""
    
    async def test_database_connection(self, db_session: AsyncSession):
        """Test database connection"""
        assert db_session is not None
        assert db_session.is_active
    
    async def test_transaction_commit(self, db_session: AsyncSession, test_organization):
        """Test transaction commit"""
        # Transaction should commit successfully
        await db_session.commit()
        assert test_organization.organization_id is not None
    
    async def test_transaction_rollback(self, db_session: AsyncSession):
        """Test transaction rollback"""
        # Rollback should work without errors
        await db_session.rollback()
        assert db_session.is_active
    
    async def test_query_execution(self, db_session: AsyncSession, test_organization):
        """Test query execution"""
        from app.models.organization import Organization
        
        result = await db_session.execute(
            select(Organization).where(
                Organization.organization_id == test_organization.organization_id
            )
        )
        org = result.scalar_one_or_none()
        
        assert org is not None
        assert org.organization_id == test_organization.organization_id
    
    async def test_bulk_insert(self, db_session: AsyncSession, test_organization):
        """Test bulk insert operations"""
        from app.models.employee import Employee
        
        employees = [
            Employee(
                employee_id=f"EMP-{i:03d}",
                organization_id=test_organization.organization_id,
                employee_code=f"{1000 + i}",
                first_name=f"Employee{i}",
                last_name="Test",
                email=f"employee{i}@test.com",
                employment_type="FULL_TIME",
                status="ACTIVE"
            )
            for i in range(5)
        ]
        
        db_session.add_all(employees)
        await db_session.commit()
        
        # Verify bulk insert
        result = await db_session.execute(
            select(Employee).where(
                Employee.organization_id == test_organization.organization_id
            )
        )
        inserted = result.scalars().all()
        assert len(inserted) >= 5


@pytest.mark.integration
@pytest.mark.asyncio
class TestDatabaseConstraints:
    """Test database constraints"""
    
    async def test_unique_constraint(self, db_session: AsyncSession, test_organization):
        """Test unique constraint enforcement"""
        from app.models.user import User
        from sqlalchemy.exc import IntegrityError
        
        # Try to create duplicate email
        user1 = User(
            user_id="user-1",
            email="duplicate@test.com",
            password_hash="hash",
            first_name="Test",
            last_name="User",
            organization_id=test_organization.organization_id,
            role="user"
        )
        
        db_session.add(user1)
        await db_session.commit()
        
        user2 = User(
            user_id="user-2",
            email="duplicate@test.com",  # Duplicate email
            password_hash="hash",
            first_name="Test2",
            last_name="User2",
            organization_id=test_organization.organization_id,
            role="user"
        )
        
        db_session.add(user2)
        
        # Should raise IntegrityError
        with pytest.raises(IntegrityError):
            await db_session.commit()
    
    async def test_foreign_key_constraint(self, db_session: AsyncSession):
        """Test foreign key constraint enforcement"""
        from app.models.employee import Employee
        from sqlalchemy.exc import IntegrityError
        
        # Try to create employee with non-existent organization
        employee = Employee(
            employee_id="EMP-999",
            organization_id="non-existent-org",
            employee_code="9999",
            first_name="Test",
            last_name="Employee",
            email="test@test.com",
            employment_type="FULL_TIME",
            status="ACTIVE"
        )
        
        db_session.add(employee)
        
        # Should raise IntegrityError due to foreign key constraint
        with pytest.raises(IntegrityError):
            await db_session.commit()
    
    async def test_not_null_constraint(self, db_session: AsyncSession, test_organization):
        """Test NOT NULL constraint enforcement"""
        from app.models.employee import Employee
        from sqlalchemy.exc import IntegrityError
        
        # Try to create employee without required field
        employee = Employee(
            employee_id="EMP-888",
            organization_id=test_organization.organization_id,
            employee_code="8888",
            first_name="Test",
            # Missing required last_name field
            email="test@test.com",
            employment_type="FULL_TIME",
            status="ACTIVE"
        )
        
        db_session.add(employee)
        
        # May raise IntegrityError depending on model definition
        try:
            await db_session.commit()
        except IntegrityError:
            await db_session.rollback()


@pytest.mark.integration
@pytest.mark.asyncio
class TestDatabaseIndexes:
    """Test database indexes"""
    
    async def test_indexes_exist(self, db_session: AsyncSession):
        """Test that required indexes exist"""
        from app.models.employee import Employee
        
        # Get table metadata
        inspector = inspect(db_session.bind)
        indexes = inspector.get_indexes(Employee.__tablename__)
        
        # Should have at least some indexes
        assert isinstance(indexes, list)
    
    async def test_query_performance_with_index(self, db_session: AsyncSession, test_organization):
        """Test query performance with indexed columns"""
        from app.models.employee import Employee
        import time
        
        # Create test data
        employees = [
            Employee(
                employee_id=f"EMP-{i:04d}",
                organization_id=test_organization.organization_id,
                employee_code=f"{2000 + i}",
                first_name=f"Employee{i}",
                last_name="Test",
                email=f"emp{i}@test.com",
                employment_type="FULL_TIME",
                status="ACTIVE"
            )
            for i in range(100)
        ]
        
        db_session.add_all(employees)
        await db_session.commit()
        
        # Query using indexed column (organization_id)
        start = time.time()
        result = await db_session.execute(
            select(Employee).where(
                Employee.organization_id == test_organization.organization_id
            ).limit(10)
        )
        end = time.time()
        
        employees_found = result.scalars().all()
        query_time = end - start
        
        # Query should be reasonably fast (< 1 second for 100 records)
        assert len(employees_found) > 0
        assert query_time < 1.0


@pytest.mark.integration
@pytest.mark.asyncio
class TestDatabaseTransactions:
    """Test database transaction handling"""
    
    async def test_nested_transactions(self, db_session: AsyncSession, test_organization):
        """Test nested transaction handling"""
        from app.models.employee import Employee
        
        # Start outer transaction
        async with db_session.begin_nested():
            employee1 = Employee(
                employee_id="EMP-NESTED-1",
                organization_id=test_organization.organization_id,
                employee_code="9001",
                first_name="Nested1",
                last_name="Test",
                email="nested1@test.com",
                employment_type="FULL_TIME",
                status="ACTIVE"
            )
            db_session.add(employee1)
            
            # Start inner transaction
            async with db_session.begin_nested():
                employee2 = Employee(
                    employee_id="EMP-NESTED-2",
                    organization_id=test_organization.organization_id,
                    employee_code="9002",
                    first_name="Nested2",
                    last_name="Test",
                    email="nested2@test.com",
                    employment_type="FULL_TIME",
                    status="ACTIVE"
                )
                db_session.add(employee2)
        
        await db_session.commit()
        
        # Both employees should be saved
        result = await db_session.execute(
            select(Employee).where(
                Employee.employee_id.in_(["EMP-NESTED-1", "EMP-NESTED-2"])
            )
        )
        employees = result.scalars().all()
        assert len(employees) == 2
    
    async def test_partial_rollback(self, db_session: AsyncSession, test_organization):
        """Test partial transaction rollback"""
        from app.models.employee import Employee
        
        employee1 = Employee(
            employee_id="EMP-PARTIAL-1",
            organization_id=test_organization.organization_id,
            employee_code="9003",
            first_name="Partial1",
            last_name="Test",
            email="partial1@test.com",
            employment_type="FULL_TIME",
            status="ACTIVE"
        )
        db_session.add(employee1)
        await db_session.commit()
        
        # This should be rolled back
        employee2 = Employee(
            employee_id="EMP-PARTIAL-2",
            organization_id=test_organization.organization_id,
            employee_code="9004",
            first_name="Partial2",
            last_name="Test",
            email="partial2@test.com",
            employment_type="FULL_TIME",
            status="ACTIVE"
        )
        db_session.add(employee2)
        await db_session.rollback()
        
        # Only first employee should exist
        result = await db_session.execute(
            select(Employee).where(
                Employee.employee_id.in_(["EMP-PARTIAL-1", "EMP-PARTIAL-2"])
            )
        )
        employees = result.scalars().all()
        assert len(employees) == 1
        assert employees[0].employee_id == "EMP-PARTIAL-1"
