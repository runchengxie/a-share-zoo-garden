import json
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

import pandas as pd
import pytest

from zoo_index.association_live import collect_observation, write_unavailable

ROOT = Path(__file__).resolve().parents[1]


class Source:
    def get_trade_calendar_range(self, start_date, end_date):
        dates = pd.date_range(start_date, end_date)
        return pd.DataFrame(
            {"cal_date": dates.strftime("%Y%m%d"), "is_open": [int(d.weekday() < 5) for d in dates]}
        )

    def get_daily(self, day):
        entries = json.loads(
            (ROOT / "published/association-study/cohort-20261104/sample.json").read_bytes()
        )["entries"]
        return pd.DataFrame([{"ts_code": e["ts_code"], "close": 10.0} for e in entries])

    def get_adj_factor(self, day):
        return self.get_daily(day).rename(columns={"close": "adj_factor"})

    def get_fund_daily(self, day, code):
        return pd.DataFrame([{"ts_code": code, "close": 4.0}])

    def get_fund_adj(self, day, code):
        return pd.DataFrame([{"ts_code": code, "adj_factor": 2.0}])


def collect(source=None, now="2026-11-04T12:00:00+08:00"):
    return collect_observation(ROOT, source or Source(), datetime.fromisoformat(now))


def test_registered_before_baseline_checks_prior_completed_day_without_returns():
    report = collect()
    assert report["as_of"] == "2026-11-03"
    assert report["scheduled_baseline"] == "2026-11-05"
    assert report["input_check"]["complete_stocks"] == 11
    assert report["input_check"]["benchmark_complete"] is True
    assert [e["status"] for e in report["entries"]].count("awaiting_baseline") == 11
    assert [e["status"] for e in report["entries"]].count("not_confirmed_at_freeze") == 2
    assert "stock_return" not in json.dumps(report)


def test_matured_windows_reuse_engine_and_fund_adjustments():
    report = collect(now="2026-11-06T17:00:00+08:00")
    window = report["entries"][0]["windows"][0]
    assert window["status"] == "observed"
    assert window["stock_return"] == 0
    assert window["benchmark_return"] == 0
    assert report["entries"][0]["windows"][1]["status"] == "not_matured"


def test_missing_etf_factor_is_not_replaced_by_one():
    class Missing(Source):
        def get_fund_adj(self, day, code):
            return pd.DataFrame(
                {"ts_code": pd.Series(dtype="object"), "adj_factor": pd.Series(dtype="float64")}
            )

    report = collect(Missing(), now="2026-11-06T17:00:00+08:00")
    assert report["input_check"]["benchmark_complete"] is False
    assert report["entries"][0]["windows"][0]["status"] == "missing_prices"


def test_weekend_uses_last_complete_session_and_timezone_is_explicit():
    report = collect(now="2026-11-08T10:00:00+08:00")
    assert report["as_of"] == "2026-11-06"
    with pytest.raises(ValueError, match="timezone"):
        collect_observation(ROOT, Source(), datetime(2026, 11, 4))


def test_unavailable_snapshot_contains_no_provider_exception(tmp_path):
    target = tmp_path / "snapshot.json"
    write_unavailable(target, datetime(2026, 11, 4, tzinfo=ZoneInfo("Asia/Shanghai")))
    data = json.loads(target.read_text())
    assert data["status"] == "unavailable"
    assert data["entries"] == []
    assert "error" not in data


def test_duplicate_provider_rows_fail_instead_of_reweighting():
    class Duplicate(Source):
        def get_daily(self, day):
            frame = super().get_daily(day)
            return pd.concat([frame, frame.iloc[:1]])

    with pytest.raises(pd.errors.MergeError):
        collect(Duplicate())


def test_provider_errors_and_absent_credentials_are_sanitized(tmp_path, monkeypatch, capsys):
    from zoo_index.association_live import main

    monkeypatch.delenv("TUSHARE_TOKEN", raising=False)
    path = tmp_path / "public.json"
    assert main(["--runtime-dir", str(tmp_path / "runtime"), "--public-output", str(path)]) == 1
    assert json.loads(path.read_text())["status"] == "unavailable"
    output = capsys.readouterr().out
    assert "Traceback" not in output
    assert "http" not in output


def test_frozen_sample_and_protocol_hashes_match_verified_registration():
    import hashlib

    receipt = json.loads((ROOT / "published/data/association_registration.json").read_bytes())
    frozen = ROOT / "published/association-study/cohort-20261104"
    for key in ["sample", "protocol"]:
        assert (
            hashlib.sha256((frozen / f"{key}.json").read_bytes()).hexdigest()
            == receipt[f"{key}_sha256"]
        )
    assert receipt["protocol_published_at"] == "2026-11-04T02:48:15Z"


def test_failed_provider_request_retains_only_safe_stage_code(tmp_path, monkeypatch, capsys):
    import zoo_index.association_live as module

    class Broken(Source):
        def get_fund_adj(self, day, code):
            raise RuntimeError("https://private-provider.invalid?token=do-not-publish")

    monkeypatch.setenv("TUSHARE_TOKEN", "synthetic-token")
    monkeypatch.setattr(module, "TushareClient", lambda *args, **kwargs: Broken())
    path = tmp_path / "public.json"
    assert (
        module.main(["--runtime-dir", str(tmp_path / "runtime"), "--public-output", str(path)]) == 1
    )
    data = path.read_text()
    assert json.loads(data)["failure_stage"] == "get_fund_adj"
    assert "do-not-publish" not in data + capsys.readouterr().out
    assert "private-provider" not in data


def test_cli_connects_existing_backup_only_as_secondary_source(tmp_path, monkeypatch):
    import zoo_index.association_live as module

    monkeypatch.setenv("TUSHARE_TOKEN", "synthetic-primary")
    monkeypatch.setenv("TUSHARE_TOKEN_2", "synthetic-secondary")
    monkeypatch.setenv("TUSHARE_API_URL", "https://backup.example.invalid")
    seen = {}

    def factory(token, **kwargs):
        seen.update(token=token, **kwargs)
        return Source()

    monkeypatch.setattr(module, "TushareClient", factory)
    path = tmp_path / "public.json"
    assert (
        module.main(["--runtime-dir", str(tmp_path / "runtime"), "--public-output", str(path)]) == 0
    )
    assert json.loads(path.read_text())["status"] == "registered_observation"
    assert seen["token2"] == "synthetic-secondary"
    assert seen["api_url2"] == "https://backup.example.invalid"
    assert "api_url" not in seen
