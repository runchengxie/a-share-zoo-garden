"""CLI presentation options must be explicit and default to disabled."""

import os
import subprocess
import sys
from pathlib import Path

import pytest
import yaml

from zoo_index.cli import _parse_args, build_run_config


@pytest.mark.parametrize("enabled", [False, True])
def test_chart_flag_reaches_run_config(monkeypatch, enabled) -> None:
    argv = ["zoo-index", "--token", "dummy"]
    if enabled:
        argv.append("--chart")
    monkeypatch.setattr("sys.argv", argv)
    config = build_run_config(_parse_args(), Path(__file__).resolve().parent.parent)
    assert config is not None
    assert config.chart is enabled


def test_default_cli_does_not_import_plotting_library() -> None:
    source = Path(__file__).resolve().parent.parent / "src"
    result = subprocess.run(
        [
            sys.executable,
            "-c",
            "import sys; import zoo_index.cli; assert 'matplotlib' not in sys.modules",
        ],
        env={**os.environ, "PYTHONPATH": str(source)},
        capture_output=True,
        text=True,
        check=False,
    )
    assert result.returncode == 0, result.stderr


@pytest.mark.parametrize("enabled", [False, True])
def test_daily_workflow_forwards_chart_option(tmp_path, enabled) -> None:
    root = Path(__file__).resolve().parent.parent
    workflow = yaml.load((root / ".github/workflows/daily.yml").read_text(), Loader=yaml.BaseLoader)
    assert workflow["on"]["workflow_dispatch"]["inputs"]["chart"]["default"] == "false"
    steps = workflow["jobs"]["build-and-deploy"]["steps"]
    fonts = next(step for step in steps if step.get("name") == "Install chart fonts")
    assert "inputs.chart == true" in fonts["if"]
    computations = [step for step in steps if step.get("name", "").startswith("Compute ")]
    assert len(computations) == 2
    capture = tmp_path / "arguments.txt"
    for step in computations:
        subprocess.run(
            ["bash", "-eu", "-c", 'uv() { printf "%s\n" "$@" > "$CAPTURE"; }\n' + step["run"]],
            env={
                **os.environ,
                "CAPTURE": str(capture),
                "GENERATE_CHART": str(enabled).lower(),
                "BACKFILL_DAYS": "1",
                "BACKFILL_MODE": "missing",
            },
            check=True,
        )
        assert ("--chart" in capture.read_text().splitlines()) is enabled
