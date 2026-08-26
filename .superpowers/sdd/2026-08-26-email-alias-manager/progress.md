# SDD ledger — plan: docs/superpowers/plans/2026-08-26-email-alias-manager.md
Ruling: Implement directly on master — user explicitly declined a worktree because this is the initial application — cost if wrong: implementation commits share the primary branch and require git revert instead of deleting an isolated branch.

## Pre-flight interface scan
| Tasks | Shared file/interface | Finding |
|---|---|---|
| 1, 6, 7 | app/page.tsx | Ordered: shell, protection, UI composition. Clean. |
| 1, 7 | app/globals.css | Ordered: base tokens then approved full UI. Clean. |
| 1, 9 | package files | Ordered: bootstrap then smoke scripts. Clean. |
| 1, 8 | .env.example | Ordered: contract then deployment detail. Clean. |
| 2, 6 | validation functions | Task 2 produces exact functions consumed by actions. Clean. |
| 3, 6 | session/security functions | Task 3 produces exact functions consumed by actions. Clean. |
| 4, 6, 7 | MXroute and Forwarder types | Client produces typed values consumed by actions/dashboard. Clean. |
| 5, 6 | generateAlias | Generator interface matches action use. Clean. |
| 6, 7, 9 | actions and components | Actions precede UI and browser flow. Clean. |
| 7, 9 | UI behavior | Playwright validates the completed UI. Clean. |
| 8, 10 | Docker and health | Packaging precedes final container gate. Clean. |
| 9, 10 | smoke flow | Mock flow precedes full final gate. Clean. |
| Task 1 | Own text | Conflict found during execution: TypeScript 7.0.2 is rejected by typescript-eslint bundled with eslint-config-next 16.3.3. |

Ruling: Pin TypeScript 5.9.3 instead of 7.0.2 — it is the latest stable TypeScript 5 release and satisfies typescript-eslint's supported `<6.1.0` range while preserving the approved architecture — cost if wrong: newer TypeScript 7-only language behavior is unavailable, which this project does not require.
Ruling: Pin ESLint 9.39.5 instead of 10.9.1 and remove the React-rule filtering shim — eslint-config-next 16.3.3 supports ESLint >=9, but its React plugin crashes under ESLint 10; keeping ESLint 9 preserves the complete Next.js Core Web Vitals rules — cost if wrong: ESLint 10-only behavior is unavailable, which this project does not use.
| Task 2 | Own text | Tests align with config and validation outputs. |
| Task 3 | Own text | Tests align with signed session and origin checks. |
| Task 4 | Own text | Four API operations match API-CONTRACT.json. |
| Task 5 | Own text | Deterministic injection matches crypto implementation. |
| Task 6 | Own text | Actions integrate Tasks 2-5 without persistence. |
| Task 7 | Own text | UI matches approved dashboard direction. |
| Task 8 | Own text | Docker verification has an honest local-engine blocker path. |
| Task 9 | Own text | Mock server covers only contracted operations. |
| Task 10 | Own text | Final gates and live mutation approval are explicit. |

Task 1: fix round 1/5 (4 addressed, 0 open; commits ba9debc..0e4fa6b)
Task 1: complete (commits ec865a5..0e4fa6b, review clean)

Task 2: fix round 1/5 (4 addressed, 0 open; commits 2e57777..3a4763a)
Task 2: complete (commits 0e4fa6b..3a4763a, review clean)

Task 3: fix round 1/5 (3 addressed, 0 open; commits 8606e9b..a339ecb)
Task 3: complete (commits 3a4763a..a339ecb, review clean)

Task 4: fix round 1/5 (2 addressed, 0 open; commits ca42ff4..e47ae59)
Task 4: complete (commits a339ecb..e47ae59, review clean)

Task 5: complete (commits e47ae59..728871c, review clean)
\nTask 6: fix round 1/5 (4 addressed, 0 open; commits 896bde4..30845fb)\nTask 6: complete (commits 728871c..30845fb, review clean)\nRuling: For Task 7, the approved product spec overrides gpt-taste landing-page mandates and design-taste-frontend dashboard exclusions; use their applicable typography, contrast, state, responsiveness, and accessibility guidance only, with native CSS and no GSAP, images, bento, dark mode, or icon dependency \u2014 cost if wrong: the UI is less cinematic but remains appropriate for a focused operational dashboard.\n\nTask 7: minor (deferred): useEffect deps, hazard-red contrast at small text, ellipsis style, dialog fieldset, aria-invalid\nTask 7: minor fixed: error.tsx raw message leak (commit 4a93500)\nTask 7: complete (commits 30845fb..4a93500, review clean)\n\nTask 8: complete (commits 4a93500..4d98177, review clean)

Task 9: complete (commits 4d98177..487922a, review clean)
Ruling: CSRF browser test replaced with unit test reference — browser fetch always sends same-origin Origin header, making foreign-origin testing impossible from Playwright. assertSameOrigin is fully covered in tests/security.test.ts.\n