# Performance Tests

This directory contains performance and load tests for the HR Management System.

## Running Performance Tests

### Prerequisites
```bash
pip install locust httpx
```

### Run Tests

#### Local Development
```bash
# Start the backend server first
cd python_backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000

# In another terminal, run Locust
cd python_backend/tests/performance
locust -f locustfile.py --host=http://localhost:8000
```

Then open http://localhost:8089 in your browser to configure and start the test.

#### Headless Mode (CI/CD)
```bash
locust -f locustfile.py \
  --host=http://localhost:8000 \
  --users 100 \
  --spawn-rate 10 \
  --run-time 5m \
  --headless \
  --html=performance-report.html
```

## Test Scenarios

### 1. Authentication Flow
- Login
- Token refresh
- Logout

### 2. Employee Management
- List employees
- Get employee details
- Create employee
- Update employee
- Search employees

### 3. Attendance
- Clock in
- Clock out
- View attendance history

### 4. Leave Management
- Submit leave request
- View leave balance
- Approve/reject leave (manager)

## Performance Targets

| Metric | Target | Critical |
|--------|--------|----------|
| Response Time (p95) | < 500ms | < 1000ms |
| Response Time (p99) | < 1000ms | < 2000ms |
| Throughput | > 100 RPS | > 50 RPS |
| Error Rate | < 1% | < 5% |
| CPU Usage | < 70% | < 90% |
| Memory Usage | < 80% | < 95% |

## Interpreting Results

- **Response Time**: Time taken to complete a request
- **Throughput (RPS)**: Requests per second the system can handle
- **Error Rate**: Percentage of failed requests
- **Percentiles**: 
  - p50: 50% of requests are faster than this
  - p95: 95% of requests are faster than this
  - p99: 99% of requests are faster than this

## Best Practices

1. **Warm up**: Run tests for 1-2 minutes before collecting metrics
2. **Realistic load**: Model actual user behavior, not just API hammering
3. **Monitor resources**: Track CPU, memory, and database connections
4. **Incremental load**: Start with low load and gradually increase
5. **Consistent environment**: Always test in similar conditions
