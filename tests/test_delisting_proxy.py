import pandas as pd

from zoo_index.index import PortfolioState, VariantState
from zoo_index.runner import _apply_delisting_proxy


def _state() -> PortfolioState:
    empty = pd.DataFrame(columns=pd.Index(["ts_code", "name", "keyword", "forced"]))
    variant = VariantState(
        weights={"600599.SH": 1.0},
        constituents=empty,
        reason="test",
        last_marks={"600599.SH": (0.43, 2.205)},
    )
    return PortfolioState("20260625", variant, variant)


def test_last_price_proxy_adds_zero_return_delisting_mark() -> None:
    daily = pd.DataFrame({"ts_code": ["000001.SZ"], "close": [10.0], "amount": [1.0]})
    factors = pd.DataFrame({"ts_code": ["000001.SZ"], "adj_factor": [1.0]})
    basic = pd.DataFrame({"ts_code": ["600599.SH"], "delist_date": ["20260626"]})

    proxy_daily, proxy_factors = _apply_delisting_proxy(
        daily, factors, basic, "20260626", _state(), "last_price_proxy"
    )

    row = proxy_daily.loc[proxy_daily.ts_code.eq("600599.SH")].iloc[0]
    assert row.close == 0.43
    assert row.amount == 0.0
    assert proxy_factors.loc[proxy_factors.ts_code.eq("600599.SH"), "adj_factor"].iloc[0] == 2.205


def test_strict_policy_keeps_missing_delisting_unpriced() -> None:
    daily = pd.DataFrame({"ts_code": ["000001.SZ"], "close": [10.0], "amount": [1.0]})
    factors = pd.DataFrame({"ts_code": ["000001.SZ"], "adj_factor": [1.0]})
    basic = pd.DataFrame({"ts_code": ["600599.SH"], "delist_date": ["20260626"]})

    strict_daily, strict_factors = _apply_delisting_proxy(
        daily, factors, basic, "20260626", _state(), "strict"
    )

    assert "600599.SH" not in set(strict_daily.ts_code)
    assert "600599.SH" not in set(strict_factors.ts_code)
