import subprocess
import sys
from collections.abc import Sequence
from pathlib import Path

import pytest
import scripts.check_flows as check_flows
from scripts.check_flows import (
    FlowCheckError,
    FlowDefinition,
    discover_flows,
    run_metaflow_checks,
)


def write_flow(path: Path, class_name: str = "ExampleFlow") -> None:
    """Create the smallest flow definition needed by checker tests."""
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        f"from metaflow import FlowSpec\n\n"
        f"class {class_name}(FlowSpec):\n    pass\n\n"
        f'if __name__ == "__main__":\n    {class_name}()\n',
        encoding="utf-8",
    )


def test_discovers_flows_recursively_in_stable_order(tmp_path: Path) -> None:
    """Discover nested flows deterministically while ignoring support files."""
    write_flow(tmp_path / "zeta" / "second_flow.py", "SecondFlow")
    write_flow(tmp_path / "alpha" / "first_flow.py", "FirstFlow")
    write_flow(tmp_path / ".venv" / "ignored_flow.py", "IgnoredFlow")
    (tmp_path / "alpha" / "helper.py").write_text("VALUE = 1\n", encoding="utf-8")

    definitions = discover_flows(tmp_path)

    assert [definition.class_name for definition in definitions] == [
        "FirstFlow",
        "SecondFlow",
    ]


@pytest.mark.parametrize("filename", ["missing_flow.py", "helper.py"])
def test_rejects_invalid_selected_paths(tmp_path: Path, filename: str) -> None:
    """Reject missing paths and existing files without the flow suffix."""
    if filename == "helper.py":
        (tmp_path / filename).write_text("VALUE = 1\n", encoding="utf-8")

    with pytest.raises(FlowCheckError):
        discover_flows(tmp_path, [tmp_path / filename])


def test_rejects_file_without_one_flowspec_subclass(tmp_path: Path) -> None:
    """Require each discovered flow file to contain one FlowSpec subclass."""
    path = tmp_path / "invalid_flow.py"
    path.write_text("class NotAFlow:\n    pass\n", encoding="utf-8")

    with pytest.raises(FlowCheckError, match="exactly one"):
        discover_flows(tmp_path)


def test_rejects_flow_without_executable_main_guard(tmp_path: Path) -> None:
    """Reject a flow file that native `python flow.py check` would not execute."""
    path = tmp_path / "invalid_flow.py"
    path.write_text(
        "from metaflow import FlowSpec\n\nclass InvalidFlow(FlowSpec):\n    pass\n",
        encoding="utf-8",
    )

    with pytest.raises(FlowCheckError, match="must instantiate InvalidFlow"):
        discover_flows(tmp_path)


def test_rejects_main_guard_that_instantiates_another_class(tmp_path: Path) -> None:
    """Require the main guard to instantiate the FlowSpec declared in that file."""
    path = tmp_path / "invalid_flow.py"
    path.write_text(
        "from metaflow import FlowSpec\n\n"
        "class InvalidFlow(FlowSpec):\n    pass\n\n"
        'if __name__ == "__main__":\n    OtherFlow()\n',
        encoding="utf-8",
    )

    with pytest.raises(FlowCheckError, match="must instantiate InvalidFlow"):
        discover_flows(tmp_path)


def test_rejects_empty_flow_directory(tmp_path: Path) -> None:
    """Fail instead of allowing CI to produce an empty flow matrix."""
    with pytest.raises(FlowCheckError, match=r"No \*_flow.py files"):
        discover_flows(tmp_path)


def test_reports_python_syntax_errors(tmp_path: Path) -> None:
    """Surface invalid Python before invoking Metaflow validation."""
    path = tmp_path / "invalid_flow.py"
    path.write_text("class InvalidFlow(FlowSpec)\n    pass\n", encoding="utf-8")

    with pytest.raises(FlowCheckError, match="Unable to parse"):
        discover_flows(tmp_path)


def test_rejects_duplicate_flow_class_names(tmp_path: Path) -> None:
    """Prevent ambiguous Metaflow identities across domain directories."""
    write_flow(tmp_path / "one" / "first_flow.py", "DuplicateFlow")
    write_flow(tmp_path / "two" / "second_flow.py", "DuplicateFlow")

    with pytest.raises(FlowCheckError, match="Duplicate flow class"):
        discover_flows(tmp_path)


def test_selected_flow_still_checks_global_name_uniqueness(tmp_path: Path) -> None:
    """Detect duplicate names outside the flow selected for native validation."""
    selected = tmp_path / "one" / "first_flow.py"
    write_flow(selected, "DuplicateFlow")
    write_flow(tmp_path / "two" / "second_flow.py", "DuplicateFlow")

    with pytest.raises(FlowCheckError, match="Duplicate flow class"):
        discover_flows(tmp_path, [str(selected)])


def test_selected_flow_limits_returned_definitions(tmp_path: Path) -> None:
    """Return only selected flows after validating the complete repository inventory."""
    selected = tmp_path / "one" / "first_flow.py"
    write_flow(selected, "FirstFlow")
    write_flow(tmp_path / "two" / "second_flow.py", "SecondFlow")

    definitions = discover_flows(tmp_path, [str(selected)])

    assert definitions == [FlowDefinition(selected.resolve(), "FirstFlow")]


def test_rejects_selected_path_excluded_from_discovery(tmp_path: Path) -> None:
    """Report a selected path that discovery skips instead of raising KeyError."""
    write_flow(tmp_path / "one" / "first_flow.py", "FirstFlow")
    hidden = tmp_path / ".venv" / "hidden_flow.py"
    write_flow(hidden, "HiddenFlow")

    with pytest.raises(FlowCheckError, match="not a discoverable repository flow"):
        discover_flows(tmp_path, [str(hidden)])


def test_main_passes_positional_paths_through_as_selection(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Forward CLI paths to discovery unchanged; pre-commit only ever stages flow files."""
    observed_selections: list[list[str]] = []
    definition = FlowDefinition(
        check_flows.FLOWS_ROOT / "models" / "browse_models_flow.py",
        "BrowseModelsFlow",
    )

    def fake_discover_flows(
        flows_root: Path = check_flows.FLOWS_ROOT,
        selected_paths: Sequence[str] = (),
    ) -> list[FlowDefinition]:
        del flows_root
        observed_selections.append(list(selected_paths))
        return [definition]

    monkeypatch.setattr(check_flows, "discover_flows", fake_discover_flows)

    paths = ["flows/models/browse_models_flow.py"]
    assert check_flows.main(["--discovery-only", *paths]) == 0
    assert observed_selections == [paths]


def test_invokes_native_metaflow_check(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    """Delegate DAG validation to the native `python flow.py check` command."""
    path = tmp_path / "example_flow.py"
    write_flow(path)
    calls: list[tuple[list[str], Path]] = []

    def fake_run(command: list[str], cwd: Path, check: bool) -> subprocess.CompletedProcess:
        calls.append((command, cwd))
        return subprocess.CompletedProcess(command, 0)

    monkeypatch.setattr(subprocess, "run", fake_run)

    run_metaflow_checks([FlowDefinition(path, "ExampleFlow")], tmp_path)

    assert calls == [([sys.executable, "example_flow.py", "check"], tmp_path)]


def test_reports_native_metaflow_check_failure(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Turn a nonzero native Metaflow result into a checker failure."""
    path = tmp_path / "example_flow.py"
    write_flow(path)

    def fake_run(command: list[str], cwd: Path, check: bool) -> subprocess.CompletedProcess:
        return subprocess.CompletedProcess(command, 2)

    monkeypatch.setattr(subprocess, "run", fake_run)

    with pytest.raises(FlowCheckError, match="exit code 2"):
        run_metaflow_checks([FlowDefinition(path, "ExampleFlow")], tmp_path)
