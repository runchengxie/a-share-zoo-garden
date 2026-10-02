"""Write reproducibility hashes for the published animal index snapshot."""

from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path


def main() -> int:
    root = Path(__file__).resolve().parents[1]
    data = root / "published" / "data"
    metadata_path = data / "metadata.json"
    metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
    metadata["provenance_file"] = "provenance.json"
    metadata_path.write_text(
        json.dumps(metadata, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    paths = [
        data / "metadata.json",
        data / "latest.json",
        data / "history.json",
        data / "constituents.json",
        data / "changes.json",
        data / "delisting_audit.json",
        root / "rules.yml",
    ]
    files: dict[str, str] = {}
    for path in paths:
        if not path.is_file():
            raise SystemExit(f"missing provenance input: {path}")
        files[str(path.relative_to(root))] = hashlib.sha256(path.read_bytes()).hexdigest()
    payload = {
        "schema_version": "zoo.provenance.v1",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "evidence_tier": "research_proxy",
        "delisting_policy": "last_price_proxy",
        "independent_recompute_through": None,
        "published_snapshot_through": metadata["updated"],
        "files": files,
    }
    (data / "provenance.json").write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
