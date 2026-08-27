# CRM Backend — Phase 3: Pipeline & Clients

Production-grade backend for the **CRM & Business Operations Platform** built with Node.js, Express, MongoDB, Redis, and JWT-based authentication.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js (ESM) |
| Framework | Express 5 |
| Database | MongoDB + Mongoose 9 |
| Cache / Sessions | Redis |
| Auth | JWT (access + refresh tokens) + httpOnly cookies |
| Validation | Zod |
| Logging | Winston |
| Security | Helmet, CORS, Rate Limiting |
| Testing | Jest + Supertest + MongoDB Memory Server |

## Architecture

```
Server/src/
├── core/                          # Infrastructure
│   ├── config/                    # mongodb.js, redis.js
│   ├── middleware/                 # auth, rbac, validate, errorHandler, rateLimiter, pagination
│   ├── scripts/                   # seedRoles.js
│   └── utils/                     # AppError, asyncWrapper, apiResponse, tokens, logger
├── modules/
│   ├── auth/                      # Phase 1
│   ├── users/                     # Phase 1
│   ├── health/                    # Phase 1
│   ├── leads/                     # Phase 2
│   ├── activities/                # Phase 2
│   ├── pipeline/                  # ★ Phase 3
│   │   ├── opportunity.model.js
│   │   ├── opportunity.controller.js
│   │   ├── opportunity.service.js
│   │   ├── opportunity.routes.js
│   │   └── opportunity.validation.js
│   └── clients/                   # ★ Phase 3
│       ├── client.model.js
│       ├── client.controller.js
│       ├── client.service.js
│       ├── client.routes.js
│       └── client.validation.js
├── __tests__/                     # 106 tests
├── app.js
└── server.js
```

## Getting Started

```bash
npm install
cp .env.example .env
npm run seed    # Seed roles with all permissions
npm run dev     # Start development server
npm test        # Run 106 tests
```

## Business Workflow

```
Lead → Qualified → Converted → Opportunity → Stages → Won/Lost
                                                      ↓
                                                   Client
```

## Opportunity Stages

```
prospecting → qualification → proposal → negotiation → won (terminal)
                                                ↓
                                             lost (terminal)
```

## API Endpoints

### Auth
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/v1/auth/login` | Login | No |
| POST | `/api/v1/auth/refresh` | Refresh tokens | Cookie |
| POST | `/api/v1/auth/logout` | Logout | Yes |
| GET | `/api/v1/auth/me` | Current user | Yes |

### Users
| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/api/v1/users` | List users | `user:read` |
| POST | `/api/v1/users` | Create user | `user:create` |
| GET | `/api/v1/users/:id` | Get user | `user:read` |
| PATCH | `/api/v1/users/:id` | Update user | `user:update` |
| PATCH | `/api/v1/users/:id/activate` | Activate | `user:update` |
| PATCH | `/api/v1/users/:id/deactivate` | Deactivate | `user:update` |
| PATCH | `/api/v1/users/:id/role` | Change role | `user:update` |
| GET | `/api/v1/roles` | List roles | `role:read` |

### Leads
| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| POST | `/api/v1/leads` | Create lead | `lead:create` |
| GET | `/api/v1/leads` | List/search/filter | `lead:read` |
| GET | `/api/v1/leads/:id` | Get lead | `lead:read` |
| PATCH | `/api/v1/leads/:id` | Update lead | `lead:update` |
| DELETE | `/api/v1/leads/:id` | Delete lead | `lead:delete` |
| PATCH | `/api/v1/leads/:id/assign` | Assign lead | `lead:update` |
| PATCH | `/api/v1/leads/:id/status` | Update status | `lead:update` |
| PATCH | `/api/v1/leads/:id/qualify` | Qualify lead | `lead:update` |
| PATCH | `/api/v1/leads/:id/convert` | Convert to opportunity | `lead:update` |
| GET | `/api/v1/leads/:id/activities` | Lead timeline | `activity:read` |

### ★ Opportunities (Phase 3)
| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| POST | `/api/v1/opportunities` | Create opportunity | `opportunity:create` |
| GET | `/api/v1/opportunities` | List/search/filter | `opportunity:read` |
| GET | `/api/v1/opportunities/:id` | Get opportunity | `opportunity:read` |
| PATCH | `/api/v1/opportunities/:id` | Update opportunity | `opportunity:update` |
| DELETE | `/api/v1/opportunities/:id` | Delete (admin/mgmt) | `opportunity:delete` |
| PATCH | `/api/v1/opportunities/:id/assign` | Assign | `opportunity:update` |
| PATCH | `/api/v1/opportunities/:id/stage` | Change stage | `opportunity:update` |
| PATCH | `/api/v1/opportunities/:id/won` | Mark as won | `opportunity:update` |
| PATCH | `/api/v1/opportunities/:id/lost` | Mark as lost | `opportunity:update` |

### ★ Clients (Phase 3)
| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| POST | `/api/v1/clients` | Create client | `client:create` |
| GET | `/api/v1/clients` | List/search/filter | `client:read` |
| GET | `/api/v1/clients/:id` | Get client | `client:read` |
| PATCH | `/api/v1/clients/:id` | Update client | `client:update` |
| DELETE | `/api/v1/clients/:id` | Delete (admin/mgmt) | `client:delete` |
| GET | `/api/v1/clients/:id/360` | Client 360 view | `client:read` |

### Activities
| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| POST | `/api/v1/activities` | Create activity | `activity:create` |
| GET | `/api/v1/activities` | List (cursor pagination) | `activity:read` |
| GET | `/api/v1/activities/:id` | Get activity | `activity:read` |
| PATCH | `/api/v1/activities/:id` | Update activity | `activity:update` |
| DELETE | `/api/v1/activities/:id` | Delete activity | — |
| PATCH | `/api/v1/activities/:id/complete` | Complete follow-up | `activity:update` |
| GET | `/api/v1/activities/follow-ups` | My pending follow-ups | `activity:read` |

### Health
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/health` | Service health |
| GET | `/health` | Simple health |

## Opportunity Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `search` | string | Full-text search on title |
| `stage` | enum | Filter by stage |
| `assignedTo` | ObjectId | Filter by assigned user |
| `client` | ObjectId | Filter by client |
| `lead` | ObjectId | Filter by lead |
| `valueMin` | number | Minimum value |
| `valueMax` | number | Maximum value |
| `expectedCloseFrom` | ISO date | Expected close date range start |
| `expectedCloseTo` | ISO date | Expected close date range end |
| `page` | number | Page number |
| `limit` | number | Results per page (max: 100) |

## Client Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `search` | string | Full-text search on companyName |
| `status` | enum | Filter by status (active/inactive) |
| `accountOwner` | ObjectId | Filter by account owner |
| `page` | number | Page number |
| `limit` | number | Results per page (max: 100) |

## Client 360 View

`GET /api/v1/clients/:id/360` returns:

```json
{
  "success": true,
  "data": {
    "client": { ... },
    "opportunities": [ ... ],
    "recentActivities": [ ... ],
    "stats": {
      "totalOpportunities": 5,
      "activeOpportunities": 3,
      "wonOpportunities": 2,
      "totalValue": 500000
    }
  }
}
```

## Authorization Model

### Two-Level Authorization

**Level 1 — Route RBAC** (middleware):
```js
router.post('/opportunities', authenticate, requirePermission('opportunity:create'), ...)
```

**Level 2 — Service Ownership** (business logic):
```js
assertOpportunityAccess(opportunity, req.user);
```

### Ownership Rules

| Role | See all? | Modify own? | Modify others? | Delete? |
|------|----------|-------------|----------------|---------|
| admin | ✅ | ✅ | ✅ | ✅ |
| management | ✅ | ✅ | ✅ | ✅ |
| sales | Only assigned/created | ✅ | ❌ | ❌ |

## Stage Transition Rules

```
prospecting → qualification
qualification → proposal
proposal → negotiation, lost
negotiation → won, lost
won → (terminal)
lost → (terminal)
```

Invalid transitions return `INVALID_STAGE_TRANSITION`.

## Lead → Opportunity Conversion

When a qualified lead is converted:
1. Opportunity is created from lead data
2. Lead status → `converted`
3. Lead `convertedToOpportunity` → Opportunity ID
4. Both records maintain referential integrity

## Error Codes

| Code | Description |
|------|-------------|
| `OPPORTUNITY_NOT_FOUND` | Opportunity does not exist |
| `OPPORTUNITY_ACCESS_DENIED` | User cannot access this opportunity |
| `INVALID_STAGE_TRANSITION` | Stage change not allowed |
| `OPPORTUNITY_ALREADY_WON` | Already won |
| `OPPORTUNITY_ALREADY_LOST` | Already lost |
| `LOST_REASON_REQUIRED` | Lost reason is mandatory |
| `CLIENT_NOT_FOUND` | Client does not exist |
| `CLIENT_ACCESS_DENIED` | User cannot access this client |
| `DUPLICATE_CLIENT` | Company name already exists |
| `INVALID_ASSIGNMENT` | Target user invalid/inactive |

## Testing

```bash
# Run all 106 tests
npm test

# Run specific suite
npx jest --forceExit src/__tests__/opportunities.test.js
```

### Test Coverage

| Suite | Tests | Coverage |
|-------|-------|----------|
| Auth | 10 | Login, logout, refresh, protected routes, security |
| RBAC | 7 | Permission checks, role-based access |
| Leads | 28 | CRUD, ownership, status transitions, search, filter, pagination |
| Activities | 17 | CRUD, polymorphic access, follow-ups, cursor pagination |
| Opportunities | 20 | CRUD, ownership, stage transitions, won/lost, lead conversion, search, filter |
| Clients | 16 | CRUD, ownership, duplicate protection, 360, search, filter |
| Phase 3 Integration | 5 | Full pipeline flow, referential integrity, activity integration, authorization |
| **Total** | **106** | |

## Deployment

1. Set `NODE_ENV=production`
2. Use managed MongoDB (Atlas) and Redis (Upstash, Redis Cloud)
3. Set secure cookie options: `COOKIE_SECURE=true`, `COOKIE_DOMAIN=yourdomain.com`
4. Generate strong JWT secrets
5. Configure CORS for your frontend domain
6. Run `npm run seed` to create/update default roles
7. Start with `npm start`

## Phase 4 Handoff

### What Phase 3 Provides

- **Pipeline module** — full Opportunity lifecycle with stage transitions, won/lost, ownership
- **Client module** — CRUD with duplicate protection, 360 view, ownership
- **Lead → Opportunity conversion** — transactional, with referential integrity
- **Activity integration** — Opportunity and Client activities work through the polymorphic system

### How Quotations Should Connect to Opportunities

1. `markWon()` accepts an optional `quotationId` — currently a placeholder
2. When Quotation module is implemented, `markWon()` should validate:
   - Quotation exists
   - Quotation status is `accepted`
   - Quotation is linked to this Opportunity
3. The Won operation becomes: `Opportunity Won → Accepted Quotation → Project → Draft Invoice`

### How Projects Should Integrate

1. Won Opportunities become Projects
2. Client reference is already available on the Opportunity
3. Activity timeline continues seamlessly

### What Remains for Phase 4/5

- Quotation module
- Project module (sales-to-project handover)
- Task module
- Finance module (invoices, payments)
- Notifications module
- Reports module
