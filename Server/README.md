# CRM & Business Operations Platform — Backend

A production-grade backend for a CRM & Business Operations Platform built with the MERN stack.

**Workflow:** Lead → Sales → Client → Project → Finance → Management

## Tech Stack

- **Runtime:** Node.js (ESM)
- **Framework:** Express.js 5
- **Database:** MongoDB + Mongoose 9
- **Cache/Queue:** Redis + BullMQ
- **Real-time:** Socket.IO
- **Auth:** JWT + httpOnly cookies
- **Validation:** Zod
- **Testing:** Jest + Supertest + MongoDB Memory Server

## Architecture

Feature-based modular architecture:

```
src/
├── core/
│   ├── config/         # MongoDB, Redis connections
│   ├── middleware/      # Auth, RBAC, validate, errorHandler, rateLimiter, pagination
│   ├── utils/          # AppError, asyncWrapper, apiResponse, tokens, logger
│   ├── scripts/        # seedRoles.js
│   └── jobs/
│       ├── queues/     # notification, overdue BullMQ queues
│       └── workers/    # notification, overdue workers
├── modules/
│   ├── auth/           # Login, logout, refresh, me
│   ├── users/          # User CRUD, Role model
│   ├── leads/          # Lead management, qualification, conversion
│   ├── activities/     # Polymorphic activity timeline
│   ├── pipeline/       # Opportunities, stage transitions, won/lost
│   ├── clients/        # Client CRUD, 360 view
│   ├── quotations/     # Quotation CRUD, calculations, versioning, status workflow
│   ├── projects/       # Project management, status workflow, handover
│   ├── tasks/          # Task management, status workflow, dependencies
│   ├── finance/        # Invoices, payments, overdue detection
│   ├── notifications/  # User notifications, read/unread
│   └── reports/        # Sales pipeline, finance overview, project status
├── sockets/            # Socket.IO with JWT authentication
├── app.js              # Express config, middleware, routes
└── server.js           # HTTP server, DB connections, graceful shutdown
```

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your MongoDB and Redis URLs

# 3. Start MongoDB and Redis (local or cloud)

# 4. Seed default roles
npm run seed

# 5. Start the server
npm run dev

# 6. Run tests
npm test
```

## Environment Variables

```env
NODE_ENV=development
PORT=3000

MONGODB_URI=mongodb://localhost:27017/crm
REDIS_URL=redis://127.0.0.1:6379

JWT_ACCESS_SECRET=your-access-secret
JWT_REFRESH_SECRET=your-refresh-secret
ACCESS_TOKEN_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d

CLIENT_URL=http://localhost:5173
CORS_ORIGIN=http://localhost:5173

COOKIE_DOMAIN=localhost
COOKIE_SECURE=false
```

## API Endpoints

All APIs are versioned under `/api/v1/`.

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/login` | Login |
| POST | `/api/v1/auth/refresh` | Refresh access token |
| POST | `/api/v1/auth/logout` | Logout (invalidate session) |
| GET | `/api/v1/auth/me` | Get current user |

### Users
| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/api/v1/users` | `user:read` | List users |
| POST | `/api/v1/users` | `user:create` | Create user |
| GET | `/api/v1/users/:id` | `user:read` | Get user |
| PATCH | `/api/v1/users/:id` | `user:update` | Update user |

### Leads
| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| POST | `/api/v1/leads` | `lead:create` | Create lead |
| GET | `/api/v1/leads` | `lead:read` | List/search/filter leads |
| GET | `/api/v1/leads/:id` | `lead:read` | Get lead |
| PATCH | `/api/v1/leads/:id` | `lead:update` | Update lead |
| DELETE | `/api/v1/leads/:id` | `lead:delete` | Delete lead |
| PATCH | `/api/v1/leads/:id/assign` | `lead:update` | Assign lead |
| PATCH | `/api/v1/leads/:id/status` | `lead:update` | Change status |
| PATCH | `/api/v1/leads/:id/qualify` | `lead:update` | Qualify lead |
| PATCH | `/api/v1/leads/:id/convert` | `lead:update` | Convert to opportunity |

### Opportunities (Pipeline)
| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| POST | `/api/v1/opportunities` | `opportunity:create` | Create opportunity |
| GET | `/api/v1/opportunities` | `opportunity:read` | List opportunities |
| GET | `/api/v1/opportunities/:id` | `opportunity:read` | Get opportunity |
| PATCH | `/api/v1/opportunities/:id` | `opportunity:update` | Update opportunity |
| DELETE | `/api/v1/opportunities/:id` | `opportunity:delete` | Delete opportunity |
| PATCH | `/api/v1/opportunities/:id/stage` | `opportunity:update` | Change stage |
| PATCH | `/api/v1/opportunities/:id/won` | `opportunity:update` | Mark won (creates Project + Invoice) |
| PATCH | `/api/v1/opportunities/:id/lost` | `opportunity:update` | Mark lost |
| PATCH | `/api/v1/opportunities/:id/assign` | `opportunity:update` | Assign user |

### Clients
| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| POST | `/api/v1/clients` | `client:create` | Create client |
| GET | `/api/v1/clients` | `client:read` | List clients |
| GET | `/api/v1/clients/:id` | `client:read` | Get client |
| PATCH | `/api/v1/clients/:id` | `client:update` | Update client |
| DELETE | `/api/v1/clients/:id` | `client:delete` | Delete client |
| GET | `/api/v1/clients/:id/360` | `client:read` | Client 360 view |

### Quotations
| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| POST | `/api/v1/quotations` | `quotation:create` | Create quotation |
| GET | `/api/v1/quotations` | `quotation:read` | List quotations |
| GET | `/api/v1/quotations/:id` | `quotation:read` | Get quotation |
| PATCH | `/api/v1/quotations/:id` | `quotation:update` | Update quotation |
| DELETE | `/api/v1/quotations/:id` | `quotation:delete` | Delete quotation |
| PATCH | `/api/v1/quotations/:id/send` | `quotation:send` | Send quotation |
| PATCH | `/api/v1/quotations/:id/accept` | `quotation:accept` | Accept quotation |
| PATCH | `/api/v1/quotations/:id/reject` | `quotation:reject` | Reject quotation |
| POST | `/api/v1/quotations/:id/version` | `quotation:version` | Create new version |

### Projects
| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| POST | `/api/v1/projects` | `project:create` | Create project |
| GET | `/api/v1/projects` | `project:read` | List projects |
| GET | `/api/v1/projects/:id` | `project:read` | Get project |
| PATCH | `/api/v1/projects/:id` | `project:update` | Update project |
| DELETE | `/api/v1/projects/:id` | `project:delete` | Delete project |
| PATCH | `/api/v1/projects/:id/status` | `project:update` | Change status |
| PATCH | `/api/v1/projects/:id/manager` | `project:update` | Assign manager |
| PATCH | `/api/v1/projects/:id/team` | `project:update` | Assign team |
| GET | `/api/v1/projects/:id/tasks` | `task:read` | Get project tasks |
| GET | `/api/v1/projects/:id/activities` | `activity:read` | Get project activities |

### Tasks
| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| POST | `/api/v1/tasks/project/:projectId` | `task:create` | Create task |
| GET | `/api/v1/tasks/project/:projectId` | `task:read` | List project tasks |
| GET | `/api/v1/tasks` | `task:read` | List all accessible tasks |
| GET | `/api/v1/tasks/:id` | `task:read` | Get task |
| PATCH | `/api/v1/tasks/:id` | `task:update` | Update task |
| DELETE | `/api/v1/tasks/:id` | `task:delete` | Delete task |
| PATCH | `/api/v1/tasks/:id/status` | `task:update` | Change status |
| PATCH | `/api/v1/tasks/:id/assign` | `task:update` | Assign task |

### Invoices & Payments (Finance)
| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| POST | `/api/v1/invoices` | `invoice:create` | Create invoice |
| GET | `/api/v1/invoices` | `invoice:read` | List invoices |
| GET | `/api/v1/invoices/:id` | `invoice:read` | Get invoice |
| PATCH | `/api/v1/invoices/:id` | `invoice:update` | Update invoice |
| PATCH | `/api/v1/invoices/:id/send` | `invoice:send` | Send invoice |
| PATCH | `/api/v1/invoices/:id/approve` | `invoice:approve` | Approve invoice |
| PATCH | `/api/v1/invoices/:id/cancel` | `invoice:update` | Cancel invoice |
| POST | `/api/v1/invoices/:invoiceId/payments` | `payment:create` | Record payment |
| GET | `/api/v1/invoices/:invoiceId/payments` | `payment:read` | List payments |

### Notifications
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/notifications` | List notifications |
| GET | `/api/v1/notifications/unread-count` | Unread count |
| PATCH | `/api/v1/notifications/:id/read` | Mark as read |
| PATCH | `/api/v1/notifications/read-all` | Mark all as read |

### Reports
| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/api/v1/reports/sales-pipeline` | `report:read` | Sales pipeline report |
| GET | `/api/v1/reports/finance-overview` | `report:read` | Finance overview |
| GET | `/api/v1/reports/project-status` | `report:read` | Project status report |

### Activities (Timeline)
| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| POST | `/api/v1/activities` | `activity:create` | Create activity |
| GET | `/api/v1/activities` | `activity:read` | List activities (cursor pagination) |
| GET | `/api/v1/activities/:id` | `activity:read` | Get activity |
| PATCH | `/api/v1/activities/:id` | `activity:update` | Update activity |
| DELETE | `/api/v1/activities/:id` | `activity:delete` | Delete activity |
| PATCH | `/api/v1/activities/:id/complete` | `activity:update` | Complete follow-up |

### Health
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/health` | Health check (MongoDB, Redis, Express) |
| GET | `/health` | Root health (for load balancers) |

## Business Workflow

```
Lead → Qualify → Convert → Opportunity → Stages → Won
                                                    ↓
                                        Project + Draft Invoice
                                                    ↓
                                            Tasks → Complete
                                                    ↓
                                        Send Invoice → Payment
                                                    ↓
                                        Notification + Reports
```

### Stage Transitions

**Leads:** `new → contacted → qualified → converted` (+ `unqualified` terminal)

**Opportunities:** `prospecting → qualification → proposal → negotiation → won/lost`

**Quotations:** `draft → sent → accepted/rejected/expired`

**Projects:** `planned → in_progress → completed` (+ `on_hold`, `cancelled`)

**Tasks:** `todo → in_progress → review → done`

**Invoices:** `draft → sent → partially_paid → paid` (+ `overdue`, `cancelled`)

## Authorization Matrix

| Resource | Admin | Management | Sales | PM | Employee | Finance |
|----------|-------|------------|-------|----|----------|---------|
| Users | Full | Read | — | — | — | — |
| Roles | Full | Read | — | — | — | — |
| Leads | Full | Full | Own | Read | — | — |
| Opportunities | Full | Full | Own | Read | — | — |
| Clients | Full | Full | Own | Read | — | Read |
| Quotations | Full | Full | Own | Read | — | Read |
| Projects | Full | Full | Read | Full | Team | Read |
| Tasks | Full | Full | — | Full | Assigned | — |
| Invoices | Full | Full | — | — | — | Full |
| Payments | Full | Full | — | — | — | Full |
| Reports | Full | Full | Sales scope | Project scope | — | Finance scope |

## Key Design Decisions

### Ownership Authorization (Two-Level)
1. **Route-level:** RBAC permission check (`requirePermission`)
2. **Service-level:** Ownership/resource access check (`assertOwnershipOrPrivileged`)

### Financial Integrity
- Backend calculates all financial values (subtotal, tax, total, balance)
- Frontend values are never trusted
- Atomic updates with optimistic concurrency for payments
- Accepted quotations/invoices are immutable

### Activity Timeline
- Polymorphic: belongs to Lead, Opportunity, Client, Project, or Quotation
- Cursor-based pagination for timeline queries
- Authorization inherits from parent resource

### Handover Transaction
When an Opportunity is marked Won:
1. Validates accepted quotation exists
2. Creates Project with commercial origin links
3. Creates Draft Invoice from quotation items
4. Updates Opportunity with project reference

## Testing

```bash
# Run all tests
npm test

# Run specific test suites
npx jest src/__tests__/auth.test.js
npx jest src/__tests__/projects.test.js
npx jest src/__tests__/finance.test.js
npx jest src/__tests__/full-workflow.test.js
```

Test suites: auth, rbac, leads, activities, opportunities, quotations, clients, projects, finance, notifications, full-workflow integration.

## Deployment

```bash
# Production
NODE_ENV=production npm start

# Seed roles (run once)
npm run seed

# Workers (run separately)
node src/core/jobs/workers/notification.worker.js
node src/core/jobs/workers/overdue.worker.js
```

Architecture:
```
Frontend → API Server → MongoDB
                      → Redis → BullMQ Workers
                      → Socket.IO (real-time)
```
