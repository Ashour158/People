"""Test configuration and fixtures"""
import pytest
import asyncio
from typing import AsyncGenerator, Generator
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import sessionmaker
from faker import Faker

from app.main import app
from app.db.database import Base, get_db
from app.models.user import User
from app.models.organization import Organization
from app.models.employee import Employee
from app.utils.security import get_password_hash

# Test database URL (use in-memory or test database)
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

# Initialize Faker for test data generation
fake = Faker()


@pytest.fixture(scope="session")
def event_loop() -> Generator:
    """Create event loop for async tests"""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="session")
async def engine():
    """Create test database engine"""
    engine = create_async_engine(
        TEST_DATABASE_URL,
        echo=False,  # Set to True for SQL debugging
        future=True
    )
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    yield engine
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    
    await engine.dispose()


@pytest.fixture
async def db_session(engine) -> AsyncGenerator[AsyncSession, None]:
    """Create test database session"""
    async_session_maker = async_sessionmaker(
        engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autoflush=False,
        autocommit=False
    )
    
    async with async_session_maker() as session:
        yield session
        await session.rollback()


@pytest.fixture
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """Create test client with database session override"""
    async def override_get_db():
        yield db_session
    
    app.dependency_overrides[get_db] = override_get_db
    
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac
    
    app.dependency_overrides.clear()


@pytest.fixture
async def test_organization(db_session: AsyncSession) -> Organization:
    """Create test organization"""
    org = Organization(
        organization_id="test-org-" + fake.uuid4()[:8],
        organization_name="Test Organization",
        industry="Technology",
        size="51-200",
        country="US",
        timezone="America/New_York",
        is_active=True
    )
    db_session.add(org)
    await db_session.commit()
    await db_session.refresh(org)
    return org


@pytest.fixture
async def test_user(db_session: AsyncSession, test_organization: Organization) -> User:
    """Create test user"""
    user = User(
        user_id="test-user-" + fake.uuid4()[:8],
        email=fake.email(),
        password_hash=get_password_hash("TestPassword123!"),
        first_name=fake.first_name(),
        last_name=fake.last_name(),
        organization_id=test_organization.organization_id,
        role="admin",
        is_active=True,
        email_verified=True
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest.fixture
async def test_employee(db_session: AsyncSession, test_organization: Organization, test_user: User) -> Employee:
    """Create test employee"""
    employee = Employee(
        employee_id="EMP-" + fake.uuid4()[:8],
        user_id=test_user.user_id,
        organization_id=test_organization.organization_id,
        employee_code=fake.random_int(min=1000, max=9999),
        first_name=test_user.first_name,
        last_name=test_user.last_name,
        email=test_user.email,
        phone=fake.phone_number(),
        date_of_birth=fake.date_of_birth(minimum_age=22, maximum_age=65),
        hire_date=fake.date_this_decade(),
        employment_type="FULL_TIME",
        status="ACTIVE"
    )
    db_session.add(employee)
    await db_session.commit()
    await db_session.refresh(employee)
    return employee


@pytest.fixture
async def authenticated_client(client: AsyncClient, test_user: User) -> AsyncClient:
    """Create authenticated test client"""
    # Login and get token
    response = await client.post(
        "/api/v1/auth/login",
        json={
            "email": test_user.email,
            "password": "TestPassword123!"
        }
    )
    
    if response.status_code == 200:
        token = response.json()["access_token"]
        client.headers["Authorization"] = f"Bearer {token}"
    
    return client


# Pytest markers
def pytest_configure(config):
    """Register custom markers"""
    config.addinivalue_line("markers", "unit: Unit tests")
    config.addinivalue_line("markers", "integration: Integration tests")
    config.addinivalue_line("markers", "slow: Slow running tests")
    config.addinivalue_line("markers", "auth: Authentication tests")
    config.addinivalue_line("markers", "employee: Employee management tests")
    config.addinivalue_line("markers", "attendance: Attendance tests")
    config.addinivalue_line("markers", "leave: Leave management tests")
    config.addinivalue_line("markers", "payroll: Payroll tests")
    config.addinivalue_line("markers", "performance: Performance management tests")
