"""Validate that published research proxy outputs remain explicitly labelled."""

from __future__ import annotations

import json
from pathlib import Path


def _read(path: Path) -> dict[str, object]:
    with path.open(encoding="utf-8") as handle:
        value = json.load(handle)
    if not isinstance(value, dict):
        raise ValueError(f"{path} must contain a JSON object")
    return value


def main() -> int:  # noqa: C901
    root = Path(__file__).resolve().parents[1]
    data = root / "published" / "data"
    metadata = _read(data / "metadata.json")
    audit = _read(data / "delisting_audit.json")
    provenance = _read(data / "provenance.json")
    if metadata.get("evidence_tier") != "research_proxy":
        raise SystemExit("animal metadata must declare evidence_tier=research_proxy")
    if metadata.get("delisting_policy") != "last_price_proxy":
        raise SystemExit("animal metadata must declare delisting_policy=last_price_proxy")
    if metadata.get("provenance_file") != "provenance.json":
        raise SystemExit("animal metadata must point to provenance.json")
    if provenance.get("evidence_tier") != metadata.get("evidence_tier"):
        raise SystemExit("provenance and metadata evidence tiers differ")
    if provenance.get("delisting_policy") != metadata.get("delisting_policy"):
        raise SystemExit("provenance and metadata delisting policies differ")
    if audit.get("evidence_tier") != metadata.get("evidence_tier"):
        raise SystemExit("delisting audit and metadata evidence tiers differ")
    events = audit.get("events")
    if not isinstance(events, list) or not events:
        raise SystemExit("delisting audit must contain events")
    for event in events:
        if not isinstance(event, dict):
            raise SystemExit("delisting audit events must be objects")
        required = {
            "ts_code",
            "delist_date",
            "last_observable_date",
            "proxy_settlement_date",
            "action",
        }
        missing = required - event.keys()
        if missing:
            raise SystemExit(f"delisting audit event missing fields: {sorted(missing)}")
        if event["action"] != "last_price_proxy_zero_return_remove":
            raise SystemExit(f"unsupported delisting audit action: {event['action']}")
    print(f"published evidence OK: {len(events)} proxy delisting events")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
