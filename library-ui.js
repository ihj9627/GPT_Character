// library-ui.js — split from character-ui.js during B-stage code structure cleanup.
// Story shelf helpers.
    const storyDataSource = Array.isArray(window.STORY_DATA) ? window.STORY_DATA : [];
    const storyTaxonomySource = window.STORY_TAXONOMY ?? {};
    const storyCharacterPlacements = storyTaxonomySource.characterPlacements ?? {};
    const storyGenreGroupOrder = new Map();
    const storyGenreOrder = new Map();

    (Array.isArray(storyTaxonomySource.genreGroups) ? storyTaxonomySource.genreGroups : []).forEach((groupData, groupIndex) => {
      const groupCode = normalizeStoryText(groupData?.code);
      if (groupCode) storyGenreGroupOrder.set(groupCode, groupIndex);
      (Array.isArray(groupData?.genres) ? groupData.genres : []).forEach((genreData, genreIndex) => {
        const genreCode = normalizeStoryText(genreData?.code);
        if (genreCode) storyGenreOrder.set(`${groupCode}/${genreCode}`, genreIndex);
      });
    });

    function normalizeStoryText(value, fallback = "") {
      const text = String(value ?? "").trim();
      return text || fallback;
    }

    function getStoryCharacterId(storyData) {
      return normalizeStoryText(storyData?.characterId);
    }

    function getStoryFilePath(storyData) {
      return normalizeStoryText(storyData?.file);
    }

    function findStoryCharacter(storyData) {
      const characterId = getStoryCharacterId(storyData);
      if (!characterId) return null;
      return characters.find(characterData => {
        const folder = typeof getCharacterFolder === "function"
          ? getCharacterFolder(characterData)
          : String(characterData?.folder ?? "").trim();
        return folder === characterId || characterData?.folder === characterId;
      }) ?? null;
    }

    function getStoryCharacterGenre(characterData) {
      return normalizeStoryText(characterData?.profile?.basicInfo?.genre, "미등록 세계관");
    }

    function getStoryWorldByCode(worldCode) {
      const targetCode = normalizeStoryText(worldCode);
      if (!targetCode) return null;
      return (Array.isArray(storyTaxonomySource.genreGroups) ? storyTaxonomySource.genreGroups : [])
        .find(groupData => normalizeStoryText(groupData?.code) === targetCode) ?? null;
    }

    function getStoryPlacement(storyData, characterData) {
      const characterId = getStoryCharacterId(storyData);
      const placementData = storyCharacterPlacements[characterId] ?? {};
      const worldCode = normalizeStoryText(storyData?.worldId, normalizeStoryText(placementData.worldCode, placementData.genreGroupCode));
      const worldData = getStoryWorldByCode(worldCode);
      const worldName = normalizeStoryText(storyData?.worldName, normalizeStoryText(worldData?.name, normalizeStoryText(placementData.worldName, placementData.genreGroupName)));
      const fallbackWorld = getStoryCharacterGenre(characterData);
      return {
        genreGroupCode: normalizeStoryText(worldCode, "uncategorized"),
        genreGroupName: normalizeStoryText(worldName, fallbackWorld || "미분류 세계관"),
        genreCode: normalizeStoryText(placementData.genreCode, worldCode || "uncategorized"),
        genreName: normalizeStoryText(placementData.genreName, worldName || fallbackWorld),
      };
    }

    function compareStoryLibraryTitle(first, second) {
      return String(first ?? "").localeCompare(String(second ?? ""), "ko");
    }

    function compareStoryOrder(first, second) {
      const firstOrder = Number(first?.storyOrder ?? 0);
      const secondOrder = Number(second?.storyOrder ?? 0);
      if (firstOrder !== secondOrder) return firstOrder - secondOrder;
      return compareStoryLibraryTitle(first?.title, second?.title);
    }

    function getStoryOrder(storyData) {
      const sourceText = `${storyData?.id ?? ""} ${storyData?.file ?? ""}`;
      const numberMatches = sourceText.match(/(?:_|-)(\d{1,3})(?:\.md)?\b/g) ?? [];
      const lastNumberText = numberMatches.length > 0 ? numberMatches[numberMatches.length - 1].match(/\d{1,3}/)?.[0] : "";
      return lastNumberText ? Number(lastNumberText) : 1;
    }

    function buildStoryLibraryTreeSeeds() {
      if (storyDataSource.length === 0) return [];
      const worldMap = new Map();

      storyDataSource.forEach(storyData => {
        const storyId = normalizeStoryText(storyData?.id);
        const characterId = getStoryCharacterId(storyData);
        const storyFile = getStoryFilePath(storyData);
        if (!storyId || !characterId || !storyFile) return;

        const characterData = findStoryCharacter(storyData);
        const characterName = normalizeStoryText(characterData?.name, characterId);
        const placementData = getStoryPlacement(storyData, characterData);
        const worldData = getStoryWorldByCode(placementData.genreGroupCode);
        const storyTitle = normalizeStoryText(storyData?.title, "제목 미정");

        if (!worldMap.has(placementData.genreGroupCode)) {
          worldMap.set(placementData.genreGroupCode, {
            code: placementData.genreGroupCode,
            title: placementData.genreGroupName,
            coreGenre: normalizeStoryText(worldData?.coreGenre),
            description: normalizeStoryText(worldData?.description),
            children: new Map()
          });
        }

        const worldNode = worldMap.get(placementData.genreGroupCode);
        if (!worldNode.children.has(characterId)) {
          worldNode.children.set(characterId, {
            title: characterName,
            children: []
          });
        }

        worldNode.children.get(characterId).children.push({
          id: storyId,
          type: "document",
          title: storyTitle,
          access: "public",
          storyFile,
          storyCharacterId: characterId,
          storyCharacterName: characterName,
          storyTypeLabel: normalizeStoryText(storyData?.typeName, "단편"),
          storyOrder: getStoryOrder(storyData),
          relatedCharacters: characterData ? [characterName] : [],
          relatedDocuments: [],
          relatedNovels: []
        });
      });

      const worldChildren = Array.from(worldMap.values())
        .sort((first, second) => {
          const firstOrder = storyGenreGroupOrder.get(first.code) ?? Number.MAX_SAFE_INTEGER;
          const secondOrder = storyGenreGroupOrder.get(second.code) ?? Number.MAX_SAFE_INTEGER;
          return firstOrder === secondOrder
            ? compareStoryLibraryTitle(first.title, second.title)
            : firstOrder - secondOrder;
        })
        .map(worldNode => ({
          code: worldNode.code,
          title: worldNode.title,
          coreGenre: worldNode.coreGenre,
          description: worldNode.description,
          children: Array.from(worldNode.children.values())
            .sort((first, second) => compareStoryLibraryTitle(first.title, second.title))
            .map(characterNode => ({
              title: characterNode.title,
              children: characterNode.children.sort(compareStoryOrder)
            }))
        }));

      return worldChildren;
    }

    const storyLibraryTreeSeeds = buildStoryLibraryTreeSeeds();
    const activeLibraryTreeSeeds = storyLibraryTreeSeeds.length ? storyLibraryTreeSeeds : libraryTreeSeeds;
    const isStoryLibraryMode = storyLibraryTreeSeeds.length > 0;

function resolveLibraryRelatedCharacters(value) {
      return Array.isArray(value) ? value : [];
    }

    function countLibraryDocuments(nodes = []) {
      return nodes.reduce((sum, node) => {
        const nodeDocument = node._libraryDocumentId ? getLibraryDocument(node._libraryDocumentId) : null;
        const selfCount = nodeDocument && isLibraryDocumentVisible(nodeDocument) ? 1 : 0;
        return sum + selfCount + countLibraryDocuments(node.children ?? []);
      }, 0);
    }

    function flattenLibraryDocuments(nodes = [], parentPath = [], result = [], state = { count: 0 }) {
      nodes.forEach(node => {
        const currentPath = [...parentPath, node.title];
        const hasNodeDocument = node.type === "document" || node.hasDocument;

        if (hasNodeDocument) {
          state.count += 1;
          const documentId = node.id ?? `library-doc-${state.count}`;
          const categoryPath = isStoryLibraryMode ? parentPath : parentPath.slice(1);
          const documentData = {
            ...node,
            id: documentId,
            rootTitle: currentPath[0] ?? "서재",
            category: categoryPath.join(" / ") || "서재",
            path: currentPath,
            pathLabel: currentPath.join(" / "),
            access: node.access ?? "public",
            relatedCharacters: resolveLibraryRelatedCharacters(node.relatedCharacters),
            relatedDocuments: node.relatedDocuments ?? [],
            relatedNovels: node.relatedNovels ?? []
          };
          delete documentData.children;
          node._libraryDocumentId = documentId;
          node._libraryDocumentPath = currentPath;
          result.push(documentData);
        }

        if (node.type === "document") return;
        flattenLibraryDocuments(node.children ?? [], currentPath, result, state);
      });
      return result;
    }

    const libraryDocuments = flattenLibraryDocuments(activeLibraryTreeSeeds);

    function getLibraryDocuments() {
      return libraryDocuments;
    }

    function findLibraryDocument(documentId) {
      if (!documentId) return null;
      return getLibraryDocuments().find(documentData => documentData.id === documentId) ?? null;
    }

    function getLibraryDocument(documentId) {
      return findLibraryDocument(documentId);
    }

    function getLibraryPersonDocumentByName(characterName) {
      const targetName = String(characterName ?? "").trim();
      if (!targetName) return null;
      return getLibraryDocuments().find(documentData => (
        documentData.title === targetName
        && documentData.category.includes("인물 해설")
      )) ?? null;
    }

    function getCharacterLibraryDocument(characterData = currentCharacter) {
      const characterFolder = typeof getCharacterFolder === "function"
        ? getCharacterFolder(characterData)
        : String(characterData?.folder ?? "").trim();
      if (!characterFolder) return null;

      return getLibraryDocuments().find(documentData => (
        documentData.storyCharacterId === characterFolder
        && isLibraryDocumentVisible(documentData)
      )) ?? null;
    }

    function addUniqueLibraryDocument(result, seenIds, documentData) {
      if (!documentData || seenIds.has(documentData.id) || !isLibraryDocumentVisible(documentData)) return;
      seenIds.add(documentData.id);
      result.push(documentData);
    }

    function compareCharacterLibraryDocuments(firstDocument, secondDocument) {
      const firstOrder = Number.isFinite(firstDocument?.storyOrder) ? firstDocument.storyOrder : Number.MAX_SAFE_INTEGER;
      const secondOrder = Number.isFinite(secondDocument?.storyOrder) ? secondDocument.storyOrder : Number.MAX_SAFE_INTEGER;
      if (firstOrder !== secondOrder) return firstOrder - secondOrder;
      return compareStoryLibraryTitle(firstDocument?.title, secondDocument?.title);
    }

    function getCharacterLibraryDocuments(characterData = currentCharacter) {
      const characterFolder = typeof getCharacterFolder === "function"
        ? getCharacterFolder(characterData)
        : String(characterData?.folder ?? "").trim();
      if (!characterFolder) return [];

      return getLibraryDocuments()
        .filter(documentData => (
          documentData?.storyCharacterId === characterFolder
          && isLibraryDocumentVisible(documentData)
        ))
        .sort(compareCharacterLibraryDocuments);
    }

    function getCharacterLibraryRelationLabel(documentData, characterData = currentCharacter) {
      const characterFolder = typeof getCharacterFolder === "function"
        ? getCharacterFolder(characterData)
        : String(characterData?.folder ?? "").trim();
      if (documentData?.storyCharacterId === characterFolder) {
        return documentData?.storyTypeLabel ? `본인 ${documentData.storyTypeLabel}` : "본인 소설";
      }
      return documentData?.category || "서재";
    }

    function renderCharacterLibraryCard(documentData, characterData = currentCharacter) {
      const safeId = escapeHtml(documentData.id);
      const safeTitle = escapeHtml(documentData.title ?? "서재 소설");
      const safeSummary = escapeHtml(getLibraryDocumentSummary(documentData));
      const safePath = escapeHtml(documentData.pathLabel ?? "서재");
      const safeRelation = escapeHtml(getCharacterLibraryRelationLabel(documentData, characterData));
      return `
        <article class="panel character-library-card" role="button" tabindex="0" data-detail-library-document="${safeId}" aria-label="${safeTitle} 서재에서 열기">
          <p class="detail-library-kicker">${safeRelation}</p>
          <h3 class="panel-title">${safeTitle}</h3>
          <p class="detail-library-summary">${safeSummary}</p>
          <div class="detail-library-path">${safePath}</div>
          <span class="detail-library-open-button" aria-hidden="true">서재에서 열기</span>
        </article>
      `;
    }

    function renderCharacterLibraryEmptyState(characterData = currentCharacter) {
      const safeName = escapeHtml(characterData?.name ?? "이 캐릭터");
      return `
        <article class="panel character-library-card detail-library-empty-card">
          <p class="detail-library-kicker">SHELF STORIES</p>
          <h3 class="panel-title">${safeName} 단편소설 준비중</h3>
          <p class="detail-library-summary">이 캐릭터의 단편소설이 등록되면 이 영역에 카드로 표시됩니다.</p>
          <div class="detail-library-path">서재 연결 대기</div>
        </article>
      `;
    }

    function openDetailLibraryDocument(documentId) {
      const libraryDocument = findLibraryDocument(documentId);
      if (!libraryDocument || !isLibraryDocumentVisible(libraryDocument)) return;
      openLibrary(libraryDocument.id);
      requestAnimationFrame(() => requestLibraryDocument(libraryDocument.id));
      window.setTimeout(() => requestLibraryDocument(libraryDocument.id), 0);
    }

    function handleDetailLibraryCardActivation(event) {
      event.preventDefault?.();
      event.stopPropagation?.();
      const trigger = event.target?.closest?.("[data-detail-library-document]") ?? event.currentTarget;
      const documentId = trigger?.dataset?.detailLibraryDocument ?? event.currentTarget?.dataset?.detailLibraryDocument;
      if (!documentId) return;
      openDetailLibraryDocument(documentId);
    }

    function handleDetailLibraryCardKeydown(event) {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      handleDetailLibraryCardActivation(event);
    }

    function renderCharacterLibraryPanel(characterData = currentCharacter) {
      const cardsElement = document.querySelector("#detailLibraryCards");
      if (!cardsElement) return;

      const documents = getCharacterLibraryDocuments(characterData);
      cardsElement.innerHTML = documents.length
        ? documents.map(documentData => renderCharacterLibraryCard(documentData, characterData)).join("")
        : renderCharacterLibraryEmptyState(characterData);

      cardsElement.querySelectorAll("[data-detail-library-document]").forEach(card => {
        card.addEventListener("click", handleDetailLibraryCardActivation);
        card.addEventListener("keydown", handleDetailLibraryCardKeydown);
      });
    }

    function openCurrentCharacterLibraryDocument() {
      const libraryDocument = getCharacterLibraryDocument(currentCharacter);
      if (!libraryDocument) return;
      openDetailLibraryDocument(libraryDocument.id);
    }

    function isLibraryAdminMode() {
      return !profileModeEnabled;
    }

    function isLibraryDocumentVisible(documentData) {
      if (!documentData) return false;
      return isLibraryAdminMode() || documentData.access === "public";
    }

    function isLibraryNodeVisible(node) {
      const nodeDocument = node._libraryDocumentId ? getLibraryDocument(node._libraryDocumentId) : null;
      if (nodeDocument && isLibraryDocumentVisible(nodeDocument)) return true;
      return (node.children ?? []).some(childNode => isLibraryNodeVisible(childNode));
    }

    function getDefaultLibraryDocumentId() {
      const documents = getLibraryDocuments();
      return documents.find(documentData => isLibraryDocumentVisible(documentData))?.id ?? documents[0]?.id ?? "";
    }

    function isLibraryAccessContentVisible(access) {
      if (!access || access === "public") return true;
      return isLibraryAdminMode();
    }

    function getVisibleLibraryBodyItems(bodyItems = []) {
      return bodyItems.filter(item => isLibraryAccessContentVisible(item?.access ?? "public"));
    }

    function getLibraryBodySearchItems(bodyItems = []) {
      return getVisibleLibraryBodyItems(bodyItems).flatMap(item => {
        if (!item) return [];
        if (typeof item === "string") return [item];
        const textItems = [item.title, item.text];
        if (Array.isArray(item.items)) {
          item.items
            .filter(entry => isLibraryAccessContentVisible(entry?.access ?? "public"))
            .forEach(entry => {
              if (typeof entry === "string") {
                textItems.push(entry);
                return;
              }
              textItems.push(entry?.label, entry?.value);
            });
        }
        return textItems.filter(Boolean);
      });
    }

    function getLibrarySearchText(documentData) {
      return [
        documentData.rootTitle,
        documentData.category,
        documentData.pathLabel,
        documentData.title,
        documentData.summary,
        ...getLibraryBodySearchItems(documentData.body ?? []),
        ...(documentData.relatedCharacters ?? []),
        ...(documentData.relatedDocuments ?? []),
        ...(documentData.relatedNovels ?? [])
      ].filter(Boolean).join(" ").toLowerCase();
    }

    function getLibraryNodeSearchText(node, parentPath = []) {
      const currentPath = [...parentPath, node.title];
      if (node._libraryDocumentId) {
        const documentData = getLibraryDocument(node._libraryDocumentId);
        return `${currentPath.join(" ")} ${getLibrarySearchText(documentData)}`.toLowerCase();
      }
      return currentPath.join(" ").toLowerCase();
    }

    function libraryNodeMatchesQuery(node, query, parentPath = []) {
      if (!isLibraryNodeVisible(node)) return false;
      if (!query) return true;
      if (getLibraryNodeSearchText(node, parentPath).includes(query)) return true;
      return (node.children ?? []).some(childNode => libraryNodeMatchesQuery(childNode, query, [...parentPath, node.title]));
    }


    function normalizeLibraryStoryMarkdownSource(sourceText) {
      let cleanedText = String(sourceText ?? "")
        .replace(/\r\n/g, "\n")
        .replace(/^\uFEFF/, "")
        .replace(/<!--[\s\S]*?-->/g, "")
        .trim();

      if (cleanedText.startsWith("---\n")) {
        cleanedText = cleanedText.replace(/^---\n[\s\S]*?\n---\n?/, "").trim();
      }

      return cleanedText
        .replace(/^\s{0,3}#{1,6}[ \t]+.+(?:\n+|$)/, "")
        .trim();
    }

    function renderLibraryStoryMarkdown(sourceText) {
      const cleanedText = normalizeLibraryStoryMarkdownSource(sourceText);

      if (!cleanedText) {
        return `<p class="library-placeholder-note">본문이 비어 있습니다.</p>`;
      }

      return cleanedText
        .split(/\n{2,}/)
        .map(block => {
          const trimmedBlock = block.trim();
          if (!trimmedBlock) return "";
          const headingMatch = trimmedBlock.match(/^(#{1,3})\s+(.+)$/);
          if (headingMatch) {
            const level = Math.min(3, headingMatch[1].length + 2);
            return `<h${level} class="library-story-heading">${escapeHtml(headingMatch[2])}</h${level}>`;
          }
          const escapedLines = trimmedBlock
            .split("\n")
            .map(line => escapeHtml(line))
            .join("<br>");
          return `<p class="library-story-paragraph">${escapedLines}</p>`;
        })
        .join("");
    }

    async function loadLibraryStoryBody(documentData, profileActionMarkup = "") {
      if (!libraryDocBody) return;
      libraryDocBody.innerHTML = `${profileActionMarkup}<p class="library-placeholder-note">소설 본문을 불러오는 중입니다.</p>`;
      try {
        const response = await fetch(documentData.storyFile, { cache: "no-store" });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const storyText = await response.text();
        if (selectedLibraryDocumentId !== documentData.id) return;
        libraryDocBody.innerHTML = `${profileActionMarkup}<div class="library-story-body">${renderLibraryStoryMarkdown(storyText)}</div>`;
      } catch (error) {
        if (selectedLibraryDocumentId !== documentData.id) return;
        libraryDocBody.innerHTML = `
          ${profileActionMarkup}
          <p class="library-placeholder-note">소설 본문 파일을 불러오지 못했습니다.</p>
          <p class="library-placeholder-note">파일 경로: ${escapeHtml(documentData.storyFile)}</p>
          <p class="library-placeholder-note">HTML을 직접 더블클릭한 file:// 실행에서는 브라우저가 본문 파일 읽기를 막을 수 있습니다. 로컬 서버나 웹 배포 환경에서 열어주세요.</p>
        `;
      }
    }

    function renderLibraryAccessBadgeMarkup(access) {
      const label = libraryAccessLabels[access] ?? "";
      if (!label) return "";
      return `<span class="library-access-badge is-${escapeHtml(access)}"><span aria-hidden="true">🔒</span>${escapeHtml(label)}</span>`;
    }

    function getLibraryDocumentSummary(documentData) {
      if (documentData?.storyFile) {
        const characterName = documentData.storyCharacterName ? `${documentData.storyCharacterName} · ` : "";
        return `${characterName}단편소설`;
      }
      if (documentData.summary) return documentData.summary;
      const accessLabel = libraryAccessLabels[documentData.access] ? `${libraryAccessLabels[documentData.access]} 소설` : "공개 소설";
      return `${documentData.title} 항목은 ${accessLabel}로 등록되어 있으며, 본문은 아직 미등록입니다.`;
    }

    function getLibraryDocumentBodyItems(documentData) {
      if (Array.isArray(documentData.body) && documentData.body.length > 0) {
        return getVisibleLibraryBodyItems(documentData.body);
      }
      return [
        `${documentData.title} 소설 본문은 아직 등록되지 않았습니다.`,
        `분류 경로: ${documentData.pathLabel}`
      ];
    }

    function renderLibraryBodyListItem(item) {
      if (typeof item === "string") {
        return `<li class="is-full">${escapeHtml(item)}</li>`;
      }
      const label = item?.label ? `<strong>${escapeHtml(item.label)}</strong>` : "";
      const value = item?.value ? `<span>${escapeHtml(item.value)}</span>` : "";
      return `<li>${label}${value}</li>`;
    }

    function renderLibraryBodyItem(item) {
      if (!item || !isLibraryAccessContentVisible(item.access ?? "public")) return "";
      if (typeof item === "string") {
        return `<p>${escapeHtml(item)}</p>`;
      }
      if (item.type === "section") {
        const titleMarkup = item.title ? `<h3>${escapeHtml(item.title)}</h3>` : "";
        const textMarkup = item.text ? `<p>${escapeHtml(item.text)}</p>` : "";
        const visibleItems = Array.isArray(item.items)
          ? item.items.filter(entry => isLibraryAccessContentVisible(entry?.access ?? "public"))
          : [];
        const listMarkup = visibleItems.length
          ? `<ul>${visibleItems.map(renderLibraryBodyListItem).join("")}</ul>`
          : "";
        return `<section class="library-document-section${item.access ? ` is-${escapeHtml(item.access)}` : ""}">${titleMarkup}${textMarkup}${listMarkup}</section>`;
      }
      return `<p>${escapeHtml(String(item.text ?? item.title ?? ""))}</p>`;
    }

    function getLibraryFolderKey(path) {
      return path.join(" / ");
    }

    function collectLibraryFolderPaths(nodes = activeLibraryTreeSeeds, parentPath = [], result = []) {
      nodes.forEach(node => {
        if (node.type === "document") return;
        const currentPath = [...parentPath, node.title];
        result.push(currentPath);
        if (Array.isArray(node.children)) {
          collectLibraryFolderPaths(node.children, currentPath, result);
        }
      });
      return result;
    }

    function resetLibraryTreeCollapse(openDocument = null) {
      collapsedLibraryFolderKeys.clear();
      collectLibraryFolderPaths().forEach(path => {
        collapsedLibraryFolderKeys.add(getLibraryFolderKey(path));
      });

      const pathToOpen = Array.isArray(openDocument?.path) ? openDocument.path : [];
      for (let index = 1; index <= pathToOpen.length; index += 1) {
        collapsedLibraryFolderKeys.delete(getLibraryFolderKey(pathToOpen.slice(0, index)));
      }
    }

    function isLibraryFolderCollapsed(path, query) {
      return !query && collapsedLibraryFolderKeys.has(getLibraryFolderKey(path));
    }

    function renderLibraryFolderNode(node, parentPath, depth, query, ancestorMatched) {
      const currentPath = [...parentPath, node.title];
      const selfMatched = Boolean(query) && getLibraryNodeSearchText(node, parentPath).includes(query);
      const includeAllChildren = ancestorMatched || selfMatched || !query;
      const visibleChildren = (node.children ?? []).filter(childNode => (
        isLibraryNodeVisible(childNode) && (includeAllChildren || libraryNodeMatchesQuery(childNode, query, currentPath))
      ));
      const folderDocument = node._libraryDocumentId ? getLibraryDocument(node._libraryDocumentId) : null;
      const hasVisibleFolderDocument = folderDocument && isLibraryDocumentVisible(folderDocument);
      if (visibleChildren.length === 0 && !hasVisibleFolderDocument) return "";

      const depthClass = ` library-depth-${Math.min(depth, 4)}`;
      const folderClass = depth === 0 ? "library-root" : "library-folder";
      const titleClass = depth === 0 ? "library-root-title" : "library-folder-title";
      const folderKey = getLibraryFolderKey(currentPath);
      const collapsed = isLibraryFolderCollapsed(currentPath, query);
      const worldCode = depth === 0 ? normalizeStoryText(node.code) : "";
      const worldActiveClass = worldCode && worldCode === selectedLibraryWorldCode && !selectedLibraryDocumentId ? " is-active" : "";
      const activeClass = hasVisibleFolderDocument && folderDocument.id === selectedLibraryDocumentId ? " is-active" : worldActiveClass;
      const documentAttribute = hasVisibleFolderDocument ? ` data-library-folder-document="${escapeHtml(folderDocument.id)}"` : "";
      const worldAttribute = worldCode ? ` data-library-world="${escapeHtml(worldCode)}"` : "";
      const childMarkup = collapsed
        ? ""
        : visibleChildren
          .map(childNode => renderLibraryTreeNode(childNode, currentPath, depth + 1, query, includeAllChildren))
          .join("");
      return `
        <section class="${folderClass}${depthClass}${collapsed ? " is-collapsed" : ""}" role="group" aria-label="${escapeHtml(node.title)}">
          <button class="${titleClass}${activeClass}" type="button" data-library-folder-toggle="${escapeHtml(folderKey)}"${documentAttribute}${worldAttribute} aria-expanded="${String(!collapsed)}">
            <span class="library-folder-main">
              <span class="library-folder-caret" aria-hidden="true">${collapsed ? "▸" : "▾"}</span>
              <span>${escapeHtml(node.title)}</span>
            </span>
            <small>${countLibraryDocuments(node.children ?? [])}${isStoryLibraryMode ? "편" : " docs"}</small>
          </button>
          <div class="library-folder-children">
            ${childMarkup}
          </div>
        </section>
      `;
    }

    function renderLibraryDocumentNode(node) {
      const documentData = getLibraryDocument(node._libraryDocumentId);
      const access = documentData.access ?? "public";
      const accessLabel = libraryAccessLabels[access];
      const activeClass = documentData.id === selectedLibraryDocumentId ? " is-active" : "";
      const accessClass = access === "public" ? "" : ` is-${access}`;
      const lockedClass = isLibraryPrivateLocked(documentData) ? " is-locked" : "";
      const buttonLabel = accessLabel ? `${documentData.title} ${accessLabel} 소설` : documentData.title;
      return `
        <button class="library-document-button${activeClass}${accessClass}${lockedClass}" type="button" data-library-document="${escapeHtml(documentData.id)}" role="treeitem" aria-label="${escapeHtml(buttonLabel)}">
          <span class="library-document-title">${escapeHtml(documentData.title)}</span>
          ${renderLibraryAccessBadgeMarkup(access)}
        </button>
      `;
    }

    function renderLibraryTreeNode(node, parentPath = [], depth = 0, query = "", ancestorMatched = false) {
      if (node.type === "document") {
        return renderLibraryDocumentNode(node);
      }
      return renderLibraryFolderNode(node, parentPath, depth, query, ancestorMatched);
    }

    function renderLibraryTree() {
      if (!libraryTree) return;
      const query = librarySearch?.value.trim().toLowerCase() ?? "";
      const matchingRoots = activeLibraryTreeSeeds.filter(node => isLibraryNodeVisible(node) && libraryNodeMatchesQuery(node, query));
      if (matchingRoots.length === 0) {
        const emptyMessage = activeLibraryTreeSeeds.length === 0
          ? "등록된 소설이 없습니다"
          : "검색 결과가 없습니다";
        libraryTree.innerHTML = `<div class="library-empty">${emptyMessage}</div>`;
        return;
      }

      libraryTree.innerHTML = matchingRoots
        .map(node => renderLibraryTreeNode(node, [], 0, query, false))
        .join("");
    }

    function renderLibraryChipList(container, items, options = {}) {
      if (!container) return;
      if (!Array.isArray(items) || items.length === 0) {
        container.innerHTML = `<span class="library-chip is-empty">미등록</span>`;
        return;
      }

      container.innerHTML = items.map(item => {
        const safeItem = escapeHtml(item);
        if (options.type === "character") {
          const linkedCharacterDocument = getLibraryPersonDocumentByName(item);
          const documentAttribute = linkedCharacterDocument ? ` data-library-document="${escapeHtml(linkedCharacterDocument.id)}"` : "";
          const ariaLabel = linkedCharacterDocument ? `${safeItem} 서재 소설 열기` : `${safeItem} 관련 캐릭터`;
          return `<button class="library-chip" type="button" data-library-character="${safeItem}"${documentAttribute} aria-label="${ariaLabel}">${safeItem}</button>`;
        }
        if (options.type === "document") {
          const linkedDocument = getLibraryDocuments().find(documentData => documentData.title === item);
          if (linkedDocument) {
            return `<button class="library-chip" type="button" data-library-document="${escapeHtml(linkedDocument.id)}">${safeItem}</button>`;
          }
        }
        return `<span class="library-chip">${safeItem}</span>`;
      }).join("");
    }

    function getLibraryProfileCharacterName(documentData) {
      if (documentData?.storyCharacterName) return documentData.storyCharacterName;
      if (!documentData?.category?.includes("인물 해설")) return "";
      const character = characters.find(characterData => characterData.name === documentData.title || characterData.en === documentData.title);
      return character?.name ?? "";
    }

    function renderLibraryProfileAction(documentData) {
      return "";
    }

    function isLibraryPrivateLocked(documentData) {
      return isLibraryAdminMode() && documentData?.access === "private";
    }

    function openLibraryPasswordModal(documentId) {
      if (!libraryPasswordModal) return;
      pendingPrivateLibraryDocumentId = documentId;
      libraryPasswordModal.classList.remove("hidden");
      if (libraryPasswordInput) {
        libraryPasswordInput.value = "";
        setTimeout(() => libraryPasswordInput.focus(), 0);
      }
      if (libraryPasswordError) libraryPasswordError.textContent = "";
    }

    function closeLibraryPasswordModal() {
      if (!libraryPasswordModal) return;
      libraryPasswordModal.classList.add("hidden");
      pendingPrivateLibraryDocumentId = "";
      if (libraryPasswordError) libraryPasswordError.textContent = "";
      if (libraryPasswordInput) libraryPasswordInput.value = "";
    }

    function submitLibraryPassword() {
      const password = libraryPasswordInput?.value ?? "";
      if (password !== libraryPrivatePassword) {
        if (libraryPasswordError) libraryPasswordError.textContent = "비밀번호가 맞지 않습니다.";
        libraryPasswordInput?.focus();
        return;
      }

      const documentId = pendingPrivateLibraryDocumentId;
      closeLibraryPasswordModal();
      renderLibraryDocument(documentId);
    }

    function renderLibraryWorldIntro(worldCode) {
      const worldData = getStoryWorldByCode(worldCode);
      if (!worldData) {
        renderLibraryEmptyDocument();
        return;
      }

      selectedLibraryDocumentId = "";
      selectedLibraryWorldCode = normalizeStoryText(worldData.code);
      const worldStories = getLibraryDocuments().filter(documentData => documentData.genreGroupCode === selectedLibraryWorldCode || documentData.path?.[0] === worldData.name);
      const characterCount = Array.isArray(worldData.characters) ? worldData.characters.length : 0;
      const storyCount = worldStories.filter(documentData => isLibraryDocumentVisible(documentData)).length;
      if (libraryDocKicker) libraryDocKicker.textContent = "세계관";
      if (libraryDocTitle) libraryDocTitle.textContent = worldData.name;
      if (libraryDocSummary) {
        libraryDocSummary.textContent = normalizeStoryText(worldData.description, "이 세계관의 소개 문구가 아직 등록되지 않았습니다.");
      }
      if (libraryDocBody) {
        const coreGenre = normalizeStoryText(worldData.coreGenre, "미등록");
        const description = normalizeStoryText(worldData.description, "이 세계관의 소개 문구가 아직 등록되지 않았습니다.");
        libraryDocBody.innerHTML = `
          <section class="library-world-intro" aria-label="${escapeHtml(worldData.name)} 세계관 소개">
            <div class="library-world-stat">
              <span>핵심 장르</span>
              <strong>${escapeHtml(coreGenre)}</strong>
            </div>
            <div class="library-world-description">
              <span>한줄 설명</span>
              <p>${escapeHtml(description)}</p>
            </div>
            <div class="library-world-meta">
              <span>등록 캐릭터 ${characterCount}명</span>
              <span>등록 단편 ${storyCount}편</span>
            </div>
          </section>
        `;
      }
      renderLibraryChipList(libraryRelatedCharacters, []);
      renderLibraryChipList(libraryRelatedDocuments, []);
      renderLibraryChipList(libraryRelatedNovels, []);
      renderLibraryTree();
    }

    function renderLibraryEmptyDocument() {
      selectedLibraryDocumentId = "";
      selectedLibraryWorldCode = "";
      if (libraryDocKicker) libraryDocKicker.textContent = "서재";
      if (libraryDocTitle) libraryDocTitle.textContent = "소설 선택 대기";
      if (libraryDocSummary) {
        libraryDocSummary.textContent = "왼쪽 트리에서 읽을 소설을 선택하세요.";
      }
      if (libraryDocBody) {
        const emptyText = getLibraryDocuments().some(documentData => isLibraryDocumentVisible(documentData))
          ? "선택된 소설이 없습니다."
          : "등록된 소설 항목이 없습니다.";
        libraryDocBody.innerHTML = `<p class="library-placeholder-note">${emptyText}</p>`;
      }
      renderLibraryChipList(libraryRelatedCharacters, []);
      renderLibraryChipList(libraryRelatedDocuments, []);
      renderLibraryChipList(libraryRelatedNovels, []);
    }

    function requestLibraryDocument(documentId) {
      const documentData = getLibraryDocument(documentId);
      if (!documentData || !isLibraryDocumentVisible(documentData)) {
        renderLibraryEmptyDocument();
        renderLibraryTree();
        return;
      }
      if (isLibraryPrivateLocked(documentData)) {
        openLibraryPasswordModal(documentData.id);
        renderLibraryTree();
        return;
      }
      selectedLibraryWorldCode = "";
      renderLibraryDocument(documentData.id);
    }

    function renderLibraryDocument(documentId = selectedLibraryDocumentId) {
      const documentData = getLibraryDocument(documentId);
      if (!documentData || !isLibraryDocumentVisible(documentData)) {
        renderLibraryEmptyDocument();
        return;
      }
      selectedLibraryDocumentId = documentData.id;
      selectedLibraryWorldCode = "";
      const accessLabel = libraryAccessLabels[documentData.access] ?? "";
      if (libraryDocKicker) libraryDocKicker.textContent = accessLabel
        ? `${documentData.pathLabel} / ${accessLabel}`
        : documentData.pathLabel;
      if (libraryDocTitle) {
        libraryDocTitle.innerHTML = `${escapeHtml(documentData.title)}${renderLibraryAccessBadgeMarkup(documentData.access)}`;
      }
      if (libraryDocSummary) libraryDocSummary.textContent = getLibraryDocumentSummary(documentData);
      const profileActionMarkup = renderLibraryProfileAction(documentData);
      if (libraryDocBody) {
        if (documentData.storyFile) {
          loadLibraryStoryBody(documentData, profileActionMarkup);
        } else {
          const bodyItems = getLibraryDocumentBodyItems(documentData);
          const bodyMarkup = bodyItems.length
            ? bodyItems.map(renderLibraryBodyItem).join("")
            : `<p class="library-placeholder-note">소설 본문은 아직 준비 중입니다.</p>`;
          libraryDocBody.innerHTML = `${profileActionMarkup}${bodyMarkup}`;
        }
      }
      renderLibraryChipList(libraryRelatedCharacters, documentData.relatedCharacters, { type: "character" });
      renderLibraryChipList(libraryRelatedDocuments, documentData.relatedDocuments, { type: "document" });
      renderLibraryChipList(libraryRelatedNovels, documentData.relatedNovels);
      renderLibraryTree();
    }

    function openLibrary(preferredDocumentId = null) {
      startScreen.classList.add("hidden");
      listScreen.classList.add("hidden");
      generatorScreen.classList.add("hidden");
      adventureScreen.classList.add("hidden");
      detailScreen.classList.add("hidden");
      libraryScreen.classList.remove("hidden");
      updateShellSection("library");

      const preferredDocument = findLibraryDocument(preferredDocumentId);
      const nextDocument = preferredDocument && isLibraryDocumentVisible(preferredDocument) ? preferredDocument : null;
      selectedLibraryDocumentId = nextDocument?.id ?? "";
      selectedLibraryWorldCode = "";

      resetLibraryTreeCollapse(nextDocument);
      renderLibraryTree();
      if (!nextDocument) {
        renderLibraryEmptyDocument();
        return;
      }
      requestLibraryDocument(nextDocument.id);
    }

    function closeLibrary() {
      closeLibraryPasswordModal();
      openList();
    }
