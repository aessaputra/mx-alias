# Email Alias Manager Design

Date: 2026-08-26
Status: Approved design

## Problem

Build a private, internet-accessible application for managing email aliases on domains already hosted by MXroute. Each alias forwards to exactly one destination email address, while multiple aliases may share the same destination. The application protects the user's primary email address by exposing aliases instead.

## Scope

### MVP

- One administrator authenticated with one password.
- One MXroute account configured on the server.
- List domains from MXroute.
- Select a domain and list its forwarders.
- Create an alias manually.
- Generate an editable alias in the form `word-word-number`.
- Assign exactly one email destination to each alias.
- Copy an alias address.
- Delete an alias after confirmation.
- Deploy first as a Docker container on a VPS.
- Keep the application compatible with a later Vercel deployment.

### Excluded

- User registration or multiple administrators.
- Multiple MXroute accounts.
- Database or local alias metadata.
- Catch-all and automatic alias creation on first email.
- Editing an existing forwarder's destination. The user deletes and recreates it.
- Multiple destinations for one alias.
- Sending or replying from an alias.
- Browser extensions, mobile applications, analytics, audit history, and delivery tracking.
- Cloudflare deployment in the first implementation.

## Source of Truth

MXroute is the only source of truth. The application does not duplicate domains or forwarders in a database. Refreshing the dashboard reads the current state from MXroute.

Catch-all remains configured as `fail`. Aliases receive mail only after explicit creation.

## Architecture

Use one Next.js application with App Router and server-side MXroute integration.

- Server Components render initial authenticated data where practical.
- Server Actions or Route Handlers perform login, refresh, create, generate, and delete operations.
- The browser never receives MXroute credentials.
- The application produces Next.js standalone output for one multi-stage Docker image.
- No persistent filesystem or database is required, preserving later Vercel compatibility.

Required environment variables:

- `MXROUTE_SERVER`
- `MXROUTE_USERNAME`
- `MXROUTE_API_KEY`
- `ADMIN_PASSWORD`
- `SESSION_SECRET`

The process must fail during startup or the first server initialization when required configuration is absent. `SESSION_SECRET` must meet a documented minimum strength requirement.

## MXroute Integration

The server sends these headers on every MXroute request:

- `X-Server`
- `X-Username`
- `X-API-Key`

The MVP uses these operations from `API-CONTRACT.json`:

- `GET /domains`
- `GET /domains/{domain}/forwarders`
- `POST /domains/{domain}/forwarders`
- `DELETE /domains/{domain}/forwarders/{alias}`

Creation sends one item in `destinations`, even though MXroute supports multiple destinations. There is no update operation in the contract. Changing a destination therefore requires explicit deletion followed by a separate creation.

All upstream requests use a finite timeout. Read operations may be retried only when safe and necessary. Delete operations are never retried automatically. Rate-limited responses preserve safe retry timing from `Retry-After` or rate-limit headers when available.

## Authentication and Session

The login page contains one password field. The server compares it to `ADMIN_PASSWORD` using a constant-time comparison that safely handles differing input lengths.

A successful login creates a signed session cookie with:

- `HttpOnly`
- `SameSite=Strict`
- `Secure` in production
- A finite expiry
- A server-verified signature using `SESSION_SECRET`

All protected reads and mutations verify the session. Mutations also enforce same-origin requests to reduce CSRF risk. Logout invalidates the cookie.

Login failures use one generic message. Logs must not contain passwords, MXroute credentials, authorization headers, session values, or sensitive upstream response bodies.

## Data Flow

### Login

1. User submits the administrator password.
2. Server validates it and performs constant-time comparison.
3. Server issues the signed session cookie.
4. User is redirected to the dashboard.

### Dashboard Load

1. Server verifies the session.
2. Server requests `GET /domains` from MXroute.
3. The first available domain or a validated requested domain becomes active.
4. Server requests `GET /domains/{domain}/forwarders`.
5. UI renders the current MXroute state.

### Alias Creation

1. User selects a domain.
2. User enters an alias manually or generates an editable suggestion.
3. User enters one destination email.
4. Server validates the session, origin, selected domain, alias, and destination.
5. Server calls `POST /domains/{domain}/forwarders` with one destination.
6. On success, the dashboard re-reads or refreshes the affected forwarder list.

### Alias Deletion

1. User confirms deletion using the full alias address.
2. Server validates the session, origin, domain, and alias.
3. Server calls `DELETE /domains/{domain}/forwarders/{alias}` once.
4. On success, the affected list refreshes.

## Validation

Validation occurs on the server even when the browser provides matching constraints.

- Domain must exactly match a value returned by the current MXroute `GET /domains` response.
- Alias is trimmed and normalized to lowercase.
- Alias accepts lowercase letters, digits, dots, underscores, and hyphens only.
- Alias must be a non-empty local part within a documented length ceiling supported by email addresses.
- Destination must be one syntactically valid email address.
- `:blackhole:` and `:fail:` are rejected as destinations.
- Duplicate alias conflicts are displayed without overwrite behavior.
- Path components are URL-encoded before upstream requests.

## Alias Generator

Generate aliases server-side using Node.js `crypto`, a small local adjective list, a small local noun list, and a random numeric suffix. The output format is:

`adjective-noun-number`

The generated value remains editable. No random-name dependency is added. A generated collision is harmless because final creation still relies on MXroute conflict detection; the UI may request another suggestion.

## Interface Direction

Design read: a private operational dashboard using softened Swiss Industrial Print with editorial minimalism.

Design parameters:

- `DESIGN_VARIANCE: 5`
- `MOTION_INTENSITY: 3`
- `VISUAL_DENSITY: 6`

Visual system:

- One light theme.
- Canvas: `#F4F4F0`.
- Primary text: `#111111`.
- Hazard red: `#E61919`, reserved for destructive actions, errors, and critical focus.
- Geist Sans for interface text.
- Geist Mono for email addresses and technical metadata.
- Sharp 90-degree corners.
- One-pixel structural dividers.
- No gradients, glass effects, decorative imagery, floating cards, or drop shadows.
- No icon dependency unless native text and controls prove insufficient.

Layout:

- Compact single-line header with application name, active domain, refresh, and logout.
- Desktop uses two columns: a persistent creation form on the left and forwarder list on the right.
- Mobile collapses to one column.
- Mobile forwarder rows become labeled blocks rather than a horizontally clipped table.

Creation form:

- Labels appear above inputs. Placeholders never replace labels.
- Alias input includes the selected domain context and a complete-address preview.
- `Generate` creates a suggestion without submitting.
- `Create alias` is the sole primary action.
- Validation errors appear directly beneath the relevant field.

Forwarder list:

- Each entry displays the full alias, single destination, copy action, and delete action.
- Email values use monospace typography.
- Delete requires an accessible confirmation dialog containing the full alias.
- Loading skeletons match the final list shape.
- Empty state points directly to the creation form.
- Upstream and action errors appear near the failed operation.
- Copy actions provide a brief textual success state.

Accessibility and motion:

- Full keyboard operation.
- Visible high-contrast focus states.
- Semantic labels, table or list markup, status messages, and dialog naming.
- WCAG AA contrast for text, controls, placeholders, and errors.
- Motion is limited to hover, focus, active, and action feedback using transform or opacity.
- `prefers-reduced-motion` removes nonessential transitions.

## Error Handling

MXroute errors are mapped to safe messages:

- Validation errors identify the relevant local field when possible.
- Unauthorized responses report an MXroute configuration problem without exposing credentials.
- Not found responses trigger a safe refresh suggestion.
- Conflict responses state that the alias already exists.
- Rate-limit responses state when another attempt is safe when known.
- Timeout and server errors keep the submitted form values and allow manual retry.

Unknown response bodies are not shown directly. The server records only safe operational context such as operation name, status code, and request timing.

## Deployment

### Docker VPS

- Multi-stage Docker build.
- Pinned supported Node.js base image selected during implementation against current official documentation.
- Next.js standalone runtime output.
- Non-root runtime user.
- Minimal production files copied into the final image.
- Container health endpoint or equivalent health check that does not call MXroute.
- Environment variables supplied at runtime, never baked into the image.
- TLS terminated by a VPS reverse proxy.
- One application instance is sufficient because sessions are self-contained signed cookies.

### Vercel Later

The same Next.js code should run without local persistent state. Environment variables move to Vercel project configuration. Any Docker-specific health check or startup behavior remains isolated from application logic. Vercel deployment is verified only after the Docker MVP works.

## Testing

Use the smallest test setup supported by the chosen Next.js toolchain. Keep tests around behavior with security or branching risk.

Unit-level checks:

- Alias normalization and validation.
- Destination validation and special-value rejection.
- Random alias format.
- Session signing, expiry, and tamper rejection.
- Safe mapping of MXroute conflict, rate-limit, timeout, and unknown errors.

Integration smoke test with a mock MXroute upstream:

1. Failed and successful login.
2. Domain list and selected-domain forwarder list.
3. Manual alias creation with one destination.
4. Generated alias creation.
5. Duplicate conflict display.
6. Confirmed deletion.
7. Unauthenticated and cross-origin mutation rejection.

Build verification:

- Lint and type check.
- Production Next.js build.
- Docker image build.
- Start the container with mock upstream configuration.
- Confirm health endpoint and one authenticated dashboard flow.

A live MXroute test is separate because it mutates real email routing. It runs only after credentials and a disposable alias/domain are explicitly provided and approved.

## Success Criteria

The MVP is complete when:

- It runs from one Docker image on a VPS behind HTTPS.
- An unauthenticated visitor cannot read or mutate MXroute data.
- The administrator can list domains and forwarders.
- The administrator can create a manual or generated alias forwarding to exactly one valid email destination.
- The administrator can copy and delete an alias.
- Refreshing the page reflects MXroute's current state without local reconciliation.
- Credentials remain server-side and absent from browser payloads and logs.
- The production build, Docker build, automated checks, and mock smoke flow pass.

## Deferred Upgrade Triggers

Add a database only when local metadata, audit history, multiple users, destination verification, or cross-account management becomes required. Add an edit workflow only if delete-and-recreate becomes frequent enough to justify its failure handling. Add catch-all only after accepting its spam and abuse implications. Add Cloudflare support only after the Vercel adapter is proven necessary and runtime differences are measured.
