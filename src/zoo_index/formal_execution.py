"""Offline Zoo target replay through the shared execution simulator."""

from __future__ import annotations

import argparse
import json
from importlib import import_module
from pathlib import Path
from typing import Protocol

import pandas as pd

from zoo_index.config import load_rules
from zoo_index.rule_comparison import OfflineCacheClient
from zoo_index.runner import BenchmarkConfig, PortfolioState, compute_day


def _iso(day: str) -> str:
    if len(day) != 8 or not day.isdigit():
        raise ValueError("clock dates must be YYYYMMDD")
    return f"{day[:4]}-{day[4:6]}-{day[6:]}"


def _clock(day: str, entry: str, valuation: str) -> dict[str, str]:
    decision = _iso(day)
    entry_date = _iso(entry)
    valuation_date = _iso(valuation)
    return {
        "schema_version": "research.clock.v1",
        "timezone": "Asia/Shanghai",
        "information_cutoff_at": f"{decision}T20:00:00+08:00",
        "signal_at": f"{decision}T20:01:00+08:00",
        "decision_at": f"{decision}T20:02:00+08:00",
        "earliest_order_at": f"{entry_date}T09:30:00+08:00",
        "execution_window_start_at": f"{entry_date}T09:30:00+08:00",
        "execution_window_end_at": f"{entry_date}T15:00:00+08:00",
        "valuation_at": f"{valuation_date}T16:00:00+08:00",
        "timing_policy_id": "zoo.modeled_after_close_next_session.v1",
        "trading_calendar_ref": "zoo.offline_nav_calendar",
    }


def _targets(
    client: OfflineCacheClient,
    rules_path: Path,
    days: list[str],
) -> dict[str, list[dict[str, object]]]:
    rules = load_rules(rules_path)
    basic = client.get_stock_basic()
    names = client.get_namechange()
    previous: PortfolioState | None = None
    targets: dict[str, list[dict[str, object]]] = {"strict": [], "extended": []}
    prior_weights: dict[str, pd.Series] = {}
    for index, day in enumerate(days[:-1]):
        result = compute_day(
            client,
            rules,
            BenchmarkConfig("510300.SH", "fund", "HS300 ETF"),
            day,
            basic,
            names,
            rules_path=rules_path,
            prev_state=previous,
        )
        assert result.state is not None
        for variant in ("strict", "extended"):
            weights = pd.Series(getattr(result.state, variant).weights, dtype=float).sort_index()
            if variant in prior_weights and weights.equals(prior_weights[variant]):
                continue
            for symbol, weight in weights.items():
                if float(weight) > 0:
                    targets[variant].append(
                        {
                            "rebalance_date": day,
                            "entry_date": days[index + 1],
                            "symbol": str(symbol),
                            "weight": float(weight),
                        }
                    )
            prior_weights[variant] = weights.copy()
        previous = result.state
    return targets


class _PricingClient(Protocol):
    def get_daily(self, trade_date: str, /) -> pd.DataFrame: ...
    def get_adj_factor(self, trade_date: str, /) -> pd.DataFrame: ...
    def get_suspension(self, trade_date: str, /) -> pd.DataFrame: ...


def _pricing(
    client: _PricingClient,
    days: list[str],
    symbols: set[str],
    limit_asset: Path | None = None,
) -> pd.DataFrame:
    frames: list[pd.DataFrame] = []
    for day in days:
        daily = client.get_daily(day)
        daily = daily.loc[daily.ts_code.isin(symbols)].copy()
        if daily.empty:
            continue
        factors = client.get_adj_factor(day)[["ts_code", "adj_factor"]]
        daily = daily.merge(factors, on="ts_code", how="left", validate="one_to_one")
        required = ["close", "adj_factor", "amount"]
        if daily[required].isna().any().any():
            raise ValueError(f"{day} has incomplete adjusted-price or liquidity input")
        suspended = set(client.get_suspension(day).ts_code.astype(str))
        if limit_asset is not None:
            files = sorted((limit_asset / "data" / f"trade_date={day}").glob("*.parquet"))
            if not files:
                raise FileNotFoundError(f"{day} has no published limit-status partition")
            limits = pd.concat(
                [
                    pd.read_parquet(path, columns=["ts_code", "up_limit", "down_limit"])
                    for path in files
                ],
                ignore_index=True,
            )
            daily = daily.merge(limits, on="ts_code", how="left", validate="one_to_one")
            if daily[["up_limit", "down_limit"]].isna().any().any():
                raise ValueError(f"{day} has unknown daily price limits")
            daily["limit_up"] = daily.close.ge(daily.up_limit - 0.005)
            daily["limit_down"] = daily.close.le(daily.down_limit + 0.005)
        daily["adjusted_close"] = daily.close * daily.adj_factor
        daily["tradable"] = daily.amount.gt(0) & ~daily.ts_code.isin(suspended)
        daily["trade_date"] = day
        columns = ["trade_date", "symbol", "adjusted_close", "amount", "tradable"]
        if limit_asset is not None:
            columns.extend(("limit_up", "limit_down"))
        frames.append(daily.rename(columns={"ts_code": "symbol"})[columns])
    if not frames:
        raise ValueError("no pricing for target symbols")
    return pd.concat(frames, ignore_index=True)


def run_diagnostic(
    *,
    cache_dir: Path,
    calendar_nav: Path,
    rules_path: Path,
    output_dir: Path,
    start: str,
    end: str,
    limit_asset: Path | None = None,
) -> dict[str, object]:
    backends = import_module("portfolio_backtester.backends")
    execution_sim = import_module("portfolio_backtester.execution_sim")

    if output_dir.exists() and any(output_dir.iterdir()):
        raise FileExistsError(f"diagnostic output directory is not empty: {output_dir}")
    client = OfflineCacheClient(cache_dir, calendar_nav)
    days = [day for day in client.dates if start <= day <= end]
    if len(days) < 2:
        raise ValueError("at least two cached sessions are required")
    targets = _targets(client, rules_path, days)
    symbols = {str(row["symbol"]) for rows in targets.values() for row in rows}
    pricing = _pricing(client, days[1:], symbols, limit_asset)
    config = execution_sim.ExecutionSimConfig(
        enabled=True,
        portfolio_value=1_000_000.0,
        participation_rate=0.05,
        liquidity_cols=("amount",),
        liquidity_notional_multiplier=1000.0,
        buy_max_days=5,
        sell_max_days=10,
        enforce_t1=True,
        enforce_price_limits=limit_asset is not None,
        limit_up_col="limit_up" if limit_asset is not None else None,
        limit_down_col="limit_down" if limit_asset is not None else None,
    )
    output_dir.mkdir(parents=True, exist_ok=True)
    summaries: dict[str, object] = {}
    for variant, rows in targets.items():
        if not rows:
            raise ValueError(f"{variant} has no target changes")
        positions = pd.DataFrame(rows)
        clocks: dict[str, dict[str, str]] = {
            str(row["rebalance_date"]): _clock(
                str(row["rebalance_date"]), str(row["entry_date"]), days[-1]
            )
            for row in rows
        }
        result = backends.SequencedExecutionBackend().run(
            backends.SequencedExecutionRequest(
                positions=positions,
                pricing=pricing,
                decision_clocks=clocks,
                config=config,
                price_col="adjusted_close",
                tradable_col="tradable",
                limit_up_col="limit_up" if limit_asset is not None else None,
                limit_down_col="limit_down" if limit_asset is not None else None,
                price_basis="adjusted_close_proxy",
            )
        )
        folder = output_dir / variant
        folder.mkdir()
        for name, frame in result.frames().items():
            frame.to_parquet(folder / f"{name}.parquet", index=False)
        (folder / "decision_clocks.json").write_text(
            json.dumps(clocks, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
        )
        summaries[variant] = {
            "decision_count": len(clocks),
            "terminal_nav": float(result.daily_ledger.nav.iloc[-1] / config.portfolio_value),
        }
    report: dict[str, object] = {
        "evidence_tier": "diagnostic",
        "reason": (
            "source availability timestamps and raw corporate actions are unavailable"
            if limit_asset is not None
            else (
                "source availability timestamps, price limits and raw corporate "
                "actions are unavailable"
            )
        ),
        "price_limits_enforced": limit_asset is not None,
        "start": start,
        "end": end,
        "variants": summaries,
    }
    (output_dir / "summary.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    return report


def main() -> int:
    parser = argparse.ArgumentParser(description="Zoo 公共执行引擎离线诊断回放")
    parser.add_argument("--cache-dir", type=Path, required=True)
    parser.add_argument("--calendar-nav", type=Path, required=True)
    parser.add_argument("--rules", type=Path, required=True)
    parser.add_argument("--limit-asset", type=Path)
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--start", required=True)
    parser.add_argument("--end", required=True)
    args = parser.parse_args()
    result = run_diagnostic(
        cache_dir=args.cache_dir,
        calendar_nav=args.calendar_nav,
        rules_path=args.rules,
        output_dir=args.output_dir,
        start=args.start,
        end=args.end,
        limit_asset=args.limit_asset,
    )
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
