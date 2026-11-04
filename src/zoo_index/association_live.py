"""Collect registered fixed-cohort observations using existing Tushare source interfaces."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
from datetime import datetime, time, timedelta
from pathlib import Path
from typing import Protocol

import pandas as pd

from .association_study import (
    BENCHMARK,
    SHANGHAI,
    _external_output,
    _registration_gate,
    build_study,
)
from .data_sources.tushare import TushareClient

COHORT = "cohort-20261104"


class ObservationSource(Protocol):
    def get_trade_calendar_range(self, start_date: str, end_date: str, /) -> pd.DataFrame: ...
    def get_daily(self, trade_date: str, /) -> pd.DataFrame: ...
    def get_adj_factor(self, trade_date: str, /) -> pd.DataFrame: ...
    def get_fund_daily(self, trade_date: str, ts_code: str, /) -> pd.DataFrame: ...
    def get_fund_adj(self, trade_date: str, ts_code: str, /) -> pd.DataFrame: ...


class ProviderInputUnavailable(Exception):
    def __init__(self, stage: str) -> None:
        self.stage = stage
        super().__init__(stage)


def _fetch(source: ObservationSource, method: str, *args: str) -> pd.DataFrame:
    try:
        return getattr(source, method)(*args)
    except Exception:
        raise ProviderInputUnavailable(method) from None


def _select(frame: pd.DataFrame, columns: list[str]) -> pd.DataFrame:
    if frame.empty:
        return pd.DataFrame(
            {
                column: pd.Series(dtype="object" if column == "ts_code" else "float64")
                for column in columns
            }
        )
    return frame[columns].copy()


def _session_prices(source: ObservationSource, day: str, codes: list[str]) -> pd.DataFrame:
    compact = day.replace("-", "")
    daily = _select(_fetch(source, "get_daily", compact), ["ts_code", "close"])
    factors = _select(_fetch(source, "get_adj_factor", compact), ["ts_code", "adj_factor"])
    stocks = (
        pd.DataFrame({"ts_code": codes})
        .merge(daily[daily.ts_code.isin(codes)], on="ts_code", how="left", validate="one_to_one")
        .merge(
            factors[factors.ts_code.isin(codes)], on="ts_code", how="left", validate="one_to_one"
        )
    )
    fund = _select(_fetch(source, "get_fund_daily", compact, BENCHMARK), ["ts_code", "close"])
    fund_adj = _select(
        _fetch(source, "get_fund_adj", compact, BENCHMARK), ["ts_code", "adj_factor"]
    )
    benchmark = (
        pd.DataFrame({"ts_code": [BENCHMARK]})
        .merge(fund, on="ts_code", how="left", validate="one_to_one")
        .merge(fund_adj, on="ts_code", how="left", validate="one_to_one")
    )
    result = pd.concat([stocks, benchmark], ignore_index=True)
    result["trade_date"] = day
    return result


def _hash_frame(frame: pd.DataFrame) -> str:
    return hashlib.sha256(frame.to_csv(index=False).encode()).hexdigest()


def collect_observation(root: Path, source: ObservationSource, now: datetime) -> dict:
    if now.tzinfo is None:
        raise ValueError("now must include timezone")
    now = now.astimezone(SHANGHAI)
    registration_bytes = (root / "published/data/association_registration.json").read_bytes()
    receipt = json.loads(registration_bytes)
    frozen = root / "published/association-study" / COHORT
    sample = (frozen / "sample.json").read_bytes()
    protocol = (frozen / "protocol.json").read_bytes()
    gate = _registration_gate(sample, protocol, receipt)
    gate_date = gate.astimezone(SHANGHAI).date()
    cutoff = now.date() if now.time() >= time(16, 30) else now.date() - timedelta(days=1)
    start = min(gate_date, cutoff - timedelta(days=31))
    calendar = _fetch(
        source,
        "get_trade_calendar_range",
        start.strftime("%Y%m%d"),
        (max(now.date(), gate_date) + timedelta(days=60)).strftime("%Y%m%d"),
    ).copy()
    calendar["cal_date"] = pd.to_datetime(calendar.cal_date, format="%Y%m%d").dt.strftime(
        "%Y-%m-%d"
    )
    open_days = sorted(calendar.loc[calendar.is_open == 1, "cal_date"].tolist())
    completed = [day for day in open_days if day <= cutoff.isoformat()]
    following = [day for day in open_days if day > gate_date.isoformat()]
    if not completed or not following:
        raise ValueError("calendar does not contain completed and future registered sessions")
    as_of, baseline = completed[-1], following[0]
    entries = json.loads(sample)["entries"]
    codes = sorted({entry["ts_code"] for entry in entries if entry["status"] == "confirmed"})
    cohort_days = [day for day in open_days if day >= baseline][:21]
    needed = sorted({as_of, *(day for day in cohort_days if day <= as_of)})
    prices = pd.concat([_session_prices(source, day, codes) for day in needed], ignore_index=True)
    report = build_study(sample, protocol, receipt, calendar, prices, as_of)
    latest = prices[prices.trade_date == as_of].set_index("ts_code")
    available = latest[["close", "adj_factor"]].notna().all(axis=1)
    report.update(
        {
            "status": "registered_observation",
            "cohort_id": COHORT,
            "evidence_tier": "single_provider_unreconciled",
            "provider": "tushare_compatible",
            "fallback_used": bool(getattr(source, "_fallback_warned", False)),
            "generated_at": now.isoformat(),
            "scheduled_baseline": baseline,
            "input_check": {
                "date": as_of,
                "expected_stocks": len(codes),
                "complete_stocks": int(available.reindex(codes).sum()),
                "benchmark_complete": bool(available.loc[BENCHMARK]),
            },
            "input_hashes": {
                "sample": hashlib.sha256(sample).hexdigest(),
                "protocol": hashlib.sha256(protocol).hexdigest(),
                "registration": hashlib.sha256(registration_bytes).hexdigest(),
                "calendar": _hash_frame(calendar),
                "prices": _hash_frame(prices),
            },
            "engine_sha256": hashlib.sha256(
                (Path(__file__).parent / "association_study.py").read_bytes()
            ).hexdigest(),
            "collector_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
        }
    )
    return report


def _write(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(".json.tmp")
    temporary.write_text(json.dumps(payload, ensure_ascii=False, indent=2, allow_nan=False) + "\n")
    temporary.replace(path)


def write_unavailable(
    path: Path, now: datetime, stage: str = "validation_or_configuration"
) -> None:
    _write(
        path,
        {
            "schema_version": "association-study.v1",
            "cohort_id": COHORT,
            "status": "unavailable",
            "failure_stage": stage,
            "generated_at": now.isoformat(),
            "entries": [],
        },
    )


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--runtime-dir", required=True)
    parser.add_argument("--public-output", required=True)
    args = parser.parse_args(argv)
    output = Path(args.public_output)
    now = datetime.now(SHANGHAI)
    try:
        runtime = _external_output(args.runtime_dir)
        token = os.environ.get("TUSHARE_TOKEN", "").strip()
        if not token:
            raise ValueError("provider credential unavailable")
        source = TushareClient(
            token,
            cache_dir=runtime / "cache",
            token2=os.environ.get("TUSHARE_TOKEN_2", "").strip() or None,
            api_url2=os.environ.get("TUSHARE_API_URL", "").strip() or None,
        )
        root = Path(__file__).resolve().parents[2]
        report = collect_observation(root, source, now)
        _write(output, report)
        print(f"association observation: {report['status']} as_of={report['as_of']}")
        return 0
    except Exception as exc:
        # Provider exceptions can include request URLs/configuration. Publish only a stable status.
        stage = (
            exc.stage
            if isinstance(exc, ProviderInputUnavailable)
            else "validation_or_configuration"
        )
        write_unavailable(output, now, stage)
        print("association observation unavailable; provider inputs or registration need review")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
