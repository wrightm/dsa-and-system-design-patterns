#!/usr/bin/env python3
"""Checks that every relative link in the repo's Markdown files points at something that exists.

    python3 scripts/check-links.py

Uses only the standard library. External links (http, mailto) are not fetched.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SKIP_DIRS = {".git", ".gradle", "build", ".venv", "node_modules", "templates"}
LINK = re.compile(r"!?\[[^\]]*\]\(([^)\s]+)\)")
EXTERNAL = re.compile(r"^([a-z][a-z0-9+.-]*:|//)", re.IGNORECASE)
HEADING = re.compile(r"^#{1,6}\s+(.*?)\s*#*$")


def markdown_files() -> list[Path]:
    return sorted(
        path
        for path in ROOT.rglob("*.md")
        if not SKIP_DIRS.intersection(path.relative_to(ROOT).parts)
        # Pages under site/content-src link relative to the built site, which checks them;
        # site/content is generated from the articles checked here; the site's test fixtures
        # break links on purpose.
        and not any(path.is_relative_to(ROOT / "site" / d) for d in ("content-src", "content", "test"))
    )


def unfenced_lines(path: Path):
    in_fence = False
    for number, line in enumerate(path.read_text(encoding="utf-8").split("\n"), start=1):
        if line.lstrip().startswith(("```", "~~~")):
            in_fence = not in_fence
        elif not in_fence:
            yield number, line


def anchors(path: Path) -> set[str]:
    """Heading anchors as GitHub generates them."""
    found = set()
    for _, line in unfenced_lines(path):
        match = HEADING.match(line)
        if match:
            text = re.sub(r"[`*_]|\[([^\]]*)\]\([^)]*\)", r"\1", match.group(1)).lower()
            found.add(re.sub(r"[^\w\- ]", "", text).replace(" ", "-"))
    return found


def main() -> int:
    problems = []
    checked = 0
    for path in markdown_files():
        for number, line in unfenced_lines(path):
            for target in LINK.findall(re.sub(r"`[^`]*`", "", line)):
                if EXTERNAL.match(target):
                    continue
                checked += 1
                file_part, _, anchor = target.partition("#")
                resolved = (path.parent / file_part).resolve() if file_part else path
                where = f"{path.relative_to(ROOT)}:{number}"
                if not resolved.exists():
                    problems.append(f"{where}: missing target {target}")
                elif anchor and resolved.suffix == ".md" and anchor not in anchors(resolved):
                    problems.append(f"{where}: no heading for #{anchor} in {file_part or path.name}")
    for problem in problems:
        print(problem)
    print(f"{checked} relative links checked, {len(problems)} broken")
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
