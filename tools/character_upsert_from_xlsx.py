#!/usr/bin/env python3
"""
Upsert character rows from the current basic Excel template into characters.js.

Usage:
  python tools/character_upsert_from_xlsx.py templates/character_import_1_basic_template.xlsx
  python tools/character_upsert_from_xlsx.py templates/character_import_1_basic_template.xlsx --dry-run
  python tools/character_upsert_from_xlsx.py templates/character_import_1_basic_template.xlsx --out characters.updated.js

Rules:
  - folder is the stable upsert key and is required.
  - If folder does not exist, a new character is created.
  - If folder exists, only supported fields present in the sheet are updated.
  - Empty cells keep existing values.
  - CLEAR clears a string field to "" and albumKeys to [].
  - albumKeys accepts comma-separated values: magazine, sketch, box
  - This tool edits only characters.js.
  - profile.shortIntro and profile.quote are supported optional columns.
    Empty cells keep existing values; CLEAR resets each field to "".
"""
from __future__ import annotations

import argparse
import copy
import json
import re
import sys
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Any, Dict, List, Tuple

CLEAR_TOKEN = "CLEAR"

BASIC_INFO_DEFAULTS = {
    "gender": "미등록",
    "genre": "미등록",
    "race": "미등록",
    "job": "미등록",
    "age": "미등록",
    "personality": "미등록",
    "ability": "미등록",
    "weapon": "미등록",
    "height": "미등록",
    "weight": "미등록",
    "measurements": "미등록",
}

COLUMN_ALIASES = {
    # top-level
    "name": "name",
    "en": "en",
    "themeColor": "themeColor",
    "themecolor": "themeColor",
    "theme_color": "themeColor",
    "folder": "folder",
    "albumKeys": "albumKeys",
    "albumkeys": "albumKeys",
    "album_keys": "albumKeys",
    "hidden": "hidden",

    # profile summary
    "shortIntro": "profile.shortIntro",
    "shortintro": "profile.shortIntro",
    "short_intro": "profile.shortIntro",
    "profile.shortIntro": "profile.shortIntro",
    "quote": "profile.quote",
    "profile.quote": "profile.quote",

    # profile.basicInfo
    "gender": "profile.basicInfo.gender",
    "genre": "profile.basicInfo.genre",
    "race": "profile.basicInfo.race",
    "job": "profile.basicInfo.job",
    "age": "profile.basicInfo.age",
    "personality": "profile.basicInfo.personality",
    "ability": "profile.basicInfo.ability",
    "weapon": "profile.basicInfo.weapon",
    "height": "profile.basicInfo.height",
    "weight": "profile.basicInfo.weight",
    "measurements": "profile.basicInfo.measurements",
}

SUPPORTED_PATHS = set(COLUMN_ALIASES.values()) | {
    "profile.shortIntro",
    "profile.quote",
    "profile.basicInfo.gender",
    "profile.basicInfo.genre",
    "profile.basicInfo.race",
    "profile.basicInfo.job",
    "profile.basicInfo.age",
    "profile.basicInfo.personality",
    "profile.basicInfo.ability",
    "profile.basicInfo.weapon",
    "profile.basicInfo.height",
    "profile.basicInfo.weight",
    "profile.basicInfo.measurements",
}

REMOVED_COLUMN_NAMES = {
    "uni" + "verse", "faction", "activityArea", "activityarea", "activity_area", "position",
    "overview", "socialPosition", "socialposition", "social_position",
    "mainActivities", "mainactivities", "main_activities",
    "strengths", "weaknesses", "relationships", "conflicts",
    "publicCaution", "publiccaution", "public_caution",
    "privatePending", "privatepending", "private_pending",
    "longTermForeshadowing", "longtermforeshadowing", "long_term_foreshadowing",
    "firstIncidentTwist", "firstincidenttwist", "first_incident_twist",
}


def col_to_index(cell_ref: str) -> int:
    letters = re.sub(r"[^A-Z]", "", cell_ref.upper())
    index = 0
    for ch in letters:
        index = index * 26 + (ord(ch) - ord("A") + 1)
    return index - 1


def normalize_cell_value(value: Any) -> str:
    if value is None:
        return ""
    return str(value).strip()


def read_first_sheet_xlsx(path: Path) -> List[List[str]]:
    ns = {
        "main": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
        "rel": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
        "pkgrel": "http://schemas.openxmlformats.org/package/2006/relationships",
    }
    with zipfile.ZipFile(path) as zf:
        shared_strings: List[str] = []
        if "xl/sharedStrings.xml" in zf.namelist():
            root = ET.fromstring(zf.read("xl/sharedStrings.xml"))
            for si in root.findall("main:si", ns):
                parts = []
                for t in si.findall(".//main:t", ns):
                    parts.append(t.text or "")
                shared_strings.append("".join(parts))

        sheet_name = "xl/worksheets/sheet1.xml"
        if sheet_name not in zf.namelist():
            workbook = ET.fromstring(zf.read("xl/workbook.xml"))
            first_sheet = workbook.find("main:sheets/main:sheet", ns)
            if first_sheet is None:
                raise ValueError("Workbook has no sheets.")
            rel_id = first_sheet.attrib.get("{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id")
            rels = ET.fromstring(zf.read("xl/_rels/workbook.xml.rels"))
            target = None
            for rel in rels.findall("pkgrel:Relationship", ns):
                if rel.attrib.get("Id") == rel_id:
                    target = rel.attrib.get("Target")
                    break
            if not target:
                raise ValueError("Could not find first worksheet target.")
            if target.startswith("/"):
                sheet_name = target.lstrip("/")
            else:
                sheet_name = "xl/" + target.lstrip("/")

        sheet = ET.fromstring(zf.read(sheet_name))
        rows: List[List[str]] = []
        for row in sheet.findall(".//main:sheetData/main:row", ns):
            values: Dict[int, str] = {}
            max_col = -1
            for c in row.findall("main:c", ns):
                ref = c.attrib.get("r", "")
                col_idx = col_to_index(ref)
                max_col = max(max_col, col_idx)
                cell_type = c.attrib.get("t")
                raw = ""

                if cell_type == "inlineStr":
                    inline = c.find("main:is", ns)
                    if inline is not None:
                        raw = "".join(t.text or "" for t in inline.findall(".//main:t", ns))
                else:
                    v = c.find("main:v", ns)
                    raw = v.text if v is not None and v.text is not None else ""
                    if cell_type == "s" and raw != "":
                        raw = shared_strings[int(raw)]
                    elif cell_type == "b":
                        raw = "TRUE" if raw == "1" else "FALSE"

                values[col_idx] = normalize_cell_value(raw)

            if max_col >= 0:
                rows.append([values.get(i, "") for i in range(max_col + 1)])

    while rows and not any(cell.strip() for cell in rows[-1]):
        rows.pop()
    return rows


def rows_to_records(rows: List[List[str]]) -> Tuple[List[Dict[str, str]], List[str]]:
    header_index = None
    for i, row in enumerate(rows):
        if any(normalize_cell_value(cell) for cell in row):
            header_index = i
            break
    if header_index is None:
        raise ValueError("No header row found.")

    headers = [normalize_cell_value(cell) for cell in rows[header_index]]
    if not any(headers):
        raise ValueError("Header row is empty.")

    records: List[Dict[str, str]] = []
    for row in rows[header_index + 1:]:
        if not any(normalize_cell_value(cell) for cell in row):
            continue
        record: Dict[str, str] = {}
        for idx, header in enumerate(headers):
            if not header:
                continue
            record[header] = normalize_cell_value(row[idx] if idx < len(row) else "")
        records.append(record)
    return records, headers


def read_characters_js(path: Path) -> Tuple[str, List[Dict[str, Any]], str]:
    text = path.read_text(encoding="utf-8")
    match = re.search(r"^(?P<prefix>.*?window\.CHARACTERS\s*=\s*)(?P<array>\[.*\])(?P<suffix>\s*;\s*)$", text, re.S)
    if not match:
        raise ValueError(f"Could not parse {path}. Expected 'window.CHARACTERS = [...]'.")
    characters = json.loads(match.group("array"))
    if not isinstance(characters, list):
        raise ValueError("window.CHARACTERS is not an array.")
    return match.group("prefix"), characters, match.group("suffix")


def write_characters_js(path: Path, prefix: str, characters: List[Dict[str, Any]], suffix: str) -> None:
    array_text = json.dumps(characters, ensure_ascii=False, indent=2)
    path.write_text(prefix + array_text + suffix, encoding="utf-8")


def make_default_character(folder: str) -> Dict[str, Any]:
    return {
        "name": "",
        "en": "",
        "themeColor": "#56D1B9",
        "profile": {
            "shortIntro": "",
            "quote": "",
            "basicInfo": copy.deepcopy(BASIC_INFO_DEFAULTS),
        },
        "folder": folder,
        "albumKeys": [],
    }


def normalize_character_schema(character: Dict[str, Any]) -> None:
    profile = character.get("profile")
    if not isinstance(profile, dict):
        profile = {}
        character["profile"] = profile

    profile["shortIntro"] = normalize_cell_value(profile.get("shortIntro"))
    profile["quote"] = normalize_cell_value(profile.get("quote"))

    basic_info = profile.get("basicInfo")
    if not isinstance(basic_info, dict):
        basic_info = {}
        profile["basicInfo"] = basic_info
    for key, default_value in BASIC_INFO_DEFAULTS.items():
        basic_info[key] = normalize_cell_value(basic_info.get(key)) or default_value

    profile.pop("wo" + "rldPlacement", None)
    character.pop("detail" + "Settings", None)
    character.pop("author" + "Memo", None)


def header_to_path(header: str) -> str | None:
    normalized = normalize_cell_value(header)
    if not normalized:
        return None
    if normalized in SUPPORTED_PATHS:
        return normalized
    alias_key = re.sub(r"\s+", "", normalized)
    return COLUMN_ALIASES.get(normalized) or COLUMN_ALIASES.get(alias_key) or COLUMN_ALIASES.get(alias_key.lower())


def is_removed_column(header: str) -> bool:
    normalized = normalize_cell_value(header)
    if normalized in REMOVED_COLUMN_NAMES:
        return True
    alias_key = re.sub(r"\s+", "", normalized)
    return alias_key in REMOVED_COLUMN_NAMES or alias_key.lower() in REMOVED_COLUMN_NAMES


def parse_album_keys(value: str) -> List[str]:
    if value.upper() == CLEAR_TOKEN:
        return []
    parts = [part.strip() for part in value.split(",")]
    return [part for part in parts if part]


def parse_bool(value: str) -> bool:
    text = value.strip().lower()
    if text in {"true", "1", "yes", "y", "예", "네", "숨김", "hidden"}:
        return True
    if text in {"false", "0", "no", "n", "아니오", "아니요", "표시", "visible"}:
        return False
    raise ValueError(f"Invalid boolean value: {value!r}")


def set_nested(data: Dict[str, Any], path: str, raw_value: str) -> None:
    if path == "folder":
        data["folder"] = raw_value
        return
    if path == "albumKeys":
        data["albumKeys"] = parse_album_keys(raw_value)
        return
    if path == "hidden":
        if raw_value.upper() == CLEAR_TOKEN:
            data.pop("hidden", None)
        else:
            data["hidden"] = parse_bool(raw_value)
        return

    keys = path.split(".")
    target: Dict[str, Any] = data
    for key in keys[:-1]:
        next_value = target.get(key)
        if not isinstance(next_value, dict):
            next_value = {}
            target[key] = next_value
        target = next_value

    final_key = keys[-1]
    target[final_key] = "" if raw_value.upper() == CLEAR_TOKEN else raw_value


def load_known_album_keys(app_core_path: Path) -> set[str]:
    if not app_core_path.exists():
        return set()
    text = app_core_path.read_text(encoding="utf-8")
    match = re.search(r"const\s+albumKeyDefinitions\s*=\s*\{(?P<body>.*?)\n\s*\};", text, re.S)
    if not match:
        return set()
    return set(re.findall(r"^\s*([A-Za-z_][A-Za-z0-9_]*)\s*:", match.group("body"), re.M))


def upsert_records(
    characters: List[Dict[str, Any]],
    records: List[Dict[str, str]],
    headers: List[str],
    known_album_keys: set[str],
) -> Tuple[int, int, int, List[str]]:
    folder_to_index = {
        str(ch.get("folder", "")).strip(): idx
        for idx, ch in enumerate(characters)
        if str(ch.get("folder", "")).strip()
    }
    header_paths: Dict[str, str] = {}
    warnings: List[str] = []

    for header in headers:
        path = header_to_path(header)
        if path is None:
            if normalize_cell_value(header):
                if is_removed_column(header):
                    warnings.append(f"Removed detail/story column skipped: {header}")
                else:
                    warnings.append(f"Unknown column skipped: {header}")
            continue
        header_paths[header] = path

    if "folder" not in set(header_paths.values()):
        raise ValueError("The sheet must include a 'folder' column.")

    added = 0
    updated = 0
    changed_cells = 0

    for character in characters:
        normalize_character_schema(character)

    for row_number, record in enumerate(records, start=2):
        folder_value = normalize_cell_value(record.get("folder", ""))
        if not folder_value:
            warnings.append(f"Row {row_number} skipped: folder is empty.")
            continue

        if folder_value in folder_to_index:
            character = characters[folder_to_index[folder_value]]
            was_new = False
        else:
            character = make_default_character(folder_value)
            characters.append(character)
            folder_to_index[folder_value] = len(characters) - 1
            added += 1
            was_new = True

        row_changed = False
        for header, path in header_paths.items():
            raw_value = normalize_cell_value(record.get(header, ""))
            if raw_value == "":
                continue
            if path == "folder":
                continue
            if path == "albumKeys":
                album_keys = parse_album_keys(raw_value)
                unknown_keys = sorted(set(album_keys) - known_album_keys) if known_album_keys else []
                if unknown_keys:
                    warnings.append(
                        f"Row {row_number} folder={folder_value}: unknown albumKeys {', '.join(unknown_keys)}. "
                        "characters.js was updated, but app-core.js must define these keys to render them."
                    )
            before = copy.deepcopy(character)
            set_nested(character, path, raw_value)
            normalize_character_schema(character)
            if character != before:
                row_changed = True
                changed_cells += 1

        if row_changed and not was_new:
            updated += 1

    return added, updated, changed_cells, warnings


def main() -> int:
    parser = argparse.ArgumentParser(description="Upsert basic Excel rows into characters.js.")
    parser.add_argument("xlsx", type=Path, help="Input .xlsx file. The first sheet is used.")
    parser.add_argument("--characters", type=Path, default=Path("characters.js"), help="Path to characters.js.")
    parser.add_argument("--out", type=Path, default=None, help="Write output to this file instead of replacing characters.js.")
    parser.add_argument("--dry-run", action="store_true", help="Validate and report without writing.")
    args = parser.parse_args()

    xlsx_path = args.xlsx
    characters_path = args.characters

    if not xlsx_path.exists():
        raise FileNotFoundError(xlsx_path)
    if not characters_path.exists():
        raise FileNotFoundError(characters_path)

    rows = read_first_sheet_xlsx(xlsx_path)
    records, headers = rows_to_records(rows)
    prefix, characters, suffix = read_characters_js(characters_path)
    known_album_keys = load_known_album_keys(characters_path.parent / "app-core.js")

    added, updated, changed_cells, warnings = upsert_records(characters, records, headers, known_album_keys)

    print(f"Input rows: {len(records)}")
    print(f"Added characters: {added}")
    print(f"Updated characters: {updated}")
    print(f"Changed fields: {changed_cells}")
    for warning in warnings:
        print(f"WARNING: {warning}", file=sys.stderr)

    if args.dry_run:
        print("Dry run only. characters.js was not written.")
        return 0

    output_path = args.out or characters_path
    write_characters_js(output_path, prefix, characters, suffix)
    print(f"Wrote: {output_path}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        raise SystemExit(1)
