# Registered association observations implementation plan

> Execute inline with executing-plans under the user's standing authorization.

Goal: Register the already-public protocol, verify real data through the existing provider connection, and integrate daily observations and localized presentation.
Architecture: Frozen cohort files and registration receipt feed a source collector which delegates returns to association_study. Existing daily workflow owns publication; an independent manual read-only workflow provides provider validation before reviewed public publication.
Spec (Chinese): ../specs/2026-11-04-association-live-design.zh-CN.md

## Constraints and review focus

Preserve protocol timing and fixed cohort. Never read unrelated credentials. Keep raw runtime state outside Git. Sanitize failures. Report data dates and missing observations explicitly. No pre-registration returns.

## Tasks

- [x] Freeze sample/protocol and record verified registration.
- [x] Add source collector tests covering prior completed day, holidays, ETF factors, missing data, duplicate inputs, sanitized errors and registered hashes.
- [x] Implement collector and read-only provider check workflow, then integrate existing daily publication.
- [x] Render registered status and per-horizon results in both locales, including unavailable or stale data.
- [ ] Validate, independently review, PR and merge. Run real provider check, review/download public report, publish it via a follow-up data PR. Confirm online state and clean up task resources.

## Local verification

Initial base ab8a72e; updated to current main 00d4067 before submission. Python 3.13 quality checks and 151 tests passed. Independent review found no critical/important issues; bounded collection to the first 21 sessions plus latest probe and added a distinct provider cache. Browser fixture uses a separate Vite cache to prevent parallel test interference. Actual provider verification remains post-merge; no real availability claim is made by synthetic tests.
