# Story Import Tool

`story_import_from_zip.py` imports short-story Markdown files into the current 서재 story tree.

## What it reads

- `characters.js`
- `story-taxonomy.js`
- `story-data.js`
- a ZIP file or folder containing `.md` files

## What it writes

- `story-data.js`
- `story/<genreGroup>/<genre>/<characterFolder>/shorts/<characterFolder>_NN.md`
- `story-import-manifest.csv`
- `story-import-report.md`

It does **not** modify `characters.js`.

## Recommended input file names

Use the character `folder` value plus the story number.

```text
rabi_03.md
alice_02.md
tanilaEllamin_02.md
xi-xi_02.md
```

When the number is omitted, the tool assigns the next available number for that character.

```text
rabi.md  -> story-rabi-003 if 001 and 002 already exist
```

## Markdown format

The generated story format can be used as-is.

```md
---
문서명: 예시 문서명
자산_ID: STORY-RABI-SHORT-003
---

# 라비 / Rabi — 새 단편 제목

본문...
```

The title is extracted from the first H1 line after the em dash:

```text
새 단편 제목
```

The character is matched in this order:

1. File name stem, such as `rabi_03.md`
2. Frontmatter asset id, such as `STORY-RABI-SHORT-003`
3. H1 character name / English name, such as `라비 / Rabi`

## Usage

From the project root:

```bash
python tools/story_import_from_zip.py top_20_3편.zip
```

Dry run first:

```bash
python tools/story_import_from_zip.py top_20_3편.zip --dry-run
```

Import from a folder:

```bash
python tools/story_import_from_zip.py story-import/
```

Import while explicitly setting the project root:

```bash
python tools/story_import_from_zip.py top_20_3편.zip --project-root /path/to/project
```

## Duplicate behavior

If the incoming file resolves to an existing story id, such as `story-rabi-002`, the tool updates that story's title/file metadata and overwrites the matching Markdown file. This is useful for fixing an existing episode.

If no number is provided, the tool adds the next available episode number instead of replacing an existing one.

## Current scope

Supported now:

- character-owned short stories
- one primary character per story
- automatic path creation from `story-taxonomy.js`

Reserved for later:

- series imports
- crossovers
- multi-character participant lists
