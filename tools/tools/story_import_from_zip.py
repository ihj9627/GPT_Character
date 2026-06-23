#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Import short-story Markdown files into the Orvia Desk story shelf.

This tool intentionally does not modify characters.js. It reads:
  - characters.js
  - story-taxonomy.js
  - story-data.js

It writes:
  - story-data.js
  - story/<genre-group>/<genre>/<character>/shorts/*.md
  - an import manifest CSV
  - an import report Markdown

Supported input:
  - a .zip file containing .md files
  - a directory containing .md files

Current scope: short stories only.
"""

from __future__ import annotations

import argparse
import csv
import json
import re
import shutil
import sys
import tempfile
import zipfile
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable


STORY_DATA_HEADER = """// Story metadata only. Each current short story belongs to one character.
// The shelf tree uses story-taxonomy.js for genre group / genre / character placement.
// Keep entries minimal: id, characterId, title, file.
"""


@dataclass(frozen=True)
class Character:
    folder: str
    name: str
    en: str


@dataclass(frozen=True)
class Placement:
    genre_group_code: str
    genre_code: str


@dataclass
class IncomingStory:
    source_path: Path
    archive_name: str
    character: Character
    episode: int | None
    title: str
    content: str


@dataclass
class ImportResult:
    incoming: IncomingStory
    story_id: str
    file_path: str
    action: str
    error: str = ""


class ImportErrorWithMessage(RuntimeError):
    """User-facing import error."""


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8-sig")


def write_text(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8", newline="\n")


def extract_js_assignment(path: Path, variable_name: str) -> Any:
    """Extract a JSON-like literal assigned to window.<variable_name>."""
    text = read_text(path)
    pattern = re.compile(rf"window\.{re.escape(variable_name)}\s*=\s*", re.M)
    match = pattern.search(text)
    if not match:
        raise ImportErrorWithMessage(f"{path.name}에서 window.{variable_name} 할당을 찾지 못했습니다.")

    start = match.end()
    while start < len(text) and text[start].isspace():
        start += 1
    if start >= len(text) or text[start] not in "[{":
        raise ImportErrorWithMessage(f"{path.name}의 window.{variable_name} 값 시작을 읽지 못했습니다.")

    open_ch = text[start]
    close_ch = "]" if open_ch == "[" else "}"
    depth = 0
    in_string = False
    escaped = False

    for index in range(start, len(text)):
        ch = text[index]
        if in_string:
            if escaped:
                escaped = False
            elif ch == "\\":
                escaped = True
            elif ch == '"':
                in_string = False
            continue

        if ch == '"':
            in_string = True
        elif ch == open_ch:
            depth += 1
        elif ch == close_ch:
            depth -= 1
            if depth == 0:
                literal = text[start : index + 1]
                try:
                    return json.loads(literal)
                except json.JSONDecodeError as exc:
                    raise ImportErrorWithMessage(
                        f"{path.name}의 window.{variable_name} 값을 JSON으로 파싱하지 못했습니다: {exc}"
                    ) from exc

    raise ImportErrorWithMessage(f"{path.name}의 window.{variable_name} 닫는 괄호를 찾지 못했습니다.")


def normalize_key(value: str) -> str:
    return re.sub(r"[^0-9a-zA-Z가-힣]+", "", str(value or "")).lower()


def strip_known_episode_suffix(stem: str) -> tuple[str, int | None]:
    """Return (base, episode) from names like rabi_02, rabi-002, rabi 2."""
    match = re.match(r"^(?P<base>.+?)[_\-\s](?P<num>\d{1,3})$", stem.strip())
    if match:
        return match.group("base"), int(match.group("num"))
    return stem, None


def parse_frontmatter(text: str) -> tuple[dict[str, str], str]:
    """Return frontmatter dict and body after frontmatter."""
    normalized = text.replace("\r\n", "\n").replace("\r", "\n")
    if not normalized.startswith("---\n"):
        return {}, normalized
    end = normalized.find("\n---", 4)
    if end == -1:
        return {}, normalized
    fm_text = normalized[4:end].strip("\n")
    body_start = end + len("\n---")
    if body_start < len(normalized) and normalized[body_start] == "\n":
        body_start += 1
    metadata: dict[str, str] = {}
    for line in fm_text.splitlines():
        if ":" not in line:
            continue
        key, value = line.split(":", 1)
        metadata[key.strip()] = value.strip()
    return metadata, normalized[body_start:]


def first_h1(body: str) -> str:
    for line in body.splitlines():
        if line.startswith("# "):
            return line[2:].strip()
    return ""


def split_heading_character_and_title(heading: str) -> tuple[list[str], str]:
    """Parse '# 캐릭터 / English — Title' style heading."""
    cleaned = re.sub(r"^[^\w가-힣]+", "", heading).strip()
    for sep in ["—", "–", " - ", "：", ":"]:
        if sep in cleaned:
            left, right = cleaned.split(sep, 1)
            names = [item.strip() for item in left.split("/") if item.strip()]
            return names, right.strip()
    return [], cleaned


def title_from_content(content: str, archive_name: str) -> tuple[str, list[str], dict[str, str]]:
    metadata, body = parse_frontmatter(content)
    heading = first_h1(body)
    names, heading_title = split_heading_character_and_title(heading) if heading else ([], "")
    title = heading_title.strip()
    if not title:
        doc_name = metadata.get("문서명") or metadata.get("title") or metadata.get("Title")
        title = str(doc_name or "").strip()
    if not title:
        title = strip_known_episode_suffix(Path(archive_name).stem)[0].replace("_", " ").replace("-", " ").strip()
    if not title:
        title = "제목 미정"
    return title, names, metadata


def build_character_indexes(characters_raw: list[dict[str, Any]]) -> tuple[list[Character], dict[str, Character], dict[str, Character]]:
    characters: list[Character] = []
    by_folder: dict[str, Character] = {}
    by_name_key: dict[str, Character] = {}

    for raw in characters_raw:
        folder = str(raw.get("folder") or "").strip()
        name = str(raw.get("name") or "").strip()
        en = str(raw.get("en") or "").strip()
        if not folder:
            continue
        character = Character(folder=folder, name=name, en=en)
        characters.append(character)
        by_folder[normalize_key(folder)] = character
        for value in [folder, name, en]:
            key = normalize_key(value)
            if key:
                by_name_key.setdefault(key, character)

    return characters, by_folder, by_name_key


def load_placements(taxonomy_raw: dict[str, Any]) -> dict[str, Placement]:
    placements: dict[str, Placement] = {}
    raw_placements = taxonomy_raw.get("characterPlacements")
    if isinstance(raw_placements, dict):
        for folder, raw in raw_placements.items():
            group_code = str(raw.get("genreGroupCode") or "").strip()
            genre_code = str(raw.get("genreCode") or "").strip()
            if group_code and genre_code:
                placements[str(folder)] = Placement(group_code, genre_code)

    # Fallback from genreGroups if characterPlacements is missing.
    if placements:
        return placements

    for group in taxonomy_raw.get("genreGroups") or []:
        group_code = str(group.get("code") or "").strip()
        for genre in group.get("genres") or []:
            genre_code = str(genre.get("code") or "").strip()
            for folder in genre.get("characters") or []:
                if group_code and genre_code and folder:
                    placements[str(folder)] = Placement(group_code, genre_code)
    return placements


def iter_markdown_inputs(source: Path) -> Iterable[tuple[Path, str, str]]:
    """Yield (temp_path, archive_name, text)."""
    if source.is_dir():
        for path in sorted(source.rglob("*.md")):
            if path.name.startswith(".") or "__MACOSX" in path.parts:
                continue
            yield path, str(path.relative_to(source)).replace("\\", "/"), read_text(path)
        return

    if not source.is_file():
        raise ImportErrorWithMessage(f"입력 경로가 없습니다: {source}")

    if source.suffix.lower() != ".zip":
        raise ImportErrorWithMessage("입력은 .zip 파일 또는 폴더여야 합니다.")

    with zipfile.ZipFile(source) as archive:
        bad_names = []
        for info in archive.infolist():
            name = info.filename
            normalized = Path(name)
            if info.is_dir() or not name.lower().endswith(".md"):
                continue
            if name.startswith("/") or ".." in normalized.parts:
                bad_names.append(name)
        if bad_names:
            raise ImportErrorWithMessage("ZIP에 안전하지 않은 경로가 있습니다: " + ", ".join(bad_names[:5]))

        for info in sorted(archive.infolist(), key=lambda item: item.filename):
            name = info.filename
            if info.is_dir() or not name.lower().endswith(".md"):
                continue
            if "__MACOSX" in Path(name).parts or Path(name).name.startswith("."):
                continue
            raw = archive.read(info)
            text = raw.decode("utf-8-sig")
            temp_path = Path(name)
            yield temp_path, name, text


def find_character_for_story(
    archive_name: str,
    content: str,
    by_folder: dict[str, Character],
    by_name_key: dict[str, Character],
) -> tuple[Character, int | None, str, dict[str, str]]:
    stem = Path(archive_name).stem
    base, episode = strip_known_episode_suffix(stem)

    for candidate in [stem, base]:
        key = normalize_key(candidate)
        if key in by_folder:
            title, _names, metadata = title_from_content(content, archive_name)
            return by_folder[key], episode, title, metadata

    title, names, metadata = title_from_content(content, archive_name)

    # Asset id fallback: STORY-ALICE-SHORT-002
    for key_name in ["자산_ID", "asset_id", "assetId", "id"]:
        asset_id = metadata.get(key_name)
        if not asset_id:
            continue
        parts = re.split(r"[\-_]+", asset_id)
        if len(parts) >= 2:
            for part in parts:
                key = normalize_key(part)
                if key in by_name_key:
                    if episode is None:
                        nums = [int(num) for num in re.findall(r"(\d{1,3})", asset_id)]
                        if nums:
                            episode = nums[-1]
                    return by_name_key[key], episode, title, metadata

    for name in names:
        key = normalize_key(name)
        if key in by_name_key:
            return by_name_key[key], episode, title, metadata

    # Last fallback: search known names in the whole H1/frontmatter text.
    searchable = normalize_key(first_h1(parse_frontmatter(content)[1]) + " " + " ".join(metadata.values()))
    matches = [character for key, character in by_name_key.items() if key and key in searchable]
    unique_matches = {character.folder: character for character in matches}
    if len(unique_matches) == 1:
        return next(iter(unique_matches.values())), episode, title, metadata

    raise ImportErrorWithMessage(
        f"캐릭터 매칭 실패: {archive_name}. 파일명 또는 첫 H1 제목에 characters.js의 folder/name/en 값을 넣어주세요."
    )


def existing_story_numbers(story_data: list[dict[str, Any]]) -> dict[str, set[int]]:
    numbers: dict[str, set[int]] = {}
    for story in story_data:
        character_id = str(story.get("characterId") or "").strip()
        story_id = str(story.get("id") or "")
        file_path = str(story.get("file") or "")
        found: int | None = None
        match = re.search(r"-(\d{3})$", story_id)
        if match:
            found = int(match.group(1))
        else:
            match = re.search(r"_(\d{1,3})\.md$", file_path)
            if match:
                found = int(match.group(1))
        if character_id and found is not None:
            numbers.setdefault(character_id, set()).add(found)
    return numbers


def next_episode_number(character_id: str, used_numbers: dict[str, set[int]]) -> int:
    used = used_numbers.setdefault(character_id, set())
    candidate = 1
    while candidate in used:
        candidate += 1
    used.add(candidate)
    return candidate


def story_sort_key(story: dict[str, Any], taxonomy_order: dict[str, tuple[int, int, int]]) -> tuple[int, int, int, str, int, str]:
    character_id = str(story.get("characterId") or "")
    group_index, genre_index, char_index = taxonomy_order.get(character_id, (9999, 9999, 9999))
    story_id = str(story.get("id") or "")
    match = re.search(r"-(\d{3})$", story_id)
    episode = int(match.group(1)) if match else 9999
    return group_index, genre_index, char_index, character_id, episode, story_id


def build_taxonomy_order(taxonomy_raw: dict[str, Any]) -> dict[str, tuple[int, int, int]]:
    order: dict[str, tuple[int, int, int]] = {}
    for group_index, group in enumerate(taxonomy_raw.get("genreGroups") or []):
        for genre_index, genre in enumerate(group.get("genres") or []):
            for char_index, folder in enumerate(genre.get("characters") or []):
                order[str(folder)] = (group_index, genre_index, char_index)
    return order


def format_story_data(story_data: list[dict[str, Any]]) -> str:
    return STORY_DATA_HEADER + "window.STORY_DATA = " + json.dumps(story_data, ensure_ascii=False, indent=2) + ";\n"


def collect_imports(source: Path, characters_raw: list[dict[str, Any]]) -> list[IncomingStory]:
    _characters, by_folder, by_name_key = build_character_indexes(characters_raw)
    imports: list[IncomingStory] = []
    seen_archive_names: set[str] = set()

    for source_path, archive_name, content in iter_markdown_inputs(source):
        if archive_name in seen_archive_names:
            raise ImportErrorWithMessage(f"입력 안에 중복 파일명이 있습니다: {archive_name}")
        seen_archive_names.add(archive_name)

        character, episode, title, _metadata = find_character_for_story(
            archive_name=archive_name,
            content=content,
            by_folder=by_folder,
            by_name_key=by_name_key,
        )
        imports.append(IncomingStory(source_path, archive_name, character, episode, title, content))

    if not imports:
        raise ImportErrorWithMessage("입력에서 .md 파일을 찾지 못했습니다.")
    return imports


def apply_import(
    project_root: Path,
    source: Path,
    *,
    dry_run: bool,
    manifest_path: Path | None,
    report_path: Path | None,
) -> tuple[list[ImportResult], list[str]]:
    characters_path = project_root / "characters.js"
    taxonomy_path = project_root / "story-taxonomy.js"
    story_data_path = project_root / "story-data.js"

    for required in [characters_path, taxonomy_path, story_data_path]:
        if not required.exists():
            raise ImportErrorWithMessage(f"필수 파일이 없습니다: {required}")

    characters_raw = extract_js_assignment(characters_path, "CHARACTERS")
    taxonomy_raw = extract_js_assignment(taxonomy_path, "STORY_TAXONOMY")
    story_data = extract_js_assignment(story_data_path, "STORY_DATA")
    if not isinstance(characters_raw, list) or not isinstance(story_data, list) or not isinstance(taxonomy_raw, dict):
        raise ImportErrorWithMessage("프로젝트 데이터 파일 형식이 예상과 다릅니다.")

    placements = load_placements(taxonomy_raw)
    taxonomy_order = build_taxonomy_order(taxonomy_raw)

    imports = collect_imports(source, characters_raw)
    used_numbers = existing_story_numbers(story_data)
    existing_by_id = {str(story.get("id")): story for story in story_data}
    results: list[ImportResult] = []
    warnings: list[str] = []

    for incoming in imports:
        folder = incoming.character.folder
        placement = placements.get(folder)
        if not placement:
            raise ImportErrorWithMessage(f"story-taxonomy.js에 캐릭터 배치가 없습니다: {folder}")

        episode = incoming.episode
        if episode is None:
            episode = next_episode_number(folder, used_numbers)
        else:
            used_numbers.setdefault(folder, set()).add(episode)

        episode_text = f"{episode:03d}"
        file_number = f"{episode:02d}"
        story_id = f"story-{folder}-{episode_text}"
        relative_file_path = (
            f"story/{placement.genre_group_code}/{placement.genre_code}/"
            f"{folder}/shorts/{folder}_{file_number}.md"
        )
        entry = {
            "id": story_id,
            "characterId": folder,
            "title": incoming.title,
            "file": relative_file_path,
        }

        target_file = project_root / relative_file_path
        action = "add"
        if story_id in existing_by_id:
            existing_by_id[story_id].update(entry)
            action = "update"
        else:
            story_data.append(entry)
            existing_by_id[story_id] = entry

        if target_file.exists() and action == "add":
            warnings.append(f"대상 파일은 이미 있지만 metadata에는 없었습니다. 덮어씁니다: {relative_file_path}")

        results.append(ImportResult(incoming, story_id, relative_file_path, action))

        if not dry_run:
            write_text(target_file, incoming.content)

    story_data.sort(key=lambda story: story_sort_key(story, taxonomy_order))

    if not dry_run:
        write_text(story_data_path, format_story_data(story_data))

    if manifest_path is None:
        manifest_path = project_root / "story-import-manifest.csv"
    if report_path is None:
        report_path = project_root / "story-import-report.md"

    manifest_rows = [
        {
            "archive_name": result.incoming.archive_name,
            "characterId": result.incoming.character.folder,
            "characterName": result.incoming.character.name,
            "characterEn": result.incoming.character.en,
            "storyId": result.story_id,
            "title": result.incoming.title,
            "file": result.file_path,
            "action": result.action,
            "error": result.error,
        }
        for result in results
    ]

    if not dry_run:
        manifest_path.parent.mkdir(parents=True, exist_ok=True)
        with manifest_path.open("w", encoding="utf-8-sig", newline="") as csv_file:
            writer = csv.DictWriter(csv_file, fieldnames=list(manifest_rows[0].keys()))
            writer.writeheader()
            writer.writerows(manifest_rows)

        added = sum(1 for item in results if item.action == "add")
        updated = sum(1 for item in results if item.action == "update")
        report_lines = [
            "# Story Import Report",
            "",
            f"- Source: `{source}`",
            f"- Project root: `{project_root}`",
            f"- Dry run: `{dry_run}`",
            f"- Imported files: {len(results)}",
            f"- Added metadata entries: {added}",
            f"- Updated metadata entries: {updated}",
            f"- Warnings: {len(warnings)}",
            "",
        ]
        if warnings:
            report_lines.append("## Warnings")
            report_lines.extend(f"- {warning}" for warning in warnings)
            report_lines.append("")
        report_lines.append("## Imported Stories")
        for result in results:
            report_lines.append(
                f"- `{result.story_id}` {result.action}: {result.incoming.character.name} — "
                f"{result.incoming.title} → `{result.file_path}`"
            )
        write_text(report_path, "\n".join(report_lines) + "\n")

    return results, warnings


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Import short-story Markdown files into story-data.js and the story/ tree."
    )
    parser.add_argument("source", help="ZIP file or folder containing .md files.")
    parser.add_argument(
        "--project-root",
        default=".",
        help="Project root containing characters.js, story-taxonomy.js, and story-data.js. Default: current directory.",
    )
    parser.add_argument("--dry-run", action="store_true", help="Validate and show planned changes without writing files.")
    parser.add_argument("--manifest", help="Output CSV manifest path. Default: <project-root>/story-import-manifest.csv")
    parser.add_argument("--report", help="Output Markdown report path. Default: <project-root>/story-import-report.md")
    return parser.parse_args(argv)


def main(argv: list[str]) -> int:
    args = parse_args(argv)
    project_root = Path(args.project_root).resolve()
    source = Path(args.source).resolve()
    manifest_path = Path(args.manifest).resolve() if args.manifest else None
    report_path = Path(args.report).resolve() if args.report else None

    try:
        results, warnings = apply_import(
            project_root=project_root,
            source=source,
            dry_run=args.dry_run,
            manifest_path=manifest_path,
            report_path=report_path,
        )
    except (ImportErrorWithMessage, zipfile.BadZipFile, UnicodeDecodeError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 2

    added = sum(1 for item in results if item.action == "add")
    updated = sum(1 for item in results if item.action == "update")
    prefix = "DRY RUN: " if args.dry_run else ""
    print(f"{prefix}imported={len(results)} added={added} updated={updated} warnings={len(warnings)}")
    for warning in warnings:
        print(f"WARNING: {warning}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
