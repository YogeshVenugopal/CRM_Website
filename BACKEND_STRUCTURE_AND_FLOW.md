# Backend Structure and Flow

## Purpose

The backend is an Express + MongoDB API for the CRM business workflow:

Lead -> Opportunity -> Quotation -> Won deal -> Project -> Invoice -> Payment -> Reports.

It is designed as a modular API under `/api/v1`, with JWT authentication, role permissions, validation, service-layer business rules, and integration tests.

## Technology

- Runtime: Node.js with ES modules
- API framework: Express 5
- Database: MongoDB through Mongoose
- Auth: JWT access and refresh tokens in httpOnly cookies
- Validation: Zod request schemas
- Permissions: Role-based access control middleware
- Realtime: Socket.IO
- Queue/cache: Redis and BullMQ, now optional unless `REQUIRE_REDIS=true`
- Testing: Jest, Supertest, MongoDB Memory Server

## Runtime Boot Flow

1. `src/server.js` loads the Express app.
2. It connects to MongoDB using `MONGODB_URI`.
3. It attempts Redis only if `REDIS_URL` is set.
4. It creates the HTTP server.
5. It initializes Socket.IO with the same allowed CORS origin.
6. It listens on `PORT`, defaulting to `3000`.
7. On shutdown, it closes Socket.IO, MongoDB, and Redis.

## Application Structure

| Area | Files | Responsibility |
| --- | --- | --- |
| Server entry | `src/server.js` | DB connections, HTTP server, sockets, graceful shutdown |
| Express app | `src/app.js` | Security middleware, parsing, routes, 404, error handler |
| Config | `src/core/config/*` | MongoDB and Redis clients |
| Middleware | `src/core/middleware/*` | Auth, RBAC, validation, pagination, rate limits, error handling |
| Utilities | `src/core/utils/*` | Tokens, API responses, logger, AppError, async wrapper |
| Jobs | `src/core/jobs/*` | Optional notification and overdue queues/workers |
| Sockets | `src/sockets/index.js` | Authenticated Socket.IO connection and room events |
| Modules | `src/modules/*` | Business resources and workflows |
| Tests | `src/__tests__/*` | Integration and module tests |

## Module Map

| Module | Main behavior |
| --- | --- |
| `auth` | Login, refresh, logout, current user |
| `users` | User CRUD, role assignment, activate/deactivate |
| `leads` | Lead CRUD, assignment, status changes, qualification, conversion |
| `activities` | Timeline notes/calls/follow-ups against business entities |
| `pipeline` | Opportunity CRUD, stage transitions, won/lost handling |
| `clients` | Client CRUD, duplicate prevention, 360-degree view |
| `quotations` | Quotation CRUD, totals, send/accept/reject, versioning |
| `projects` | Project CRUD, manager/team assignment, handover from won deals |
| `tasks` | Task CRUD, project tasks, assignee/status updates |
| `finance` | Invoices, invoice lifecycle, payments, overdue detection |
| `notifications` | Notification list/count/read state |
| `reports` | Sales pipeline, finance, and project status reports |
| `health` | `/health` and `/api/v1/health` checks |

## Business Flow

1. Sales creates a lead.
2. The lead moves from `new` to `contacted`, then to `qualified`.
3. A qualified lead can be converted into an opportunity.
4. The opportunity moves through pipeline stages:
   `prospecting -> qualification -> proposal -> negotiation`.
5. Sales creates a quotation for the opportunity.
6. The quotation moves from `draft` to `sent`.
7. The client accepts or rejects the quotation.
8. An opportunity can only be marked `won` after it has an accepted quotation.
9. Marking an opportunity `won` creates:
   - a project linked to the opportunity and quotation
   - a draft invoice copied from the accepted quotation items
10. Project managers assign managers, team members, and tasks.
11. Finance sends or approves invoices.
12. Finance records payments. The backend prevents overpayment and updates invoice balance/status.
13. Reports aggregate sales, finance, and delivery data.

## State Transitions

| Resource | Valid flow |
| --- | --- |
| Lead | `new -> contacted -> qualified -> converted`, with `unqualified` as terminal |
| Opportunity | `prospecting -> qualification -> proposal -> negotiation -> won/lost` |
| Quotation | `draft -> sent -> accepted/rejected/expired` |
| Project | `planned -> in_progress -> completed`, with hold/cancel states handled by model rules |
| Task | `todo -> in_progress -> review -> done` |
| Invoice | `draft -> sent -> partially_paid -> paid`, with `overdue` and `cancelled` states |

## Security and Access Control

Every protected API route uses `authenticate`, which reads the access token from the `Authorization` header or `accessToken` cookie. The middleware verifies JWT, checks session state when Redis is available, loads the user, and attaches `req.user`.

Routes use `requirePermission(...)` for role permissions. Service methods add business/resource checks where required, especially for ownership-sensitive updates and transitions.

Roles used by the system:

- `admin`
- `management`
- `sales`
- `project_manager`
- `employee`
- `finance`

## Financial Rules

The backend is the source of truth for money:

- Quotation and invoice totals are calculated server-side.
- Frontend totals are not trusted.
- Accepted quotations are treated as final workflow artifacts.
- Payments cannot exceed invoice balance.
- Payments cannot be recorded against draft or cancelled invoices.
- Payment updates use an optimistic concurrency check to reduce double-payment risk.

## API Base

All main routes are under:

```text
/api/v1
```

Important route groups:

- `/api/v1/auth`
- `/api/v1/users`
- `/api/v1/leads`
- `/api/v1/activities`
- `/api/v1/opportunities`
- `/api/v1/clients`
- `/api/v1/quotations`
- `/api/v1/projects`
- `/api/v1/tasks`
- `/api/v1/invoices`
- `/api/v1/notifications`
- `/api/v1/reports`
- `/api/v1/health`

There is also a non-versioned `/health` route for load balancers.

## Deployment Readiness

The backend is deployable to Render.

Recommended Render settings:

- Root directory: `Server`
- Build command: `npm install`
- Start command: `npm start`
- Health check path: `/health`

Required environment variables:

```env
NODE_ENV=production
PORT=3000
MONGODB_URI=<your MongoDB Atlas connection string>
JWT_ACCESS_SECRET=<strong secret>
JWT_REFRESH_SECRET=<strong secret>
CORS_ORIGIN=https://your-vercel-frontend.vercel.app
COOKIE_SECURE=true
COOKIE_SAME_SITE=none
```

Optional Redis variables:

```env
REDIS_URL=<your Redis URL>
REQUIRE_REDIS=false
```

Use `REQUIRE_REDIS=true` only if Redis-backed sessions/queues must be mandatory. Without Redis, the API can still start, and auth still keeps refresh-token backup state in MongoDB.

For cross-site Vercel -> Render cookies, production should use `COOKIE_SECURE=true` and `COOKIE_SAME_SITE=none`. Avoid setting `COOKIE_DOMAIN=localhost` in production.

## Verification Notes

- Backend integration tests passed with `npm test`: 13 test suites and 198 tests.
- Backend tests cover auth, RBAC, leads, activities, opportunities, quotations, clients, projects, finance, notifications, and the full lead-to-payment workflow.
- The first sandboxed test run failed because MongoDB Memory Server could not bind a local port. Running outside the sandbox passed.
- Backend lint script currently fails because no ESLint configuration file exists for the server package. This does not affect runtime or tests, but the script should be configured before using it in CI.

## Changes Made During Review

- Made Redis optional by default in `src/core/config/redis.js`.
- Added `REQUIRE_REDIS=false` to `Server/.env.example`.
- Removed duplicate Mongoose indexes for `invoiceNumber` and `quotationNumber`.
- Replaced deprecated Mongoose `{ new: true }` usage with `{ returnDocument: 'after' }`.

## Current Assessment

The core CRM business logic is in good shape. The tested backend workflow covers the important business path from lead creation through won opportunity, project creation, invoice generation, and payment recording. The main production risks are configuration-related: Vercel must point to the Render API, Render must allow the Vercel origin through CORS, and production cookie settings must be cross-site safe.

