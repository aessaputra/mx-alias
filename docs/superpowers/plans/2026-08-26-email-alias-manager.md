# Email Alias Manager Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a private Next.js dashboard that securely creates, lists, copies, and deletes single-destination MXroute email aliases.

**Architecture:** One Next.js App Router application owns the UI, signed-cookie authentication, validation, and a thin MXroute HTTP client. MXroute remains the only source of truth; the application stores no persistent data and ships first as a standalone Docker image.

**Tech Stack:** Next.js 16.3.3, React 19.2.8, TypeScript 5.9.3, Node.js 24 LTS, native CSS, Node.js `crypto`, Vitest 4.1.11, Playwright 1.62.1.

**Spec:** `docs/superpowers/specs/2026-08-26-email-alias-manager-design.md`

## Global Constraints

- One administrator and one MXroute account, both configured through environment variables.
- Required environment variables: `MXROUTE_SERVER`, `MXROUTE_USERNAME`, `MXROUTE_API_KEY`, `ADMIN_PASSWORD`, `SESSION_SECRET`.
- MXroute is the only source of truth. Do not add a database or persistent filesystem state.
- Each alias has exactly one destination. Editing means explicit delete and separate recreate.
- Catch-all remains `fail`; do not implement catch-all management.
- MXroute credentials and session values must never reach browser payloads or logs.
- UI uses `#F4F4F0`, `#111111`, and hazard red `#E61919`; Geist Sans and Geist Mono; sharp corners; no gradients, shadows, glass, decorative imagery, or icon dependency.
- Docker VPS is the first verified deployment. Vercel compatibility must not introduce a runtime adapter yet.
- Use native platform and installed framework features before adding dependencies.
- Run tests before implementation changes, keep commits task-sized, and never mutate a real MXroute account without explicit approval.

## File Structure

- `app/layout.tsx`: root metadata, fonts, and global shell.
- `app/globals.css`: complete visual token system and responsive layout.
- `app/login/page.tsx`: public login screen.
- `app/page.tsx`: authenticated dashboard orchestration.
- `app/actions.ts`: login, logout, generate, create, and delete Server Actions.
- `app/health/route.ts`: dependency-free container health response.
- `components/alias-form.tsx`: interactive creation form and generated suggestion handling.
- `components/forwarder-list.tsx`: responsive list, copy feedback, and delete confirmation.
- `lib/config.ts`: validated server-only environment configuration.
- `lib/session.ts`: signed cookie creation and verification.
- `lib/security.ts`: constant-time comparison and same-origin verification.
- `lib/validation.ts`: domain, alias, and destination normalization and validation.
- `lib/generator.ts`: cryptographically random alias suggestions.
- `lib/mxroute.ts`: typed MXroute client, timeout, response parsing, and safe errors.
- `lib/types.ts`: shared domain, forwarder, and action-state types.
- `tests/*.test.ts`: focused unit tests for non-trivial and security-sensitive logic.
- `tests/e2e/alias-flow.spec.ts`: browser smoke flow against mock MXroute.
- `tests/mock-mxroute.ts`: deterministic upstream mock server used only by smoke tests.
- `Dockerfile`, `.dockerignore`, `.env.example`: production packaging and configuration contract.

---

### Task 1: Bootstrap the Smallest Next.js Application

**Files:**
- Create: `package.json`
- Create: `package-lock.json`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `next-env.d.ts`
- Create: `eslint.config.mjs`
- Create: `vitest.config.mts`
- Create: `app/layout.tsx`
- Create: `app/page.tsx`
- Create: `app/globals.css`
- Create: `.gitignore`
- Create: `.env.example`

**Interfaces:**
- Consumes: approved design spec.
- Produces: buildable Next.js App Router shell and `npm test`, `npm run lint`, `npm run typecheck`, `npm run build` commands.

- [ ] **Step 1: Write the package manifest with exact versions**

```json
{
  "name": "email-alias-manager",
  "version": "0.1.0",
  "private": true,
  "engines": { "node": ">=24 <25" },
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:e2e": "playwright test"
  },
  "dependencies": {
    "next": "16.3.3",
    "react": "19.2.8",
    "react-dom": "19.2.8"
  },
  "devDependencies": {
    "@playwright/test": "1.62.1",
    "@types/node": "26.3.0",
    "@types/react": "19.2.14",
    "@types/react-dom": "19.2.3",
    "eslint": "9.39.5",
    "eslint-config-next": "16.3.3",
    "typescript": "5.9.3",
    "vitest": "4.1.11"
  }
}
```

Run: `npm install`
Expected: lockfile created with no unresolved peer dependency error.

- [ ] **Step 2: Add minimal framework configuration**

Set `output: "standalone"` in `next.config.ts`, strict TypeScript in `tsconfig.json`, flat Next.js ESLint configuration, and `vitest.config.mts` with `environment: "node"` and alias `@` mapped to the repository root.

- [ ] **Step 3: Add the initial shell**

Create a server-rendered root layout using `Geist` and `Geist_Mono` from `next/font/google`. Render a temporary `<main><h1>Email Alias Manager</h1></main>` page. Define only base color, typography, focus, and reduced-motion tokens in `globals.css`.

- [ ] **Step 4: Verify the clean shell**

Run: `npm run lint && npm run typecheck && npm test && npm run build`
Expected: all commands exit 0; Vitest reports no test files without failing.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json tsconfig.json next.config.ts next-env.d.ts eslint.config.mjs vitest.config.mts app .gitignore .env.example
git commit -m "chore: bootstrap Next.js application"
```

---

### Task 2: Validate Configuration and Inputs

**Files:**
- Create: `lib/config.ts`
- Create: `lib/validation.ts`
- Create: `tests/config.test.ts`
- Create: `tests/validation.test.ts`

**Interfaces:**
- Produces: `loadConfig(env?: NodeJS.ProcessEnv): AppConfig`, `normalizeAlias(value: string): string`, `validateAlias(value: string): ValidationResult`, `validateDestination(value: string): ValidationResult`, `validateDomain(value: string, allowed: readonly string[]): ValidationResult`.

- [ ] **Step 1: Write failing configuration tests**

Test that missing required keys throw named configuration errors, `SESSION_SECRET` below 32 characters fails, and valid input returns an immutable object without exposing a general `env` bag.

```ts
expect(() => loadConfig({})).toThrow(/MXROUTE_SERVER/)
expect(() => loadConfig(validEnv({ SESSION_SECRET: "short" }))).toThrow(/SESSION_SECRET/)
expect(loadConfig(validEnv()).mxrouteServer).toBe("mail.example.test")
```

- [ ] **Step 2: Write failing validation tests**

Cover lowercase normalization, valid `billing-2026`, invalid whitespace and `@`, empty alias, overlong local part, valid destination, malformed destination, `:fail:`, `:blackhole:`, and a domain absent from the allowed list.

- [ ] **Step 3: Run tests and confirm RED**

Run: `npm test -- tests/config.test.ts tests/validation.test.ts`
Expected: FAIL because modules do not exist.

- [ ] **Step 4: Implement minimal validation**

Use no validation package. Return `{ ok: true, value } | { ok: false, message }`. Use an explicit alias regex `/^[a-z0-9._-]{1,64}$/`. Validate destination with a conservative single-address shape, trim it, reject control characters and MXroute special values, and cap total length at 254.

- [ ] **Step 5: Run checks and commit**

Run: `npm test -- tests/config.test.ts tests/validation.test.ts && npm run typecheck`
Expected: PASS.

```bash
git add lib/config.ts lib/validation.ts tests/config.test.ts tests/validation.test.ts
git commit -m "feat: validate server configuration and alias input"
```

---

### Task 3: Implement Signed Sessions and Request Security

**Files:**
- Create: `lib/session.ts`
- Create: `lib/security.ts`
- Create: `tests/session.test.ts`
- Create: `tests/security.test.ts`

**Interfaces:**
- Produces: `createSessionToken(now?: number): string`, `verifySessionToken(token: string, now?: number): boolean`, `safeEqual(left: string, right: string): boolean`, `assertSameOrigin(headers: Headers): void`.

- [ ] **Step 1: Write failing session tests**

Test a valid token, modified signature, expired token, malformed token, and token signed with another secret. Inject time so tests do not sleep.

- [ ] **Step 2: Write failing security tests**

Test equal strings, differing strings and lengths, accepted `Origin` matching `Host`, accepted `X-Forwarded-Host`, rejected foreign origin, and rejected missing origin on mutation.

- [ ] **Step 3: Verify RED**

Run: `npm test -- tests/session.test.ts tests/security.test.ts`
Expected: FAIL because implementations do not exist.

- [ ] **Step 4: Implement with Node.js crypto**

Use HMAC-SHA256 over a compact payload containing version and expiry. Encode with base64url. Compare decoded signatures with `timingSafeEqual` only after equal-length buffers are established. Make sessions expire after 12 hours. `assertSameOrigin` parses `Origin` and compares host exactly, respecting the first `X-Forwarded-Host` value.

- [ ] **Step 5: Verify and commit**

Run: `npm test -- tests/session.test.ts tests/security.test.ts && npm run typecheck`
Expected: PASS.

```bash
git add lib/session.ts lib/security.ts tests/session.test.ts tests/security.test.ts
git commit -m "feat: add signed admin sessions"
```

---

### Task 4: Build the Typed MXroute Client

**Files:**
- Create: `lib/types.ts`
- Create: `lib/mxroute.ts`
- Create: `tests/mxroute.test.ts`

**Interfaces:**
- Produces: `listDomains(): Promise<string[]>`, `listForwarders(domain: string): Promise<Forwarder[]>`, `createForwarder(domain: string, alias: string, destination: string): Promise<void>`, `deleteForwarder(domain: string, alias: string): Promise<void>`, and `MxrouteError` with safe `kind`, `message`, `retryAfterSeconds?`, and `status?` fields.

- [ ] **Step 1: Write failing HTTP contract tests**

Stub `global.fetch`. Assert the base URL, encoded paths, three authentication headers, JSON creation body with `destinations: [destination]`, 10-second abort signal, and no body expectation for `204` deletion.

- [ ] **Step 2: Write failing error mapping tests**

Cover `401`, `404`, `409`, `429` with `Retry-After`, malformed JSON, `500`, and `AbortError`. Assert public messages never include mock API keys or raw response bodies.

- [ ] **Step 3: Verify RED**

Run: `npm test -- tests/mxroute.test.ts`
Expected: FAIL because client does not exist.

- [ ] **Step 4: Implement one internal request helper**

Use one private `request<T>(path, init)` helper, `AbortSignal.timeout(10_000)`, `cache: "no-store"`, exact headers from the contract, and narrow runtime checks for response shapes. Do not add retries in the MVP client.

- [ ] **Step 5: Verify and commit**

Run: `npm test -- tests/mxroute.test.ts && npm run typecheck`
Expected: PASS.

```bash
git add lib/types.ts lib/mxroute.ts tests/mxroute.test.ts
git commit -m "feat: add MXroute forwarder client"
```

---

### Task 5: Add the Alias Generator

**Files:**
- Create: `lib/generator.ts`
- Create: `tests/generator.test.ts`

**Interfaces:**
- Produces: `generateAlias(randomInt?: typeof import("node:crypto").randomInt): string`.

- [ ] **Step 1: Write the failing deterministic test**

Inject a deterministic `randomInt` function and assert the exact `adjective-noun-123` output. Also generate 100 real values and assert `/^[a-z]+-[a-z]+-\d{3}$/`.

- [ ] **Step 2: Verify RED**

Run: `npm test -- tests/generator.test.ts`
Expected: FAIL because generator does not exist.

- [ ] **Step 3: Implement the minimum generator**

Keep two short local constant arrays in `generator.ts`. Select both words and a number from `100` through `999` with `node:crypto.randomInt`. Do not add a package or collision cache.

- [ ] **Step 4: Verify and commit**

Run: `npm test -- tests/generator.test.ts`
Expected: PASS.

```bash
git add lib/generator.ts tests/generator.test.ts
git commit -m "feat: generate readable aliases"
```

---

### Task 6: Wire Authentication and Protected Server Actions

**Files:**
- Create: `app/actions.ts`
- Create: `app/login/page.tsx`
- Create: `tests/actions.test.ts`
- Modify: `app/page.tsx`

**Interfaces:**
- Produces Server Actions: `loginAction`, `logoutAction`, `generateAliasAction`, `createAliasAction`, `deleteAliasAction`; each mutation returns a typed `ActionState` or redirects on successful login/logout.
- Consumes validation, session, security, generator, and MXroute interfaces from Tasks 2-5.

- [ ] **Step 1: Write failing action tests around extracted action logic**

Test generic login failure, valid login token creation, unauthenticated create/delete rejection, foreign-origin rejection, invalid domain rejection after domain refresh, one-destination creation, and delete without automatic retry. Keep Next.js cookie and redirect wrappers thin so core handlers accept injected dependencies.

- [ ] **Step 2: Verify RED**

Run: `npm test -- tests/actions.test.ts`
Expected: FAIL because actions do not exist.

- [ ] **Step 3: Implement actions and login page**

Use `cookies()` and `headers()` from Next.js. Name the cookie `email_alias_session`. Set `httpOnly`, `sameSite: "strict"`, `secure: process.env.NODE_ENV === "production"`, `path: "/"`, and `maxAge: 43_200`. Before create/delete, fetch allowed domains and validate the submitted domain. Use `revalidatePath("/")` after successful mutation.

- [ ] **Step 4: Protect the dashboard**

In `app/page.tsx`, verify the cookie and redirect unauthenticated requests to `/login`. Fetch domains, validate the optional selected domain query, fetch forwarders, and pass serializable data to UI components added next.

- [ ] **Step 5: Verify and commit**

Run: `npm test -- tests/actions.test.ts && npm run typecheck && npm run build`
Expected: PASS.

```bash
git add app/actions.ts app/login/page.tsx app/page.tsx tests/actions.test.ts
git commit -m "feat: protect alias management actions"
```

---

### Task 7: Build the Approved Dashboard Interface

**Files:**
- Create: `components/alias-form.tsx`
- Create: `components/forwarder-list.tsx`
- Create: `app/loading.tsx`
- Create: `app/error.tsx`
- Modify: `app/page.tsx`
- Modify: `app/globals.css`

**Interfaces:**
- Consumes: typed actions and `Forwarder` values.
- Produces: keyboard-accessible, responsive dashboard with explicit loading, empty, success, and error states.

- [ ] **Step 1: Add component behavior tests where logic branches**

Keep browser behavior in the later Playwright smoke test. Add only a small unit test for action-state formatting if mapping logic leaves the server module. Avoid adding React Testing Library solely for static markup.

- [ ] **Step 2: Implement the form as a small Client Component**

Use `useActionState` for creation. Include visible labels, domain selector, editable alias, complete-address preview, destination input, `Generate`, and `Create alias`. Disable only the pending action. Focus or associate inline errors through `aria-describedby`.

- [ ] **Step 3: Implement the forwarder list**

Render semantic table markup on desktop and CSS-driven labeled blocks on mobile from the same data. Use `navigator.clipboard.writeText` with textual `Copied` feedback. Use native `<dialog>` or an accessible confirmation component without another dependency. The destructive button uses hazard red only.

- [ ] **Step 4: Apply the approved visual system**

Implement the exact tokens and responsive two-column layout in native CSS. Keep the header below 80px and one line on desktop. Use sharp corners and 1px lines. Add visible `:focus-visible`, tactile `:active`, skeleton shapes, and a reduced-motion media query. Do not add GSAP, images, icons, gradients, shadows, pills, or decorative telemetry strings.

- [ ] **Step 5: Verify static quality**

Run: `npm run lint && npm run typecheck && npm run build`
Expected: PASS with no client/server boundary error.

- [ ] **Step 6: Commit**

```bash
git add components app/page.tsx app/loading.tsx app/error.tsx app/globals.css
git commit -m "feat: add alias management dashboard"
```

---

### Task 8: Add Health Check and Docker Packaging

**Files:**
- Create: `app/health/route.ts`
- Create: `Dockerfile`
- Create: `.dockerignore`
- Modify: `.env.example`
- Create: `tests/health.test.ts`

**Interfaces:**
- Produces: `GET /health` returning `{ "status": "ok" }` without MXroute access; OCI image running as non-root on port 3000.

- [ ] **Step 1: Write the failing health test**

Import the route handler and assert status 200 plus exact JSON. Verify it succeeds with MXroute fetch stubbed to throw.

- [ ] **Step 2: Implement the route and verify**

Run: `npm test -- tests/health.test.ts`
Expected: PASS.

- [ ] **Step 3: Add the multi-stage Dockerfile**

Use a pinned Node 24 Alpine digest resolved at implementation time from the official image registry, with named `deps`, `builder`, and `runner` stages. Copy `.next/standalone`, `.next/static`, and `public` only. Create and run as an unprivileged user. Add a Node-based health check against `http://127.0.0.1:3000/health` so no `curl` package is needed.

- [ ] **Step 4: Build with an available container engine**

Run: `docker build -t email-alias-manager:test .` or `podman build -t email-alias-manager:test .`
Expected: image builds successfully.

Current environment note: neither Docker nor Podman was installed while writing this plan. If still unavailable, install/enable one or run this exact gate on the target VPS; do not claim the image was verified locally.

- [ ] **Step 5: Run and inspect the container**

Start with mock environment variables, request `/health`, assert HTTP 200, inspect the runtime user, then stop the container.

- [ ] **Step 6: Commit**

```bash
git add app/health/route.ts tests/health.test.ts Dockerfile .dockerignore .env.example
git commit -m "build: package application for Docker"
```

---

### Task 9: Add the Mock MXroute Browser Smoke Flow

**Files:**
- Create: `playwright.config.ts`
- Create: `tests/mock-mxroute.ts`
- Create: `tests/e2e/alias-flow.spec.ts`
- Modify: `package.json`
- Modify: `package-lock.json`

**Interfaces:**
- Produces: repeatable full-flow verification without real MXroute mutation.

- [ ] **Step 1: Implement a deterministic mock upstream**

Use Node's built-in `http` module. Maintain domains and forwarders in process memory. Implement only the four contracted endpoints, validate authentication headers, return `409` for duplicates, and reset state at startup.

- [ ] **Step 2: Write the failing Playwright flow**

Cover failed login, successful login, visible domain, manual alias creation, generated editable alias, duplicate error, copy feedback, delete cancel, confirmed delete, logout, and unauthenticated redirect. Add a direct foreign-origin mutation request and expect rejection.

- [ ] **Step 3: Run and confirm RED**

Run: `npx playwright install chromium && npm run test:e2e`
Expected: FAIL at the first missing or incorrect behavior, not because the servers fail to start.

- [ ] **Step 4: Make only smoke-test-driven fixes**

Fix discovered integration issues in existing actions/components. Do not add new features or local state.

- [ ] **Step 5: Verify GREEN and commit**

Run: `npm run test:e2e`
Expected: all Chromium tests pass.

```bash
git add playwright.config.ts tests/mock-mxroute.ts tests/e2e/alias-flow.spec.ts package.json package-lock.json app components lib
git commit -m "test: cover authenticated alias lifecycle"
```

---

### Task 10: Final Verification and Operator Documentation

**Files:**
- Create: `README.md`
- Modify: files only when a verification failure identifies a defect.

**Interfaces:**
- Produces: reproducible setup, VPS deployment steps, Vercel notes, and verified release candidate.

- [ ] **Step 1: Write concise operator documentation**

Document prerequisites, environment generation, local run, test commands, Docker build/run, reverse-proxy HTTPS requirement, backup implications of having no database, and the explicit warning that live smoke tests mutate email routing. Include Vercel as a later deployment path using the same environment variables, not as verified MVP output.

- [ ] **Step 2: Run the complete local gate**

Run: `npm ci && npm run lint && npm run typecheck && npm test && npm run build && npm run test:e2e`
Expected: every command exits 0.

- [ ] **Step 3: Run the container gate**

Run the image build, health check, non-root inspection, and authenticated mock smoke flow against the container. Record actual output in the execution report.

- [ ] **Step 4: Perform the UI pre-flight**

Inspect desktop and mobile widths. Verify one theme, one red accent, sharp geometry, no horizontal clipping, keyboard operation, visible focus, readable errors, dialog naming, button contrast, reduced motion, and all loading/empty/error states. Run Lighthouse and require no accessibility failure; record performance values rather than inventing them.

- [ ] **Step 5: Confirm secret hygiene**

Search tracked files and browser responses for the mock credentials and session secret. Verify no real `.env` file is tracked and browser bundles do not contain `MXROUTE_API_KEY` or `SESSION_SECRET`.

- [ ] **Step 6: Commit documentation**

```bash
git add README.md
git commit -m "docs: add deployment and verification guide"
```

- [ ] **Step 7: Optional live MXroute verification gate**

Stop and request explicit approval plus a disposable domain/alias before creating or deleting anything on the real account. If approval or credentials are absent, report the mock verification as complete and the live test as intentionally not run.

## Plan Self-Review

- Spec coverage: authentication, source-of-truth behavior, validation, generator, CRUD subset, visual direction, accessibility, errors, Docker, later Vercel compatibility, tests, and live-mutation gate each map to a task.
- Placeholder scan: every implementation and verification step is concrete; no deferred or undefined work remains.
- Type consistency: actions consume the exact validation, session, generator, and MXroute interfaces produced in Tasks 2-5; dashboard consumes `Forwarder` and `ActionState`; smoke tests exercise the same four upstream operations.
- Scope: one application and one integration path. No database, multi-user system, catch-all, edit transaction, or Cloudflare adapter is included.
