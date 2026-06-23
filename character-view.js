// character-view.js — split from character-ui.js during B-stage code structure cleanup.
function getSearchText(characterData) {
      return [
        characterData.name,
        characterData.en,
        getProfileBasicInfo(characterData, "race"),
        getProfileBasicInfo(characterData, "job"),
        getProfileBasicInfo(characterData, "world"),
        getProfileBasicInfo(characterData, "genre")
      ].filter(Boolean).join(" ").toLowerCase();
    }

    function getVisibleCharacters() {
      const query = searchQuery.trim().toLowerCase();
      return characters
        .map((characterData, index) => ({ characterData, index }))
        .filter(({ characterData }) => !query || getSearchText(characterData).includes(query))
        .filter(({ characterData }) => characterMatchesFilters(characterData))
        .sort((first, second) => {
          const firstFavorite = favoriteIds.has(getCharacterId(first.characterData));
          const secondFavorite = favoriteIds.has(getCharacterId(second.characterData));
          if (firstFavorite !== secondFavorite) return firstFavorite ? -1 : 1;
          return first.index - second.index;
        });
    }

    function getListImageSource(characterData) {
      return characterData.images?.thumbnail
        ?? characterData.images?.illustration
        ?? "";
    }

    function getListImagePosition(characterData) {
      return characterData.listImagePosition
        ?? characterData.thumbnailPosition
        ?? characterData.imagePosition
        ?? "center center";
    }

    function updateDetailFavoriteButton() {
      const characterId = getCharacterId(currentCharacter);
      const isFavorite = favoriteIds.has(characterId);
      detailFavoriteButton.classList.toggle("is-favorite", isFavorite);
      detailFavoriteButton.setAttribute("aria-pressed", String(isFavorite));
      detailFavoriteButton.setAttribute("aria-label", isFavorite ? "즐겨찾기 해제" : "즐겨찾기");
      detailFavoriteButton.title = isFavorite ? "즐겨찾기 해제" : "즐겨찾기";
    }

    function toggleCurrentFavorite() {
      const characterId = getCharacterId(currentCharacter);
      if (favoriteIds.has(characterId)) {
        favoriteIds.delete(characterId);
      } else {
        favoriteIds.add(characterId);
      }
      saveFavorites();
      updateDetailFavoriteButton();
      renderFilterPanel();
      renderCharacterList();
    }

    function changeListPage(direction) {
      const nextPage = Math.max(0, Math.min(totalListPages - 1, currentPage + direction));
      if (nextPage === currentPage) return;
      currentPage = nextPage;
      pageDirection = direction < 0 ? "right" : "left";
      renderCharacterList();
    }

    function getListImageCount(characterData) {
      return getRegisteredAlbumItems(characterData)
        .filter(item => !(profileModeEnabled && item.visibility === "restricted"))
        .filter(item => !item.locked && item.source)
        .length;
    }

    function readCssPixelValue(rawValue, fallbackValue) {
      const numericValue = Number.parseFloat(rawValue);
      return Number.isFinite(numericValue) ? numericValue : fallbackValue;
    }

    function getCharacterGridMetrics() {
      // Official desktop layout is now fixed at 1920×1080.
      // Keep the character archive stable instead of recalculating density from
      // the browser viewport; smaller windows scroll the fixed shell and mobile
      // will receive a separate layout later.
      const columns = 6;
      const rows = 4;
      return { columns, rows, pageSize: columns * rows };
    }

    function syncCharacterGridMetrics() {
      const metrics = getCharacterGridMetrics();
      pageSize = metrics.pageSize;
      characterGrid?.style.setProperty("--list-columns", String(metrics.columns));
      characterGrid?.style.setProperty("--list-rows", String(metrics.rows));
      return metrics;
    }

    function renderCharacterList() {
      syncCharacterGridMetrics();
      characterGrid.innerHTML = "";
      characterGrid.classList.remove("is-sliding-left", "is-sliding-right");
      void characterGrid.offsetWidth;
      characterGrid.classList.add(pageDirection === "right" ? "is-sliding-right" : "is-sliding-left");
      const visibleCharacters = getVisibleCharacters();
      const totalPages = Math.max(1, Math.ceil(visibleCharacters.length / pageSize));
      totalListPages = totalPages;
      currentPage = Math.min(currentPage, totalPages - 1);
      const pageStart = currentPage * pageSize;
      const pageCharacters = visibleCharacters.slice(pageStart, pageStart + pageSize);
      const totalCharacterCount = characters.length;
      const shownCharacterCount = visibleCharacters.length;
      listCount.textContent = shownCharacterCount === totalCharacterCount
        ? `총 ${totalCharacterCount}명`
        : `표시 ${shownCharacterCount}명 / 총 ${totalCharacterCount}명`;
      const activeFilterCount = getActiveFilterCount();
      searchStatus.textContent = searchQuery.trim() || activeFilterCount
        ? `${visibleCharacters.length}\uBA85 \uD45C\uC2DC${activeFilterCount ? ` / \uD544\uD130 ${activeFilterCount}` : ""}`
        : "\uC804\uCCB4 \uD45C\uC2DC";
      edgePrevPageButton.disabled = currentPage === 0;
      edgeNextPageButton.disabled = currentPage >= totalPages - 1;
      pageStatus.innerHTML = totalPages <= 1
        ? `<span>1 / 1</span>`
        : `${Array.from({ length: totalPages }, (_, index) => `<span class="page-dot${index === currentPage ? " active" : ""}" aria-hidden="true"></span>`).join("")}<span>${currentPage + 1} / ${totalPages}</span>`;

      if (visibleCharacters.length === 0) {
        characterGrid.innerHTML = `<div class="empty-list">검색 결과가 없습니다</div>`;
        return;
      }

      pageCharacters.forEach(({ characterData, index }) => {
        const characterId = getCharacterId(characterData);
        const isFavorite = favoriteIds.has(characterId);
        const thumbnailSource = getListImageSource(characterData);
        const imageIsReady = loadedListImages.has(thumbnailSource);
        const card = document.createElement("article");
        card.className = `character-card${isFavorite ? " is-favorite" : ""}`;
        card.tabIndex = 0;
        card.setAttribute("role", "button");
        card.dataset.character = String(index);
        const cardRgb = rgbValue(characterData.themeColor ?? "#ffffff");
        card.style.setProperty("--card-rgb", cardRgb);
        card.style.setProperty("--card-accent", `rgba(${cardRgb}, .74)`);
        card.style.setProperty("--card-position", getListImagePosition(characterData));
        const safeCharacterName = escapeHtml(characterData.name ?? "");
        const safeThumbnailSource = escapeHtml(thumbnailSource);
        const imageCount = getListImageCount(characterData);
        card.innerHTML = `
          <div class="card-art${imageIsReady ? " has-image" : ""}">
            <img src="${safeThumbnailSource}" alt="${safeCharacterName} 목록 이미지"${imageIsReady ? "" : " hidden"}>
          </div>
          <div class="card-info">
            <div class="card-title-row">
              <p class="card-name">${safeCharacterName}</p>
              <span class="card-image-count">IMG ${imageCount}</span>
            </div>
          </div>
        `;

        const cardArt = card.querySelector(".card-art");
        const image = card.querySelector(".card-art img");
        card.querySelector(".card-name").title = characterData.name ?? "";
        card.querySelector(".card-image-count").title = `등록 이미지 ${imageCount}장`;
        image.addEventListener("load", () => {
          loadedListImages.add(image.currentSrc || image.src || thumbnailSource);
          loadedListImages.add(thumbnailSource);
          image.hidden = false;
          cardArt.classList.add("has-image");
        });
        image.addEventListener("error", () => {
          if (image.dataset.fallback !== "used" && thumbnailSource !== characterData.images.illustration) {
            image.dataset.fallback = "used";
            image.src = characterData.images.illustration;
            return;
          }
          image.hidden = true;
          cardArt.classList.remove("has-image");
        });
        if (image.complete) {
          if (image.naturalWidth > 0) {
            loadedListImages.add(image.currentSrc || image.src || thumbnailSource);
            loadedListImages.add(thumbnailSource);
            image.hidden = false;
            cardArt.classList.add("has-image");
          } else {
            image.dispatchEvent(new Event("error"));
          }
        }
        card.addEventListener("keydown", event => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openDetail(index);
          }
        });
        card.addEventListener("click", () => openDetail(index));
        characterGrid.appendChild(card);
      });
    }

    function updateDetailPreviewAffordance() {
      const canOpenPreview = currentDetailTab === "images";
      illustrationSlot.classList.toggle("is-modal-trigger", canOpenPreview);
      if (canOpenPreview) {
        illustrationSlot.setAttribute("role", "button");
        illustrationSlot.tabIndex = 0;
        illustrationSlot.setAttribute("aria-label", "선택한 이미지를 크게 보기");
      } else {
        illustrationSlot.removeAttribute("role");
        illustrationSlot.removeAttribute("tabindex");
        illustrationSlot.setAttribute("aria-label", "일러스트 공간");
      }
    }

    function setDetailTab(tabName) {
      const nextTab = profileModeEnabled && tabName === "status" ? "profile" : tabName;
      currentDetailTab = nextTab;
      detailScreen.dataset.tab = nextTab;
      tabButtons.forEach(button => {
        button.classList.toggle("active", button.dataset.tab === nextTab);
      });
      updateDetailPreviewAffordance();
      if (nextTab === "images") {
        renderImageAlbum();
      } else {
        setMainIllustration();
      }
    }

    function updateAlbumPreviewCardState() {
      if (!albumGrid) return;
      albumGrid.querySelectorAll(".album-card").forEach(card => {
        card.classList.toggle("is-active", card.dataset.albumKey === currentAlbumPreviewKey);
      });
    }

    function setDetailPreviewImage({ source, alt, fit = "cover", position = "center center", theme = tabThemes[0], modalItem = null }) {
      if (!source) return;
      currentPreviewModalItem = modalItem;
      illustrationSlot.style.background = theme;
      illustrationSlot.style.setProperty("--detail-image-fit", fit);
      illustrationSlot.style.setProperty("--detail-image-position", position);
      illustrationSlot.classList.remove("has-image");
      slotImage.hidden = true;
      slotImage.src = source;
      slotImage.alt = alt;
    }

    function getMainIllustrationModalItem() {
      const source = currentCharacter.images?.illustration ?? "";
      if (!source) return null;
      return {
        key: "illustration",
        title: "기본 일러스트",
        category: "MAIN",
        source,
        fit: currentCharacter.detailImageFit ?? "cover",
        visibility: "safe",
        locked: false
      };
    }

    function setMainIllustration() {
      currentAlbumPreviewKey = "illustration";
      setDetailPreviewImage({
        source: currentCharacter.images.illustration,
        alt: `${currentCharacter.name} 일러스트`,
        fit: currentCharacter.detailImageFit ?? "cover",
        position: currentCharacter.detailImagePosition ?? currentCharacter.imagePosition ?? "center top",
        theme: tabThemes[0],
        modalItem: getMainIllustrationModalItem()
      });
      updateAlbumPreviewCardState();
    }

    function setAlbumPreviewItem(item) {
      if (!item || item.locked || !item.source) return;
      currentAlbumPreviewKey = item.key;
      const shouldContain = item.fit === "contain" || item.category === "REFERENCE";
      setDetailPreviewImage({
        source: item.source,
        alt: `${currentCharacter.name ?? ""} ${item.title ?? "이미지"}`.trim(),
        fit: shouldContain ? "contain" : (item.fit ?? "cover"),
        position: shouldContain ? "center center" : (item.position ?? currentCharacter.imagePosition ?? "center center"),
        theme: shouldContain ? tabThemes[4] : tabThemes[0],
        modalItem: item
      });
      updateAlbumPreviewCardState();
    }

    function getAlbumSource(characterData, item) {
      if (item.src) return item.src;
      if (item.path) return item.path;
      const folder = getCharacterFolder(characterData);
      if (item.file) return `assets/characters/${folder}/${item.file}`;
      if (item.fileName) return `assets/characters/${folder}/${item.fileName}`;
      return characterData.images?.[item.key] ?? "";
    }

    function createAlbumItem(characterData, item, index) {
      const source = getAlbumSource(characterData, item);
      return {
        key: item.key ?? `extra-${index}`,
        title: item.title ?? item.name ?? `추가 이미지 ${index + 1}`,
        category: item.category ?? item.type ?? "SCENE",
        source,
        fit: item.fit ?? (item.category === "REFERENCE" || item.type === "reference" ? "contain" : "cover"),
        visibility: item.visibility ?? item.access ?? "safe",
        locked: item.locked === true || !source,
        optional: item.optional === true
      };
    }

    function getAlbumKeyDefinition(albumKey) {
      const key = typeof albumKey === "string" ? albumKey : albumKey?.key;
      const definition = albumKeyDefinitions[key];
      if (!definition) return null;
      return {
        ...definition,
        ...(typeof albumKey === "object" ? albumKey : {}),
        key
      };
    }

    function getExtraAlbumItems(characterData) {
      const keyedExtras = (characterData.albumKeys ?? [])
        .map(getAlbumKeyDefinition)
        .filter(Boolean);
      const extras = [
        ...keyedExtras,
        ...(characterData.imageItems ?? []),
        ...(characterData.extraImages ?? []),
        ...(characterData.gallery ?? []),
        ...(characterData.album ?? [])
      ];
      const knownKeys = new Set(["thumbnail", ...tabKeys]);
      Object.entries(characterData.images ?? {}).forEach(([key, source]) => {
        if (!knownKeys.has(key) && source) {
          extras.push({
            key,
            title: key.replace(/[-_]+/g, " ").replace(/\b\w/g, letter => letter.toUpperCase()),
            category: "SCENE",
            src: source,
            fit: "cover",
            visibility: "restricted"
          });
        }
      });
      return extras;
    }

    function getAssetFileName(source) {
      if (!source) return "";
      try {
        const url = new URL(source, window.location.href);
        return decodeURIComponent(url.pathname.split("/").pop() ?? "").toLowerCase();
      } catch {
        return String(source).split("?")[0].split("#")[0].split("/").pop().toLowerCase();
      }
    }

    function escapeHtml(value) {
      return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
    }

    function getUsedAlbumFileNames(characterData, items) {
      const fileNames = new Set(["thumb.webp"]);
      Object.values(imageFileNames).forEach(fileName => fileNames.add(fileName.toLowerCase()));
      items.forEach(item => {
        if (!item.source) return;
        const fileName = getAssetFileName(item.source);
        if (fileName) fileNames.add(fileName);
      });
      Object.values(characterData.images ?? {}).forEach(source => {
        const fileName = getAssetFileName(source);
        if (fileName) fileNames.add(fileName);
      });
      return fileNames;
    }

    function normalizeAssetFileName(fileName) {
      return getAssetFileName(fileName).toLowerCase();
    }

    function isImageAssetFile(fileName) {
      return /\.(png|jpe?g|webp|gif|svg|avif)$/i.test(String(fileName).split("?")[0].split("#")[0]);
    }

    async function getCharacterAssetFiles(characterData, { forceRefresh = false } = {}) {
      const folder = getCharacterFolder(characterData);
      if (!folder) {
        return { ok: false, files: [], source: "none", message: "캐릭터 폴더명을 찾을 수 없습니다." };
      }

      if (!forceRefresh && folderAssetCache.has(folder)) return folderAssetCache.get(folder);

      const manifestFiles = characterAssetManifest[folder] ?? characterAssetManifest[getCharacterId(characterData)];
      if (Array.isArray(manifestFiles)) {
        const result = { ok: true, files: manifestFiles.map(fileName => String(fileName)), source: "manifest" };
        folderAssetCache.set(folder, Promise.resolve(result));
        return result;
      }

      const request = fetch(`/api/character-assets?folder=${encodeURIComponent(folder)}`)
        .then(response => {
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          return response.json();
        })
        .then(data => {
          if (!Array.isArray(data.files)) throw new Error("files 배열이 없습니다.");
          return { ok: true, files: data.files.map(fileName => String(fileName)), source: "api" };
        })
        .catch(error => ({
          ok: false,
          files: [],
          source: "api",
          message: error?.message || "이미지 검사 API를 사용할 수 없습니다."
        }));

      folderAssetCache.set(folder, request);
      return request;
    }

    function getExpectedAssetFileNames(characterData, registeredItems) {
      const fileNames = getUsedAlbumFileNames(characterData, registeredItems);
      return [...fileNames].filter(Boolean).sort((first, second) => first.localeCompare(second));
    }

    function getUnregisteredAssetFileNames(files, expectedFileNames) {
      return files
        .map(fileName => ({ original: String(fileName), normalized: normalizeAssetFileName(fileName) }))
        .filter(({ original, normalized }) => normalized && isImageAssetFile(original))
        .filter(({ normalized }) => !expectedFileNames.has(normalized))
        .map(({ original }) => original)
        .sort((first, second) => first.localeCompare(second, "ko"));
    }

    async function checkCharacterAssets() {
      const results = await Promise.all(characters.map(async characterData => {
        const registeredItems = getRegisteredAlbumItems(characterData);
        const expectedFileNames = new Set(getExpectedAssetFileNames(characterData, registeredItems));
        const assetResult = await getCharacterAssetFiles(characterData, { forceRefresh: true });
        const actualFileNames = new Set(assetResult.files.map(normalizeAssetFileName).filter(Boolean));

        return {
          characterData,
          characterName: characterData.name ?? characterData.en ?? getCharacterId(characterData),
          ok: assetResult.ok,
          message: assetResult.message ?? "",
          missing: assetResult.ok
            ? [...expectedFileNames].filter(fileName => !actualFileNames.has(fileName))
            : [],
          unregistered: assetResult.ok
            ? getUnregisteredAssetFileNames(assetResult.files, expectedFileNames)
            : []
        };
      }));

      return {
        unavailable: results.filter(result => !result.ok),
        missing: results.filter(result => result.missing.length > 0),
        unregistered: results.filter(result => result.unregistered.length > 0)
      };
    }

    function formatAssetCheckRows(rows, key) {
      return rows
        .map(result => `<li><b>${escapeHtml(result.characterName)}</b>: ${result[key].map(fileName => escapeHtml(fileName)).join(", ")}</li>`)
        .join("");
    }

    function renderAssetCheckResult(result) {
      if (!assetCheckBody) return;
      const sections = [];

      if (result.unavailable.length) {
        const allUnavailable = result.unavailable.length === characters.length;
        sections.push(allUnavailable
          ? `
            <h3>검사 불가</h3>
            <p>이미지 검사 API 또는 CHARACTER_ASSET_MANIFEST에서 파일 목록을 가져오지 못했습니다.</p>
            <p>로컬 검사 서버를 켠 뒤 다시 실행해주세요.</p>
          `
          : `
            <h3>검사 불가</h3>
            <ul>
              ${result.unavailable.map(item => `<li><b>${escapeHtml(item.characterName)}</b>: ${escapeHtml(item.message || "이미지 파일 목록을 가져오지 못했습니다.")}</li>`).join("")}
            </ul>
          `);
      }

      if (result.missing.length) {
        sections.push(`
          <h3>이미지 누락</h3>
          <ul>${formatAssetCheckRows(result.missing, "missing")}</ul>
        `);
      }

      if (result.unregistered.length) {
        sections.push(`
          <h3>미등록 파일</h3>
          <ul>${formatAssetCheckRows(result.unregistered, "unregistered")}</ul>
        `);
      }

      assetCheckBody.innerHTML = sections.length
        ? sections.join("")
        : `<p>정상입니다.</p><p>누락 이미지와 미등록 파일이 없습니다.</p>`;
    }

    function openAssetCheckModal() {
      if (!assetCheckModal) return;
      assetCheckModal.classList.remove("hidden");
      assetCheckClose?.focus();
    }

    function closeAssetCheckModal() {
      if (!assetCheckModal) return;
      assetCheckModal.classList.add("hidden");
      assetCheckButton?.focus();
    }

    async function runAssetCheck() {
      if (!assetCheckButton || profileModeEnabled) return;
      assetCheckButton.disabled = true;
      assetCheckButton.textContent = "검사 중...";
      if (assetCheckBody) {
        assetCheckBody.innerHTML = `<p>이미지 파일 목록을 확인하는 중입니다.</p>`;
      }
      openAssetCheckModal();

      try {
        const result = await checkCharacterAssets();
        renderAssetCheckResult(result);
      } catch (error) {
        if (assetCheckBody) {
          assetCheckBody.innerHTML = `<p>이미지 검사를 완료하지 못했습니다.</p><p>${escapeHtml(error?.message || "알 수 없는 오류가 발생했습니다.")}</p>`;
        }
      } finally {
        assetCheckButton.disabled = false;
        assetCheckButton.textContent = "이미지 검사";
      }
    }

    function updateAssetCheckButtonVisibility() {
      if (!assetCheckButton) return;
      assetCheckButton.classList.toggle("hidden", profileModeEnabled);
      assetCheckButton.disabled = profileModeEnabled;
    }

    function getRegisteredAlbumItems(characterData) {
      const baseItems = albumImageDefinitions.map((definition, index) => createAlbumItem(characterData, definition, index));
      const extraItems = getExtraAlbumItems(characterData).map((item, index) => createAlbumItem(characterData, item, index + baseItems.length));
      return [...baseItems, ...extraItems];
    }

    function getAlbumItems(characterData, registeredItems = getRegisteredAlbumItems(characterData)) {
      const visibleItems = registeredItems.filter(item => !(profileModeEnabled && item.visibility === "restricted"));
      const minimumSlots = Math.max(baseAlbumSlots, Math.ceil(visibleItems.length / albumSlotColumns) * albumSlotColumns);
      const lockedItems = Array.from(
        { length: Math.max(0, minimumSlots - visibleItems.length) },
        (_, index) => ({
          key: `locked-${index}`,
          title: "미해금 일러스트",
          category: "LOCKED",
          source: "",
          fit: "cover",
          visibility: "locked",
          locked: true
        })
      );
      return [...visibleItems, ...lockedItems];
    }

    function renderImageAlbum() {
      if (!albumGrid || !currentCharacter) return;
      const registeredItems = getRegisteredAlbumItems(currentCharacter);
      const items = getAlbumItems(currentCharacter, registeredItems);
      const renderToken = albumRenderToken + 1;
      albumRenderToken = renderToken;
      const loadedAlbumItemKeys = new Set();
      const syncModalAlbumItems = () => {
        if (renderToken !== albumRenderToken) return;
        currentModalAlbumItems = items.filter(item => !item.locked && loadedAlbumItemKeys.has(item.key));
        updateImageModalNavigation();
      };
      const createLockedAlbumCard = (index) => {
        const card = document.createElement("button");
        card.className = "album-card is-locked";
        card.type = "button";
        card.dataset.fit = "cover";
        card.dataset.visibility = "locked";
        card.disabled = true;
        card.innerHTML = `
          <span class="album-badge">${imageVisibilityLabels.locked}</span>
          <span class="album-art"><div class="album-locked-mark">♥</div></span>
          <span class="album-caption"><b>미해금 일러스트</b><small>LOCKED</small></span>
        `;
        return card;
      };
      const ensureAlbumSlots = () => {
        if (renderToken !== albumRenderToken) return;
        const minimumSlots = Math.max(baseAlbumSlots, Math.ceil(albumGrid.children.length / albumSlotColumns) * albumSlotColumns);
        while (albumGrid.children.length < minimumSlots) {
          albumGrid.appendChild(createLockedAlbumCard(albumGrid.children.length));
        }
      };
      albumSubtitle.textContent = "";
      currentModalAlbumItems = [];
      currentModalItemIndex = -1;
      updateImageModalNavigation();
      albumGrid.innerHTML = "";

      items.forEach((item) => {
        const card = document.createElement("button");
        card.className = "album-card";
        card.type = "button";
        card.dataset.fit = item.fit;
        card.dataset.visibility = item.visibility;
        card.dataset.albumKey = item.key;
        card.disabled = item.locked;
        card.classList.toggle("is-locked", item.locked);
        card.classList.toggle("is-active", item.key === currentAlbumPreviewKey);

        const badge = imageVisibilityLabels[item.visibility] ?? item.category;
        const safeBadge = escapeHtml(badge);
        const safeAlbumSource = escapeHtml(item.source);
        const safeAlbumTitle = escapeHtml(item.title);
        const safeAlbumCategory = escapeHtml(item.category);
        const safeAlbumAlt = escapeHtml(`${currentCharacter.name ?? ""} ${item.title ?? ""}`.trim());
        const imageMarkup = item.locked
          ? `<div class="album-locked-mark">♥</div>`
          : `<img src="${safeAlbumSource}" alt="${safeAlbumAlt}" loading="eager" decoding="async">`;

        card.innerHTML = `
          <span class="album-badge">${safeBadge}</span>
          <span class="album-art">${imageMarkup}</span>
          <span class="album-caption"><b>${safeAlbumTitle}</b><small>${safeAlbumCategory}</small></span>
        `;

        if (!item.locked) {
          card.addEventListener("click", () => setAlbumPreviewItem(item));
          card.addEventListener("dblclick", () => openImageModal(item));
          const image = card.querySelector(".album-art img");
          if (!image) {
            return;
          }
          const markLoaded = () => {
            if (renderToken !== albumRenderToken) return;
            if (card.dataset.loaded === "true") return;
            card.dataset.loaded = "true";
            loadedAlbumItemKeys.add(item.key);
            syncModalAlbumItems();
          };
          const markMissing = () => {
            if (renderToken !== albumRenderToken) return;
            if (card.dataset.loaded === "true") return;
            if (item.optional) {
              loadedAlbumItemKeys.delete(item.key);
              syncModalAlbumItems();
              card.remove();
              ensureAlbumSlots();
              return;
            }
            loadedAlbumItemKeys.delete(item.key);
            syncModalAlbumItems();
            card.disabled = true;
            card.dataset.visibility = "locked";
            card.classList.add("is-locked");
            card.innerHTML = `
              <span class="album-badge">${imageVisibilityLabels.locked}</span>
              <span class="album-art"><div class="album-locked-mark">♥</div></span>
              <span class="album-caption"><b>미해금 일러스트</b><small>${item.category}</small></span>
            `;
          };
          image.addEventListener("load", markLoaded);
          image.addEventListener("error", markMissing);
          if (image.complete) {
            if (image.naturalWidth > 0) {
              markLoaded();
            } else {
              markMissing();
            }
          }
        }

        albumGrid.appendChild(card);
      });
      ensureAlbumSlots();
    }

    function hashString(text) {
      let hash = 2166136261;
      for (let index = 0; index < text.length; index += 1) {
        hash ^= text.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
      }
      return hash >>> 0;
    }

    function seededRandom(seed) {
      let value = seed >>> 0;
      return () => {
        value += 0x6D2B79F5;
        let t = value;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    }

    function randomInt(random, min, max) {
      return Math.floor(random() * (max - min + 1)) + min;
    }

    function createAutoStats(characterData) {
      const random = seededRandom(hashString(`${characterData.name}:${characterData.en}`));
      const value = (min = 20, max = 99) => randomInt(random, min, max);
      const count = (min = 0, max = 300) => randomInt(random, min, max);
      const percent = (min = 25, max = 98) => randomInt(random, min, max);
      const acts = [
        count(),
        count(),
        count(),
        count(50, 300),
        count(0, 200),
        count(0, 100),
        count(0, 80)
      ];

      return {
        hLevel: value(50, 100),
        currentPleasure: value(0, 999),
        charm: value(30, 100),
        sensitivity: value(30, 100),
        openness: `${value(20, 100)}%`,
        pleasureLimit: value(30, 100),
        defense: value(10, 60),
        stamina: value(30, 100),
        act0: `${acts[0]} 회`,
        act1: `${acts[1]} 회`,
        act2: `${acts[2]} 회`,
        act3: `${acts[3]} 회`,
        act4: `${acts[4]} 회`,
        act5: `${acts[5]} 회`,
        act6: `${acts[6]} 회`,
        actTotal: `${acts.reduce((sum, item) => sum + item, 0)} 회`,
        climaxTotal: `${count(0, 360)} 회`,
        climaxChain: `${randomInt(random, 5, 30)} 회`,
        climaxTime: `00:${String(randomInt(random, 15, 59)).padStart(2, "0")}`,
        riskCount: `${count(0, 30)} 회`,
        riskPeak: `${percent(20, 96)}%`,
        play0: `${count(0, 100)} 회`,
        play1: `${count(0, 150)} 회`,
        play2: `${count(100, 300)} 회`,
        play3: `${count(1,30)} 회`,
        play4: `${count(0, 20)} 회`,
        play5: `${count(0, 20)} 회`,
        play6: `${count(50,150)} 회`,
        play7: `${count(0, 100)} 회`,
        body: {
          chest: percent(),
          nipple: percent(),
          vagina: percent(),
          anus: percent(),
          womb: percent()
        },
        parameters: {
          desire: value(50,100),
          sensitive: value(50,100),
          pleasure: value(50,100),
          chastity: value(50,100),
          allure: value(50,100),
          obedience: value(50,100),
          deviance: value(50,100),
          mental: value(20,70)
        }
      };
    }

    function applyAutoStats(characterData) {
      const stats = createAutoStats(characterData);

      document.querySelectorAll("[data-auto]").forEach(element => {
        const key = element.dataset.auto;
        element.textContent = key === "currentPleasure" ? `${stats.currentPleasure} / 999` : (stats[key] ?? "");
      });

      const circleProgress = document.querySelector(".circle-progress");
      const circumference = 314;
      circleProgress.style.strokeDashoffset = String(circumference - (circumference * stats.hLevel / 100));
      const pleasurePercent = Math.min(100, Math.round(stats.currentPleasure / 999 * 100));
      document.querySelector(".h-status .progress-line span").style.width = `${pleasurePercent}%`;

      document.querySelectorAll("[data-body]").forEach(row => {
        const value = stats.body[row.dataset.body];
        row.querySelector(".body-percent b").textContent = `${value}%`;
        row.querySelector(".bar span").style.width = `${value}%`;
      });

      document.querySelectorAll("[data-param]").forEach(parameter => {
        const value = stats.parameters[parameter.dataset.param];
        parameter.querySelector(".parameter-value").textContent = value;
        parameter.querySelector(".bar span").style.width = `${value}%`;
      });
    }

    function applyCharacterInfo(characterData) {
      document.querySelectorAll("[data-basic-info]").forEach(element => {
        const value = getProfileBasicInfo(characterData, element.dataset.basicInfo);
        element.textContent = value;
        element.classList.toggle("is-unregistered", isUnregisteredValue(value));
      });

      const profileDescription = document.querySelector("#profileDescription");
      if (profileDescription) {
        profileDescription.textContent = getCharacterShortIntro(characterData);
        profileDescription.classList.toggle("is-unregistered", isUnregisteredValue(profileDescription.textContent));
      }

      const profileQuote = document.querySelector("#profileQuote");
      if (profileQuote) {
        profileQuote.textContent = getCharacterQuote(characterData);
        profileQuote.classList.toggle("is-unregistered", isUnregisteredValue(profileQuote.textContent));
      }

      renderCharacterLibraryPanel(characterData);
    }

    function setModalZoom(enabled) {
      modalImageZoomed = Boolean(enabled);
      modalImage.classList.toggle("is-zoomed", modalImageZoomed);
      modalImage.closest(".modal-window")?.classList.toggle("is-zoomed", modalImageZoomed);
      modalImageStage?.classList.toggle("is-panning", false);
      modalPanActive = false;
      modalPanPointerId = null;
      modalPanMoved = false;
      if (modalImageStage) {
        if (modalImageZoomed) {
          requestAnimationFrame(() => {
            modalImageStage.scrollLeft = Math.max(0, (modalImageStage.scrollWidth - modalImageStage.clientWidth) / 2);
            modalImageStage.scrollTop = Math.max(0, (modalImageStage.scrollHeight - modalImageStage.clientHeight) / 2);
          });
        } else {
          modalImageStage.scrollLeft = 0;
          modalImageStage.scrollTop = 0;
        }
      }
    }

    function updateImageModalNavigation() {
      const hasNavigation = currentModalAlbumItems.length > 1;
      [modalPrev, modalNext].forEach((button) => {
        if (!button) return;
        button.hidden = !hasNavigation;
      });
    }

    function showImageModalItem(item) {
      if (!item) return;
      const title = item.title;
      const source = item.source;
      modalTitle.textContent = `${currentCharacter.name} - ${title}`;
      modalMeta.textContent = `${item.category} / ${imageVisibilityLabels[item.visibility] ?? item.visibility}`;
      modalImage.hidden = true;
      modalPlaceholder.hidden = false;
      setModalZoom(false);
      modalImage.src = source;
      modalImage.alt = `${currentCharacter.name} ${title}`;
      updateImageModalNavigation();
    }

    function openImageModal(item) {
      const itemIndex = currentModalAlbumItems.findIndex(albumItem => albumItem.key === item.key && albumItem.source === item.source);
      if (itemIndex >= 0) {
        currentModalItemIndex = itemIndex;
      } else {
        currentModalAlbumItems = [item];
        currentModalItemIndex = 0;
      }
      showImageModalItem(currentModalAlbumItems[currentModalItemIndex]);
      imageModal.classList.remove("hidden");
    }

    function moveImageModal(step) {
      if (imageModal.classList.contains("hidden")) return;
      if (currentModalAlbumItems.length <= 1) return;
      currentModalItemIndex = (currentModalItemIndex + step + currentModalAlbumItems.length) % currentModalAlbumItems.length;
      showImageModalItem(currentModalAlbumItems[currentModalItemIndex]);
    }

    function closeImageModal() {
      imageModal.classList.add("hidden");
      modalImage.src = "";
      modalMeta.textContent = "";
      currentModalItemIndex = -1;
      setModalZoom(false);
      updateImageModalNavigation();
    }

    function hexToRgb(hex) {
      const normalized = hex.replace("#", "").trim();
      const value = normalized.length === 3
        ? normalized.split("").map(part => part + part).join("")
        : normalized;
      const number = Number.parseInt(value, 16);
      return {
        r: (number >> 16) & 255,
        g: (number >> 8) & 255,
        b: number & 255
      };
    }

    function rgbToHex({ r, g, b }) {
      return `#${[r, g, b].map(value => Math.round(value).toString(16).padStart(2, "0")).join("")}`;
    }

    function rgbValue(hex) {
      const { r, g, b } = hexToRgb(hex);
      return `${r}, ${g}, ${b}`;
    }

    function mixColors(firstHex, secondHex, amount = 0.5) {
      const first = hexToRgb(firstHex);
      const second = hexToRgb(secondHex);
      return rgbToHex({
        r: first.r + (second.r - first.r) * amount,
        g: first.g + (second.g - first.g) * amount,
        b: first.b + (second.b - first.b) * amount
      });
    }

    function buildThemePalette(characterData) {
      const base = characterData.themeColor ?? "#5b2ab8";
      return {
        light: mixColors("#ffffff", base, 0.12),
        dark: mixColors(base, "#000000", 0.42),
        main: base,
        accent: mixColors("#ffffff", base, 0.38),
        line: mixColors("#ffffff", base, 0.24),
        pink: mixColors("#ffffff", base, 0.56)
      };
    }

    function applyCharacterTheme(characterData) {
      const { light, dark, main, accent, line, pink } = buildThemePalette(characterData);
      const darkRgb = hexToRgb(main);
      const accentRgb = hexToRgb(accent);
      const pinkRgb = hexToRgb(pink);
      const targets = [detailScreen, imageModal];

      targets.forEach(target => {
        target.style.setProperty("--purple", main);
        target.style.setProperty("--violet", accent);
        target.style.setProperty("--pink", pink);
        target.style.setProperty("--line", line);
        target.style.setProperty("--soft", light);
        target.style.setProperty("--theme-dark", dark);
        target.style.setProperty("--panel", `rgba(20, 19, 33, .88)`);
        target.style.setProperty("--purple-rgb", `${darkRgb.r}, ${darkRgb.g}, ${darkRgb.b}`);
        target.style.setProperty("--violet-rgb", `${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}`);
        target.style.setProperty("--pink-rgb", `${pinkRgb.r}, ${pinkRgb.g}, ${pinkRgb.b}`);
        target.style.setProperty("--shadow", `0 22px 60px rgba(${darkRgb.r}, ${darkRgb.g}, ${darkRgb.b}, .18)`);
      });

      document.querySelector(".status-stop-start").setAttribute("stop-color", pink);
      document.querySelector(".status-stop-end").setAttribute("stop-color", main);
      detailScreen.style.background = `
        radial-gradient(circle at 10% 6%, rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, .18), transparent 24%),
        radial-gradient(circle at 88% 8%, rgba(${pinkRgb.r}, ${pinkRgb.g}, ${pinkRgb.b}, .10), transparent 24%),
        linear-gradient(135deg, #10101b, #191628 52%, #101722)
      `;
    }

    slotImage.addEventListener("load", () => {
      slotImage.hidden = false;
      illustrationSlot.classList.add("has-image");
    });

    slotImage.addEventListener("error", () => {
      slotImage.hidden = true;
      illustrationSlot.classList.remove("has-image");
    });

    function openCurrentPreviewModal() {
      if (currentDetailTab !== "images") return;
      if (!currentPreviewModalItem || !currentPreviewModalItem.source) return;
      if (slotImage.hidden) return;
      openImageModal(currentPreviewModalItem);
    }

    illustrationSlot.addEventListener("click", openCurrentPreviewModal);

    illustrationSlot.addEventListener("keydown", event => {
      if (event.key !== "Enter" && event.key !== " ") return;
      if (currentDetailTab !== "images") return;
      event.preventDefault();
      openCurrentPreviewModal();
    });

    modalImage.addEventListener("load", () => {
      modalImage.hidden = false;
      modalPlaceholder.hidden = true;
    });

    modalImage.addEventListener("error", () => {
      modalImage.hidden = true;
      modalPlaceholder.hidden = false;
    });

    function getDetailNameSizes(name = "", en = "") {
      const nameLength = [...String(name)].length;
      const enLength = [...String(en)].length;
      const nameSize = nameLength >= 13 ? "24px" : nameLength >= 11 ? "26px" : nameLength >= 8 ? "29px" : "34px";
      const enSize = enLength >= 18 ? "11px" : enLength >= 14 ? "12px" : "13px";
      const tracking = nameLength >= 11 ? "-.07em" : nameLength >= 8 ? "-.055em" : "-.03em";
      return { nameSize, enSize, tracking };
    }

    function openDetail(index) {
      const selected = characters[index];
      currentCharacter = selected;
      const detailNameSizes = getDetailNameSizes(selected.name, selected.en);
      detailScreen.style.setProperty("--detail-name-size", detailNameSizes.nameSize);
      detailScreen.style.setProperty("--detail-en-size", detailNameSizes.enSize);
      detailScreen.style.setProperty("--detail-name-tracking", detailNameSizes.tracking);
      document.querySelector("#detailName").textContent = selected.name;
      document.querySelector("#detailEn").textContent = selected.en;
      applyCharacterTheme(selected);
      applyCharacterInfo(selected);
      applyAutoStats(selected);
      updateDetailFavoriteButton();
      detailScreen.classList.toggle("profile-mode", profileModeEnabled);
      startScreen.classList.add("hidden");
      listScreen.classList.add("hidden");
      generatorScreen.classList.add("hidden");
      adventureScreen.classList.add("hidden");
      libraryScreen.classList.add("hidden");
      detailScreen.classList.remove("hidden");
      updateShellSection("detail");
      setDetailTab("profile");
      setMainIllustration();
    }

    function openList() {
      startScreen.classList.add("hidden");
      generatorScreen.classList.add("hidden");
      adventureScreen.classList.add("hidden");
      libraryScreen.classList.add("hidden");
      detailScreen.classList.add("hidden");
      listScreen.classList.remove("hidden");
      renderCharacterList();
      updateShellSection("characters");
      updateAssetCheckButtonVisibility();
    }
