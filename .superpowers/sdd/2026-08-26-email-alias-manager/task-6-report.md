# Task 6 Report

## Status

Complete.

## Implemented

- Added extracted, dependency-injected core handlers for login, create, and delete.
- Added thin Next.js Server Action wrappers for login, logout, alias generation, creation, and deletion.
- Login failures are generic; successful login stores only a signed session token.
- Session cookie is named `email_alias_session` with `httpOnly`, `sameSite: "strict"`, production-only `secure`, `path: "/"`, and `maxAge: 43_200`.
- Create/delete require a valid session and same-origin request before MXroute access.
- Create/delete refresh the MXroute domain list and validate the submitted domain against it.
- Creation validates and sends exactly one destination. Deletion makes one call and never retries.
- Successful mutations revalidate `/`.
- Added the login page and protected `/`; authenticated dashboard loading refreshes domains, validates the optional selected domain, and fetches forwarders.
- Kept dashboard rendering minimal for Task 7.

## TDD Evidence

- RED: `npm test -- tests/actions.test.ts` failed because `@/app/actions` did not exist.
- GREEN: targeted action suite passed with 8 tests.
- Coverage includes generic login failure, valid token creation, unauthenticated create/delete rejection, foreign-origin rejection, refreshed domain rejection, exact one-destination creation, and no delete retry.

## Verification

- `npm test -- tests/actions.test.ts`: 8 passed.
- `npm test`: 7 files, 63 tests passed.
- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `npm run build`: passed; `/` is dynamic and `/login` is static.
- `git diff --check`: passed.

## Self-review

No credentials are exposed to client code. User-controlled alias, destination, and domain values pass existing reviewed validators. Mutation failures return safe messages. The diff adds no retry loop, debug logging, hardcoded secret, or speculative dashboard UI.

## Concerns

None blocking. Full dashboard controls and presentation remain intentionally deferred to Task 7.

## Review Fix Round 1

- Protected alias generation with the same session verification used by mutations; unauthenticated generation now returns `Authentication required`.
- Added login-specific SHA-256 digest comparison. Every submitted shape reaches one fixed-length `timingSafeEqual` call while failures retain `Invalid credentials`; `safeEqual` remains unchanged.
- Moved dependency-injected handlers and dependency/result types to `app/action-handlers.ts`; `app/actions.ts` now exports only the five intended async Server Action wrappers.
- Added behavioral regressions for unauthenticated generation and missing, malformed, shorter, and longer login submissions. The comparison tests assert execution rather than timing thresholds.

### Exact verification evidence

- `npm test -- tests/actions.test.ts`: passed; 1 file, 13 tests.
- `npm test`: passed; 7 files, 68 tests.
- `npm run typecheck`: passed; `tsc --noEmit` exited 0.
- `npm run lint`: passed; `eslint .` exited 0.
- `npm run build`: passed with Next.js 16.3.3; compiled successfully, TypeScript completed, `/` dynamic and `/login` static. This also verifies that the `"use server"` module exports are valid Server Actions.
- `git diff --check`: passed.

### Review concerns

None blocking.
