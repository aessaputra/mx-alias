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
- `lib/security.ts`: constant-time equal-length string comparison and exact `Origin` host validation against the first `X-Forwarded-Host` value whenever that header is present, using `Host` only when it is absent.

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

## Review round 1

Added regression coverage proving that an empty or whitespace-only first `X-Forwarded-Host` value is rejected rather than falling back to `Host`. Updated `assertSameOrigin` to use `Host` only when `X-Forwarded-Host` is absent.

### RED evidence

```text
npm test -- tests/security.test.ts
Test Files 1 failed (1)
Tests 2 failed | 7 passed (9)
```

Both new tests failed because `assertSameOrigin` accepted the matching `Host` after an empty forwarded value.

### GREEN evidence

```text
npm test -- tests/security.test.ts
Test Files 1 passed (1)
Tests 9 passed (9)

npm test
Test Files 4 passed (4)
Tests 38 passed (38)

npm run typecheck
> tsc --noEmit
exit 0

npm run lint
> eslint .
exit 0
```
