# Market association observation pool implementation plan

> Execute inline under the user-authorized scope, using executing-plans.

Goal: Publish a source-backed observation pool separately from name-based indices.
Architecture: Reviewed published JSON, a typed frontend adapter, and an independent localized React route.
Tech stack: Existing React, TypeScript, Node test runner and Playwright.
Spec: ../specs/2026-11-04-market-associations-design.md

## Constraints and review focus

Preserve index rules and NAV. Store all translated UI copy in locale catalogs. Avoid fabricated publication or performance dates. Confirmed means a reported association, not causation. Keep plant empty states useful. Source samples are incomplete and selected after the event.

## Tasks

- [x] Add failing data-contract tests for source references, chronology, IDs, states, evidence tiers and forbidden backfilled performance.
- [x] Add reviewed public source/association records and a maintenance policy, then pass contract tests.
- [x] Add a typed adapter and localized observation page with independent navigation, theme/status filtering, source details and time boundaries.
- [x] Add browser checks for locale switching, filters, empty plants, external links and mobile width.
- [ ] Run Python quality gates, frontend tests/build/browser checks; review diff and push a PR to the verified owner repository. Merge only after current-target validation and required checks pass, then publish through the existing publish-only workflow and clean up task-owned resources.

## Verification record

Local source: origin/main 89f8477 plus this task diff. Python 3.13: ruff format, ruff check, ty and 119 pytest tests passed. Frontend: Node tests, TypeScript/Vite build and both Playwright browser regressions passed. Independent review narrowed sample scope to same-day reporting, allowed expired community records, strengthened event history validation and constrained catalyst labels. Publication time and performance tracking remain deliberately unstarted for a separate prospective-observation implementation.
