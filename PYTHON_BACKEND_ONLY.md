# Python-Only Backend Notice

## Important: Backend Architecture Change (January 2025)

As of **January 2025**, this repository uses **Python FastAPI exclusively** for the backend.

### What Changed?

- ✅ **Removed**: TypeScript/Node.js backend (previously in `/backend/`)
- ✅ **Active**: Python FastAPI backend (in `/python_backend/`)
- ✅ **Status**: All features migrated, API compatible, production-ready

### Quick Start with Python Backend

```bash
# Navigate to Python backend
cd python_backend

# Install dependencies
pip install -r requirements.txt

# Set up environment
cp .env.example .env
# Edit .env with your configuration

# Run database migrations
alembic upgrade head

# Start the server
uvicorn app.main:app --reload --host 0.0.0.0 --port 5000
```

The API will be available at `http://localhost:5000`

### TypeScript Files in Root

The TypeScript files in the root directory (e.g., `backend_setup.ts`, `auth_routes_complete.ts`) are **reference implementation files** only. They contain:

- Code examples and patterns
- Complete module implementations for reference
- Documentation of features

These files are **NOT** executed and are kept for:
- Migration reference
- Feature documentation
- Implementation patterns
- Code examples

### Frontend Configuration

The frontend is configured to work with the Python backend. Update your frontend `.env`:

```bash
VITE_API_URL=http://localhost:5000/api/v1
```

### Why Python Only?

The decision to consolidate to Python was made for:

1. **Simplicity**: One backend to maintain
2. **Performance**: FastAPI's async capabilities
3. **Auto-Documentation**: OpenAPI/Swagger out of the box
4. **Type Safety**: Pydantic models and Python type hints
5. **Testing**: Better testing tools (pytest)
6. **Community**: Larger Python HR/ML ecosystem

### Complete Feature Parity

The Python backend includes all features from the TypeScript version:

- ✅ Authentication (JWT, OAuth 2.0)
- ✅ Employee Management
- ✅ Attendance Tracking
- ✅ Leave Management
- ✅ Payroll Processing
- ✅ Performance Management
- ✅ Recruitment (ATS)
- ✅ Workflow Engine
- ✅ AI & Analytics
- ✅ **NEW**: DocuSign E-Signature Integration
- ✅ **NEW**: 123+ Comprehensive Test Cases

### Documentation

- [Python Backend Setup](python_backend/SETUP_INSTRUCTIONS.md)
- [Migration Guide](python_backend/MIGRATION_GUIDE.md)
- [API Documentation](API_REFERENCE.md)
- [Frontend Integration](FRONTEND_BACKEND_INTEGRATION.md)

### Support

For questions about:
- **Python Backend**: See [python_backend/README.md](python_backend/README.md)
- **Migration**: See [MIGRATION_COMPLETE.md](MIGRATION_COMPLETE.md)
- **Testing**: See test files in `python_backend/tests/`

---

**Last Updated**: January 2025  
**Backend Version**: Python FastAPI v1.0  
**Status**: ✅ Production Ready
