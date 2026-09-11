import re
from pathlib import Path

REPOSITORY_ROOT = Path(__file__).resolve().parents[2]
REQUIREMENTS_PATH = REPOSITORY_ROOT / "flows" / "requirements.txt"
DEV_REQUIREMENTS_PATH = REPOSITORY_ROOT / "flows" / "requirements-dev.txt"
PRE_COMMIT_CONFIG_PATH = REPOSITORY_ROOT / ".pre-commit-config.yaml"


def requirement_version(package: str, requirements_path: Path = DEV_REQUIREMENTS_PATH) -> str:
    """Read one strictly pinned package version from a requirements file."""
    pattern = re.compile(rf"^{re.escape(package)}==([^\s#]+)", re.MULTILINE)
    match = pattern.search(requirements_path.read_text(encoding="utf-8"))
    # Under pre-commit only staged content is on disk, so an unstaged pin reads
    # as missing here: stage the requirements and hook changes together.
    assert match, f"Missing pinned {package} version in {requirements_path}"
    return match.group(1)


def test_ruff_versions_match() -> None:
    """Keep the Ruff CLI version aligned with the isolated pre-commit hook."""
    config = PRE_COMMIT_CONFIG_PATH.read_text(encoding="utf-8")
    match = re.search(
        r"repo: https://github\.com/astral-sh/ruff-pre-commit\s+rev: v([^\s]+)",
        config,
    )
    assert match, f"Missing pinned Ruff revision in {PRE_COMMIT_CONFIG_PATH}"
    assert match.group(1) == requirement_version("ruff")


def test_pytest_versions_match() -> None:
    """Keep the pytest CLI version aligned with its pre-commit environment."""
    config = PRE_COMMIT_CONFIG_PATH.read_text(encoding="utf-8")
    match = re.search(r"additional_dependencies:\s+- pytest==([^\s]+)", config)
    assert match, f"Missing pinned pytest dependency in {PRE_COMMIT_CONFIG_PATH}"
    assert match.group(1) == requirement_version("pytest")


def test_outerbounds_versions_match() -> None:
    """Validate flows against the same Outerbounds release that CI installs."""
    config = PRE_COMMIT_CONFIG_PATH.read_text(encoding="utf-8")
    match = re.search(r"additional_dependencies:\s+- outerbounds==([^\s]+)", config)
    assert match, f"Missing pinned outerbounds dependency in {PRE_COMMIT_CONFIG_PATH}"
    assert match.group(1) == requirement_version("outerbounds", REQUIREMENTS_PATH)
