// admin-tools.js — browser-side admin utilities for safe patch/result generation.
(function () {
  "use strict";

  const MAX_PREVIEW_ROWS = 80;
  const IMPORT_ROOT = "story";
  const SHORTS_DIRECTORY = "shorts";
  const CLEAR_TOKEN = "CLEAR";

  const BASIC_INFO_DEFAULTS = {
    gender: "미등록",
    genre: "미등록",
    race: "미등록",
    job: "미등록",
    age: "미등록",
    personality: "미등록",
    ability: "미등록",
    weapon: "미등록",
    height: "미등록",
    weight: "미등록",
    measurements: "미등록"
  };

  const COLUMN_ALIASES = {
    name: "name",
    en: "en",
    themeColor: "themeColor",
    themecolor: "themeColor",
    theme_color: "themeColor",
    folder: "folder",
    albumKeys: "albumKeys",
    albumkeys: "albumKeys",
    album_keys: "albumKeys",
    hidden: "hidden",

    shortIntro: "profile.shortIntro",
    shortintro: "profile.shortIntro",
    short_intro: "profile.shortIntro",
    "profile.shortIntro": "profile.shortIntro",
    quote: "profile.quote",
    "profile.quote": "profile.quote",

    gender: "profile.basicInfo.gender",
    genre: "profile.basicInfo.genre",
    race: "profile.basicInfo.race",
    job: "profile.basicInfo.job",
    age: "profile.basicInfo.age",
    personality: "profile.basicInfo.personality",
    ability: "profile.basicInfo.ability",
    weapon: "profile.basicInfo.weapon",
    height: "profile.basicInfo.height",
    weight: "profile.basicInfo.weight",
    measurements: "profile.basicInfo.measurements"
  };

  const SUPPORTED_PATHS = new Set([
    ...Object.values(COLUMN_ALIASES),
    "profile.shortIntro",
    "profile.quote",
    ...Object.keys(BASIC_INFO_DEFAULTS).map(key => `profile.basicInfo.${key}`)
  ]);

  const REMOVED_COLUMN_NAMES = new Set([
    "universe", "faction", "activityArea", "activityarea", "activity_area", "position",
    "overview", "socialPosition", "socialposition", "social_position",
    "mainActivities", "mainactivities", "main_activities",
    "strengths", "weaknesses", "relationships", "conflicts",
    "publicCaution", "publiccaution", "public_caution",
    "privatePending", "privatepending", "private_pending",
    "longTermForeshadowing", "longtermforeshadowing", "long_term_foreshadowing",
    "firstIncidentTwist", "firstincidenttwist", "first_incident_twist"
  ]);

  const elements = {
    tabs: [],
    panels: [],
    story: {},
    character: {}
  };

  let plannedStoryImport = null;
  let plannedCharacterImport = null;

  function $(selector) {
    return document.querySelector(selector);
  }

  function text(value, fallback = "") {
    const result = String(value ?? "").trim();
    return result || fallback;
  }

  function deepClone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function padStoryNumber(value) {
    return String(Math.max(1, Number(value) || 1)).padStart(3, "0");
  }

  function displayStoryNumber(value) {
    return String(Math.max(1, Number(value) || 1)).padStart(2, "0");
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function normalizeKey(value) {
    return String(value ?? "")
      .toLowerCase()
      .normalize("NFKC")
      .replace(/[\s_\-./()[\]{}'"“”‘’·:：,，]/g, "");
  }

  function getCharacters() {
    return Array.isArray(window.CHARACTERS) ? window.CHARACTERS : [];
  }

  function getStories() {
    return Array.isArray(window.STORY_DATA) ? window.STORY_DATA : [];
  }

  function getTaxonomy() {
    return window.STORY_TAXONOMY ?? {};
  }

  function getCharacterFolder(characterData) {
    return text(characterData?.folder);
  }

  function getCharacterName(characterData) {
    return text(characterData?.name, "");
  }

  function getCharacterEnglishName(characterData) {
    return text(characterData?.en, "");
  }

  function getCharacterPlacement(characterFolder) {
    const taxonomy = getTaxonomy();
    const directPlacement = taxonomy.characterPlacements?.[characterFolder];
    if (directPlacement?.genreGroupCode || directPlacement?.worldCode) {
      const worldCode = text(directPlacement.worldCode, directPlacement.genreGroupCode);
      const worldName = text(directPlacement.worldName, directPlacement.genreGroupName);
      return {
        genreGroupCode: text(worldCode, "uncategorized"),
        genreGroupName: text(worldName, "미분류 세계관"),
        genreCode: text(directPlacement.genreCode, worldCode || "uncategorized"),
        genreName: text(directPlacement.genreName, worldName || "미분류 세계관")
      };
    }

    const groups = Array.isArray(taxonomy.genreGroups) ? taxonomy.genreGroups : [];
    for (const group of groups) {
      const groupCharacterList = Array.isArray(group?.characters) ? group.characters : [];
      if (groupCharacterList.includes(characterFolder)) {
        return {
          genreGroupCode: text(group.code),
          genreGroupName: text(group.name, "미분류 세계관"),
          genreCode: text(group.code),
          genreName: text(group.name, "미분류 세계관")
        };
      }

      const genres = Array.isArray(group?.genres) ? group.genres : [];
      for (const genre of genres) {
        const characterList = Array.isArray(genre?.characters) ? genre.characters : [];
        if (characterList.includes(characterFolder)) {
          return {
            genreGroupCode: text(group.code),
            genreGroupName: text(group.name, "미분류 세계관"),
            genreCode: text(genre.code),
            genreName: text(genre.name, "미분류")
          };
        }
      }
    }

    return {
      genreGroupCode: "uncategorized",
      genreGroupName: "미분류 세계관",
      genreCode: "uncategorized",
      genreName: "미분류 세계관"
    };
  }

  function buildCharacterLookup() {
    const lookup = new Map();

    getCharacters().forEach(characterData => {
      const folder = getCharacterFolder(characterData);
      if (!folder) return;
      [
        folder,
        getCharacterName(characterData),
        getCharacterEnglishName(characterData),
      ].forEach(key => {
        const normalized = normalizeKey(key);
        if (normalized && !lookup.has(normalized)) lookup.set(normalized, characterData);
      });
    });

    return lookup;
  }

  function stripFrontmatter(markdownText) {
    const source = String(markdownText ?? "").replace(/^\uFEFF/, "");
    if (!source.startsWith("---")) return source;
    const lines = source.split(/\r?\n/);
    for (let index = 1; index < lines.length; index += 1) {
      if (lines[index].trim() === "---") {
        return lines.slice(index + 1).join("\n").replace(/^\s+/, "");
      }
    }
    return source;
  }

  function findLeadingHeading(markdownText) {
    const content = stripFrontmatter(markdownText);
    const headingLine = content.split(/\r?\n/).find(line => /^#{1,6}\s+/.test(line.trim()));
    return headingLine ? headingLine.replace(/^#{1,6}\s+/, "").trim() : "";
  }

  function removeEmojiPrefix(value) {
    return String(value ?? "")
      .replace(/^[^\p{L}\p{N}]+/u, "")
      .trim();
  }

  function parseHeading(headingText) {
    const cleanHeading = removeEmojiPrefix(headingText);
    if (!cleanHeading) {
      return { characterPart: "", title: "" };
    }

    const dashMatch = cleanHeading.match(/^(.*?)\s*[—–-]\s*(.+)$/);
    if (dashMatch) {
      return {
        characterPart: dashMatch[1].trim(),
        title: dashMatch[2].trim()
      };
    }

    return { characterPart: "", title: cleanHeading.trim() };
  }

  function getBaseName(pathName) {
    const withoutQuery = String(pathName ?? "").split(/[?#]/)[0];
    const fileName = withoutQuery.split(/[\\/]/).pop() ?? "";
    return fileName.replace(/\.[^.]+$/, "");
  }

  function parseFileName(pathName) {
    const baseName = getBaseName(pathName);
    const match = baseName.match(/^(.*?)(?:[_-](\d{1,3}))?$/);
    const characterKey = text(match?.[1] ?? baseName);
    const number = match?.[2] ? Number(match[2]) : null;
    return { baseName, characterKey, number };
  }

  function matchCharacter(pathName, markdownText, lookup) {
    const fileInfo = parseFileName(pathName);
    const candidates = [fileInfo.characterKey];

    const heading = findLeadingHeading(markdownText);
    const parsedHeading = parseHeading(heading);
    if (parsedHeading.characterPart) {
      parsedHeading.characterPart
        .split("/")
        .map(part => part.trim())
        .filter(Boolean)
        .forEach(part => candidates.push(part));
    }

    for (const candidate of candidates) {
      const matched = lookup.get(normalizeKey(candidate));
      if (matched) {
        return { character: matched, matchedBy: candidate, fileInfo, heading, parsedHeading };
      }
    }

    return { character: null, matchedBy: "", fileInfo, heading, parsedHeading };
  }

  function extractStoryTitle(pathName, markdownText, matchedData) {
    const heading = matchedData.heading || findLeadingHeading(markdownText);
    const parsed = matchedData.parsedHeading || parseHeading(heading);
    const title = text(parsed.title);
    if (title) return title;

    const baseName = matchedData.fileInfo?.baseName || getBaseName(pathName);
    return baseName.replace(/[_-]\d{1,3}$/, "").replace(/[_-]+/g, " ").trim() || "제목 미정";
  }

  function getExistingStoryNumbers() {
    const numbers = new Map();

    getStories().forEach(storyData => {
      const characterId = text(storyData?.characterId);
      if (!characterId) return;
      const source = `${storyData?.id ?? ""} ${storyData?.file ?? ""}`;
      const matches = Array.from(source.matchAll(/(?:_|-)(\d{1,3})(?:\.md)?\b/g));
      const number = matches.length ? Number(matches[matches.length - 1][1]) : 1;
      if (!numbers.has(characterId)) numbers.set(characterId, new Set());
      numbers.get(characterId).add(number || 1);
    });

    return numbers;
  }

  function pickStoryNumber(characterId, requestedNumber, usedNumbers) {
    if (!usedNumbers.has(characterId)) usedNumbers.set(characterId, new Set());
    const characterNumbers = usedNumbers.get(characterId);

    if (requestedNumber) {
      characterNumbers.add(requestedNumber);
      return requestedNumber;
    }

    let nextNumber = 1;
    while (characterNumbers.has(nextNumber)) nextNumber += 1;
    characterNumbers.add(nextNumber);
    return nextNumber;
  }

  function buildStoryDataText(stories) {
    const comment = [
      "// Story metadata only. Each current story belongs to one character.",
      "// The shelf tree uses story-taxonomy.js for genre group / genre / character placement.",
      "// Keep entries minimal: id, characterId, title, file.",
      ""
    ].join("\n");

    return `${comment}window.STORY_DATA = ${JSON.stringify(stories, null, 2)};\n`;
  }

  function getStoryNumber(storyData) {
    const source = `${storyData?.id ?? ""} ${storyData?.file ?? ""}`;
    const matches = Array.from(source.matchAll(/(?:_|-)(\d{1,3})(?:\.md)?\b/g));
    return matches.length ? Number(matches[matches.length - 1][1]) : 1;
  }

  function sortStoryData(stories) {
    const characterOrder = new Map();
    getCharacters().forEach((characterData, index) => {
      const folder = getCharacterFolder(characterData);
      if (folder) characterOrder.set(folder, index);
    });

    return [...stories].sort((first, second) => {
      const firstIndex = characterOrder.get(text(first.characterId)) ?? Number.MAX_SAFE_INTEGER;
      const secondIndex = characterOrder.get(text(second.characterId)) ?? Number.MAX_SAFE_INTEGER;
      if (firstIndex !== secondIndex) return firstIndex - secondIndex;
      const firstNumber = getStoryNumber(first);
      const secondNumber = getStoryNumber(second);
      if (firstNumber !== secondNumber) return firstNumber - secondNumber;
      return text(first.title).localeCompare(text(second.title), "ko");
    });
  }

  function planStoryImport(entries) {
    const lookup = buildCharacterLookup();
    const usedNumbers = getExistingStoryNumbers();
    const existingStories = getStories();
    const existingById = new Map(existingStories.map(storyData => [text(storyData?.id), storyData]));
    const storyMap = new Map(existingStories.map(storyData => [text(storyData?.id), { ...storyData }]));
    const plannedFiles = [];
    const plannedTargets = new Set();
    const results = [];

    entries.forEach(entry => {
      const match = matchCharacter(entry.path, entry.text, lookup);
      if (!match.character) {
        results.push({
          source: entry.path,
          ok: false,
          status: "매칭 실패",
          detail: "파일명 또는 제목 줄에서 캐릭터를 찾지 못했습니다."
        });
        return;
      }

      const characterFolder = getCharacterFolder(match.character);
      const placement = getCharacterPlacement(characterFolder);
      const storyNumber = pickStoryNumber(characterFolder, match.fileInfo.number, usedNumbers);
      const storyNumberThree = padStoryNumber(storyNumber);
      const storyNumberTwo = displayStoryNumber(storyNumber);
      const storyId = `story-${characterFolder}-${storyNumberThree}`;
      const filePath = [
        IMPORT_ROOT,
        placement.genreGroupCode,
        characterFolder,
        SHORTS_DIRECTORY,
        `${characterFolder}_${storyNumberTwo}.md`
      ].join("/");
      const title = extractStoryTitle(entry.path, entry.text, match);
      const action = existingById.has(storyId) ? "갱신" : "추가";

      if (plannedTargets.has(filePath)) {
        results.push({
          source: entry.path,
          ok: false,
          status: "중복 대상",
          detail: `${filePath} 경로로 들어가는 파일이 ZIP 안에 이미 있습니다.`
        });
        return;
      }

      plannedTargets.add(filePath);
      storyMap.set(storyId, {
        id: storyId,
        characterId: characterFolder,
        title,
        file: filePath
      });

      plannedFiles.push({ path: filePath, text: entry.text });

      results.push({
        source: entry.path,
        ok: true,
        status: action,
        characterName: getCharacterName(match.character),
        characterFolder,
        number: storyNumberThree,
        title,
        target: filePath
      });
    });

    const updatedStories = sortStoryData(Array.from(storyMap.values()));
    const addedCount = results.filter(result => result.ok && result.status === "추가").length;
    const updatedCount = results.filter(result => result.ok && result.status === "갱신").length;
    const failedCount = results.filter(result => !result.ok).length;

    return {
      results,
      files: plannedFiles,
      storyDataText: buildStoryDataText(updatedStories),
      updatedStoryCount: updatedStories.length,
      addedCount,
      updatedCount,
      failedCount
    };
  }

  function getKnownAlbumKeys() {
    if (typeof albumKeyDefinitions === "undefined" || !albumKeyDefinitions) return new Set();
    return new Set(Object.keys(albumKeyDefinitions));
  }

  function makeDefaultCharacter(folder) {
    return {
      name: "",
      en: "",
      themeColor: "#56D1B9",
      profile: {
        shortIntro: "",
        quote: "",
        basicInfo: { ...BASIC_INFO_DEFAULTS }
      },
      folder,
      albumKeys: []
    };
  }

  function normalizeCharacterSchema(characterData) {
    if (!characterData || typeof characterData !== "object") return;

    if (!characterData.profile || typeof characterData.profile !== "object") {
      characterData.profile = {};
    }

    characterData.profile.shortIntro = text(characterData.profile.shortIntro);
    characterData.profile.quote = text(characterData.profile.quote);

    if (!characterData.profile.basicInfo || typeof characterData.profile.basicInfo !== "object") {
      characterData.profile.basicInfo = {};
    }

    Object.entries(BASIC_INFO_DEFAULTS).forEach(([key, fallback]) => {
      characterData.profile.basicInfo[key] = text(characterData.profile.basicInfo[key], fallback);
    });

    delete characterData.profile.worldPlacement;
    delete characterData.detailSettings;
    delete characterData.authorMemo;
  }

  function headerToPath(header) {
    const normalized = text(header);
    if (!normalized) return null;
    if (SUPPORTED_PATHS.has(normalized)) return normalized;
    const aliasKey = normalized.replace(/\s+/g, "");
    return COLUMN_ALIASES[normalized] || COLUMN_ALIASES[aliasKey] || COLUMN_ALIASES[aliasKey.toLowerCase()] || null;
  }

  function isRemovedColumn(header) {
    const normalized = text(header);
    const aliasKey = normalized.replace(/\s+/g, "");
    return REMOVED_COLUMN_NAMES.has(normalized)
      || REMOVED_COLUMN_NAMES.has(aliasKey)
      || REMOVED_COLUMN_NAMES.has(aliasKey.toLowerCase());
  }

  function parseAlbumKeys(value) {
    if (text(value).toUpperCase() === CLEAR_TOKEN) return [];
    return String(value ?? "")
      .split(",")
      .map(part => part.trim())
      .filter(Boolean);
  }

  function parseBoolean(value) {
    const normalized = text(value).toLowerCase();
    if (["true", "1", "yes", "y", "예", "네", "숨김", "hidden"].includes(normalized)) return true;
    if (["false", "0", "no", "n", "아니오", "아니요", "표시", "visible"].includes(normalized)) return false;
    throw new Error(`유효하지 않은 hidden 값: ${value}`);
  }

  function setNested(data, path, rawValue) {
    if (path === "folder") {
      data.folder = rawValue;
      return;
    }

    if (path === "albumKeys") {
      data.albumKeys = parseAlbumKeys(rawValue);
      return;
    }

    if (path === "hidden") {
      if (text(rawValue).toUpperCase() === CLEAR_TOKEN) {
        delete data.hidden;
      } else {
        data.hidden = parseBoolean(rawValue);
      }
      return;
    }

    const keys = path.split(".");
    let target = data;
    keys.slice(0, -1).forEach(key => {
      if (!target[key] || typeof target[key] !== "object") target[key] = {};
      target = target[key];
    });
    target[keys[keys.length - 1]] = text(rawValue).toUpperCase() === CLEAR_TOKEN ? "" : rawValue;
  }

  function buildCharactersText(characters) {
    const comment = [
      "// Character data only. Add/edit characters here, then refresh character-ui.html.",
      "// Base image paths are generated automatically from folder as:",
      "// assets/characters/<folder>/main.png, thumb.png, doodle.png, turn.png",
      "// Optional album slots are controlled through albumKeys. Current common keys: figure, magazine, sketch.",
      "// Set hidden: true to keep a template character out of the list.",
      "// Story/detail text was reset for the character-archive baseline. Intro and quote fields remain profile fields.",
      ""
    ].join("\n");

    return `${comment}window.CHARACTERS = ${JSON.stringify(characters, null, 2)};\n`;
  }

  function rowsToRecords(rows) {
    const headerIndex = rows.findIndex(row => row.some(cell => text(cell)));
    if (headerIndex < 0) {
      throw new Error("엑셀에서 헤더 행을 찾지 못했습니다.");
    }

    const headers = rows[headerIndex].map(cell => text(cell));
    if (!headers.some(Boolean)) {
      throw new Error("엑셀 헤더가 비어 있습니다.");
    }

    const records = [];
    rows.slice(headerIndex + 1).forEach((row, index) => {
      if (!row.some(cell => text(cell))) return;
      const record = {};
      headers.forEach((header, cellIndex) => {
        if (!header) return;
        record[header] = text(row[cellIndex] ?? "");
      });
      records.push({ rowNumber: headerIndex + index + 2, record });
    });

    return { headers, records };
  }

  function findDuplicateValues(items, getter) {
    const seen = new Map();
    const duplicates = new Set();

    items.forEach(item => {
      const value = text(getter(item));
      if (!value) return;
      const normalized = normalizeKey(value);
      if (!normalized) return;
      if (seen.has(normalized)) duplicates.add(value);
      else seen.set(normalized, item);
    });

    return Array.from(duplicates);
  }

  function planCharacterImport(rows) {
    const { headers, records } = rowsToRecords(rows);
    const headerPaths = new Map();
    const warnings = [];
    const knownAlbumKeys = getKnownAlbumKeys();

    headers.forEach(header => {
      const path = headerToPath(header);
      if (!path) {
        if (text(header)) {
          warnings.push(isRemovedColumn(header)
            ? `제거된 예전 상세/세계관 컬럼 건너뜀: ${header}`
            : `알 수 없는 컬럼 건너뜀: ${header}`);
        }
        return;
      }
      headerPaths.set(header, path);
    });

    if (![...headerPaths.values()].includes("folder")) {
      throw new Error("엑셀에는 folder 컬럼이 필요합니다.");
    }

    const characters = deepClone(getCharacters());
    characters.forEach(normalizeCharacterSchema);

    const folderToIndex = new Map();
    characters.forEach((characterData, index) => {
      const folder = getCharacterFolder(characterData);
      if (folder && !folderToIndex.has(folder)) folderToIndex.set(folder, index);
    });

    const results = [];
    let addedCount = 0;
    let updatedCount = 0;
    let changedFieldCount = 0;
    let failedCount = 0;
    const sheetFolders = new Set();

    records.forEach(({ rowNumber, record }) => {
      const folderValue = text(record.folder);
      if (!folderValue) {
        results.push({
          ok: true,
          status: "건너뜀",
          rowNumber,
          main: "folder 비어 있음",
          detail: "folder가 없는 행은 반영하지 않습니다."
        });
        warnings.push(`행 ${rowNumber}: folder가 없어 건너뛰었습니다.`);
        return;
      }

      if (sheetFolders.has(folderValue)) {
        warnings.push(`엑셀 안에 같은 folder가 여러 번 등장합니다: ${folderValue}`);
      }
      sheetFolders.add(folderValue);

      let characterData;
      let isNew = false;
      if (folderToIndex.has(folderValue)) {
        characterData = characters[folderToIndex.get(folderValue)];
      } else {
        characterData = makeDefaultCharacter(folderValue);
        characters.push(characterData);
        folderToIndex.set(folderValue, characters.length - 1);
        isNew = true;
        addedCount += 1;
      }

      const beforeText = JSON.stringify(characterData);
      const changedPaths = [];

      try {
        headerPaths.forEach((path, header) => {
          const rawValue = text(record[header]);
          if (!rawValue || path === "folder") return;

          if (path === "albumKeys") {
            const albumKeys = parseAlbumKeys(rawValue);
            const unknownKeys = knownAlbumKeys.size
              ? albumKeys.filter(key => !knownAlbumKeys.has(key))
              : [];
            if (unknownKeys.length) {
              warnings.push(`행 ${rowNumber} folder=${folderValue}: 알 수 없는 albumKeys ${unknownKeys.join(", ")}`);
            }
          }

          const beforePathText = JSON.stringify(characterData);
          setNested(characterData, path, rawValue);
          normalizeCharacterSchema(characterData);
          if (JSON.stringify(characterData) !== beforePathText) {
            changedPaths.push(path);
            changedFieldCount += 1;
          }
        });
      } catch (error) {
        results.push({
          ok: false,
          status: "오류",
          rowNumber,
          main: folderValue,
          detail: error?.message || "행 처리 중 오류가 발생했습니다."
        });
        failedCount += 1;
        return;
      }

      const changed = JSON.stringify(characterData) !== beforeText;
      if (changed && !isNew) updatedCount += 1;

      results.push({
        ok: true,
        status: isNew ? "신규" : (changed ? "수정" : "변경 없음"),
        rowNumber,
        main: `${text(characterData.name, "이름 미등록")} / ${folderValue}`,
        detail: changedPaths.length ? `${changedPaths.length}개 필드 반영` : "반영할 변경 없음"
      });
    });

    const duplicateFolders = findDuplicateValues(characters, characterData => characterData.folder);
    const duplicateNames = findDuplicateValues(characters, characterData => characterData.name);
    const duplicateEnglishNames = findDuplicateValues(characters, characterData => characterData.en);

    duplicateFolders.forEach(value => {
      warnings.push(`결과 characters.js에 중복 folder가 있습니다: ${value}`);
      failedCount += 1;
    });
    duplicateNames.forEach(value => warnings.push(`결과 characters.js에 중복 이름이 있습니다: ${value}`));
    duplicateEnglishNames.forEach(value => warnings.push(`결과 characters.js에 중복 영문명이 있습니다: ${value}`));

    return {
      results,
      warnings,
      charactersText: buildCharactersText(characters),
      inputRows: records.length,
      currentCount: getCharacters().length,
      finalCount: characters.length,
      addedCount,
      updatedCount,
      changedFieldCount,
      failedCount
    };
  }

  function setStatus(target, message, tone = "muted") {
    if (!target.status) return;
    target.status.textContent = message;
    target.status.dataset.tone = tone;
  }

  function renderStoryPreview(plan) {
    const target = elements.story;
    if (!target.summary || !target.results) return;

    target.summary.innerHTML = [
      `<strong>${escapeHtml(plan.results.length)}개 파일 분석</strong>`,
      `<span>추가 ${escapeHtml(plan.addedCount)}개</span>`,
      `<span>갱신 ${escapeHtml(plan.updatedCount)}개</span>`,
      `<span>실패 ${escapeHtml(plan.failedCount)}개</span>`,
      `<span>최종 ${escapeHtml(plan.updatedStoryCount)}편</span>`
    ].join("");

    const previewRows = plan.results.slice(0, MAX_PREVIEW_ROWS).map(result => {
      const statusClass = result.ok ? "is-ok" : "is-error";
      const title = result.ok
        ? `${result.characterName} / ${result.title}`
        : result.detail;
      const targetPath = result.ok ? result.target : "대상 없음";
      return `
        <li class="admin-import-row ${statusClass}">
          <span class="admin-import-status">${escapeHtml(result.status)}</span>
          <span class="admin-import-main">${escapeHtml(title)}</span>
          <span class="admin-import-path">${escapeHtml(targetPath)}</span>
        </li>
      `;
    }).join("");

    const moreCount = Math.max(0, plan.results.length - MAX_PREVIEW_ROWS);
    target.results.innerHTML = `
      <ul class="admin-import-list">${previewRows}</ul>
      ${moreCount ? `<p class="admin-import-more">외 ${escapeHtml(moreCount)}개 항목은 생략되었습니다.</p>` : ""}
    `;

    if (target.downloadButton) {
      target.downloadButton.disabled = plan.failedCount > 0 || plan.files.length === 0;
    }
  }

  function renderCharacterPreview(plan) {
    const target = elements.character;
    if (!target.summary || !target.results) return;

    target.summary.innerHTML = [
      `<strong>${escapeHtml(plan.inputRows)}개 행 분석</strong>`,
      `<span>신규 ${escapeHtml(plan.addedCount)}명</span>`,
      `<span>수정 ${escapeHtml(plan.updatedCount)}명</span>`,
      `<span>실패 ${escapeHtml(plan.failedCount)}개</span>`,
      `<span>최종 ${escapeHtml(plan.finalCount)}명</span>`
    ].join("");

    const resultRows = plan.results.slice(0, MAX_PREVIEW_ROWS).map(result => {
      const statusClass = result.ok ? "is-ok" : "is-error";
      return `
        <li class="admin-import-row ${statusClass}">
          <span class="admin-import-status">${escapeHtml(result.status)}</span>
          <span class="admin-import-main">${escapeHtml(`행 ${result.rowNumber}: ${result.main}`)}</span>
          <span class="admin-import-path">${escapeHtml(result.detail)}</span>
        </li>
      `;
    }).join("");

    const warningRows = plan.warnings.slice(0, MAX_PREVIEW_ROWS).map(warning => `
      <li class="admin-import-row is-warning">
        <span class="admin-import-status">주의</span>
        <span class="admin-import-main">${escapeHtml(warning)}</span>
        <span class="admin-import-path">다운로드 전 확인 권장</span>
      </li>
    `).join("");

    const omitted = Math.max(0, plan.results.length - MAX_PREVIEW_ROWS)
      + Math.max(0, plan.warnings.length - MAX_PREVIEW_ROWS);
    target.results.innerHTML = `
      <ul class="admin-import-list">${resultRows}${warningRows}</ul>
      ${omitted ? `<p class="admin-import-more">외 ${escapeHtml(omitted)}개 항목은 생략되었습니다.</p>` : ""}
    `;

    if (target.downloadButton) {
      target.downloadButton.disabled = plan.failedCount > 0;
    }
  }

  function readFileAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.addEventListener("load", () => resolve(reader.result));
      reader.addEventListener("error", () => reject(reader.error || new Error("파일을 읽지 못했습니다.")));
      reader.readAsArrayBuffer(file);
    });
  }

  function getUint16(view, offset) {
    return view.getUint16(offset, true);
  }

  function getUint32(view, offset) {
    return view.getUint32(offset, true);
  }

  async function inflateRaw(data) {
    if (typeof DecompressionStream !== "function") {
      throw new Error("이 브라우저는 압축 ZIP 해제를 지원하지 않습니다. Python 자동화 도구를 사용해 주세요.");
    }
    const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }

  function findEndOfCentralDirectory(bytes, view) {
    const minOffset = Math.max(0, bytes.length - 0xFFFF - 22);
    for (let offset = bytes.length - 22; offset >= minOffset; offset -= 1) {
      if (getUint32(view, offset) === 0x06054b50) return offset;
    }
    throw new Error("ZIP 중앙 디렉터리를 찾지 못했습니다.");
  }

  async function readZipTextEntries(arrayBuffer, shouldInclude) {
    const bytes = new Uint8Array(arrayBuffer);
    const view = new DataView(arrayBuffer);
    const decoder = new TextDecoder("utf-8");

    const eocdOffset = findEndOfCentralDirectory(bytes, view);
    const entryCount = getUint16(view, eocdOffset + 10);
    const centralDirectoryOffset = getUint32(view, eocdOffset + 16);
    const entries = [];

    let cursor = centralDirectoryOffset;
    for (let index = 0; index < entryCount; index += 1) {
      if (getUint32(view, cursor) !== 0x02014b50) {
        throw new Error("ZIP 중앙 디렉터리 항목을 읽지 못했습니다.");
      }

      const method = getUint16(view, cursor + 10);
      const compressedSize = getUint32(view, cursor + 20);
      const fileNameLength = getUint16(view, cursor + 28);
      const extraLength = getUint16(view, cursor + 30);
      const commentLength = getUint16(view, cursor + 32);
      const localHeaderOffset = getUint32(view, cursor + 42);
      const fileName = decoder.decode(bytes.slice(cursor + 46, cursor + 46 + fileNameLength));

      cursor += 46 + fileNameLength + extraLength + commentLength;

      if (fileName.endsWith("/") || !shouldInclude(fileName)) continue;

      if (getUint32(view, localHeaderOffset) !== 0x04034b50) {
        throw new Error(`${fileName}: ZIP 로컬 헤더를 읽지 못했습니다.`);
      }

      const localFileNameLength = getUint16(view, localHeaderOffset + 26);
      const localExtraLength = getUint16(view, localHeaderOffset + 28);
      const dataStart = localHeaderOffset + 30 + localFileNameLength + localExtraLength;
      const compressedData = bytes.slice(dataStart, dataStart + compressedSize);

      let fileBytes;
      if (method === 0) {
        fileBytes = compressedData;
      } else if (method === 8) {
        fileBytes = await inflateRaw(compressedData);
      } else {
        throw new Error(`${fileName}: 지원하지 않는 ZIP 압축 방식입니다. method=${method}`);
      }

      entries.push({ path: fileName, text: decoder.decode(fileBytes) });
    }

    return entries;
  }

  async function readZipMarkdownEntries(arrayBuffer) {
    return readZipTextEntries(arrayBuffer, fileName => fileName.toLowerCase().endsWith(".md"));
  }

  function parseXml(textValue, label) {
    const documentXml = new DOMParser().parseFromString(textValue, "application/xml");
    const parserError = documentXml.getElementsByTagName("parsererror")[0];
    if (parserError) throw new Error(`${label} XML을 읽지 못했습니다.`);
    return documentXml;
  }

  function getXmlChildrenByName(node, localName) {
    return Array.from(node.children || []).filter(child => child.localName === localName);
  }

  function colToIndex(cellRef) {
    const letters = String(cellRef ?? "").toUpperCase().replace(/[^A-Z]/g, "");
    let index = 0;
    for (const letter of letters) {
      index = index * 26 + (letter.charCodeAt(0) - 64);
    }
    return Math.max(0, index - 1);
  }

  function getTextContent(node) {
    return node ? String(node.textContent ?? "").trim() : "";
  }

  function resolveWorksheetPath(entryMap) {
    if (entryMap.has("xl/worksheets/sheet1.xml")) return "xl/worksheets/sheet1.xml";

    const workbookText = entryMap.get("xl/workbook.xml");
    const relsText = entryMap.get("xl/_rels/workbook.xml.rels");
    if (!workbookText || !relsText) throw new Error("엑셀 workbook 정보를 찾지 못했습니다.");

    const workbook = parseXml(workbookText, "workbook.xml");
    const firstSheet = workbook.getElementsByTagNameNS("*", "sheet")[0];
    const relId = firstSheet?.getAttribute("r:id")
      || firstSheet?.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships", "id");
    if (!relId) throw new Error("엑셀 첫 번째 시트의 관계 ID를 찾지 못했습니다.");

    const rels = parseXml(relsText, "workbook.xml.rels");
    const relation = Array.from(rels.getElementsByTagNameNS("*", "Relationship"))
      .find(item => item.getAttribute("Id") === relId);
    const target = relation?.getAttribute("Target");
    if (!target) throw new Error("엑셀 첫 번째 시트 경로를 찾지 못했습니다.");

    if (target.startsWith("/")) return target.slice(1);
    return `xl/${target.replace(/^\/+/, "")}`;
  }

  async function readFirstSheetXlsxRows(arrayBuffer) {
    const xmlEntries = await readZipTextEntries(
      arrayBuffer,
      fileName => fileName.toLowerCase().endsWith(".xml") || fileName.toLowerCase().endsWith(".rels")
    );
    const entryMap = new Map(xmlEntries.map(entry => [entry.path, entry.text]));

    const sharedStrings = [];
    if (entryMap.has("xl/sharedStrings.xml")) {
      const sharedXml = parseXml(entryMap.get("xl/sharedStrings.xml"), "sharedStrings.xml");
      Array.from(sharedXml.getElementsByTagNameNS("*", "si")).forEach(si => {
        sharedStrings.push(Array.from(si.getElementsByTagNameNS("*", "t")).map(node => node.textContent || "").join(""));
      });
    }

    const sheetPath = resolveWorksheetPath(entryMap);
    const sheetText = entryMap.get(sheetPath);
    if (!sheetText) throw new Error(`엑셀 시트 파일을 찾지 못했습니다: ${sheetPath}`);

    const sheetXml = parseXml(sheetText, sheetPath);
    const rows = [];

    Array.from(sheetXml.getElementsByTagNameNS("*", "row")).forEach(rowNode => {
      const values = new Map();
      let maxCol = -1;

      getXmlChildrenByName(rowNode, "c").forEach(cellNode => {
        const ref = cellNode.getAttribute("r") || "";
        const colIndex = colToIndex(ref);
        maxCol = Math.max(maxCol, colIndex);

        const cellType = cellNode.getAttribute("t");
        let rawValue = "";

        if (cellType === "inlineStr") {
          const inlineNode = getXmlChildrenByName(cellNode, "is")[0];
          rawValue = inlineNode ? Array.from(inlineNode.getElementsByTagNameNS("*", "t")).map(node => node.textContent || "").join("") : "";
        } else {
          rawValue = getTextContent(getXmlChildrenByName(cellNode, "v")[0]);
          if (cellType === "s" && rawValue !== "") {
            rawValue = sharedStrings[Number(rawValue)] ?? "";
          } else if (cellType === "b") {
            rawValue = rawValue === "1" ? "TRUE" : "FALSE";
          }
        }

        values.set(colIndex, text(rawValue));
      });

      if (maxCol >= 0) {
        rows.push(Array.from({ length: maxCol + 1 }, (_, index) => values.get(index) || ""));
      }
    });

    while (rows.length && !rows[rows.length - 1].some(cell => text(cell))) rows.pop();
    return rows;
  }

  function makeCrcTable() {
    const table = [];
    for (let index = 0; index < 256; index += 1) {
      let value = index;
      for (let bit = 0; bit < 8; bit += 1) {
        value = value & 1 ? 0xEDB88320 ^ (value >>> 1) : value >>> 1;
      }
      table[index] = value >>> 0;
    }
    return table;
  }

  const crcTable = makeCrcTable();

  function crc32(bytes) {
    let crc = 0xFFFFFFFF;
    for (const byte of bytes) {
      crc = crcTable[(crc ^ byte) & 0xFF] ^ (crc >>> 8);
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }

  function writeUint16(output, value) {
    output.push(value & 0xFF, (value >>> 8) & 0xFF);
  }

  function writeUint32(output, value) {
    output.push(value & 0xFF, (value >>> 8) & 0xFF, (value >>> 16) & 0xFF, (value >>> 24) & 0xFF);
  }

  function encodeText(value) {
    return new TextEncoder().encode(String(value ?? ""));
  }

  function createStoredZip(fileEntries) {
    const localParts = [];
    const centralParts = [];
    let offset = 0;

    fileEntries.forEach(fileEntry => {
      const nameBytes = encodeText(fileEntry.path);
      const dataBytes = fileEntry.bytes ?? encodeText(fileEntry.text ?? "");
      const crc = crc32(dataBytes);
      const localHeader = [];

      writeUint32(localHeader, 0x04034b50);
      writeUint16(localHeader, 20);
      writeUint16(localHeader, 0x0800);
      writeUint16(localHeader, 0);
      writeUint16(localHeader, 0);
      writeUint16(localHeader, 0);
      writeUint32(localHeader, crc);
      writeUint32(localHeader, dataBytes.length);
      writeUint32(localHeader, dataBytes.length);
      writeUint16(localHeader, nameBytes.length);
      writeUint16(localHeader, 0);

      localParts.push(new Uint8Array(localHeader), nameBytes, dataBytes);

      const centralHeader = [];
      writeUint32(centralHeader, 0x02014b50);
      writeUint16(centralHeader, 20);
      writeUint16(centralHeader, 20);
      writeUint16(centralHeader, 0x0800);
      writeUint16(centralHeader, 0);
      writeUint16(centralHeader, 0);
      writeUint16(centralHeader, 0);
      writeUint32(centralHeader, crc);
      writeUint32(centralHeader, dataBytes.length);
      writeUint32(centralHeader, dataBytes.length);
      writeUint16(centralHeader, nameBytes.length);
      writeUint16(centralHeader, 0);
      writeUint16(centralHeader, 0);
      writeUint16(centralHeader, 0);
      writeUint16(centralHeader, 0);
      writeUint32(centralHeader, 0);
      writeUint32(centralHeader, offset);

      centralParts.push(new Uint8Array(centralHeader), nameBytes);
      offset += localHeader.length + nameBytes.length + dataBytes.length;
    });

    const centralOffset = offset;
    const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
    const endHeader = [];
    writeUint32(endHeader, 0x06054b50);
    writeUint16(endHeader, 0);
    writeUint16(endHeader, 0);
    writeUint16(endHeader, fileEntries.length);
    writeUint16(endHeader, fileEntries.length);
    writeUint32(endHeader, centralSize);
    writeUint32(endHeader, centralOffset);
    writeUint16(endHeader, 0);

    return new Blob([...localParts, ...centralParts, new Uint8Array(endHeader)], { type: "application/zip" });
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function resetToolState(target, defaultMessage) {
    if (target.downloadButton) target.downloadButton.disabled = true;
    if (target.summary) target.summary.innerHTML = "";
    if (target.results) target.results.innerHTML = "";
    setStatus(target, defaultMessage);
  }

  async function handleStoryPreview() {
    const target = elements.story;
    const file = target.fileInput?.files?.[0];
    if (!file) {
      setStatus(target, "먼저 소설 ZIP 파일을 선택해 주세요.", "error");
      return;
    }

    plannedStoryImport = null;
    resetToolState(target, "ZIP을 분석하는 중입니다...");

    try {
      const buffer = await readFileAsArrayBuffer(file);
      const entries = await readZipMarkdownEntries(buffer);
      if (entries.length === 0) {
        throw new Error("ZIP 안에서 .md 파일을 찾지 못했습니다.");
      }

      plannedStoryImport = planStoryImport(entries);
      renderStoryPreview(plannedStoryImport);

      if (plannedStoryImport.failedCount > 0) {
        setStatus(target, "매칭 실패 항목이 있습니다. 파일명 또는 제목 줄을 확인해 주세요.", "error");
      } else {
        setStatus(target, "미리보기 완료. 문제가 없으면 패치 ZIP을 다운로드하세요.", "ok");
      }
    } catch (error) {
      plannedStoryImport = null;
      setStatus(target, error?.message || "ZIP 분석 중 오류가 발생했습니다.", "error");
    }
  }

  function handleStoryDownloadPatch() {
    const target = elements.story;
    if (!plannedStoryImport || plannedStoryImport.failedCount > 0 || plannedStoryImport.files.length === 0) {
      setStatus(target, "다운로드할 수 있는 유효한 미리보기가 없습니다.", "error");
      return;
    }

    const files = [
      { path: "story-data.js", text: plannedStoryImport.storyDataText },
      ...plannedStoryImport.files.map(fileData => ({ path: fileData.path, text: fileData.text }))
    ];

    const zipBlob = createStoredZip(files);
    const stamp = new Date().toISOString().slice(0, 10).replaceAll("-", "");
    downloadBlob(zipBlob, `story-import-patch-${stamp}.zip`);
    setStatus(target, "패치 ZIP을 생성했습니다. 내려받은 파일의 story-data.js와 story/를 프로젝트에 덮어씌우면 됩니다.", "ok");
  }

  async function handleCharacterPreview() {
    const target = elements.character;
    const file = target.fileInput?.files?.[0];
    if (!file) {
      setStatus(target, "먼저 캐릭터 엑셀 파일을 선택해 주세요.", "error");
      return;
    }

    plannedCharacterImport = null;
    resetToolState(target, "엑셀을 분석하는 중입니다...");

    try {
      const buffer = await readFileAsArrayBuffer(file);
      const rows = await readFirstSheetXlsxRows(buffer);
      plannedCharacterImport = planCharacterImport(rows);
      renderCharacterPreview(plannedCharacterImport);

      if (plannedCharacterImport.failedCount > 0) {
        setStatus(target, "반영할 수 없는 항목이 있습니다. 오류 행을 확인해 주세요.", "error");
      } else if (plannedCharacterImport.warnings.length > 0) {
        setStatus(target, "미리보기 완료. 주의 항목을 확인한 뒤 characters.js를 다운로드하세요.", "ok");
      } else {
        setStatus(target, "미리보기 완료. 문제가 없으면 characters.js를 다운로드하세요.", "ok");
      }
    } catch (error) {
      plannedCharacterImport = null;
      setStatus(target, error?.message || "엑셀 분석 중 오류가 발생했습니다.", "error");
    }
  }

  function handleCharacterDownload() {
    const target = elements.character;
    if (!plannedCharacterImport || plannedCharacterImport.failedCount > 0) {
      setStatus(target, "다운로드할 수 있는 유효한 미리보기가 없습니다.", "error");
      return;
    }

    const blob = new Blob([plannedCharacterImport.charactersText], { type: "text/javascript;charset=utf-8" });
    const stamp = new Date().toISOString().slice(0, 10).replaceAll("-", "");
    downloadBlob(blob, `characters-${stamp}.js`);
    setStatus(target, "characters.js를 생성했습니다. 내려받은 파일을 확인한 뒤 프로젝트의 characters.js와 교체해 주세요.", "ok");
  }

  function setActiveToolTab(tabName) {
    const activeName = tabName === "character" ? "character" : "story";

    elements.tabs.forEach(tab => {
      const isActive = tab.dataset.adminToolTab === activeName;
      tab.classList.toggle("is-active", isActive);
      tab.setAttribute("aria-selected", String(isActive));
    });

    elements.panels.forEach(panel => {
      panel.classList.toggle("hidden", panel.dataset.adminToolPanel !== activeName);
    });
  }

  function setPanelOpen(isOpen) {
    if (!elements.panel) return;
    const adminMode = document.body.classList.contains("admin-mode");
    elements.panel.classList.toggle("hidden", !isOpen || !adminMode);
    if (elements.openButton) elements.openButton.setAttribute("aria-expanded", String(isOpen && adminMode));
  }

  function handleTogglePanel() {
    const adminMode = document.body.classList.contains("admin-mode");
    if (!adminMode) {
      setPanelOpen(false);
      return;
    }
    setPanelOpen(elements.panel?.classList.contains("hidden"));
  }

  function refreshAdminToolAccess() {
    const adminMode = document.body.classList.contains("admin-mode");
    if (elements.openButton) {
      elements.openButton.hidden = !adminMode;
      elements.openButton.disabled = !adminMode;
    }
    if (!adminMode) setPanelOpen(false);
  }

  function init() {
    elements.openButton = $("#openAdminToolsButton");
    elements.panel = $("#adminToolsPanel");
    elements.tabs = Array.from(document.querySelectorAll("[data-admin-tool-tab]"));
    elements.panels = Array.from(document.querySelectorAll("[data-admin-tool-panel]"));

    elements.story.fileInput = $("#storyImportZipInput");
    elements.story.previewButton = $("#storyImportPreviewButton");
    elements.story.downloadButton = $("#storyImportDownloadButton");
    elements.story.status = $("#storyImportStatus");
    elements.story.summary = $("#storyImportSummary");
    elements.story.results = $("#storyImportResults");

    elements.character.fileInput = $("#characterImportXlsxInput");
    elements.character.previewButton = $("#characterImportPreviewButton");
    elements.character.downloadButton = $("#characterImportDownloadButton");
    elements.character.status = $("#characterImportStatus");
    elements.character.summary = $("#characterImportSummary");
    elements.character.results = $("#characterImportResults");

    if (!elements.panel) return;

    elements.openButton?.addEventListener("click", handleTogglePanel);
    elements.tabs.forEach(tab => {
      tab.addEventListener("click", () => setActiveToolTab(tab.dataset.adminToolTab));
    });

    elements.story.previewButton?.addEventListener("click", handleStoryPreview);
    elements.story.downloadButton?.addEventListener("click", handleStoryDownloadPatch);
    elements.story.fileInput?.addEventListener("change", () => {
      plannedStoryImport = null;
      resetToolState(
        elements.story,
        elements.story.fileInput.files?.[0]?.name ? "파일을 선택했습니다. 미리보기를 실행해 주세요." : "ZIP 파일을 선택해 주세요."
      );
    });

    elements.character.previewButton?.addEventListener("click", handleCharacterPreview);
    elements.character.downloadButton?.addEventListener("click", handleCharacterDownload);
    elements.character.fileInput?.addEventListener("change", () => {
      plannedCharacterImport = null;
      resetToolState(
        elements.character,
        elements.character.fileInput.files?.[0]?.name ? "파일을 선택했습니다. 미리보기를 실행해 주세요." : "엑셀 파일을 선택해 주세요."
      );
    });

    setActiveToolTab("story");
    refreshAdminToolAccess();

    const observer = new MutationObserver(refreshAdminToolAccess);
    observer.observe(document.body, { attributes: true, attributeFilter: ["class"] });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
