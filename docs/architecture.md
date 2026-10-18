# Architecture and operations

[简体中文](architecture.zh-CN.md)

The Python package computes index snapshots. The React frontend displays reviewed public JSON and does not calculate returns or receive provider credentials.

## Paths and artifacts

The CLI defaults to `<repository>/artifacts`, not `docs/`. Pass `--output-dir` explicitly to select another root. Reviewed production snapshots use `published/` for the animal garden and `published/plant/` for the plant garden.

| Relative path under an output root | Contract |
| --- | --- |
| `data/nav.csv` | NAV and daily returns, also read for incremental calculation |
| `data/latest.json`, `history.json`, `constituents.json`, `changes.json`, `metadata.json` | Five public JSON snapshots read by the frontend |
| `data/chart.png`, `data/badges/*.json` | Optional share chart (`--chart`) and shields.io badge payloads |
| `manifests/` | Holdings, constituent, change, and rule snapshots used for audit and restart |

`published/` is tracked and includes reviewed manifests. The frontend copies only the public data it needs through `web/scripts/copy-published-data.mjs` into generated `web/public/data/`. `web/dist/`, `.build/`, and the raw Tushare `data/cache/` are generated and ignored. `docs/` contains maintained source documentation.

New CSV columns use `benchmark_ret` and `benchmark_nav`. Public JSON uses `benchmark_nav`, `benchmark_daily`, and `benchmark_excess`. Reading an older NAV file still normalizes legacy `hs300_*` columns.

## Calculation and restart

`runner.compute_day` is shared by daily and backfill paths. `PortfolioState` carries strict/extended holdings, fixed weights, suspension counters, and the last valid prices and adjustment factors. Rebalances use the old basket for that day's return and make the new weights effective on the next trading day. [Methodology](methodology.md) defines the numerical and eligibility rules.

Daily restart reads the previous holdings snapshot. Older snapshots without valuation fields recover them from historical prices. Backfill passes state forward within its selected date range. `--backfill-mode missing` skips already computed dates within that range; it does not expand the requested range to find every historical gap. Use `all` after rule, benchmark, or return-convention changes and review the resulting snapshot in a PR.

## Credentials and CLI

- `TUSHARE_TOKEN` is the primary credential.
- `TUSHARE_TOKEN_2` optionally supplies a secondary credential.
- `TUSHARE_API_URL` selects the secondary endpoint only.

A failed primary request may fall back once to the configured secondary client. It does not change the calculation contract. Keep credentials and private provider settings outside public snapshots and source control.

```bash
uv run zoo-index --help
uv run zoo-audit --help
uv run zoo-chart --help
```

Common options include `--date`, `--rules`, `--output-dir`, `--start-date`, `--backfill`, `--backfill-years`, `--backfill-mode`, `--backfill-write-snapshots`, `--no-rules-snapshot`, `--no-cache`, `--force-refresh`, `--benchmark`, `--benchmark-source`, and `--benchmark-label`. `--backfill` without a count selects five years. The benchmark defaults to the adjusted-return ETF `510300.SH`; `--benchmark-source index` uses the CSI 300 index `000300.SH` when the default code is otherwise unchanged.

`zoo-audit` supports offline `--input` and `--namechange-input` files. Its optional `--llm` path tries Gemini, configured fixed OpenRouter models, then `openrouter/free`. Reports retain input/rule hashes and model/prompt identity. They do not change rules or published constituents. See [audit review](audit-review.md).

`zoo-index` generates `data/chart.png` only with `--chart`, in both daily and backfill runs. The default leaves any existing PNG untouched, so it may be stale. `zoo-chart` remains an explicit redraw command. PNG rendering requires Noto Sans CJK or Source Han Sans CN. Install `fonts-noto-cjk` on Debian/Ubuntu before starting Python. This dependency affects presentation only; it does not change the public JSON or NAV values.

Redraw a chart without calling Tushare:

```bash
uv run zoo-chart --nav published/data/nav.csv --out /path/to/generated/chart.png
```

## Deployment

The scheduled `daily.yml` workflow runs at 08:10 UTC on weekdays. It defaults to `missing` mode with **one** backfill trading day, not a full-history repair. Manual dispatch can increase `backfill_days`, select `all`, or use `publish_only` to rebuild the merged snapshot without calculation or a data commit.

Scheduled runs skip PNG generation. A `missing` backfill with no missing dates skips output generation even with `--chart`; use `zoo-chart` to redraw existing NAV. Manual dispatch can enable `chart` to generate animal and plant PNGs when computation writes outputs, and install the required fonts.

The animal command currently uses `--delisting-policy last_price_proxy` and writes `published/`; its metadata identifies `evidence_tier=research_proxy`. The plant command writes `published/plant/` with the default `strict` policy. These are different evidence tiers. The frontend labels the proxy series, and consumers must preserve that label rather than treating it as verified settlement or executable performance.

After calculation, the workflow writes and validates provenance, commits reviewed `published/` changes with its bot identity, builds the frontend, and deploys GitHub Pages. Local source and snapshot changes follow the branch/PR workflow in [AGENTS.md](../AGENTS.md). Do not treat the scheduled bot workflow as authorization for a direct local push to `main`.

Cloudflare deployment builds the merged public snapshot through `deploy-cloudflare.yml`. It needs `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`; the calculation workflow needs `TUSHARE_TOKEN`. This audit does not execute either deployment or a real provider request.

## Languages and validation

The website supports `en-US` and `zh-CN`. A valid `?lang=` overrides the saved `a-share-zoo-locale` preference; otherwise the saved Chinese preference or English fallback applies. Locale changes presentation of the same JSON. CLI help and diagnostics currently include Chinese text and have no locale option.

Run the Python and frontend checks in the root [README](../README.md#verification). The `formal` extra requires Python 3.12+ for pinned runtime/platform contracts. Formal runtime jobs use the explicitly configured external `ZOO_BACKTEST_RUNTIME_ROOT`; they do not belong in published snapshots. No real-data recalculation, settlement validation, or deployment is implied by synthetic tests.
