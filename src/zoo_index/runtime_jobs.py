"""Submit sequenced diagnostics to the durable backtest runtime CLI."""

from __future__ import annotations

import hashlib
import json
import os
import shutil
import subprocess
import sys
import time
from pathlib import Path
from typing import Any

import pandas as pd


def _store_artifact(root: Path, payload: bytes) -> str:
    digest = hashlib.sha256(payload).hexdigest()
    destination = root / "sha256" / digest
    destination.parent.mkdir(parents=True, exist_ok=True)
    if destination.exists():
        if destination.read_bytes() != payload:
            raise ValueError("content-addressed artifact collision")
    else:
        destination.write_bytes(payload)
    return f"artifact://sha256/{digest}"


def _store_frame(root: Path, frame: pd.DataFrame, staging: Path) -> str:
    frame.to_parquet(staging, index=False)
    try:
        return _store_artifact(root, staging.read_bytes())
    finally:
        staging.unlink()


def _runtime_command(root: Path, command: str, argument: str) -> dict[str, Any]:
    completed = subprocess.run(
        [
            sys.executable,
            "-m",
            "backtest_runtime.cli",
            "--database",
            str(root / "jobs.sqlite"),
            "--artifact-root",
            str(root / "artifacts"),
            "--result-root",
            str(root / "results"),
            command,
            argument,
        ],
        check=True,
        capture_output=True,
        text=True,
        timeout=60,
    )
    return json.loads(completed.stdout)


def run_sequenced_job(
    root: Path,
    variant: str,
    positions: pd.DataFrame,
    pricing: pd.DataFrame,
    clocks: dict[str, dict[str, str]],
    ledger_config: dict[str, Any],
    *,
    enforce_limits: bool,
) -> tuple[Path, dict[str, Any]]:
    """Return a verified runtime result directory and its receipt."""
    root.mkdir(parents=True, exist_ok=True)
    artifacts = root / "artifacts"
    inputs = {
        "positions_ref": _store_frame(artifacts, positions, root / f"{variant}-positions.parquet"),
        "pricing_ref": _store_frame(artifacts, pricing, root / f"{variant}-pricing.parquet"),
        "decision_clocks_ref": _store_artifact(
            artifacts, (json.dumps(clocks, ensure_ascii=False, sort_keys=True) + "\n").encode()
        ),
    }
    request = {
        "schema_version": 3,
        "idempotency_key": "",
        "backend": "native.sequenced_execution",
        "evidence_tier": "diagnostic",
        "inputs": inputs,
        "config": {
            "price_col": "adjusted_close",
            "tradable_col": "tradable",
            "buy_tradable_col": None,
            "sell_tradable_col": None,
            "limit_up_col": "limit_up" if enforce_limits else None,
            "limit_down_col": "limit_down" if enforce_limits else None,
            "listing_status_col": None,
            "transaction_cost_bps": 0.0,
            "price_basis": "adjusted_close_proxy",
        },
        "execution": {"ledger_config": ledger_config},
        "budgets": {"wall_seconds": 1800, "memory_mb": 8192},
    }
    fingerprint = hashlib.sha256(json.dumps(request, sort_keys=True).encode()).hexdigest()[:24]
    request["idempotency_key"] = f"zoo-{variant}-{fingerprint}"
    manifest = root / f"{variant}-request.json"
    manifest.write_text(json.dumps(request, ensure_ascii=False, sort_keys=True) + "\n")
    receipt = _runtime_command(root, "submit", str(manifest))
    job_id = str(receipt["job_id"])
    deadline = time.monotonic() + 1810
    while time.monotonic() < deadline:
        status = _runtime_command(root, "status", job_id)
        if status["status"] == "SUCCEEDED":
            verified = _runtime_command(root, "result", job_id)
            if verified.get("backend") != "native.sequenced_execution":
                raise ValueError("unexpected runtime backend in verified result")
            return root / "results" / job_id, {
                "job_id": job_id,
                "request_sha256": verified["request_sha256"],
                "result_sha256": status["result_sha256"],
            }
        if status["status"] in {"FAILED", "CANCELLED"}:
            raise RuntimeError(f"backtest job {job_id} {status['status']}: {status['error_code']}")
        time.sleep(0.1)
    raise TimeoutError(f"backtest job {job_id} did not finish within its budget")


def publish_verified_frames(result_dir: Path, destination: Path) -> None:
    destination.mkdir()
    for name in ("performance", "positions", "orders", "fills", "daily_ledger"):
        shutil.copy2(result_dir / f"{name}.parquet", destination / f"{name}.parquet")


def run_trade_accounting_job(
    date: str,
    variant: str,
    frame: pd.DataFrame,
    *,
    commission_rate: float,
    stamp_tax_rate: float,
    slippage_rate: float,
) -> tuple[float, float, str]:
    """Settle one opt-in cost calculation with a durable verified runtime Job."""
    configured = os.environ.get("ZOO_BACKTEST_RUNTIME_ROOT")
    if not configured or not Path(configured).is_absolute():
        raise ValueError("ZOO_BACKTEST_RUNTIME_ROOT must be an external absolute directory")
    root = Path(configured).resolve()
    root.mkdir(parents=True, exist_ok=True)
    reference = _store_frame(
        root / "artifacts", frame, root / f"{date}-{variant}-accounting.parquet"
    )
    request = {
        "schema_version": 4,
        "idempotency_key": "",
        "backend": "native.trade_accounting",
        "evidence_tier": "diagnostic",
        "inputs": {"accounting_ref": reference},
        "config": {
            "commission_rate": commission_rate,
            "stamp_tax_rate": stamp_tax_rate,
            "slippage_rate": slippage_rate,
        },
        "execution": {},
        "budgets": {"wall_seconds": 120, "memory_mb": 8192},
    }
    fingerprint = hashlib.sha256(json.dumps(request, sort_keys=True).encode()).hexdigest()[:24]
    request["idempotency_key"] = f"zoo-cost-{date}-{variant}-{fingerprint}"
    manifest = root / f"{date}-{variant}-accounting-request.json"
    manifest.write_text(json.dumps(request, ensure_ascii=False, sort_keys=True) + "\n")
    receipt = _runtime_command(root, "submit", str(manifest))
    job_id = str(receipt["job_id"])
    deadline = time.monotonic() + 130
    while time.monotonic() < deadline:
        status = _runtime_command(root, "status", job_id)
        if status["status"] == "SUCCEEDED":
            verified = _runtime_command(root, "result", job_id)
            if verified.get("backend") != "native.trade_accounting":
                raise ValueError("unexpected trade accounting runtime backend")
            summary = verified["summary"]
            return float(summary["turnover"]), float(summary["total_cost"]), job_id
        if status["status"] in {"FAILED", "CANCELLED"}:
            raise RuntimeError(f"backtest job {job_id} {status['status']}: {status['error_code']}")
        time.sleep(0.1)
    raise TimeoutError(f"backtest job {job_id} did not finish within its budget")
