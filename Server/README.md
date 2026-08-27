# CRM Backend — Phase 1: Foundation, Authentication & RBAC

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
Server/
├── src/
│   ├── core/
│   │   ├── config/
│   │   │   ├── mongodb.js          # MongoDB connection
│   │   │   └── redis.js            # Redis connection
│   │   ├── middleware/
│   │   │   ├── auth.js             # JWT authentication
│   │   │   ├── rbac.js             # Permission-based RBAC
│   │   │   ├── validate.js         # Zod validation
│   │   │   ├── errorHandler.js     # Global error handler
│   │   │   ├── rateLimiter.js      # Rate limiting
│   │   │   └── pagination.js       # Pagination
│   │   ├── scripts/
│   │   │   └── seedRoles.js        # Role seeding
│   │   └── utils/
│   │       ├── apiResponse.js      # Standard response envelope
│   │       ├── AppError.js         # Custom error class
│   │       ├── asyncWrapper.js     # Async error wrapper
│   │       ├── logger.js           # Winston logger
│   │       └── tokens.js           # JWT utilities
│   ├── modules/
│   │   ├── auth/                   # Authentication module
│   │   │   ├── auth.controller.js
│   │   │   ├── auth.routes.js
│   │   │   ├── auth.service.js
│   │   │   └── auth.validation.js
│   │   ├── health/
│   │   │   └── health.routes.js    # Health check
│   │   └── users/                  # User & Role management
│   │       ├── role.model.js
│   │       ├── user.controller.js
│   │       ├── user.model.js
│   │       ├── user.routes.js
│   │       ├── user.service.js
│   │       └── user.validation.js
│   ├── __tests__/
│   │   ├── setup.js                # Test utilities
│   │   ├── auth.test.js
│   │   └── rbac.test.js
│   ├── app.js                      # Express app config
│   └── server.js                   # HTTP server startup
├── .env.example
├── package.json
└── README.md
```

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)
- Redis

### Setup

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your values

# Seed default roles
npm run seed

# Start development server
npm run dev

# Run tests
npm test
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment | `development` |
| `PORT` | Server port | `3000` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/crm_backend` |
| `REDIS_URL` | Redis connection string | `redis://127.0.0.1:6379` |
| `JWT_ACCESS_SECRET` | Access token secret | — |
| `JWT_REFRESH_SECRET` | Refresh token secret | — |
| `ACCESS_TOKEN_EXPIRES_IN` | Access token TTL | `15m` |
| `REFRESH_TOKEN_EXPIRES_IN` | Refresh token TTL | `7d` |
| `COOKIE_DOMAIN` | Cookie domain | `localhost` |
| `COOKIE_SECURE` | Secure cookies | `false` |
| `COOKIE_SAME_SITE` | SameSite policy | `lax` |
| `CORS_ORIGIN` | Allowed origin | `http://localhost:5173` |

## Authentication Flow

```
Login:
  POST /api/v1/auth/login { email, password }
  → Returns accessToken in body + sets httpOnly cookies
  → Stores session in Redis

Access protected route:
  Authorization: Bearer <accessToken>
  OR
  Cookie: accessToken=...

Refresh:
  POST /api/v1/auth/refresh
  → Reads refreshToken from httpOnly cookie
  → Validates against Redis session
  → Issues new token pair (rotation)
  → Invalidates old refresh token

Logout:
  POST /api/v1/auth/logout
  → Deletes Redis session
  → Clears cookies
```

## RBAC System

Permissions follow `resource:action` pattern:
- `lead:create`, `lead:read`, `lead:update`, `lead:delete`
- `invoice:approve`, `project:*` (wildcard)

### Route-level auth
```js
router.post('/leads',
  authenticate,
  requirePermission('lead:create'),
  validate(createLeadSchema),
  leadController.create
);
```

### Service-level ownership
```js
if (!assertOwnershipOrPrivileged(resource.assignedTo, req.user)) {
  throw new AppError('Not authorized', 403, 'FORBIDDEN');
}
```

## Default Roles

| Role | Description |
|------|-------------|
| `admin` | Full system access |
| `management` | Can manage most resources |
| `sales` | Leads, opportunities, clients |
| `project_manager` | Projects and tasks |
| `employee` | Limited — tasks, activities |
| `finance` | Invoices and payments |

## API Endpoints

### Auth
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/v1/auth/login` | Login | No |
| POST | `/api/v1/auth/refresh` | Refresh tokens | Cookie |
| POST | `/api/v1/auth/logout` | Logout | Yes |
| GET | `/api/v1/auth/me` | Current user | Yes |

### Users (Admin)
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

### Health
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/health` | Service health |
| GET | `/health` | Simple health |

## Response Format

### Success
```json
{
  "success": true,
  "data": {},
  "meta": {}
}
```

### Error
```json
{
  "success": false,
  "error": {
    "message": "Something went wrong",
    "code": "ERROR_CODE",
    "details": {}
  }
}
```

## Security Features

- Helmet security headers
- CORS with credentials
- Rate limiting (stricter for auth endpoints)
- httpOnly cookies for refresh tokens
- Password hashing (bcrypt, 12 rounds)
- JWT access + refresh token rotation
- Redis-backed session management
- Sensitive fields excluded from responses
- Request validation (Zod)
- Stack traces hidden in production

## Testing

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch
```

Tests cover:
- Authentication (login, logout, refresh, protected routes)
- RBAC (permission checks, role-based access)
- Security (password hash exclusion, sensitive field protection)

## Deployment

1. Set `NODE_ENV=production`
2. Use managed MongoDB (Atlas) and Redis (Upstash, Redis Cloud)
3. Set secure cookie options: `COOKIE_SECURE=true`, `COOKIE_DOMAIN=yourdomain.com`
4. Generate strong JWT secrets
5. Configure CORS for your frontend domain
6. Run `npm run seed` to create default roles
7. Start with `npm start`
