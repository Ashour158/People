# API Endpoints Quick Reference Guide

## Expense Management API

### Base URL: `/api/v1/expenses`

#### Expense Policies
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/policies` | Create expense policy | Admin/HR |
| GET | `/policies` | List expense policies | All |
| GET | `/policies?category={category}` | Filter policies by category | All |

#### Expenses
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/` | Create new expense | Employee |
| GET | `/` | List expenses | Employee |
| GET | `/?status={status}` | Filter by status | Employee |
| GET | `/?from_date={date}&to_date={date}` | Filter by date range | Employee |
| GET | `/{expense_id}` | Get expense details | Employee/Manager |
| PATCH | `/{expense_id}` | Update expense (draft only) | Employee |
| DELETE | `/{expense_id}` | Delete expense (draft only) | Employee |

#### Expense Workflow
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/submit` | Submit expenses for approval | Employee |
| POST | `/approve` | Approve expense | Manager/Admin |
| POST | `/reject` | Reject expense | Manager/Admin |
| POST | `/reimburse` | Process reimbursement | Finance/Admin |

#### Expense Comments
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/{expense_id}/comments` | Add comment | All |
| GET | `/{expense_id}/comments` | List comments | All |

#### Statistics
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/summary/stats` | Get expense statistics | All |

### Request/Response Examples

#### Create Expense
```bash
POST /api/v1/expenses
Content-Type: application/json
Authorization: Bearer {token}

{
  "expense_date": "2024-01-15",
  "category": "travel",
  "description": "Flight to client meeting",
  "merchant": "Airline ABC",
  "amount": 450.00,
  "currency": "USD",
  "tax_amount": 50.00,
  "receipt_url": "https://...",
  "business_purpose": "Client presentation",
  "is_billable": true
}
```

Response:
```json
{
  "expense_id": "uuid",
  "expense_number": "EXP-20240115-ABC12345",
  "status": "draft",
  "total_amount": 500.00,
  "created_at": "2024-01-15T10:30:00Z"
}
```

#### Submit Expenses
```bash
POST /api/v1/expenses/submit
{
  "expense_ids": ["uuid1", "uuid2", "uuid3"]
}
```

#### Approve Expense
```bash
POST /api/v1/expenses/approve
{
  "expense_id": "uuid",
  "comments": "Approved as per company policy"
}
```

---

## Helpdesk/Ticketing API

### Base URL: `/api/v1/helpdesk`

#### Tickets
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/tickets` | Create new ticket | Employee |
| GET | `/tickets` | List tickets | All |
| GET | `/tickets?status={status}` | Filter by status | All |
| GET | `/tickets?category={category}` | Filter by category | All |
| GET | `/tickets?assigned_to_me=true` | Get assigned tickets | Agent/Admin |
| GET | `/tickets/{ticket_id}` | Get ticket details | Employee/Agent |
| PATCH | `/tickets/{ticket_id}` | Update ticket | Agent/Admin |

#### Ticket Workflow
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/tickets/{id}/assign` | Assign ticket to agent | Admin/Manager |
| POST | `/tickets/{id}/resolve` | Resolve ticket | Agent/Admin |
| POST | `/tickets/{id}/close` | Close ticket with rating | Employee |

#### Ticket Comments
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/tickets/{id}/comments` | Add comment/reply | All |
| GET | `/tickets/{id}/comments` | List comments | All |

#### Knowledge Base
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/kb/categories` | Create KB category | Admin |
| GET | `/kb/categories` | List categories | All |
| POST | `/kb/articles` | Create article | Admin/HR |
| GET | `/kb/articles` | List articles | All |
| GET | `/kb/articles?search={query}` | Search articles | All |
| GET | `/kb/articles/{id}` | Get article | All |

#### Statistics
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/statistics` | Get ticket statistics | Admin/Manager |

### Request/Response Examples

#### Create Ticket
```bash
POST /api/v1/helpdesk/tickets
Content-Type: application/json
Authorization: Bearer {token}

{
  "subject": "Cannot access payslip",
  "description": "I am unable to download my payslip for December",
  "category": "payroll",
  "ticket_type": "issue",
  "priority": "high",
  "attachments": ["https://..."]
}
```

Response:
```json
{
  "ticket_id": "uuid",
  "ticket_number": "TKT-20240115-XYZ789",
  "status": "open",
  "first_response_due": "2024-01-15T14:00:00Z",
  "resolution_due": "2024-01-16T10:00:00Z",
  "created_at": "2024-01-15T10:00:00Z"
}
```

#### Add Ticket Comment
```bash
POST /api/v1/helpdesk/tickets/{ticket_id}/comments
{
  "comment_text": "Thank you for reporting this. We are investigating.",
  "is_internal_note": false
}
```

#### Create KB Article
```bash
POST /api/v1/helpdesk/kb/articles
{
  "category_id": "uuid",
  "title": "How to download payslips",
  "content": "Step 1: Go to...",
  "summary": "Guide for downloading monthly payslips",
  "keywords": ["payslip", "download", "salary"],
  "is_published": true
}
```

---

## Common Patterns

### Authentication
All endpoints require JWT authentication:
```bash
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Error Responses
```json
{
  "detail": "Error message here",
  "status_code": 400
}
```

Common status codes:
- 200: Success
- 201: Created
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 422: Validation Error
- 500: Internal Server Error

### Pagination
For list endpoints:
```
GET /api/v1/expenses?page=1&limit=10
```

Response includes:
```json
{
  "items": [...],
  "total": 100,
  "page": 1,
  "limit": 10
}
```

### Filtering
Common query parameters:
- `status`: Filter by status
- `category`: Filter by category
- `from_date`: Start date filter
- `to_date`: End date filter
- `search`: Text search
- `employee_id`: Filter by employee

### Multi-tenancy
All data is automatically filtered by `organization_id` based on the authenticated user's organization.

### Role-Based Access
- **Employee**: Own records only
- **Manager**: Team records + own records
- **HR Manager**: All records in organization
- **Admin**: Full access

---

## Testing with cURL

### Get Access Token
```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

### Create Expense
```bash
curl -X POST http://localhost:8000/api/v1/expenses \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{
    "expense_date": "2024-01-15",
    "category": "travel",
    "description": "Business trip",
    "amount": 150.00,
    "currency": "USD",
    "tax_amount": 15.00
  }'
```

### List Expenses
```bash
curl http://localhost:8000/api/v1/expenses?page=1&limit=10 \
  -H "Authorization: Bearer {token}"
```

### Create Ticket
```bash
curl -X POST http://localhost:8000/api/v1/helpdesk/tickets \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{
    "subject": "Need help with leave application",
    "description": "How do I apply for annual leave?",
    "category": "leave",
    "priority": "low"
  }'
```

---

## Expense Management Status Flow

```
DRAFT → SUBMITTED → APPROVED → REIMBURSED
         ↓
      REJECTED → (back to DRAFT or CANCELLED)
```

Actions by status:
- **DRAFT**: Create, Update, Delete, Submit
- **SUBMITTED**: Approve, Reject
- **APPROVED**: Reimburse
- **REJECTED**: View only
- **REIMBURSED**: View only

---

## Ticket Status Flow

```
OPEN → IN_PROGRESS → RESOLVED → CLOSED
  ↓         ↑
  → PENDING_EMPLOYEE/PENDING_HR →
  ↓
REOPENED → (back to IN_PROGRESS)
```

Actions by status:
- **OPEN**: Assign, Comment
- **IN_PROGRESS**: Comment, Resolve, Reassign
- **PENDING_**: Comment, Update
- **RESOLVED**: Close, Reopen, Rate
- **CLOSED**: View only, Reopen (if needed)

---

## Data Models Reference

### Expense Categories
- `travel` - Travel expenses
- `accommodation` - Hotels, lodging
- `meals` - Food and dining
- `transportation` - Local transport
- `office_supplies` - Office materials
- `equipment` - Equipment purchases
- `training` - Training and courses
- `entertainment` - Client entertainment
- `communication` - Phone, internet
- `medical` - Medical expenses
- `other` - Other expenses

### Ticket Categories
- `payroll` - Payroll issues
- `benefits` - Benefits questions
- `leave` - Leave management
- `attendance` - Attendance issues
- `performance` - Performance management
- `it_support` - IT support
- `policy_question` - Policy questions
- `document_request` - Document requests
- `onboarding` - Onboarding help
- `offboarding` - Offboarding process
- `general` - General queries
- `other` - Other issues

### Priority Levels
- `low` - Low priority
- `medium` - Medium priority (default)
- `high` - High priority
- `urgent` - Urgent (immediate attention)

---

## Best Practices

### For Employees
1. Always add receipts for expenses over $25
2. Provide clear business purpose
3. Submit expenses within 30 days
4. Check policy limits before submitting

### For Managers
1. Review expenses within 48 hours
2. Provide clear rejection reasons
3. Check policy compliance
4. Verify receipt authenticity

### For Support Agents
1. Respond to tickets within SLA
2. Use knowledge base to answer common questions
3. Add internal notes for context
4. Mark solutions to build knowledge base

### For Administrators
1. Set up expense policies before deployment
2. Configure ticket SLAs
3. Create knowledge base articles
4. Monitor statistics regularly

---

## Integration Points

### Expense Management
- **Payroll**: Reimbursements feed into payroll
- **Accounting**: Export to accounting systems
- **Projects**: Link expenses to projects
- **Receipt OCR**: Auto-extract receipt data

### Helpdesk
- **Email**: Create tickets from emails
- **Slack**: Notifications to Slack
- **Knowledge Base**: AI-powered suggestions
- **Satisfaction**: Post-resolution surveys

---

## Performance Considerations

### Caching
- Cache policy data (rarely changes)
- Cache KB articles (frequently read)
- Cache ticket statistics

### Indexing
Key indexes for performance:
- `expense_date` - For date range queries
- `status` - For filtering
- `employee_id` - For employee queries
- `ticket_number` - For search
- `category` - For categorization

### Pagination
Always use pagination for list endpoints to avoid loading too much data.

---

## Security Notes

### Authentication
- JWT tokens expire after 24 hours
- Refresh tokens for extended sessions
- Password must be 8+ characters

### Authorization
- Employees can only see their own data
- Managers can see team data
- HR/Admin have full access
- Soft deletes for data retention

### Audit Trail
All critical actions are logged:
- Expense submissions/approvals
- Ticket status changes
- Document access
- User actions

---

## Future Enhancements

### Expense Management
- [ ] Receipt OCR integration
- [ ] Mileage calculator with maps
- [ ] Credit card integration
- [ ] Multi-currency conversion
- [ ] Expense reports export

### Helpdesk
- [ ] Email-to-ticket conversion
- [ ] AI-powered ticket routing
- [ ] Chatbot integration
- [ ] Video call support
- [ ] Satisfaction surveys

---

## Support

For API support or questions:
- Check documentation: `/docs` (Swagger UI)
- View OpenAPI spec: `/openapi.json`
- Submit issues: GitHub Issues
- Developer guide: `IMPLEMENTATION_SUMMARY_CORE_HR.md`
