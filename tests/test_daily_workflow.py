from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def test_daily_workflow_allows_manual_full_backfill() -> None:
    workflow = (ROOT / ".github/workflows/daily.yml").read_text(encoding="utf-8")

    assert "backfill_mode:" in workflow
    assert "default: missing" in workflow
    assert "backfill_days:" in workflow
    assert 'default: "1"' in workflow
    assert "BACKFILL_MODE: ${{ inputs.backfill_mode || 'missing' }}" in workflow
    assert "BACKFILL_DAYS: ${{ inputs.backfill_days || '1' }}" in workflow
    assert '--backfill "$BACKFILL_DAYS" --backfill-mode "$BACKFILL_MODE"' in workflow


def test_cloudflare_follows_successful_daily_publication() -> None:
    import yaml

    path = ROOT / ".github/workflows/deploy-cloudflare.yml"
    workflow = yaml.load(path.read_text(), Loader=yaml.BaseLoader)
    trigger = workflow["on"]["workflow_run"]
    assert trigger["workflows"] == ["zoo-index-daily"]
    assert trigger["types"] == ["completed"]
    assert trigger["branches"] == ["main"]
    condition = workflow["jobs"]["deploy"]["if"]
    assert "conclusion == 'success'" in condition
    assert "head_repository.full_name == github.repository" in condition
    assert workflow["concurrency"]["cancel-in-progress"] == "false"
    checkout = workflow["jobs"]["deploy"]["steps"][0]
    assert checkout["with"]["ref"] == "main"
