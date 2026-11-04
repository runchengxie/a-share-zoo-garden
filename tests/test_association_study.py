import hashlib
import json

import pandas as pd
import pytest

from zoo_index.association_study import build_study


def inputs():
    snapshot = json.dumps(
        {
            "entries": [
                {
                    "id": "a",
                    "ts_code": "002086.SZ",
                    "status": "confirmed",
                    "reviewed_at": "2026-11-04T09:00:00+08:00",
                    "events": [{"status": "confirmed", "at": "2026-11-04T09:00:00+08:00"}],
                }
            ]
        }
    ).encode()
    protocol = json.dumps(
        {"version": "association-study.v1", "benchmark": "510300.SH", "horizons": [1, 5, 20]}
    ).encode()
    registration = {
        "sample_sha256": hashlib.sha256(snapshot).hexdigest(),
        "protocol_sha256": hashlib.sha256(protocol).hexdigest(),
        "sample_published_at": "2026-11-04T10:18:40+08:00",
        "protocol_published_at": "2026-11-04T12:00:00+08:00",
        "evidence_url": "https://github.com/runchengxie/a-share-zoo-garden/actions/runs/123",
    }
    dates = pd.date_range("2026-11-04", "2026-12-10")
    calendar = pd.DataFrame(
        {"cal_date": dates.strftime("%Y-%m-%d"), "is_open": [int(d.weekday() < 5) for d in dates]}
    )
    open_days = calendar.loc[calendar.is_open == 1, "cal_date"].tolist()
    prices = pd.DataFrame(
        [
            {
                "trade_date": d,
                "ts_code": code,
                "close": 10 + i if code == "002086.SZ" else 10,
                "adj_factor": 2 if code == "002086.SZ" and i > 1 else 1,
            }
            for i, d in enumerate(open_days)
            for code in ["002086.SZ", "510300.SH"]
        ]
    )
    return snapshot, protocol, registration, calendar, prices


def run(as_of="2026-12-10", **changes):
    names = ["sample", "protocol", "registration", "calendar", "prices"]
    args = dict(zip(names, inputs(), strict=True))
    args.update(changes)
    return build_study(**args, as_of=as_of)


def test_registration_and_hashes_gate_all_returns():
    report = run(registration=None)
    assert report["status"] == "awaiting_registration"
    assert "return" not in json.dumps(report)
    receipt = inputs()[2]
    receipt["sample_sha256"] = "wrong"
    with pytest.raises(ValueError, match="hash"):
        run(registration=receipt)


def test_next_trading_close_and_exact_horizons_adjusted_excess():
    row = run()["entries"][0]
    assert row["baseline_date"] == "2026-11-05"
    assert [w["horizon"] for w in row["windows"]] == [1, 5, 20]
    first = row["windows"][0]
    assert first["end_date"] == "2026-11-06"
    assert first["stock_return"] == pytest.approx(24 / 11 - 1)
    assert first["benchmark_return"] == 0
    assert first["excess_return"] == first["stock_return"]
    assert row["windows"][1]["end_date"] == "2026-11-12"
    assert row["windows"][2]["end_date"] == "2026-12-03"


def test_future_endpoint_does_not_use_available_future_prices():
    row = run(as_of="2026-11-05")["entries"][0]
    assert all(w["status"] == "not_matured" for w in row["windows"])
    assert all("stock_return" not in w for w in row["windows"])


@pytest.mark.parametrize("missing_date", ["2026-11-05", "2026-11-09"])
def test_missing_baseline_or_interior_price_does_not_shift_or_fill(missing_date):
    prices = inputs()[4]
    prices = prices[~((prices.ts_code == "002086.SZ") & (prices.trade_date == missing_date))]
    row = run(prices=prices)["entries"][0]
    assert row["baseline_date"] == "2026-11-05"
    assert row["windows"][1]["status"] == "missing_prices"
    assert "stock_return" not in row["windows"][1]


@pytest.mark.parametrize("status", ["pending", "expired"])
def test_unconfirmed_records_are_retained_without_returns(status):
    sample, _, receipt, _, _ = inputs()
    data = json.loads(sample)
    data["entries"][0]["status"] = status
    data["entries"][0]["events"][0]["status"] = status
    sample = json.dumps(data).encode()
    receipt["sample_sha256"] = hashlib.sha256(sample).hexdigest()
    row = run(sample=sample, registration=receipt)["entries"][0]
    assert row["status"] == "not_confirmed_at_freeze"


@pytest.mark.parametrize("bad", [0, -1, float("inf")])
def test_invalid_prices_fail_closed(bad):
    prices = inputs()[4]
    prices["close"] = prices["close"].astype(float)
    prices.loc[0, "close"] = bad
    with pytest.raises(ValueError, match="positive finite"):
        run(prices=prices)


def test_duplicate_prices_and_calendar_gaps_are_rejected():
    _, _, _, calendar, prices = inputs()
    with pytest.raises(ValueError, match="duplicate"):
        run(prices=pd.concat([prices, prices.iloc[:1]]))
    with pytest.raises(ValueError, match="calendar"):
        run(calendar=calendar.drop(index=3))


def test_publication_on_friday_uses_monday_close():
    receipt = inputs()[2]
    receipt["protocol_published_at"] = "2026-11-06T09:00:00+08:00"
    assert run(registration=receipt)["entries"][0]["baseline_date"] == "2026-11-09"


def test_holiday_and_later_protocol_publication_define_baseline():
    _, _, receipt, calendar, _ = inputs()
    receipt["protocol_published_at"] = "2026-11-06T16:00:00+08:00"
    calendar.loc[calendar.cal_date == "2026-11-09", "is_open"] = 0
    assert (
        run(registration=receipt, calendar=calendar)["entries"][0]["baseline_date"] == "2026-11-10"
    )


def test_mixed_post_publication_reviews_and_duplicate_ids_are_rejected():
    sample, _, receipt, _, _ = inputs()
    data = json.loads(sample)
    data["entries"][0]["events"][0]["at"] = "2026-11-05T09:00:00+08:00"
    sample = json.dumps(data).encode()
    receipt["sample_sha256"] = hashlib.sha256(sample).hexdigest()
    with pytest.raises(ValueError, match="after frozen"):
        run(sample=sample, registration=receipt)
    data["entries"].append(data["entries"][0])
    sample = json.dumps(data).encode()
    receipt["sample_sha256"] = hashlib.sha256(sample).hexdigest()
    with pytest.raises(ValueError, match="duplicate"):
        run(sample=sample, registration=receipt)


def test_naive_registration_timestamp_and_unknown_protocol_fail_closed():
    _, protocol, receipt, _, _ = inputs()
    receipt["protocol_published_at"] = "2026-11-04T12:00:00"
    with pytest.raises(ValueError, match="time zone"):
        run(registration=receipt)
    data = json.loads(protocol)
    data["horizons"] = [1, 3, 5]
    with pytest.raises(ValueError, match="unsupported"):
        run(protocol=json.dumps(data).encode())


def test_cli_writes_a_hashed_offline_manifest_outside_repository(tmp_path):
    from zoo_index.association_study import main

    sample, protocol, receipt, calendar, prices = inputs()
    (tmp_path / "sample.json").write_bytes(sample)
    (tmp_path / "protocol.json").write_bytes(protocol)
    (tmp_path / "receipt.json").write_text(json.dumps(receipt))
    calendar = pd.concat([pd.DataFrame([{"cal_date": "2026-11-03", "is_open": 1}]), calendar])
    calendar.to_csv(tmp_path / "calendar.csv", index=False)
    prices.to_csv(tmp_path / "prices.csv", index=False)
    args = []
    for key, filename in [
        ("sample", "sample.json"),
        ("protocol", "protocol.json"),
        ("calendar", "calendar.csv"),
        ("prices", "prices.csv"),
        ("registration", "receipt.json"),
    ]:
        args.extend([f"--{key}", str(tmp_path / filename)])
    args.extend(
        [
            "--as-of",
            "2026-11-03",
            "--input-source",
            "synthetic-test",
            "--output-dir",
            str(tmp_path / "out"),
        ]
    )
    assert main(args) == 0
    report = json.loads((tmp_path / "out/association_study.json").read_text())
    assert report["entries"][0]["status"] == "awaiting_baseline"
    assert len(report["input_hashes"]) == 5
    assert len(report["engine_sha256"]) == 64
    assert report["evidence_tier"] == "user_supplied_inputs_unverified"


def test_output_paths_inside_repositories_or_relative_paths_are_rejected(tmp_path):
    from zoo_index.association_study import _external_output

    with pytest.raises(ValueError, match="absolute"):
        _external_output("relative/output")
    repository = tmp_path / "repository"
    (repository / ".git").mkdir(parents=True)
    (repository / ".git/HEAD").write_text("ref: refs/heads/main\n")
    with pytest.raises(ValueError, match="outside Git"):
        _external_output(str(repository / "outputs"))
    alias = tmp_path / "alias"
    alias.symlink_to(repository, target_is_directory=True)
    with pytest.raises(ValueError, match="outside Git"):
        _external_output(str(alias / "outputs"))


def test_benchmark_missing_factor_and_adjusted_price_underflow_are_not_filled():
    prices = inputs()[4]
    prices.loc[prices.ts_code == "510300.SH", "adj_factor"] = float("nan")
    row = run(prices=prices)["entries"][0]
    assert all(w["status"] == "missing_prices" for w in row["windows"])
    prices = inputs()[4].astype({"close": float, "adj_factor": float})
    prices.loc[0, ["close", "adj_factor"]] = [1e-300, 1e-300]
    with pytest.raises(ValueError, match="positive finite"):
        run(prices=prices)


@pytest.mark.parametrize("asset", ["002086.SZ", "510300.SH"])
@pytest.mark.parametrize("field", ["close", "adj_factor"])
def test_blank_stock_or_etf_values_keep_the_cohort_with_missing_data(asset, field):
    prices = inputs()[4].astype({"close": float, "adj_factor": float})
    prices.loc[(prices.ts_code == asset) & (prices.trade_date == "2026-11-06"), field] = float(
        "nan"
    )
    row = run(prices=prices)["entries"][0]
    assert row["baseline_date"] == "2026-11-05"
    assert row["windows"][0]["status"] == "missing_prices"
    assert f"{asset}:2026-11-06" in row["windows"][0]["missing"]
