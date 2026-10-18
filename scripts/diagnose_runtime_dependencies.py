"""Report installed cross-repository dependencies without importing their runtime code."""

from __future__ import annotations

import json
import sys
from importlib import metadata, util

PACKAGES = {
    "quant-backtest-runtime": "backtest_runtime",
    "quant-platform": "portfolio_backtester",
    "research-contracts": "research_contracts",
}


def dependency_provenance(distribution_name: str, module_name: str) -> dict[str, str | None]:
    result: dict[str, str | None] = {
        "module": module_name,
        "module_path": None,
        "version": None,
        "install_source": "not_installed",
        "commit_id": None,
        "requested_revision": None,
    }
    try:
        spec = util.find_spec(module_name)
    except (ImportError, ValueError):
        spec = None
    result["module_path"] = spec.origin if spec else None
    try:
        distribution = metadata.distribution(distribution_name)
    except metadata.PackageNotFoundError:
        if spec is not None:
            result["install_source"] = "missing_distribution_metadata"
        return result
    result["version"] = distribution.version
    source = distribution.read_text("direct_url.json")
    result["install_source"] = "index_or_unknown"
    if source:
        try:
            payload = json.loads(source)
            if not isinstance(payload, dict):
                raise ValueError("invalid direct_url.json")
            vcs = payload.get("vcs_info", {})
            if not isinstance(vcs, dict):
                raise ValueError("invalid vcs_info")
        except ValueError:
            result["install_source"] = "invalid_metadata"
            return result
        result["install_source"] = "vcs" if vcs else "direct"
        for key in ("commit_id", "requested_revision"):
            value = vcs.get(key)
            result[key] = value if isinstance(value, str) else None
    return result


def main() -> None:
    report = {
        "python_executable": sys.executable,
        "python_version": sys.version.split()[0],
        "packages": {
            name: dependency_provenance(name, module) for name, module in PACKAGES.items()
        },
    }
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
