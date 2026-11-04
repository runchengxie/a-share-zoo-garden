"""Offline, fixed-cohort observation study; never changes index membership or NAV."""

from __future__ import annotations

import argparse
import hashlib
import json
import math
from datetime import date, datetime, time, timedelta
from io import BytesIO
from pathlib import Path
from zoneinfo import ZoneInfo

import numpy as np
import pandas as pd

SHANGHAI = ZoneInfo("Asia/Shanghai")
HORIZONS = [1, 5, 20]
BENCHMARK = "510300.SH"


def _timestamp(value: str) -> datetime:
    result = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if result.tzinfo is None:
        raise ValueError("timestamps must include a time zone")
    return result


def _registration_gate(sample: bytes, protocol: bytes, receipt: dict) -> datetime:
    for label, content in (("sample", sample), ("protocol", protocol)):
        if receipt[f"{label}_sha256"] != hashlib.sha256(content).hexdigest():
            raise ValueError(f"{label} hash does not match frozen registration")
    if not receipt["evidence_url"].startswith(
        "https://github.com/runchengxie/a-share-zoo-garden/actions/runs/"
    ):
        raise ValueError("registration requires a project deployment evidence URL")
    return max(
        _timestamp(receipt["sample_published_at"]),
        _timestamp(receipt["protocol_published_at"]),
    )


def _calendar_days(calendar: pd.DataFrame, start: date, as_of: date) -> list[str]:
    frame = calendar.copy()
    days = frame.cal_date.astype(str).tolist()
    if not days or len(set(days)) != len(days):
        raise ValueError("calendar must contain unique contiguous dates")
    parsed = sorted(date.fromisoformat(day) for day in days)
    if any(date.fromisoformat(day).isoformat() != day for day in days):
        raise ValueError("calendar dates must use ISO format")
    expected = [parsed[0] + timedelta(days=i) for i in range((parsed[-1] - parsed[0]).days + 1)]
    if parsed != expected or parsed[0] > min(start, as_of) or parsed[-1] < as_of:
        raise ValueError("calendar must cover every calendar day through as_of")
    if not frame.is_open.isin([0, 1]).all():
        raise ValueError("calendar is_open must be 0 or 1")
    return sorted(frame.loc[frame.is_open == 1, "cal_date"].astype(str).tolist())


def _price_lookup(prices: pd.DataFrame) -> dict[tuple[str, str], float]:
    if prices.duplicated(["ts_code", "trade_date"]).any():
        raise ValueError("duplicate security/date prices")
    values = prices[["close", "adj_factor"]].to_numpy(dtype=float)
    known = values[~np.isnan(values)]
    if not np.isfinite(known).all() or (known <= 0).any():
        raise ValueError("prices and adjustment factors must be positive finite numbers")
    complete = ~np.isnan(values).any(axis=1)
    values = values[complete]
    with np.errstate(over="ignore", under="ignore"):
        adjusted = values[:, 0] * values[:, 1]
    if not np.isfinite(adjusted).all() or (adjusted <= 0).any():
        raise ValueError("adjusted prices must be positive finite numbers")
    result = {}
    for row, value in zip(
        prices.loc[complete, ["ts_code", "trade_date"]].itertuples(index=False, name=None),
        adjusted,
        strict=True,
    ):
        day = str(row[1])
        if date.fromisoformat(day).isoformat() != day:
            raise ValueError("price dates must be ISO dates")
        result[(str(row[0]), day)] = float(value)
    return result


def _window(code: str, days: list[str], horizon: int, prices: dict, as_of: str) -> dict:
    result = {"horizon": horizon, "end_date": days[horizon] if len(days) > horizon else None}
    if len(days) <= horizon or days[horizon] > as_of:
        return {**result, "status": "not_matured"}
    required = [(asset, day) for asset in (code, BENCHMARK) for day in days[: horizon + 1]]
    missing = [f"{asset}:{day}" for asset, day in required if (asset, day) not in prices]
    if missing:
        return {**result, "status": "missing_prices", "missing": missing}
    stock = prices[code, days[horizon]] / prices[code, days[0]] - 1
    benchmark = prices[BENCHMARK, days[horizon]] / prices[BENCHMARK, days[0]] - 1
    if not math.isfinite(stock) or not math.isfinite(benchmark):
        raise ValueError("computed ratios must be positive finite price ratios")
    return {
        **result,
        "status": "observed",
        "stock_return": stock,
        "benchmark_return": benchmark,
        "excess_return": stock - benchmark,
    }


def _entry_result(entry: dict, gate: datetime, days: list[str], prices: dict, as_of: str) -> dict:
    base = {"id": entry["id"], "ts_code": entry["ts_code"]}
    if entry["status"] != "confirmed":
        return {**base, "status": "not_confirmed_at_freeze", "windows": []}
    eligible_date = max(gate, _timestamp(entry["reviewed_at"])).astimezone(SHANGHAI).date()
    following = [day for day in days if date.fromisoformat(day) > eligible_date]
    if not following or following[0] > as_of:
        return {**base, "status": "awaiting_baseline", "windows": []}
    return {
        **base,
        "status": "evaluated",
        "baseline_date": following[0],
        "windows": [_window(entry["ts_code"], following, h, prices, as_of) for h in HORIZONS],
    }


def _frozen_entries(data: dict, receipt: dict) -> list[dict]:
    entries = data["entries"]
    if len({entry["id"] for entry in entries}) != len(entries):
        raise ValueError("duplicate association IDs")
    published = _timestamp(receipt["sample_published_at"])
    for entry in entries:
        if entry["status"] not in {"confirmed", "pending", "expired"}:
            raise ValueError("unknown association status")
        reviewed = _timestamp(entry["reviewed_at"])
        if reviewed > published or any(_timestamp(e["at"]) > published for e in entry["events"]):
            raise ValueError("sample contains review events after frozen publication")
        if not entry["events"] or entry["events"][-1]["status"] != entry["status"]:
            raise ValueError("frozen status must agree with review history")
    return entries


def build_study(
    sample: bytes,
    protocol: bytes,
    registration: dict | None,
    calendar: pd.DataFrame,
    prices: pd.DataFrame,
    as_of: str,
) -> dict:
    """Compute only registered, matured observations from user-supplied offline inputs."""
    as_of_date = date.fromisoformat(as_of)
    config = json.loads(protocol)
    if config != {"version": "association-study.v1", "benchmark": BENCHMARK, "horizons": HORIZONS}:
        raise ValueError("unsupported study protocol")
    base = {"schema_version": "association-study.v1", "as_of": as_of}
    if registration is None:
        return {**base, "status": "awaiting_registration", "entries": []}
    gate = _registration_gate(sample, protocol, registration)
    entries = _frozen_entries(json.loads(sample), registration)
    days = _calendar_days(calendar, gate.astimezone(SHANGHAI).date(), as_of_date)
    lookup = _price_lookup(prices)
    return {
        **base,
        "status": "offline_observation",
        "evidence_tier": "user_supplied_inputs_unverified",
        "benchmark": BENCHMARK,
        "entries": [_entry_result(e, gate, days, lookup, as_of) for e in entries],
    }


def _external_output(value: str) -> Path:
    path = Path(value)
    if not path.is_absolute():
        raise ValueError("output directory must be an absolute path outside Git repositories")
    resolved = path.resolve()
    if any(
        (p / ".git").is_file() or (p / ".git" / "HEAD").is_file()
        for p in (path, *path.parents, resolved, *resolved.parents)
    ):
        raise ValueError("output directory must be outside Git repositories")
    return resolved


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    for key in ("sample", "protocol", "calendar", "prices", "output-dir", "input-source"):
        parser.add_argument(f"--{key}", required=True)
    parser.add_argument("--registration")
    parser.add_argument(
        "--as-of", required=True, help="Completed Shanghai trading date, ISO format"
    )
    args = parser.parse_args(argv)
    now = datetime.now(SHANGHAI)
    end = date.fromisoformat(args.as_of)
    if end > now.date() or (end == now.date() and now.time() < time(16, 30)):
        raise ValueError("as_of must be a completed date after the daily data cutoff")
    output = _external_output(args.output_dir)
    paths = {key: Path(getattr(args, key)) for key in ("sample", "protocol", "calendar", "prices")}
    if args.registration:
        paths["registration"] = Path(args.registration)
    contents = {key: path.read_bytes() for key, path in paths.items()}
    receipt = json.loads(contents["registration"]) if args.registration else None
    report = build_study(
        contents["sample"],
        contents["protocol"],
        receipt,
        pd.read_csv(BytesIO(contents["calendar"]), dtype={"cal_date": str}),
        pd.read_csv(BytesIO(contents["prices"]), dtype={"ts_code": str, "trade_date": str}),
        args.as_of,
    )
    report["engine_sha256"] = hashlib.sha256(Path(__file__).read_bytes()).hexdigest()
    report["input_source"] = args.input_source
    report["input_hashes"] = {
        key: hashlib.sha256(value).hexdigest() for key, value in contents.items()
    }
    output.mkdir(parents=True, exist_ok=True)
    temporary = output / "association_study.json.tmp"
    temporary.write_text(json.dumps(report, ensure_ascii=False, indent=2, allow_nan=False) + "\n")
    temporary.replace(output / "association_study.json")
    print(f"association study: {report['status']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
