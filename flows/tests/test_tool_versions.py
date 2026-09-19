import re
from pathlib import Path

import yaml

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


def load_pre_commit_config() -> dict:
    return yaml.safe_load(PRE_COMMIT_CONFIG_PATH.read_text(encoding="utf-8"))


def hook_config(hook_id: str) -> dict:
    """Return the hook block for `hook_id` from `.pre-commit-config.yaml`."""
    for repo in load_pre_commit_config()["repos"]:
        for hook in repo["hooks"]:
            if hook["id"] == hook_id:
                return hook
    raise AssertionError(f"Missing hook {hook_id!r} in {PRE_COMMIT_CONFIG_PATH}")


def additional_dependency_version(hook_id: str, package: str) -> str:
    """Read a pinned `package==version` entry from a hook's additional_dependencies."""
    dependencies = hook_config(hook_id).get("additional_dependencies", [])
    for dependency in dependencies:
        if dependency.startswith(f"{package}=="):
            return dependency.split("==", 1)[1]
    raise AssertionError(
        f"Missing pinned {package} dependency for hook {hook_id!r} in {PRE_COMMIT_CONFIG_PATH}"
    )


def test_ruff_versions_match() -> None:
    """Keep the Ruff CLI version aligned with the isolated pre-commit hook."""
    for repo in load_pre_commit_config()["repos"]:
        if repo["repo"] == "https://github.com/astral-sh/ruff-pre-commit":
            rev = repo["rev"]
            break
    else:
        raise AssertionError(f"Missing ruff-pre-commit repo in {PRE_COMMIT_CONFIG_PATH}")
    assert rev.lstrip("v") == requirement_version("ruff")


def test_pytest_versions_match() -> None:
    """Keep the pytest CLI version aligned with its pre-commit environment."""
    assert additional_dependency_version("test-flow-tools", "pytest") == requirement_version(
        "pytest"
    )


def test_outerbounds_versions_match() -> None:
    """Validate flows against the same Outerbounds release that CI installs."""
    assert additional_dependency_version("check-flows", "outerbounds") == requirement_version(
        "outerbounds", REQUIREMENTS_PATH
    )


def test_openai_versions_match() -> None:
    """Validate flows against the same OpenAI SDK release that CI installs."""
    assert additional_dependency_version("check-flows", "openai") == requirement_version(
        "openai", REQUIREMENTS_PATH
    )


def test_flow_filename_hook_matches_python_files_anywhere() -> None:
    """Run staged FlowSpec filename validation outside the flows directory."""
    pattern = re.compile(hook_config("check-flow-filenames")["files"])

    assert pattern.search("renamed.py")
    assert pattern.search("flows/models/example.py")
    assert not pattern.search("flows/README.md")
