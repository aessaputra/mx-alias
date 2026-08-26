# Task 4 Report: Typed MXroute Client

## Status

Complete.

## Implementation

- Added `Forwarder` and `MxrouteErrorKind` types in `lib/types.ts`.
- Added the four required MXroute operations in `lib/mxroute.ts`:
  - `listDomains()`
  - `listForwarders(domain)`
  - `createForwarder(domain, alias, destination)`
  - `deleteForwarder(domain, alias)`
- Routed every operation through one internal `request<T>()` fetch helper.
- Matched `API-CONTRACT.json`: `https://api.mxroute.com`, encoded path segments, `X-Server`, `X-Username`, `X-API-Key`, and `{ alias, destinations: [destination] }` creation JSON.
- Enforced `cache: "no-store"` and `AbortSignal.timeout(10_000)` with no retries or added dependencies.
- Added narrow runtime validation for domain and forwarder response envelopes.
- Added safe `MxrouteError` mapping for authentication, missing resources, conflicts, rate limits, server failures, malformed responses, timeouts, and network failures. Raw response bodies, upstream messages, and credentials are never copied into public errors.

## TDD Evidence

- RED: `npm test -- tests/mxroute.test.ts` failed because `@/lib/mxroute` did not exist.
- GREEN: targeted contract/error tests passed after the minimum implementation.
- Self-review found absent `Retry-After` was parsed as `0`; a failing regression test reproduced it before fixing the parser.

## Verification

- `npm test -- tests/mxroute.test.ts`: 13 passed.
- `npm test`: 51 passed across 5 files.
- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `git diff --check`: passed.

## Concerns

- None blocking. The client intentionally does not retry; callers can use `kind` and `retryAfterSeconds` for policy later.

## Review Fix Round 1

- Added a regression proving native `AbortSignal.timeout()` rejection name `TimeoutError` maps to `kind: "timeout"`; RED failed with `kind: "network"` before the fix.
- Minimally mapped both DOMException names, `AbortError` and `TimeoutError`, through the existing timeout branch.
- Added malformed `Retry-After: later` coverage; invalid values remain omitted.
- Assessed optional `status` and `retryAfterSeconds` parameter properties. Left them unchanged: removing own properties when undefined requires extra conditional assignment and changes runtime object shape without improving the public optional interface.

### Fix Evidence

- RED — `npm test -- tests/mxroute.test.ts`: 1 failed, 14 passed; `TimeoutError` received `kind: "network"` instead of `"timeout"`.
- GREEN — `npm test -- tests/mxroute.test.ts`: 15 passed.
- Full suite — `npm test`: 53 passed across 5 files.
- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `git diff --check`: passed.
