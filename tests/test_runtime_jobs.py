"""The public Zoo diagnostic runs through the durable runtime worker."""

from __future__ import annotations

import json
import runpy
import subprocess
import sys
from dataclasses import asdict
from importlib import import_module
from pathlib import Path
from types import SimpleNamespace

import pandas as pd
import pytest

from zoo_index.runtime_jobs import (
    publish_verified_frames,
    run_sequenced_job,
    run_trade_accounting_job,
)

DIAGNOSTIC_SCRIPT = Path(__file__).resolve().parents[1] / "scripts/diagnose_runtime_dependencies.py"


def test_runtime_dependency_diagnostic_cli_reports_actual_environment() -> None:
    result = subprocess.run(
        [sys.executable, str(DIAGNOSTIC_SCRIPT)], capture_output=True, text=True, check=False
    )
    assert result.returncode == 0, result.stderr
    report = json.loads(result.stdout)
    assert report["python_executable"] == sys.executable
    assert set(report["packages"]) == {
        "quant-backtest-runtime",
        "quant-platform",
        "research-contracts",
    }


def test_runtime_dependency_diagnostic_reports_commit_without_source_credentials(
    monkeypatch,
) -> None:
    diagnostic = runpy.run_path(str(DIAGNOSTIC_SCRIPT))
    source = json.dumps(
        {
            "url": "https://user:private-token@example.invalid/package.git?token=secret",
            "vcs_info": {"vcs": "git", "commit_id": "a" * 40, "requested_revision": "release"},
        }
    )
    distribution = SimpleNamespace(version="0.1.0", read_text=lambda _name: source)
    monkeypatch.setattr(diagnostic["metadata"], "distribution", lambda _name: distribution)
    monkeypatch.setattr(
        diagnostic["util"], "find_spec", lambda _name: SimpleNamespace(origin="/tmp/runtime.py")
    )
    report = diagnostic["dependency_provenance"]("example", "runtime")
    assert report["commit_id"] == "a" * 40
    assert report["requested_revision"] == "release"
    assert report["module_path"] == "/tmp/runtime.py"
    assert "private-token" not in json.dumps(report)
    assert "secret" not in json.dumps(report)


@pytest.mark.parametrize("source", ["{", "[]", '{"vcs_info": null}'])
def test_runtime_dependency_diagnostic_identifies_invalid_metadata(monkeypatch, source) -> None:
    diagnostic = runpy.run_path(str(DIAGNOSTIC_SCRIPT))
    distribution = SimpleNamespace(version="0.1.0", read_text=lambda _name: source)
    monkeypatch.setattr(diagnostic["metadata"], "distribution", lambda _name: distribution)
    report = diagnostic["dependency_provenance"]("example", "missing_runtime_fixture")
    assert report["install_source"] == "invalid_metadata"
    assert report["version"] == "0.1.0"
    assert report["commit_id"] is None


@pytest.mark.parametrize("module_exists", [False, True])
def test_runtime_dependency_diagnostic_reports_missing_package_without_importing(
    monkeypatch, tmp_path, module_exists
) -> None:
    diagnostic = runpy.run_path(str(DIAGNOSTIC_SCRIPT))
    module = tmp_path / "optional_runtime_fixture.py"
    if module_exists:
        module.write_text("raise RuntimeError('diagnostics must not import this module')\n")
    monkeypatch.syspath_prepend(str(tmp_path))

    def missing(_name):
        raise diagnostic["metadata"].PackageNotFoundError("example")

    monkeypatch.setattr(diagnostic["metadata"], "distribution", missing)
    report = diagnostic["dependency_provenance"]("example", "optional_runtime_fixture")
    assert report["install_source"] == (
        "missing_distribution_metadata" if module_exists else "not_installed"
    )
    assert report["module_path"] == (str(module) if module_exists else None)
    assert report["version"] is None


def test_opt_in_cost_job_requires_external_runtime_root(monkeypatch) -> None:
    monkeypatch.delenv("ZOO_BACKTEST_RUNTIME_ROOT", raising=False)
    with pytest.raises(ValueError, match="ZOO_BACKTEST_RUNTIME_ROOT"):
        run_trade_accounting_job(
            "20260105",
            "strict",
            pd.DataFrame(),
            commission_rate=0.0,
            stamp_tax_rate=0.0,
            slippage_rate=0.0,
        )


def test_sequenced_job_publishes_verified_daily_ledger(tmp_path) -> None:
    pytest.importorskip("backtest_runtime")
    execution_sim = import_module("portfolio_backtester.execution_sim")

    positions = pd.DataFrame(
        {
            "rebalance_date": ["20260102"],
            "entry_date": ["20260105"],
            "symbol": ["AAA"],
            "weight": [1.0],
        }
    )
    pricing = pd.DataFrame(
        {
            "trade_date": ["20260105", "20260106"],
            "symbol": ["AAA", "AAA"],
            "adjusted_close": [100.0, 105.0],
            "amount": [10_000_000.0] * 2,
            "tradable": [True, True],
        }
    )
    clocks = {
        "20260102": {
            "schema_version": "research.clock.v1",
            "timezone": "Asia/Shanghai",
            "information_cutoff_at": "2026-01-02T20:00:00+08:00",
            "signal_at": "2026-01-02T20:01:00+08:00",
            "decision_at": "2026-01-02T20:02:00+08:00",
            "earliest_order_at": "2026-01-05T09:30:00+08:00",
            "execution_window_start_at": "2026-01-05T09:30:00+08:00",
            "execution_window_end_at": "2026-01-05T15:00:00+08:00",
            "valuation_at": "2026-01-06T16:00:00+08:00",
            "timing_policy_id": "synthetic.next-session.v1",
            "trading_calendar_ref": "synthetic-calendar",
        }
    }
    config = execution_sim.ExecutionSimConfig(
        enabled=True,
        portfolio_value=100_000.0,
        participation_rate=1.0,
        liquidity_cols=("amount",),
    )
    result_dir, receipt = run_sequenced_job(
        tmp_path / "runtime",
        "strict",
        positions,
        pricing,
        clocks,
        asdict(config),
        enforce_limits=False,
    )
    destination = tmp_path / "published"
    publish_verified_frames(result_dir, destination)
    daily = pd.read_parquet(destination / "daily_ledger.parquet")
    assert not daily.empty
    assert daily.nav.iloc[-1] > 0
    assert len(receipt["request_sha256"]) == 64
    assert len(receipt["result_sha256"]) == 64


def test_installed_runtime_binds_completion_to_submitted_job(tmp_path) -> None:
    """The pinned formal dependency must reject a different job's result URI."""
    jobs = pytest.importorskip("backtest_runtime.jobs")
    store_module = import_module("backtest_runtime.store")
    store = store_module.JobStore(tmp_path / "jobs.sqlite")
    try:
        service = jobs.BacktestJobService(
            store, artifact_root=tmp_path / "artifacts", result_root=tmp_path / "results"
        )
        request = jobs.BacktestJobRequest.from_mapping(
            {
                "schema_version": 4,
                "idempotency_key": "zoo-binding-contract",
                "backend": "native.trade_accounting",
                "evidence_tier": "diagnostic",
                "inputs": {"accounting_ref": "artifact://sha256/" + "a" * 64},
                "config": {"commission_rate": 0.0, "stamp_tax_rate": 0.0, "slippage_rate": 0.0},
                "execution": {},
                "budgets": {"wall_seconds": 120, "memory_mb": 8192},
            }
        )
        receipt = service.submit(request)
        service.claim(receipt.job_id, worker_pid=1234, lease_seconds=60)
        with pytest.raises(ValueError, match="result_ref must match the completed job"):
            service.complete(
                receipt.job_id,
                result_ref="backtest-job://00000000-0000-0000-0000-000000000000",
                result_sha256="e" * 64,
            )
        assert service.get_status(receipt.job_id).status == "RUNNING"
        completed = service.complete(
            receipt.job_id,
            result_ref=f"backtest-job://{receipt.job_id}",
            result_sha256="e" * 64,
        )
        assert completed.status == "SUCCEEDED"
    finally:
        store.close()


def test_trade_accounting_job_uses_pinned_runtime_cli(tmp_path, monkeypatch) -> None:
    pytest.importorskip("backtest_runtime")
    monkeypatch.setenv("ZOO_BACKTEST_RUNTIME_ROOT", str(tmp_path / "runtime"))
    frame = pd.DataFrame(
        {
            "symbol": ["A", "B"],
            "previous_weight": [0.5, 0.5],
            "target_weight": [0.5, 0.5],
            "previous_price": [10.0, 10.0],
            "current_price": [20.0, 10.0],
            "tradable": [True, True],
        }
    )
    turnover, cost, job_id = run_trade_accounting_job(
        "20260105",
        "strict",
        frame,
        commission_rate=0.001,
        stamp_tax_rate=0.005,
        slippage_rate=0.002,
    )
    assert turnover == pytest.approx(1 / 6)
    assert cost == pytest.approx(1 / 3000 + 1 / 1200 + 1 / 1500)
    assert (tmp_path / "runtime" / "results" / job_id / "accounting.parquet").is_file()
