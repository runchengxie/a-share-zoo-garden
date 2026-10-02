"""Exercise snapshot provenance through the same scripts used by publication."""

from __future__ import annotations

import hashlib
import json
import shutil
import subprocess
import sys
from pathlib import Path

from zoo_index.outputs import generate_metadata_json


def test_provenance_writer_links_metadata_before_hashing(tmp_path: Path) -> None:
    root = Path(__file__).resolve().parents[1]
    scripts = tmp_path / "scripts"
    scripts.mkdir()
    for name in ("write_published_provenance.py", "validate_published_evidence.py"):
        shutil.copyfile(root / "scripts" / name, scripts / name)
    data = tmp_path / "published" / "data"
    data.mkdir(parents=True)
    generate_metadata_json(
        data / "metadata.json", "000300.SH", "CSI 300", "fixture", "20261002", "last_price_proxy"
    )
    for name in ("latest", "history", "constituents", "changes"):
        (data / f"{name}.json").write_text("{}\n", encoding="utf-8")
    (tmp_path / "rules.yml").write_text("keywords: []\n", encoding="utf-8")
    (data / "delisting_audit.json").write_text(
        json.dumps(
            {
                "evidence_tier": "research_proxy",
                "delisting_policy": "last_price_proxy",
                "events": [
                    {
                        "ts_code": "000001.SZ",
                        "delist_date": "20261002",
                        "last_observable_date": "20260930",
                        "proxy_settlement_date": "20261002",
                        "action": "last_price_proxy_zero_return_remove",
                    }
                ],
            }
        ),
        encoding="utf-8",
    )
    subprocess.run([sys.executable, str(scripts / "write_published_provenance.py")], check=True)
    metadata = json.loads((data / "metadata.json").read_text(encoding="utf-8"))
    assert metadata["provenance_file"] == "provenance.json"
    assert metadata["updated"] == "20261002"
    provenance = json.loads((data / "provenance.json").read_text(encoding="utf-8"))
    assert (
        provenance["files"]["published/data/metadata.json"]
        == hashlib.sha256((data / "metadata.json").read_bytes()).hexdigest()
    )
    subprocess.run([sys.executable, str(scripts / "validate_published_evidence.py")], check=True)
