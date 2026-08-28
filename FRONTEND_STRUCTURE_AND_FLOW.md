# Frontend Structure and Flow

## Purpose

The frontend is a Vite + React CRM interface for the complete business journey:

Lead capture -> Sales pipeline -> Client management -> Quotation -> Project delivery -> Invoice/payment -> Reports.

It is built as an authenticated single page application. Public users only see login/register routes. Authenticated users enter the application shell and see modules based on their role.

## Technology

- Runtime/build: Vite
- UI framework: React
- Routing: `react-router-dom`
- Server state: `@tanstack/react-query`
- HTTP client: Axios through `src/lib/apiClient.js`
- Realtime: Socket.IO client through `src/lib/socket.js`
- Icons: `lucide-react`
- Styling: Tailwind CSS plus app CSS

## Important Files

| Area | Main files | Responsibility |
| --- | --- | --- |
| App entry | `src/main.jsx`, `src/App.jsx` | Mount React, define routes, wrap providers |
| Layout | `src/components/layout/AppShell.jsx`, `Sidebar.jsx`, `Topbar.jsx`, `UserMenu.jsx` | Main CRM shell, navigation, top actions |
| Auth | `src/contexts/AuthContext.jsx`, `src/features/auth/Login.jsx`, `ProtectedRoute.jsx` | Login, session restore, protected routes |
| API | `src/lib/apiClient.js`, `src/lib/api.js` | Backend connection, endpoint wrappers, response normalization |
| Realtime | `src/lib/socket.js`, `src/contexts/NotificationContext.jsx` | Socket connection and notification/toast state |
| Shared UI | `src/components/ui/*` | Buttons, inputs, modals, tables, kanban, charts, toasts |
| Business features | `src/features/*` | CRM modules: dashboard, leads, pipeline, clients, quotations, projects, tasks, finance, reports |
| Utilities | `src/utils/rbac.js`, `src/utils/formatters.js` | Role-based nav visibility and display formatting |

## Route Flow

| Route | Screen | Business use |
| --- | --- | --- |
| `/login` | Login | User signs in and receives secure cookie session |
| `/register` | Login component | Currently points to the same auth UI |
| `/dashboard` | Dashboard | High-level CRM snapshot and role-aware metrics |
| `/leads` | Lead list | Capture, search, edit, qualify, and convert leads |
| `/leads/:id` | Lead detail | View lead timeline and detailed lead information |
| `/pipeline` | Pipeline kanban | Move opportunities through sales stages and mark won/lost |
| `/clients` | Client list | Manage active client accounts |
| `/clients/:id` | Client detail / 360 view | See client, opportunities, quotations, projects, invoices, activities |
| `/quotations` | Quotation list | Track quotation status and create quotations |
| `/quotations/new` | Quotation builder | Create quotation line items against an opportunity/client |
| `/projects` | Project list | Track delivery projects created manually or from won opportunities |
| `/projects/:id` | Project detail | Manage project details, team, tasks, and activities |
| `/tasks` | Task board | Work management by task status |
| `/invoices` | Invoice list | Finance overview of invoices and payment state |
| `/invoices/:id` | Invoice detail | Send/approve/cancel invoice and record payments |
| `/reports` | Reports | Sales, finance, and project analytics |

Unknown authenticated routes redirect to `/dashboard`.

## Common User Flow

1. User logs in from `/login`.
2. `AuthProvider` calls `/auth/me` on app load to restore the session from httpOnly cookies.
3. `ProtectedRoute` blocks unauthenticated users and sends them back to login.
4. User lands in `AppShell`, which shows the left navigation and topbar.
5. User creates or manages leads in `/leads`.
6. A lead can move through status steps and be converted into an opportunity.
7. Opportunities are managed in `/pipeline` using a kanban view.
8. Sales creates a quotation for an opportunity and sends it to the client.
9. Once a quotation is accepted, the opportunity can be marked won.
10. A won opportunity creates the project and draft invoice on the backend.
11. Project managers and team members manage project work and tasks.
12. Finance sends/approves invoices and records payments.
13. Reports summarize sales pipeline, finance, and project delivery health.

## Role-Based Frontend Access

Navigation is controlled by `src/utils/rbac.js`.

| Role | Main visible areas |
| --- | --- |
| `admin` | All areas |
| `management` | Dashboard, leads, pipeline, clients, quotations, projects, tasks, finance, reports |
| `sales` | Dashboard, leads, pipeline, clients, quotations, projects, reports |
| `project_manager` | Dashboard, leads, pipeline, clients, projects, tasks, reports |
| `employee` | Dashboard, projects, tasks |
| `finance` | Dashboard, clients, quotations, projects, finance, reports |

Frontend role visibility is only a UX layer. Backend permissions remain the source of truth.

## API Integration

`src/lib/apiClient.js` sets the base URL from `VITE_API_URL`. If not provided, it defaults to `/api/v1`, which works in local Vite development because `vite.config.js` proxies `/api` to `http://localhost:3000`.

For Vercel production, set:

```env
VITE_API_URL=https://your-render-backend.onrender.com/api/v1
VITE_SOCKET_URL=https://your-render-backend.onrender.com
VITE_ENABLE_MOCK_FALLBACK=false
```

Main API wrappers live in `src/lib/api.js`:

- `authApi`: login, logout, refresh, current user
- `leadsApi`: lead CRUD, assignment, status, qualify, convert
- `opportunitiesApi`: opportunity CRUD, stage movement, won/lost, quotations
- `clientsApi`: client CRUD and client 360 view
- `quotationsApi`: create/update/send/accept/reject/version-related reads
- `projectsApi`: project CRUD, manager/team, project tasks, activities
- `tasksApi`: task CRUD, assignment, status
- `financeApi`: invoices and payments
- `activitiesApi`: timeline actions
- `notificationsApi`: notifications and unread state
- `reportsApi`: sales, finance, and project reports

## Verification Notes

- Production build passed with `npm run build`.
- Frontend lint passed with `npm run lint` after fixing the blocking `PaymentModal` hook-order issue.
- Remaining frontend lint output is warnings only, mostly unused imports and React compiler recommendations around state-in-effect patterns.
- Build reports one large JavaScript bundle around 934 kB before gzip and warns that some dynamic imports are ineffective because the same modules are also statically imported.

## Change Made During Review

- Fixed `src/features/finance/PaymentModal.jsx` so React hooks are always called in the same order.
- Reset the payment form when a new invoice is opened so the amount defaults to the current invoice balance.

## Deployment Readiness

The frontend is deployable to Vercel. Before deployment, configure `VITE_API_URL` and `VITE_SOCKET_URL` to the Render backend URL. If these are left unset in production, the app will call `/api/v1` on the Vercel domain, which will not reach the Render API unless a Vercel rewrite is added.

Recommended Vercel settings:

- Root directory: `Client`
- Build command: `npm run build`
- Output directory: `dist`
- Environment variables: `VITE_API_URL`, `VITE_SOCKET_URL`, `VITE_ENABLE_MOCK_FALLBACK=false`

