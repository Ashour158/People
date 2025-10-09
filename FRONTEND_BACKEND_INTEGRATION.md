# Frontend-Backend Integration Guide

This guide explains how the React frontend integrates with the Python FastAPI backend.

## Architecture Overview

```
┌─────────────────┐         ┌──────────────────┐         ┌──────────────┐
│  React Frontend │  HTTP   │  Python FastAPI  │  SQL    │  PostgreSQL  │
│  (Vite + TS)    │────────>│  Backend         │────────>│  Database    │
│  Port 5173/3000 │  REST   │  Port 5000       │         │  Port 5432   │
└─────────────────┘         └──────────────────┘         └──────────────┘
                                      │
                                      │ Cache
                                      v
                            ┌──────────────────┐
                            │  Redis           │
                            │  Port 6379       │
                            └──────────────────┘
```

## API Configuration

### Frontend Configuration

The frontend is configured via environment variables in `frontend/.env`:

```env
VITE_API_BASE_URL=http://localhost:5000/api/v1
```

This is used by the Axios client in `frontend/src/api/axios.ts`:

```typescript
import axios from 'axios';
import { API_CONFIG } from '../constants';

const axiosInstance = axios.create({
  baseURL: API_CONFIG.BASE_URL, // Points to Python backend
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});
```

### Backend Configuration

The Python backend is configured via `python_backend/.env`:

```env
PORT=5000
CORS_ORIGINS=["http://localhost:3000","http://localhost:5173"]
```

CORS is configured in `python_backend/app/main.py` to accept requests from the frontend.

## API Endpoints Mapping

### Authentication Endpoints

| Frontend Call | Backend Route | Method | Description |
|--------------|---------------|---------|-------------|
| `authApi.login()` | `/api/v1/auth/login` | POST | User login |
| `authApi.register()` | `/api/v1/auth/register` | POST | User registration |
| `authApi.logout()` | `/api/v1/auth/logout` | POST | User logout |
| `authApi.refreshToken()` | `/api/v1/auth/refresh-token` | POST | Refresh JWT token |

### Employee Endpoints

| Frontend Call | Backend Route | Method | Description |
|--------------|---------------|---------|-------------|
| `employeeApi.getAll()` | `/api/v1/employees` | GET | List employees |
| `employeeApi.getById(id)` | `/api/v1/employees/{id}` | GET | Get employee details |
| `employeeApi.create(data)` | `/api/v1/employees` | POST | Create employee |
| `employeeApi.update(id, data)` | `/api/v1/employees/{id}` | PUT | Update employee |
| `employeeApi.delete(id)` | `/api/v1/employees/{id}` | DELETE | Delete employee |

### Attendance Endpoints

| Frontend Call | Backend Route | Method | Description |
|--------------|---------------|---------|-------------|
| `attendanceApi.checkIn()` | `/api/v1/attendance/check-in` | POST | Check in |
| `attendanceApi.checkOut()` | `/api/v1/attendance/check-out` | POST | Check out |
| `attendanceApi.getAll()` | `/api/v1/attendance` | GET | List attendance records |
| `attendanceApi.requestRegularization()` | `/api/v1/attendance/regularization` | POST | Request attendance fix |

### Leave Endpoints

| Frontend Call | Backend Route | Method | Description |
|--------------|---------------|---------|-------------|
| `leaveApi.getTypes()` | `/api/v1/leave/types` | GET | List leave types |
| `leaveApi.apply(data)` | `/api/v1/leave/apply` | POST | Apply for leave |
| `leaveApi.getAll()` | `/api/v1/leave` | GET | List leave requests |
| `leaveApi.approveReject(id, data)` | `/api/v1/leave/{id}/action` | POST | Approve/reject leave |
| `leaveApi.getBalance()` | `/api/v1/leave/balance` | GET | Get leave balance |

## Authentication Flow

### 1. Login Process

```typescript
// Frontend: src/api/auth.ts
export const login = async (email: string, password: string) => {
  const response = await axios.post('/api/v1/auth/login', { 
    email, 
    password 
  });
  
  // Store token in localStorage
  localStorage.setItem('token', response.data.data.access_token);
  localStorage.setItem('user', JSON.stringify(response.data.data.user));
  
  return response.data;
};
```

```python
# Backend: python_backend/app/api/v1/endpoints/auth.py
@router.post("/login")
async def login(
    credentials: LoginRequest,
    db: AsyncSession = Depends(get_db)
):
    # Verify credentials
    user = await authenticate_user(credentials.email, credentials.password, db)
    
    # Generate JWT token
    access_token = create_access_token(user.user_id)
    
    return {
        "success": True,
        "data": {
            "access_token": access_token,
            "token_type": "bearer",
            "user": UserResponse.from_orm(user)
        }
    }
```

### 2. Token Authentication

```typescript
// Frontend: Axios interceptor automatically adds token to requests
axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

```python
# Backend: Middleware verifies token
class AuthMiddleware:
    @staticmethod
    async def get_current_user(
        authorization: str = Header(None),
        db: AsyncSession = Depends(get_db)
    ):
        if not authorization or not authorization.startswith("Bearer "):
            raise HTTPException(401, "Not authenticated")
        
        token = authorization.replace("Bearer ", "")
        payload = verify_token(token)
        
        # Load user from database
        user = await get_user_by_id(payload["user_id"], db)
        return user
```

## Request/Response Format

### Standard Success Response

```json
{
  "success": true,
  "data": {
    // Response data here
  }
}
```

### Paginated Response

```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "pages": 10
  }
}
```

### Error Response

```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {}
}
```

## Data Types Alignment

### TypeScript Types (Frontend)

```typescript
// frontend/src/types/index.ts
export interface Employee {
  employee_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  job_title?: string;
  employment_status: string;
  hire_date?: string;
  created_at: string;
}
```

### Pydantic Schemas (Backend)

```python
# python_backend/app/schemas/schemas.py
class EmployeeResponse(BaseModel):
    employee_id: UUID
    first_name: str
    last_name: str
    email: str
    phone: Optional[str] = None
    job_title: Optional[str] = None
    employment_status: str
    hire_date: Optional[date] = None
    created_at: datetime
    
    class Config:
        from_attributes = True
```

## Development Setup

### 1. Start Backend

```bash
cd python_backend
source venv/bin/activate
uvicorn app.main:app --reload --port 5000
```

Backend will be available at:
- API: http://localhost:5000/api/v1
- Swagger Docs: http://localhost:5000/api/v1/docs

### 2. Start Frontend

```bash
cd frontend
npm run dev
```

Frontend will be available at:
- App: http://localhost:5173

### 3. Verify Integration

```bash
# Test API from frontend
curl http://localhost:5000/api/v1/health

# Check CORS
curl -H "Origin: http://localhost:5173" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     http://localhost:5000/api/v1/employees
```

## Production Deployment

### Using Docker Compose

```bash
# Use the Python backend docker-compose
docker-compose -f docker-compose.python.yml up -d

# Services:
# - Frontend: http://localhost:3000
# - Backend: http://localhost:5000
# - Database: localhost:5432
# - Redis: localhost:6379
```

### Environment Variables

Create a `.env` file in the project root:

```env
# Database
DB_PASSWORD=your_secure_password

# Security
SECRET_KEY=your-secret-key-min-32-chars
JWT_SECRET_KEY=your-jwt-secret-key-min-32-chars

# Email (optional)
SMTP_USERNAME=your_email@gmail.com
SMTP_PASSWORD=your_app_password

# Environment
ENVIRONMENT=production
DEBUG=false
```

## API Documentation

### Interactive Documentation

The Python backend provides automatic interactive API documentation:

1. **Swagger UI**: http://localhost:5000/api/v1/docs
   - Try out API endpoints directly in the browser
   - See request/response schemas
   - Test authentication

2. **ReDoc**: http://localhost:5000/api/v1/redoc
   - Alternative documentation view
   - Better for reading and sharing

3. **OpenAPI JSON**: http://localhost:5000/api/v1/openapi.json
   - Machine-readable API specification
   - Can be imported into Postman, Insomnia, etc.

## Troubleshooting

### CORS Errors

If you see CORS errors in the browser console:

1. Check that `CORS_ORIGINS` in backend `.env` includes your frontend URL:
   ```env
   CORS_ORIGINS=["http://localhost:5173","http://localhost:3000"]
   ```

2. Restart the backend after changing environment variables

### Authentication Errors

If requests return 401 Unauthorized:

1. Check that token is stored in localStorage:
   ```javascript
   console.log(localStorage.getItem('token'));
   ```

2. Verify token is sent in headers:
   ```javascript
   // Check in browser DevTools > Network > Headers
   Authorization: Bearer <token>
   ```

3. Check token expiration (default: 24 hours)

### API Connection Errors

If frontend can't connect to backend:

1. Verify backend is running:
   ```bash
   curl http://localhost:5000/api/v1/health
   ```

2. Check frontend `.env`:
   ```env
   VITE_API_BASE_URL=http://localhost:5000/api/v1
   ```

3. Check that ports are not in use:
   ```bash
   lsof -i :5000  # Backend port
   lsof -i :5173  # Frontend port
   ```

## Testing Integration

### Manual Testing

1. Start both backend and frontend
2. Open browser to http://localhost:5173
3. Open DevTools > Network tab
4. Perform actions (login, create employee, etc.)
5. Verify API calls in Network tab

### Automated Testing

```bash
# Backend API tests
cd python_backend
pytest tests/

# Frontend component tests
cd frontend
npm test

# End-to-end tests (if configured)
npm run test:e2e
```

## Additional Resources

- [Python Backend Setup](../python_backend/SETUP_INSTRUCTIONS.md)
- [Frontend README](../frontend/README.md)
- [API Documentation](../python_backend/PROJECT_SUMMARY.md)
- [Migration Guide](../python_backend/MIGRATION_GUIDE.md)
