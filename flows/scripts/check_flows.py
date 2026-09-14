"""Discover QA flows, enforce repository conventions, and run Metaflow checks."""

from __future__ import annotations

import argparse
import ast
import json
import subprocess
import sys
from collections.abc import Sequence
from dataclasses import dataclass
from pathlib import Path

FLOWS_ROOT = Path(__file__).resolve().parents[1]
REPOSITORY_ROOT = FLOWS_ROOT.parent


@dataclass(frozen=True)
class FlowDefinition:
    path: Path
    class_name: str


class FlowCheckError(Exception):
    """Raised when repository flow validation fails."""


def _is_flowspec_base(base: ast.expr, flowspec_names: set[str], metaflow_modules: set[str]) -> bool:
    """Recognize FlowSpec inheritance through direct and module imports."""
    return (isinstance(base, ast.Name) and base.id in flowspec_names) or (
        isinstance(base, ast.Attribute)
        and base.attr == "FlowSpec"
        and isinstance(base.value, ast.Name)
        and base.value.id in metaflow_modules
    )


def _parse_flow(path: Path) -> ast.Module:
    """Parse a flow file and surface readable syntax or file errors."""
    try:
        return ast.parse(path.read_text(encoding="utf-8"), filename=str(path))
    except (OSError, SyntaxError) as error:
        raise FlowCheckError(f"Unable to parse {path}: {error}") from error


def _flow_class_names(tree: ast.Module) -> list[str]:
    """Return top-level FlowSpec subclass names from a parsed flow."""
    flowspec_names: set[str] = set()
    metaflow_modules: set[str] = set()
    for node in tree.body:
        if isinstance(node, ast.ImportFrom) and node.module == "metaflow":
            flowspec_names.update(
                alias.asname or "FlowSpec"
                for alias in node.names
                if alias.name in {"FlowSpec", "*"}
            )
        elif isinstance(node, ast.Import):
            metaflow_modules.update(
                alias.asname or alias.name for alias in node.names if alias.name == "metaflow"
            )

    return [
        node.name
        for node in tree.body
        if isinstance(node, ast.ClassDef)
        and any(_is_flowspec_base(base, flowspec_names, metaflow_modules) for base in node.bases)
    ]


def validate_tracked_flow_filenames(repository_root: Path = REPOSITORY_ROOT) -> None:
    """Require every tracked Python file containing a FlowSpec to use the flow suffix."""
    listed = subprocess.run(
        ["git", "ls-files", "--cached", "-z", "--", "*.py"],
        cwd=repository_root,
        check=False,
        capture_output=True,
    )
    if listed.returncode:
        raise FlowCheckError("Unable to list tracked flow files from the Git index")

    for raw_path in listed.stdout.split(b"\0"):
        if not raw_path:
            continue
        relative_path = raw_path.decode("utf-8")
        path = Path(relative_path)
        if path.suffix != ".py" or path.name.endswith("_flow.py"):
            continue

        staged = subprocess.run(
            ["git", "show", f":{relative_path}"],
            cwd=repository_root,
            check=False,
            capture_output=True,
        )
        if staged.returncode:
            raise FlowCheckError(f"Unable to read staged file: {relative_path}")
        try:
            tree = ast.parse(staged.stdout, filename=relative_path)
        except SyntaxError:
            continue
        if _flow_class_names(tree):
            raise FlowCheckError(f"Tracked FlowSpec file must end with '_flow.py': {relative_path}")


def _is_main_guard(test: ast.expr) -> bool:
    """Recognize the standard `if __name__ == "__main__"` expression."""
    return (
        isinstance(test, ast.Compare)
        and isinstance(test.left, ast.Name)
        and test.left.id == "__name__"
        and len(test.ops) == 1
        and isinstance(test.ops[0], ast.Eq)
        and len(test.comparators) == 1
        and isinstance(test.comparators[0], ast.Constant)
        and test.comparators[0].value == "__main__"
    )


def _has_main_guard_call(tree: ast.Module, class_name: str) -> bool:
    """Return whether the main guard directly instantiates the discovered flow."""
    for node in tree.body:
        if not isinstance(node, ast.If) or not _is_main_guard(node.test):
            continue
        return any(
            isinstance(statement, ast.Expr)
            and isinstance(statement.value, ast.Call)
            and isinstance(statement.value.func, ast.Name)
            and statement.value.func.id == class_name
            for statement in node.body
        )
    return False


def _resolve_selected_path(path: str, flows_root: Path) -> Path:
    """Resolve a CLI path relative to the repository root.

    Every caller (pre-commit, CI) passes repository-relative paths.
    """
    candidate = Path(path)
    if candidate.is_absolute():
        return candidate.resolve()
    return (flows_root.parent / candidate).resolve()


def discover_flows(
    flows_root: Path = FLOWS_ROOT,
    selected_paths: Sequence[str] = (),
) -> list[FlowDefinition]:
    """Discover flows and enforce repository-wide file and naming conventions."""
    root = flows_root.resolve()

    # Validate requested paths first, but do not use them as the repository
    # inventory: duplicate flow names must still be detected in unselected files.
    if selected_paths:
        selected = sorted({_resolve_selected_path(path, root) for path in selected_paths})
        for path in selected:
            try:
                path.relative_to(root)
            except ValueError as error:
                raise FlowCheckError(f"Flow path is outside {root}: {path}") from error
            if not path.is_file():
                raise FlowCheckError(f"Flow file does not exist: {path}")
            if not path.name.endswith("_flow.py"):
                raise FlowCheckError(f"Flow file must end with '_flow.py': {path}")
    else:
        selected = []

    # Hidden directories and Python caches can contain third-party files whose
    # names happen to end in `_flow.py`; they are not repository QA flows.
    paths = sorted(
        path.resolve()
        for path in root.glob("**/*_flow.py")
        if not any(
            part.startswith(".") or part == "__pycache__" for part in path.relative_to(root).parts
        )
    )

    definitions: list[FlowDefinition] = []
    for path in paths:
        # One FlowSpec per file keeps discovery and per-flow CI reporting
        # unambiguous. Python parsing also catches syntax errors before Metaflow.
        tree = _parse_flow(path)
        class_names = _flow_class_names(tree)
        if len(class_names) != 1:
            raise FlowCheckError(
                f"{path} must define exactly one top-level FlowSpec subclass; "
                f"found {len(class_names)}"
            )
        class_name = class_names[0]

        # Running `python flow.py check` requires the file's main guard to
        # instantiate its FlowSpec; otherwise the command can exit without checking.
        if not _has_main_guard_call(tree, class_name):
            raise FlowCheckError(
                f'{path} must instantiate {class_name} under `if __name__ == "__main__"`'
            )
        definitions.append(FlowDefinition(path=path, class_name=class_name))

    # An empty matrix would make CI appear successful without testing anything.
    if not definitions:
        raise FlowCheckError(f"No *_flow.py files found under {root}")

    # Metaflow identifies flows by class name, so duplicate names across product
    # domains would make runs and metadata ambiguous.
    paths_by_name: dict[str, Path] = {}
    for definition in definitions:
        previous_path = paths_by_name.get(definition.class_name)
        if previous_path is not None:
            raise FlowCheckError(
                f"Duplicate flow class {definition.class_name}: "
                f"{previous_path} and {definition.path}"
            )
        paths_by_name[definition.class_name] = definition.path

    if not selected:
        return definitions

    # A selected path can pass the checks above and still be excluded from
    # discovery (hidden directory, Python cache), so report it instead of
    # failing with a KeyError.
    definitions_by_path = {definition.path: definition for definition in definitions}
    missing = [path for path in selected if path not in definitions_by_path]
    if missing:
        raise FlowCheckError(
            "Flow file is not a discoverable repository flow: "
            + ", ".join(str(path) for path in missing)
        )
    return [definitions_by_path[path] for path in selected]


def run_metaflow_checks(
    definitions: Sequence[FlowDefinition], flows_root: Path = FLOWS_ROOT
) -> None:
    """Run Metaflow's built-in definition and DAG validation for every flow."""
    for definition in definitions:
        relative_path = definition.path.relative_to(flows_root.resolve())
        print(f"Checking {relative_path}", file=sys.stderr)
        # Native `check` owns step, transition, decorator, parameter, import, and
        # graph validation. It validates definitions without executing flow steps.
        result = subprocess.run(
            [sys.executable, str(relative_path), "check"],
            cwd=flows_root,
            check=False,
        )
        if result.returncode:
            raise FlowCheckError(
                f"Metaflow validation failed for {relative_path} with exit code {result.returncode}"
            )


def _parse_args(arguments: Sequence[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("paths", nargs="*", help="Flow files to validate")
    parser.add_argument(
        "--discovery-only",
        action="store_true",
        help="Discover flows without invoking Metaflow",
    )
    parser.add_argument(
        "--tracked-filenames-only",
        action="store_true",
        help="Validate tracked FlowSpec filenames from the Git index",
    )
    parser.add_argument(
        "--format",
        choices=("paths", "json"),
        default="paths",
        help="Discovery output format",
    )
    return parser.parse_args(arguments)


def main(arguments: Sequence[str] | None = None) -> int:
    args = _parse_args(arguments)
    flow_paths = list(args.paths)
    try:
        if args.tracked_filenames_only:
            validate_tracked_flow_filenames()
            return 0
        definitions = discover_flows(selected_paths=flow_paths)
        if not args.discovery_only:
            run_metaflow_checks(definitions)
    except FlowCheckError as error:
        print(f"Flow validation failed: {error}", file=sys.stderr)
        return 1

    paths = [definition.path.relative_to(REPOSITORY_ROOT).as_posix() for definition in definitions]
    if args.format == "json":
        print(json.dumps({"flow": paths}))
    else:
        print("\n".join(paths))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
