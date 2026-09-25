from __future__ import annotations

import os
import time
from pathlib import Path

import pandas as pd
import pytest

from zoo_index.data_sources.tushare import TushareClient


def _client(
    tmp_path: Path, reference_cache_ttl: int = 60, force_refresh: bool = False
) -> TushareClient:
    return TushareClient(
        "dummy-token",
        cache_dir=tmp_path,
        use_cache=True,
        force_refresh=force_refresh,
        reference_cache_ttl=reference_cache_ttl,
    )


def test_reference_cache_expires_after_ttl(tmp_path: Path) -> None:
    client = _client(tmp_path, reference_cache_ttl=60)
    path = tmp_path / "stock_basic.parquet"
    pd.DataFrame({"ts_code": ["000001.SZ"]}).to_parquet(path, index=False)

    # 新鲜缓存（带 TTL）命中。
    assert client._read_cache(path, ttl=60) is not None

    # 把修改时间往前推 100 秒，超过 TTL，应视为过期。
    old = time.time() - 100
    os.utime(path, (old, old))
    assert client._read_cache(path, ttl=60) is None

    # 不带 TTL 的永久缓存不受修改时间影响。
    assert client._read_cache(path) is not None


def test_force_refresh_ignores_cache(tmp_path: Path) -> None:
    client = _client(tmp_path, force_refresh=True)
    path = tmp_path / "namechange.parquet"
    pd.DataFrame({"ts_code": ["000001.SZ"]}).to_parquet(path, index=False)
    assert client._read_cache(path, ttl=60) is None


def test_missing_cache_file_returns_none(tmp_path: Path) -> None:
    client = _client(tmp_path)
    assert client._read_cache(tmp_path / "missing.parquet", ttl=60) is None


def test_namechange_fetches_all_pages_and_replaces_truncated_cache(tmp_path: Path) -> None:
    client = _client(tmp_path)
    old = pd.DataFrame({"ts_code": [f"{n:06d}.SZ" for n in range(10000)], "name": ["旧名"] * 10000})
    old.to_parquet(tmp_path / "namechange.parquet", index=False)
    calls: list[int] = []

    def fake_api(method: str, **kwargs: object) -> pd.DataFrame:
        assert method == "namechange"
        offset = kwargs["offset"]
        assert isinstance(offset, int)
        calls.append(offset)
        if offset == 0:
            return pd.DataFrame(
                {
                    "ts_code": [f"{n:06d}.SZ" for n in range(10000)],
                    "name": ["新名"] * 10000,
                    "start_date": ["20200101"] * 10000,
                    "end_date": [None] * 10000,
                }
            )
        return pd.DataFrame(
            {
                "ts_code": ["999999.SZ"],
                "name": ["补页"],
                "start_date": ["20200101"],
                "end_date": [None],
            }
        )

    client._api = fake_api  # ty: ignore[invalid-assignment]
    result = client.get_namechange()
    assert calls == [0, 10000]
    assert len(result) == 10001
    assert len(pd.read_parquet(tmp_path / "namechange.parquet")) == 10001


def test_namechange_repairs_missing_20061009_interval(tmp_path: Path) -> None:
    client = _client(tmp_path)
    calls: list[str] = []

    def fake_api(method: str, **kwargs: object) -> pd.DataFrame:
        assert method == "namechange"
        code = kwargs.get("ts_code")
        if code is None:
            return pd.DataFrame(
                [
                    {
                        "ts_code": "600336.SH",
                        "name": "G澳柯玛",
                        "start_date": "20051212",
                        "end_date": "20061008",
                    }
                ]
            )
        assert isinstance(code, str)
        calls.append(code)
        return pd.DataFrame(
            [{"ts_code": code, "name": "澳柯玛", "start_date": "20061009", "end_date": None}]
        )

    client._api = fake_api  # ty: ignore[invalid-assignment]
    result = client.get_namechange()
    assert calls == ["600336.SH"]
    assert len(result) == 2
    assert (result["start_date"] == "20061009").any()
    assert len(client.get_namechange()) == 2
    assert calls == ["600336.SH"]


class _FakePro:
    def __init__(self, tag: str) -> None:
        self.tag = tag

    def daily(self, **kwargs: object) -> pd.DataFrame:
        if self.tag == "primary":
            raise RuntimeError("quota exceeded")
        return pd.DataFrame({"ts_code": ["000001.SZ"]})


def test_fallback_uses_token2_when_primary_fails(tmp_path: Path) -> None:
    import zoo_index.data_sources.tushare as tushare_mod

    primary = _FakePro("primary")
    secondary = _FakePro("secondary")
    state = {"n": 0}

    def fake_pro_api(token: str = "", timeout: int = 30) -> object:
        state["n"] += 1
        return primary if state["n"] == 1 else secondary

    original = tushare_mod.ts.pro_api
    tushare_mod.ts.pro_api = fake_pro_api  # ty: ignore[invalid-assignment]
    try:
        client = TushareClient(
            "primary-token",
            cache_dir=tmp_path,
            token2="secondary-token",
            api_url2="https://example.com",
        )
        df = client._api("daily", ts_code="000001.SZ")
        # 主 Token 抛错，应回退到备用 Token 拿到数据。
        assert not df.empty
        assert df.iloc[0]["ts_code"] == "000001.SZ"
    finally:
        tushare_mod.ts.pro_api = original


def test_no_fallback_reraises_when_primary_fails(tmp_path: Path) -> None:
    import zoo_index.data_sources.tushare as tushare_mod

    def fake_pro_api(token: str = "", timeout: int = 30) -> object:
        return _FakePro("primary")

    original = tushare_mod.ts.pro_api
    tushare_mod.ts.pro_api = fake_pro_api  # ty: ignore[invalid-assignment]
    try:
        client = TushareClient("primary-token", cache_dir=tmp_path)
        with pytest.raises(RuntimeError):
            client._api("daily")
    finally:
        tushare_mod.ts.pro_api = original


def test_get_suspension_calls_suspend_d_and_caches(tmp_path: Path) -> None:
    import zoo_index.data_sources.tushare as tushare_mod

    class _SuspPro:
        def suspend_d(self, **kwargs: object) -> pd.DataFrame:
            return pd.DataFrame(
                {"ts_code": ["000001.SZ"], "suspend_date": ["20240102"], "suspend_type": "S"}
            )

    original = tushare_mod.ts.pro_api
    tushare_mod.ts.pro_api = lambda token="", timeout=30: _SuspPro()  # ty: ignore[invalid-assignment]
    try:
        client = TushareClient("token", cache_dir=tmp_path)
        df = client.get_suspension("20240102")
        assert not df.empty
        assert df.iloc[0]["ts_code"] == "000001.SZ"
        assert (tmp_path / "suspension" / "20240102.parquet").exists()
    finally:
        tushare_mod.ts.pro_api = original
