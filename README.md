# NOUS Estrategia frontend

Angular 22 standalone application preserving the public wireframes and existing CRM screens. Reactive state uses signals; HTTP operations use RxJS. Angular Material provides client pagination. Notifications render on both anonymous and authenticated pages.

## Run and verify

```powershell
npm ci
npm start
npm test -- --watch=false
npm run build
```

Open http://localhost:4200. Start the existing backend separately:

```powershell
dotnet run --project ../NousEstrategia.Backend/NousEstrategia.Api
```

Development uses `http://localhost:5000/api`, matching the backend launch profile. Production uses `/api`; proxy this path to the backend. Serve the generated directory indexes for the five public routes and `index.csr.html` for CRM routes. Unknown paths should return HTTP 404 with the CSR shell. Environment files are in `src/environments`, with production replacement configured automatically.

## SEO and static hosting

Public pages are now prerendered during `npm run build`. Run `npm run test:seo` to check the generated HTML, or `npm run test:seo:browser` for browser checks as well (requires Microsoft Edge). Deployment and account-owner steps are in [SEO-HANDOFF.md](SEO-HANDOFF.md).

## Phase 1 behavior

- Login and registration persist the backend's `{ token, user }` response. Registration validates backend password rules and confirmation.
- Sessions restore on reload, expire while idle, and synchronize logout across tabs. The backend issues access tokens only; expiration requires another login.
- Bearer headers go only to the configured API origin and path. Protected 401 responses clear the session and preserve the return destination. Anonymous login failures remain on the form.
- `/app` and all children require a valid session. Client/project create and edit routes require Admin, Consultant or Analyst. Viewers see an access-restricted page. Server authorization remains authoritative.
- Failed HTTP responses and unsuccessful response envelopes show notifications. Concurrent requests keep the loading indicator active until all finish or cancel.
- Clients retain CRUD with server pagination and Material page-size controls. Projects retain client-scoped lists, status/pillar filters, CRUD, status transitions and deliverables.
- Forms prevent duplicate submission, show validation errors, and prevent editing after failed initial loads.

## Actual API contract

The brief differs from the checked-in backend. Calls use the existing `/api` endpoints without an unsupported `/v1`:

| Feature | Endpoint |
| --- | --- |
| Login / signup | `POST /api/auth/login`, `POST /api/auth/register` |
| Current user | `GET /api/auth/me` |
| Clients | `GET /api/clients?page=1&limit=20`, `POST /api/clients` |
| Client details / updates / deletion | `GET`, `PUT`, `DELETE /api/clients/{id}` |
| Client projects | `GET /api/projects/client/{clientId}?status=&pillar=` |
| Project creation | `POST /api/projects` |
| Project details / updates / deletion | `GET`, `PUT`, `DELETE /api/projects/{id}` |

Responses use `{ success, data, error, pagination }`; pagination uses `{ page, limit, total, pages }`. Domain models match the .NET DTOs, including string dates and enum names. Feature services centralize endpoint calls over HttpService. Existing signals and standalone components are retained instead of introducing NgRx or NgModules.

## Remaining backend dependencies

These brief requirements have not been simulated and require API implementation:

- Refresh-token issuance, rotation and revocation; forgot/reset password; profile updates and password changes.
- Server-side client search, industry/tier/status filtering and configurable sorting. The client endpoint accepts only page and limit.
- The brief's client statistics and project metrics endpoints.
- Client detail responses omit phone, website and key contact although PUT replaces them. The existing form asks for phone again; omitted contact fields can be cleared on save. Expose those fields in the backend DTO or support partial updates before client edits can preserve all contact data automatically.

## Validation

The production build and 15 automated tests pass. `src/app/core/phase-one.spec.ts` covers login mapping, stored/expired/malformed sessions, cross-tab logout, credential scoping, 401 handling, concurrent loading/cancellation, unsuccessful envelopes, pagination, project filters and guards using Angular's mock HTTP backend.

Live API/browser CRUD has not been verified: no backend was listening on the configured development port during this pass. For live acceptance, run both services, sign in, create a disposable client/project, edit them, reload, verify Viewer restrictions, and remove only the disposable records as Admin. Email recovery and token refresh remain blocked by missing endpoints.

Testing uses the [Angular HTTP testing guidance](https://angular.dev/guide/http/testing).
