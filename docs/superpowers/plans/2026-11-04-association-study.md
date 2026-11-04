# Association study exploration implementation plan

> Execute inline with executing-plans under the user's authorization to explore subsequent stages.

Goal: Deliver a fixed protocol, an offline computation tool and an auditable first-sample publication receipt.
Architecture: Separate JSON protocol/receipts, pure Python study functions with local CSV inputs, existing localized observation page. Existing indices and provider caches remain independent.
Tech stack: Python 3.11+, pandas, pytest, React and TypeScript.
Spec: ../specs/2026-11-04-association-study-design.md

## Constraints and review focus

No fabricated historical availability or real returns. No shared data mutation. Missing prices never become zero. Frozen membership is never filtered by subsequent outcomes. Publication receipts validate hashes but require external verification of their truth. Generated outputs must use an absolute external data directory.

## Tasks

- [x] Add failing tests for registration, timing, calendar integrity, exact horizons, adjusted stock/ETF returns, excluded cases and missing/invalid prices.
- [x] Implement offline report and CLI with hashed input manifest and explicit blocked/pending states.
- [x] Record verified first-sample deployment, write fixed protocol and maintenance/run instructions; expose next-stage preparation on the bilingual page.
- [ ] Run full Python/frontend checks and independent review, then PR, CI, merge, publish and clean up.

## Exploration findings

Verified first sample deployment completion using GitHub run 41759840493 (step completion 2026-11-04T02:18:40Z). Existing data-source interfaces cover needed fields, but no real provider readiness or input completeness was claimed. Fixed-cohort offline computation was selected over a dynamic portfolio. Independent review corrected blank-factor handling and CSV hash/read consistency. All generated report tests use synthetic inputs and temporary external paths.
