from pathlib import Path

import pandas as pd
import yaml

from zoo_index.config import load_rules_asof
from zoo_index.rule_comparison import OfflineCacheClient, build_scenarios


def test_comparison_starts_executable_modes_at_first_known_rule(tmp_path: Path) -> None:
    rules_path = tmp_path / "rules.yml"
    rules_path.write_text(
        yaml.safe_dump(
            {"theme": "animal", "effective_from": "20260925", "strict_keywords": ["熊猫"]},
            allow_unicode=True,
        ),
        encoding="utf-8",
    )
    (tmp_path / "rules_history.yml").write_text(
        yaml.safe_dump(
            [{"effective_from": "20251222", "rules": {"strict_keywords": ["海豚"]}}],
            allow_unicode=True,
        ),
        encoding="utf-8",
    )
    scenarios = build_scenarios(rules_path, tmp_path / "results", "20210101")
    assert [(scenario.name, scenario.start_date) for scenario in scenarios] == [
        ("historical_rules", "20251222"),
        ("frozen_first_known", "20251222"),
        ("frozen_current_backcast", "20210101"),
    ]
    assert load_rules_asof("20260601", scenarios[0].rules_path).strict_keywords == ("海豚",)
    assert load_rules_asof("20261001", scenarios[1].rules_path).strict_keywords == ("海豚",)
    assert load_rules_asof("20210101", scenarios[2].rules_path).strict_keywords == ("熊猫",)


def test_offline_client_rejects_missing_daily_cache(tmp_path: Path) -> None:
    calendar = tmp_path / "nav.csv"
    pd.DataFrame({"date": ["20251222"]}).to_csv(calendar, index=False)
    client = OfflineCacheClient(tmp_path / "cache", calendar)
    assert client.get_trade_calendar_range("20251201", "20251231").cal_date.tolist() == ["20251222"]
    try:
        client.get_daily("20251222")
    except FileNotFoundError as error:
        assert "20251222.parquet" in str(error)
    else:
        raise AssertionError("missing cache was accepted")
