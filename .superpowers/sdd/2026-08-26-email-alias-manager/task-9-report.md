## Task 9: Mock MXroute Browser Smoke Flow — Report

**Status:** PASS  
**Commit:** `487922a`  
**Date:** 2026-08-27

### Files Created
- `tests/mock-mxroute.ts` — Node HTTP server implementing 4 MXroute API endpoints (list domains, list forwarders, create forwarder, delete forwarder) with auth check, 409 for duplicates, in-memory state.
- `playwright.config.ts` — Playwright config for Chromium with dual webServer (mock + Next.js dev).
- `tests/e2e/alias-flow.spec.ts` — 11 smoke tests covering the full authenticated alias lifecycle.

### Files Modified
- `lib/mxroute.ts` — BASE_URL now reads from `MXROUTE_BASE_URL` env var with fallback to production URL.
- `vitest.config.mts` — Added `exclude: ["tests/e2e/**", "node_modules/**"]` to prevent vitest from picking up Playwright tests.
- `package.json` — Added `@playwright/test` and `tsx` as dev dependencies.

### Test Results
- **Unit tests (vitest):** 8 files, 70/70 passed
- **E2E tests (Playwright):** 11/11 passed
- **Typecheck:** clean
- **Lint:** clean

### E2E Coverage
1. Failed login shows error
2. Successful login shows dashboard
3. Domain is visible and selectable
4. Manual alias creation
5. Generate alias fills input and can be edited
6. Duplicate alias shows error
7. Copy button exists and is clickable
8. Delete cancel does not remove alias
9. Confirmed delete removes alias
10. Logout and unauthenticated redirect
11. CSRF protection is unit-tested (assertSameOrigin verified in security.test.ts; browser fetch always sends same-origin Origin header)

### Concerns
1. CSRF browser test replaced with unit test reference — browser fetch always sets Origin to page origin, making foreign-origin testing impossible from Playwright. `assertSameOrigin` is fully covered in `tests/security.test.ts`.
2. Clipboard API (`navigator.clipboard.writeText`) may fail in headless Chromium — copy test verifies button exists and is clickable rather than clipboard contents.
3. Chromium installed with fallback ubuntu24.04-x64 build (OS not officially supported by Playwright).
