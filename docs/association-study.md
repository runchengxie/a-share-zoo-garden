# Registered fixed-window observations

[中文](association-study.zh-CN.md) · [Website](https://runchengxie.github.io/a-share-zoo-garden/?lang=en-US#/associations)

The observation protocol was publicly deployed on 4 November 2026 at 10:48:15 Asia/Shanghai. The registration receipt binds the original sample and protocol hashes to verified publication evidence. The frozen cohort contains 11 confirmed media associations and two unconfirmed community narratives. It remains separate from the animal and plant indices.

The website shows the latest report's date, input coverage and per-stock observation states. A registered method does not imply that any horizon has matured or that provider data has been independently reconciled.

## Fixed method

`association-study.v1` uses the first trading close strictly after review, sample publication and protocol publication as its baseline. It observes the subsequent 1, 5 and 20 trading sessions, using a complete exchange calendar rather than weekday approximations. Changes to this method require a new protocol version and registration.

Stock returns are the endpoint adjusted price divided by the baseline adjusted price minus one. The benchmark is adjusted CSI 300 ETF `510300.SH`, using fund adjustment factors. Excess is the stock return minus the benchmark return, displayed in percentage points. Adjustment factors approximate dividend reinvestment; this is not cash-dividend accounting, cost-adjusted performance or executable trading. A quoted limit-up price does not establish that a purchase could execute.

Only associations confirmed in the frozen sample participate. Pending and expired-at-freeze records remain visible without returns. Later review changes never rewrite the frozen cohort or remove unsuccessful outcomes. A restarted association needs a new cohort.

Baseline and intermediate sessions require both stock and ETF prices and factors. Missing rows or blank values make the affected window unavailable. The baseline is never moved, missing returns are never filled with zero, and missing cases are never deleted. Nonpositive or infinite provided values fail validation. Horizons beyond the report's completed date remain immature even if future prices happen to be present in an input file. Suspension, delisting and provider gaps require separate diagnosis; the tool does not infer their cause.

## Frozen files and registration

- `published/association-study/cohort-20261104/sample.json` is the original reviewed sample.
- `published/association-study/cohort-20261104/protocol.json` holds version, benchmark and horizons.
- `published/data/association_registration.json` records raw-byte SHA-256 hashes, publication times, commit IDs and deployment evidence.
- `published/data/association_study.json` is the reviewed public observation report.

The protocol evidence is [successful deployment run 41763006926](https://github.com/runchengxie/a-share-zoo-garden/actions/runs/41763006926), on commit `94e7d0bfba63eaffd9ff31c8abee21b68be5b203`, whose Deploy to GitHub Pages step completed at `2026-11-04T02:48:15Z`. The original sample was published at `2026-11-04T02:18:40Z`, verified separately. The protocol cannot inherit the sample's earlier publication time. On this timing, 4 November cannot be a baseline; the exchange calendar determines the next eligible session.

The offline tool checks hashes and receipt structure, not the truth of a remote deployment. Operators must independently verify the run, revision, success and actual completion time. Historical planning documents retain their then-unregistered limitations; the latest receipt and report describe the current state.

## Real-source collection and publication

The manual `association-study-check.yml` workflow uses the existing Actions Tushare credential with read-only repository permissions. It checks the actual calendar, stock daily prices, stock adjustment factors, ETF daily prices and ETF adjustment factors. Only a public-report candidate is uploaded, with no credentials, raw prices or internal provider errors. A failed check fails the workflow and retains a sanitized unavailable report. The first candidate is reviewed and published through a data PR.

The existing daily workflow runs at 16:45 Asia/Shanghai, after the 16:30 completed-data cutoff. It updates observations before its existing reviewed-data publication step. Study failures produce an explicit unavailable snapshot without blocking the original index publication; `publish_only` makes no market-data requests. Provider cache data stays in a distinct runner-temporary namespace and Actions cache, outside source control and public artifacts. This cache can be evicted: content hashes are not a promise of permanent raw-data retention or independent reconciliation.

Collection is bounded to the baseline plus the next 20 sessions, with an additional check of the most recent complete session. Reports retain input hashes, calculation and collector hashes, single-provider evidence tier and data date. The frontend distinguishes waiting for baseline, immature windows, observed windows and missing data. Reports older than 48 hours receive a visible warning.

No local credential was configured during implementation. Do not search unrelated credential stores. Use existing authorized environment variables for local collection and an explicit external runtime directory:

```bash
python -m zoo_index.association_live \
  --runtime-dir "$STUDY_DATA/runtime/run-id" \
  --public-output "$STUDY_DATA/candidates/association_study.json"
```

Resolve `STUDY_DATA` to a task-specific directory under the owning project's configured data root, never to a temporary worktree. Real-source availability must be established by an actual run; synthetic tests do not prove it.

## Offline inputs and replay

The calendar CSV uses `cal_date,is_open`, with ISO dates and every calendar day represented, including closures. It must cover publication through as-of, and `is_open` accepts only 0 or 1. The price CSV uses `trade_date,ts_code,close,adj_factor`; codes retain their exchange suffix. ETF factors must come from fund data, never default to one. Duplicate security/date rows are rejected.

The registration JSON requires `sample_sha256`, `protocol_sha256`, timezone-aware `sample_published_at` and `protocol_published_at`, and `evidence_url`. Hashes bind exact file bytes. Calculations parse the same captured bytes used for their input hashes.

```bash
python -m zoo_index.association_study \
  --sample published/association-study/cohort-20261104/sample.json \
  --protocol published/association-study/cohort-20261104/protocol.json \
  --registration published/data/association_registration.json \
  --calendar "$STUDY_DATA/calendar.csv" \
  --prices "$STUDY_DATA/prices.csv" \
  --as-of YYYY-MM-DD \
  --input-source reviewed-provider-export \
  --output-dir "$STUDY_DATA/results/run-id"
```

Offline outputs remain explicitly labeled user-supplied and unverified. The CLI rejects future dates and same-day runs before 16:30 Shanghai time. Its output directory must be absolute and outside Git repositories. Omit registration to inspect the waiting state without computing returns. Retain raw inputs and reports outside source control; only reviewed public summaries belong under `published/`.


## First real-source check

[Run 41777085658](https://github.com/runchengxie/a-share-zoo-garden/actions/runs/41777085658) succeeded on reviewed revision `7816790d775953106069dce3bb3a44adec3dcfa2`, whose source files are unchanged in merged main `84a3b02`. The latest complete session checked was 3 November 2026: all 11 eligible stocks had prices and adjustment factors, and ETF price/factor fields were complete. The actual calendar places the baseline at the 5 November close. All 11 confirmed entries are waiting for that baseline; the two unconfirmed entries remain excluded. No numerical returns were generated.

The earlier attempt, [run 41776582826](https://github.com/runchengxie/a-share-zoo-garden/actions/runs/41776582826), failed at the stock adjustment-factor request. The new collector had omitted the repository's designated fallback wiring; this was corrected and tested without adding credentials. The successful run reported no fallback request, so these observations do not establish that permission or fallback activation caused the first failure or subsequent success. `fallback_requested_this_run` is process activity, not provenance for previously cached prices.

The public evidence record retains both attempts and candidate-report hashes. Review checked exact frozen IDs and sample/protocol/registration/code hashes, coverage counts and absence of premature returns or sensitive content. This verifies source-interface availability and consistent report construction, not independent accuracy of every raw price, predictive value of the theme, or future pipeline execution. Raw calendar and price hashes cannot be independently reproduced from the public readiness report alone.
