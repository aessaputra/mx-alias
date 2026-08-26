# Task 3 Report: Signed Sessions and Request Security

## Status

Complete.

## TDD evidence

### RED

Created `tests/session.test.ts` and `tests/security.test.ts` before production code. Ran:

```text
npm test -- tests/session.test.ts tests/security.test.ts
```

Vitest failed both suites because `@/lib/session` and `@/lib/security` did not exist.

During self-review, added expiry-boundary and non-canonical base64url tests. Both failed against the initial implementation for the expected reasons, then drove the final corrections.

### GREEN

Implemented the minimum primitives with Node `crypto` and the existing `loadConfig()` interface:

- `lib/session.ts`: 12-hour versioned session payload, base64url encoding, HMAC-SHA256 signing, strict token parsing, constant-time equal-length signature comparison, expiry checks.
- `lib/security.ts`: constant-time equal-length string comparison and exact `Origin` host validation against the first `X-Forwarded-Host` value or `Host`.

No dependencies added. Session secrets remain inside HMAC operations and are never returned or logged.

## Verification

```text
npm test -- tests/session.test.ts tests/security.test.ts
Test Files 2 passed; Tests 14 passed

npm test
Test Files 4 passed; Tests 36 passed

npm run typecheck
PASS

npm run lint
PASS

git diff --check
PASS
```

## Self-review

- Requirements and exported interfaces match the brief.
- HMAC input is the encoded compact payload; signatures use SHA-256 and base64url.
- Signature bytes reach `timingSafeEqual` only after equal-length validation.
- Invalid shape, encoding, JSON, payload version, expiry, and signature fail closed.
- Origin parsing uses `URL`; comparison includes hostname and port exactly via `.host`.
- Missing/malformed/foreign origins and missing hosts fail closed.
- No hardcoded production secret, logging, debug code, dependency, or unrelated refactor.

## Files

Created:

- `lib/session.ts`
- `lib/security.ts`
- `tests/session.test.ts`
- `tests/security.test.ts`
- `.superpowers/sdd/2026-08-26-email-alias-manager/task-3-report.md`

## Concerns

None. `loadConfig()` intentionally requires the full application environment, so session callers and tests must provide all required configuration values.
