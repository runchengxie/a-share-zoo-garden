# A-share Zoo and Plant Garden

[中文 README](README.zh-CN.md)

An A-share thematic index research project. It selects stocks whose historical names contain configured animal or plant terms, builds strict and extended theme portfolios, updates the public outputs daily, and compares them with the CSI 300 benchmark.

The animal and plant gardens use separate rule files and output namespaces while sharing matching, listing-status, ST, liquidity, adjusted-return, and cache logic. Results are research artifacts and do not constitute investment advice.

## What the project provides

- Strict and extended animal-garden indices with CSI 300 comparison.
- A plant-garden rule set that currently uses explicit multi-character plant terms to reduce false matches.
- Reproducible keyword rules and force-include or force-exclude lists.
- Daily NAV, charts, badges, public JSON snapshots, constituents, changes, and metadata.
- Optional turnover, transaction-cost, and tradability diagnostics.
- Optional deterministic name audits for missed or potentially false matches.
- A research-style web presentation for index snapshots, NAV history, rebalances, constituents, and methodology.

## Quick start

Requirements: [uv](https://docs.astral.sh/uv/) and a Tushare token.

```bash
uv sync
export TUSHARE_TOKEN=your-token
uv run zoo-index
```

For a local web preview:

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

The project deploys to GitHub Pages and Cloudflare Pages. Daily production calculation and deployment are defined in the repository workflows. Do not commit tokens, proxy addresses, local paths, or private runtime logs.

## Verification

```bash
uv run pytest
cd web
npm ci
npm test
npm run build
```

[Chinese README](README.zh-CN.md)
