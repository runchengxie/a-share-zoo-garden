"""Offline, isolated comparison of historical and frozen theme rule sets."""

from __future__ import annotations

import argparse
import hashlib
import json
from dataclasses import dataclass
from pathlib import Path

import pandas as pd
import yaml

from zoo_index.config import load_backtest_config, load_rules
from zoo_index.data_sources.tushare import TradeCalendarEntry
from zoo_index.runner import BenchmarkConfig, RunConfig, run_backfill


@dataclass(frozen=True)
class Scenario:
    name: str
    rules_path: Path
    start_date: str
    interpretation: str


class OfflineCacheClient:
    """Read a complete, fixed local snapshot without falling back to an API."""

    def __init__(self, cache_dir: Path, calendar_nav: Path) -> None:
        self.cache_dir = cache_dir
        nav = pd.read_csv(calendar_nav)
        self.dates = sorted(nav["date"].astype(str).drop_duplicates().tolist())
        if not self.dates:
            raise ValueError("calendar NAV has no dates")

    def _table(self, *parts: str) -> pd.DataFrame:
        path = self.cache_dir.joinpath(*parts)
        if not path.is_file():
            raise FileNotFoundError(f"offline cache is missing {path}")
        return pd.read_parquet(path)

    def get_stock_basic(self) -> pd.DataFrame:
        return self._table("stock_basic.parquet")

    def get_namechange(self) -> pd.DataFrame:
        return self._table("namechange.parquet")

    def get_trade_calendar_range(self, start_date: str, end_date: str) -> pd.DataFrame:
        return pd.DataFrame(
            {"cal_date": [day for day in self.dates if start_date <= day <= end_date], "is_open": 1}
        )

    def get_trade_calendar(self, date: str) -> TradeCalendarEntry:
        return TradeCalendarEntry(date, date in self.dates)

    def get_recent_open_dates(
        self, end_date: str, count: int, lookback_days: int | None = None
    ) -> list[str]:
        # The replay may need an older last-traded mark for a security already
        # suspended when the experiment starts. Callers use the final dates for
        # previous-session lookup, so additional history is safe here.
        return [day for day in self.dates if day <= end_date][-max(count, 300) :]

    def get_daily(self, trade_date: str) -> pd.DataFrame:
        return self._table("daily", f"{trade_date}.parquet")

    def get_adj_factor(self, trade_date: str) -> pd.DataFrame:
        return self._table("adj_factor", f"{trade_date}.parquet")

    def get_suspension(self, trade_date: str) -> pd.DataFrame:
        return self._table("suspension", f"{trade_date}.parquet")

    def get_fund_daily(self, trade_date: str, ts_code: str) -> pd.DataFrame:
        return self._table("fund_daily", ts_code, f"{trade_date}.parquet")

    def get_fund_adj(self, trade_date: str, ts_code: str) -> pd.DataFrame:
        return self._table("fund_adj", ts_code, f"{trade_date}.parquet")

    def get_index_daily(self, trade_date: str, ts_code: str) -> pd.DataFrame:
        return self._table("index_daily", ts_code, f"{trade_date}.parquet")


def build_scenarios(rules_path: Path, output_dir: Path, start_date: str) -> list[Scenario]:
    history_path = rules_path.with_name(f"{rules_path.stem}_history.yml")
    history = yaml.safe_load(history_path.read_text(encoding="utf-8"))
    if not isinstance(history, list) or not history:
        raise ValueError("comparison requires a nonempty rules_history.yml")
    entries = sorted(history, key=lambda entry: str(entry["effective_from"]))
    first_date = str(entries[0]["effective_from"])
    if len(first_date) != 8 or not first_date.isdigit():
        raise ValueError("first known rule date must be YYYYMMDD")
    theme = load_rules(rules_path).theme
    first_rules = dict(entries[0]["rules"])
    first_rules["theme"] = theme
    current_rules = yaml.safe_load(rules_path.read_text(encoding="utf-8"))
    current_rules["theme"] = theme
    frozen_dir = output_dir / "rule_inputs"
    frozen_dir.mkdir(parents=True, exist_ok=True)
    first_path = frozen_dir / "first_known.yml"
    current_path = frozen_dir / "current.yml"
    for path, payload in ((first_path, first_rules), (current_path, current_rules)):
        path.write_text(
            yaml.safe_dump(payload, allow_unicode=True, sort_keys=True), encoding="utf-8"
        )
    overlap_start = max(start_date, first_date)
    return [
        Scenario(
            "historical_rules",
            rules_path,
            overlap_start,
            "known rules only from their first recorded date",
        ),
        Scenario(
            "frozen_first_known", first_path, overlap_start, "first known rules held fixed forward"
        ),
        Scenario(
            "frozen_current_backcast",
            current_path,
            start_date,
            "retrospective current-rule taxonomy",
        ),
    ]


def _sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _summary(nav_path: Path, start_date: str) -> dict[str, object]:
    nav = pd.read_csv(nav_path, dtype={"date": str})
    nav = nav.loc[nav.date >= start_date].sort_values("date")
    if nav.empty:
        raise ValueError(f"NAV contains no dates from {start_date}")
    result: dict[str, object] = {
        "start_date": nav.date.iloc[0],
        "end_date": nav.date.iloc[-1],
        "sessions": len(nav),
    }
    for variant in ("strict", "extended"):
        returns = nav[f"zoo_{variant}_ret"].astype(float)
        curve = (1 + returns).cumprod()
        result[f"{variant}_terminal_nav"] = float(curve.iloc[-1])
        result[f"{variant}_max_drawdown"] = float((curve / curve.cummax() - 1).min())
    return result


def run_comparison(
    *,
    rules_path: Path,
    cache_dir: Path,
    calendar_nav: Path,
    output_dir: Path,
    start_date: str,
    end_date: str,
    benchmark: BenchmarkConfig,
) -> dict[str, object]:
    if output_dir.exists() and any(output_dir.iterdir()):
        raise ValueError("comparison output directory must be empty")
    output_dir.mkdir(parents=True, exist_ok=True)
    client = OfflineCacheClient(cache_dir, calendar_nav)
    scenarios = build_scenarios(rules_path, output_dir, start_date)
    covered = [day for day in client.dates if start_date <= day <= end_date]
    if not covered or covered[-1] != end_date:
        raise ValueError("end_date must be a cached calendar session")
    required = (
        "daily",
        "adj_factor",
        "suspension",
        f"fund_daily/{benchmark.code}",
        f"fund_adj/{benchmark.code}",
    )
    inventory: list[dict[str, str]] = []
    for day in covered:
        for folder in required:
            path = cache_dir / folder / f"{day}.parquet"
            if not path.is_file():
                raise FileNotFoundError(f"missing comparison input: {folder}/{day}.parquet")
            inventory.append({"path": str(path.relative_to(cache_dir)), "sha256": _sha256(path)})
    inventory_path = output_dir / "input_inventory.json"
    inventory_path.write_text(
        json.dumps(inventory, ensure_ascii=False, sort_keys=True, indent=2) + "\n",
        encoding="utf-8",
    )
    summaries: dict[str, object] = {}
    overlap_start = scenarios[0].start_date
    for scenario in scenarios:
        scenario_dir = output_dir / scenario.name
        first_session = next((day for day in covered if day >= scenario.start_date), None)
        if first_session is None:
            raise ValueError(f"cache ends before the first known rule date for {scenario.name}")
        config = RunConfig(
            repo_root=rules_path.parent,
            output_dir=scenario_dir,
            rules_path=scenario.rules_path,
            token="offline",
            benchmark=benchmark,
            date=end_date,
            backfill_requested=True,
            start_date=first_session,
            backfill_mode="all",
            backtest=load_backtest_config(rules_path.parent / "backtest.yml"),
        )
        if run_backfill(config, client=client) != 0:
            raise RuntimeError(f"comparison failed: {scenario.name}")
        nav_path = scenario_dir / "data" / "nav.csv"
        summaries[scenario.name] = {
            "interpretation": scenario.interpretation,
            "rules_sha256": _sha256(scenario.rules_path),
            "full_period": _summary(nav_path, first_session),
            "common_period": _summary(nav_path, overlap_start),
        }
    report: dict[str, object] = {
        "schema_version": "zoo.rule_comparison.v1",
        "calendar_sha256": _sha256(calendar_nav),
        "stock_basic_sha256": _sha256(cache_dir / "stock_basic.parquet"),
        "namechange_sha256": _sha256(cache_dir / "namechange.parquet"),
        "rules_history_sha256": _sha256(rules_path.with_name(f"{rules_path.stem}_history.yml")),
        "input_inventory_sha256": _sha256(inventory_path),
        "comparison_start_date": overlap_start,
        "scenarios": summaries,
    }
    (output_dir / "comparison.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    return report


def main() -> int:
    parser = argparse.ArgumentParser(description="离线比较历史词表、首版冻结词表和当前词表回放")
    parser.add_argument("--rules", type=Path, required=True)
    parser.add_argument("--cache-dir", type=Path, required=True)
    parser.add_argument("--calendar-nav", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--start-date", required=True)
    parser.add_argument("--end-date", required=True)
    parser.add_argument("--benchmark-code", default="510300.SH")
    args = parser.parse_args()
    report = run_comparison(
        rules_path=args.rules.resolve(),
        cache_dir=args.cache_dir.resolve(),
        calendar_nav=args.calendar_nav.resolve(),
        output_dir=args.output_dir.resolve(),
        start_date=args.start_date,
        end_date=args.end_date,
        benchmark=BenchmarkConfig(args.benchmark_code, "fund", "HS300 ETF"),
    )
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
