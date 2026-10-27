# A-share Zoo and Plant Garden

[中文 README](README.zh-CN.md)

An A-share thematic index research project. It selects stocks whose historical names contain configured animal or plant terms, builds strict and extended theme portfolios, updates the public outputs daily, and compares them with the CSI 300 benchmark.

The animal and plant gardens use separate rule files and output namespaces while sharing matching, listing-status, ST, liquidity, adjusted-return, and cache logic. Results are research artifacts and do not constitute investment advice.

Both gardens and the CSI 300 ETF benchmark start at NAV 1 at the close of 2021-01-04. Positions are established that day; returns begin on the next trading day. History before the known rule versions is a retrospective rule replay.

## What the project provides

- Strict and extended animal-garden indices with CSI 300 comparison.
- A plant-garden rule set that currently uses explicit multi-character plant terms to reduce false matches.
- Reproducible keyword rules and force-include or force-exclude lists.
- Daily NAV, badges, public JSON snapshots, constituents, changes, metadata, and optional PNG charts.
- Optional turnover, transaction-cost, and tradability diagnostics.
- Optional deterministic name audits for missed or potentially false matches.
- A research-style web presentation for index snapshots, NAV history, rebalances, constituents, and methodology.

## Quick start

Requirements: Python 3.11 or newer, [uv](https://docs.astral.sh/uv/) and a Tushare token.

`zoo-index` skips PNG generation by default. Add `--chart` for `data/chart.png`, or use `zoo-chart` to redraw an existing NAV file.

Only PNG rendering requires Noto Sans CJK or Source Han Sans CN. On Debian/Ubuntu, install `fonts-noto-cjk` before starting Python. CI installs the fonts for rendering tests; daily calculation installs them only when the manual `chart` option is enabled.

Existing PNG files are left untouched when generation is disabled and may be stale. A `missing` backfill with no missing dates skips output generation even with `--chart`; use `zoo-chart` to redraw existing NAV. NAV, public JSON, badges, and the interactive web charts are unaffected.

```bash
uv sync
export TUSHARE_TOKEN=your-token
uv run zoo-index
```

For a local web preview:

Use Node.js 20.19+ or 22.12+ (or a newer supported release) for the Vite 8 toolchain. CI and deployment use Node.js 22. The frontend uses React 18, React Router 7 in declarative `HashRouter` mode, and ECharts 6 with its v5 compatibility theme. Updating the frontend does not recompute the published snapshots.

Run the full frontend verification suite on Node.js 22 (22.18 or later) or 24+. The Node tests import TypeScript directly, using the native type stripping enabled by default in [Node.js 22.18](https://nodejs.org/en/blog/release/v22.18.0).

```bash
cd web
npm ci
npm run dev
```

The default run uses the most recent complete trading day in the Shanghai timezone. Use the `--backfill` and `--backfill-mode` options for historical calculation. A second token and proxy can be configured with `TUSHARE_TOKEN_2` and `TUSHARE_API_URL`.

## Commands

| Command | Purpose |
| --- | --- |
| `uv run zoo-index` | Update the latest complete trading day |
| `uv run zoo-index --backfill` | Backfill the recent five-year history |
| `uv run zoo-index --start-date 20210104 --backfill-mode all` | Recalculate from the shared start date |
| `uv run zoo-chart` | Redraw charts without calling Tushare |
| `uv run zoo-audit --date YYYYMMDD` | Produce deterministic name-audit candidates |
| `make daily` / `make backfill` / `make chart` / `make test` | Run the corresponding Make targets |

## Documentation and outputs

- [Methodology](docs/methodology.md): inclusion rules and index construction.
- [Architecture](docs/architecture.md): artifacts, data flow, deployment, and token handling.
- `published/`: reviewed public snapshots and manifests.
- `published/plant/`: independent plant-garden outputs.
- `artifacts/audit/`: local name-audit reports; these do not modify rules or constituents.

The project deploys to GitHub Pages and Cloudflare Pages. Daily production calculation and deployment are defined in the repository workflows. Cloudflare publication follows successful main-branch daily runs as well as main pushes, building both reviewed snapshot directories from main. This also covers daily data commits made with the workflow token, which do not trigger another push workflow. Do not commit tokens, proxy addresses, local paths, or private runtime logs.

## Verification

```bash
uv sync --frozen --extra formal
uv run --extra formal ruff format --check .
uv run --extra formal ruff check .
uv run --extra formal ty check
uv run --extra formal pytest
cd web
npm ci
npx playwright install chromium
npm test
npm run test:browser
npm run build
```

The `formal` extra installs the pinned execution and contract dependencies on Python 3.12+. On older supported Python versions, tests requiring `backtest_runtime` are skipped. CI runs the Python checks above and the frontend checks. `uv audit --frozen` reports dependency vulnerabilities without blocking CI. Coverage is reported by pytest; no minimum is configured. Unexpected warnings fail tests; intentional warnings must be captured explicitly.

If a cross-repository contract test fails, run `uv run --extra formal python scripts/diagnose_runtime_dependencies.py`. It reports the actual Python executable, package versions, module paths, and installed Git revisions so you can compare them with `pyproject.toml` and `uv.lock`. CI prints the same diagnostic before pytest. Missing packages and invalid installation metadata are reported explicitly. The diagnostic does not validate behavior or replace contract tests, and it omits source URLs that may contain credentials.

Browser regressions start a local Vite server, read public snapshot fixtures, and block external requests. They verify narrow layouts in both locales and the unknown stored-locale fallback, while keeping wide evidence tables scrollable. They do not validate live font delivery or provider access. Chromium must be installed; Linux hosts may need `npx playwright install --with-deps chromium` for system dependencies.

The website defaults to `en-US` and provides a `zh-CN` switch. A valid `?lang=` query takes precedence over the saved `a-share-zoo-locale` preference. Unknown values use the saved preference or fall back to English. The locale changes presentation of the same public JSON snapshots.

## Python support migration

Python 3.10 is no longer supported: the security fixes in Pillow 13 require Python 3.11. Upgrade the interpreter before recreating the environment. Python 3.11 and 3.13 are the validation targets. Business APIs and data formats are unchanged.

```bash
uv python install 3.11
uv sync --python 3.11 --frozen --extra formal
```

Formal diagnostics still require Python 3.12 or newer for the pinned optional providers.

Use the same command with `--python 3.13` for Python 3.13. Existing data and results do not need regeneration.
