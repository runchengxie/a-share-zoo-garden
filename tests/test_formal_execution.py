from __future__ import annotations

import pandas as pd
import pytest

from zoo_index.formal_execution import _clock, _iso, _pricing


def test_each_target_clock_starts_execution_on_the_next_session() -> None:
    clock = _clock("20251222", "20251223", "20260904")
    assert clock["information_cutoff_at"] == "2025-12-22T20:00:00+08:00"
    assert clock["earliest_order_at"] == "2025-12-23T09:30:00+08:00"
    with pytest.raises(ValueError, match="YYYYMMDD"):
        _iso("2025-12-22")


class _SuspendedClient:
    def get_daily(self, day: str) -> pd.DataFrame:
        return pd.DataFrame({"ts_code": ["A.SZ"], "close": [5.0], "amount": [1000.0]})

    def get_adj_factor(self, day: str) -> pd.DataFrame:
        return pd.DataFrame({"ts_code": ["A.SZ"], "adj_factor": [2.0]})

    def get_suspension(self, day: str) -> pd.DataFrame:
        return pd.DataFrame({"ts_code": ["A.SZ"]})


def test_pricing_uses_adjusted_mark_and_blocks_suspended_trades() -> None:
    pricing = _pricing(_SuspendedClient(), ["20251223"], {"A.SZ"})
    assert pricing.loc[0, "adjusted_close"] == 10.0
    assert not bool(pricing.loc[0, "tradable"])


def test_optional_published_limits_block_unknown_inputs(tmp_path) -> None:
    folder = tmp_path / "data" / "trade_date=20251223"
    folder.mkdir(parents=True)
    pd.DataFrame({"ts_code": ["A.SZ"], "up_limit": [5.0], "down_limit": [4.0]}).to_parquet(
        folder / "part.parquet"
    )
    pricing = _pricing(_SuspendedClient(), ["20251223"], {"A.SZ"}, tmp_path)
    assert bool(pricing.loc[0, "limit_up"])

    pd.DataFrame({"ts_code": ["A.SZ"], "up_limit": [None], "down_limit": [4.0]}).to_parquet(
        folder / "part.parquet"
    )
    with pytest.raises(ValueError, match="unknown daily price limits"):
        _pricing(_SuspendedClient(), ["20251223"], {"A.SZ"}, tmp_path)
