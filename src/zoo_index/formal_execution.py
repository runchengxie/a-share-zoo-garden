"""Offline Zoo target replay through the shared execution simulator."""

from __future__ import annotations

import argparse
import json
from dataclasses import asdict
from importlib import import_module
from pathlib import Path
from typing import Protocol

import pandas as pd

from zoo_index.config import load_rules
from zoo_index.rule_comparison import OfflineCacheClient
from zoo_index.runner import BenchmarkConfig, PortfolioState, compute_day
from zoo_index.runtime_jobs import publish_verified_frames, run_sequenced_job


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


def _actual_pricing(
    client: _PricingClient,
    daily: pd.DataFrame,
    day: str,
    limit_asset: Path | None,
    delist_dates: dict[str, str] | None,
    columns: list[str],
) -> pd.DataFrame:
    if daily.empty:
        return pd.DataFrame(columns=pd.Index(columns))
    factors = client.get_adj_factor(day)[["ts_code", "adj_factor"]]
    daily = daily.merge(factors, on="ts_code", how="left", validate="one_to_one")
    if daily[["close", "adj_factor", "amount"]].isna().any().any():
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
    delisted = daily.ts_code.map(delist_dates or {}).fillna("99999999").le(day)
    daily["tradable"] = daily.amount.gt(0) & ~daily.ts_code.isin(suspended) & ~delisted
    daily["trade_date"] = day
    return daily.rename(columns={"ts_code": "symbol"})[columns]


def _pricing(
    client: _PricingClient,
    days: list[str],
    symbols: set[str],
    limit_asset: Path | None = None,
    delist_dates: dict[str, str] | None = None,
) -> pd.DataFrame:
    frames: list[pd.DataFrame] = []
    last_marks: dict[str, float] = {}
    for day in days:
        daily = client.get_daily(day)
        daily = daily.loc[daily.ts_code.isin(symbols)].copy()
        columns = ["trade_date", "symbol", "adjusted_close", "amount", "tradable"]
        if limit_asset is not None:
            columns.extend(("limit_up", "limit_down"))
        frame = _actual_pricing(client, daily, day, limit_asset, delist_dates, columns)
        last_marks.update(
            zip(frame.symbol.astype(str), frame.adjusted_close.astype(float), strict=True)
        )
        missing = [
            symbol
            for symbol, delist in (delist_dates or {}).items()
            if symbol in symbols and delist <= day and symbol not in set(frame.symbol)
        ]
        if missing:
            if any(symbol not in last_marks for symbol in missing):
                raise ValueError(f"{day} has unpriced delisting without prior mark: {missing}")
            carried = pd.DataFrame(
                [
                    {
                        "trade_date": day,
                        "symbol": symbol,
                        "adjusted_close": last_marks[symbol],
                        "amount": 0.0,
                        "tradable": False,
                        "limit_up": False,
                        "limit_down": False,
                    }
                    for symbol in missing
                ]
            )
            frame = pd.concat([frame, carried[columns]], ignore_index=True)
        if not frame.empty:
            frames.append(frame)
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
    execution_sim = import_module("portfolio_backtester.execution_sim")

    if output_dir.exists() and any(output_dir.iterdir()):
        raise FileExistsError(f"diagnostic output directory is not empty: {output_dir}")
    client = OfflineCacheClient(cache_dir, calendar_nav)
    days = [day for day in client.dates if start <= day <= end]
    if len(days) < 2:
        raise ValueError("at least two cached sessions are required")
    try:
        targets = _targets(client, rules_path, days)
        symbols = {str(row["symbol"]) for rows in targets.values() for row in rows}
        basic = client.get_stock_basic()
        delist_dates = {
            str(row["ts_code"]): str(row["delist_date"])
            for row in basic[["ts_code", "delist_date"]].to_dict("records")
            if pd.notna(row["delist_date"]) and str(row["delist_date"]).isdigit()
        }
        pricing = _pricing(client, days[1:], symbols, limit_asset, delist_dates)
    except (ValueError, FileNotFoundError) as error:
        output_dir.mkdir(parents=True, exist_ok=True)
        (output_dir / "summary.json").write_text(
            json.dumps(
                {"evidence_tier": "blocked", "start": start, "end": end, "reason": str(error)},
                ensure_ascii=False,
                indent=2,
            )
            + "\n",
            encoding="utf-8",
        )
        raise
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
    pending: dict[
        str, tuple[Path, dict[str, object], dict[str, dict[str, str]], list[dict[str, object]]]
    ] = {}
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
        result_dir, receipt = run_sequenced_job(
            output_dir / ".runtime",
            variant,
            positions,
            pricing,
            clocks,
            asdict(config),
            enforce_limits=limit_asset is not None,
        )
        try:
            exit_audit = execution_sim.audit_delisting_exits(
                pd.read_parquet(result_dir / "fills.parquet"),
                pricing,
                {
                    symbol: day
                    for symbol, day in delist_dates.items()
                    if symbol in set(positions.symbol)
                },
                price_col="adjusted_close",
            )
        except ValueError as error:
            (output_dir / "summary.json").write_text(
                json.dumps(
                    {"evidence_tier": "blocked", "start": start, "end": end, "reason": str(error)},
                    ensure_ascii=False,
                    indent=2,
                )
                + "\n",
                encoding="utf-8",
            )
            raise
        pending[variant] = (result_dir, receipt, clocks, exit_audit.to_dict("records"))
    for variant, (result_dir, receipt, clocks, exit_rows) in pending.items():
        folder = output_dir / variant
        publish_verified_frames(result_dir, folder)
        (folder / "decision_clocks.json").write_text(
            json.dumps(clocks, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
        )
        summaries[variant] = {
            "decision_count": len(clocks),
            "terminal_nav": float(
                pd.read_parquet(folder / "daily_ledger.parquet").nav.iloc[-1]
                / config.portfolio_value
            ),
            "runtime_job_id": receipt["job_id"],
            "delisting_exit_audit": exit_rows,
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
