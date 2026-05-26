#!/usr/bin/env python3
"""
Package a generated data analysis skill into a distributable .skill archive.

The .skill file is a zip archive that keeps the skill folder as the top-level
directory, for example:

    acme-data-analyst.skill
    └── acme-data-analyst/
        ├── SKILL.md
        └── references/

Usage:
    python package_data_skill.py <path/to/skill-folder> [output-directory]

Examples:
    python package_data_skill.py /tmp/acme-data-analyst
    python package_data_skill.py /tmp/acme-data-analyst /tmp/outputs
"""

from __future__ import annotations

import sys
import zipfile
from pathlib import Path


JUNK_NAMES = {"__pycache__", ".DS_Store", "Thumbs.db"}


def validate_skill(skill_path: Path) -> tuple[bool, str]:
    """Validate the minimum skill structure before packaging."""

    skill_md = skill_path / "SKILL.md"
    if not skill_md.exists():
        return False, "Missing SKILL.md"

    content = skill_md.read_text(encoding="utf-8")
    if not content.startswith("---\n"):
        return False, "SKILL.md missing YAML frontmatter"

    end = content.find("\n---", 4)
    if end == -1:
        return False, "SKILL.md frontmatter is not closed"

    frontmatter = content[:end]
    if "name:" not in frontmatter:
        return False, "SKILL.md missing 'name' in frontmatter"
    if "description:" not in frontmatter:
        return False, "SKILL.md missing 'description' in frontmatter"

    placeholders = ["[PLACEHOLDER]", "[COMPANY]", "{{", "}}"]
    for placeholder in placeholders:
        if placeholder in content:
            return False, f"SKILL.md contains unfilled placeholder text: {placeholder}"

    return True, "Validation passed"


def should_skip(file_path: Path, skill_path: Path, output_file: Path) -> bool:
    """Return True for junk files or files that should not be packaged."""

    if file_path.resolve() == output_file.resolve():
        return True

    relative_parts = file_path.relative_to(skill_path).parts
    if any(part.startswith(".") for part in relative_parts):
        return True
    if any(part in JUNK_NAMES for part in relative_parts):
        return True

    return False


def package_skill(skill_path_arg: str, output_dir_arg: str | None = None) -> Path | None:
    """
    Package a skill folder into a .skill archive.

    Args:
        skill_path_arg: Path to the skill folder.
        output_dir_arg: Optional output directory.

    Returns:
        Path to the created .skill file, or None if packaging failed.
    """

    skill_path = Path(skill_path_arg).expanduser().resolve()

    if not skill_path.exists():
        print(f"Error: skill folder not found: {skill_path}")
        return None

    if not skill_path.is_dir():
        print(f"Error: path is not a directory: {skill_path}")
        return None

    print("Validating skill...")
    valid, message = validate_skill(skill_path)
    if not valid:
        print(f"Validation failed: {message}")
        return None
    print(f"{message}\n")

    output_dir = Path(output_dir_arg).expanduser().resolve() if output_dir_arg else Path.cwd()
    output_dir.mkdir(parents=True, exist_ok=True)
    output_file = output_dir / f"{skill_path.name}.skill"

    try:
        with zipfile.ZipFile(output_file, "w", zipfile.ZIP_DEFLATED) as zip_file:
            for file_path in sorted(skill_path.rglob("*")):
                if not file_path.is_file():
                    continue
                if should_skip(file_path, skill_path, output_file):
                    continue

                archive_name = file_path.relative_to(skill_path.parent)
                zip_file.write(file_path, archive_name)
                print(f"  Added: {archive_name}")

        print(f"\nPackaged skill: {output_file}")
        return output_file

    except Exception as error:  # noqa: BLE001 - command-line utility should report any failure.
        print(f"Error creating skill archive: {error}")
        return None


def main() -> int:
    if len(sys.argv) < 2:
        print(__doc__)
        return 1

    skill_path = sys.argv[1]
    output_dir = sys.argv[2] if len(sys.argv) > 2 else None

    print(f"Packaging skill: {skill_path}")
    if output_dir:
        print(f"Output directory: {output_dir}")
    print()

    return 0 if package_skill(skill_path, output_dir) else 1


if __name__ == "__main__":
    raise SystemExit(main())
