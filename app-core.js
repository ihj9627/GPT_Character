// app-core.js — split from character-ui.js during B-stage code structure cleanup.
const tabKeys = ["illustration", "doodle", "turnaround", "figure"];
    const baseAlbumSlots = 12;
    const albumSlotColumns = 4;
    const unregisteredValue = "미등록";

    // key: stable id used by code, title: card title, category: card label.
    // fileName: file inside the character folder, fit: thumbnail display mode.
    // category values currently used: MAIN, REFERENCE, FIGURE, MAGAZINE, SCENE, EVENT.
    // fit: "cover" fills the card by cropping from the center; "contain" shows the whole image.
    // visibility: "safe" always shows; "restricted" is hidden when profile view is ON.
    // Shared image slots are rendered for every character.
    // Optional slots are removed automatically when the file is not present in that character folder.
    const albumImageDefinitions = [
      { key: "illustration", title: "기본 일러스트", category: "MAIN", fileName: "main.png", fit: "cover", visibility: "safe" },
      { key: "doodle", title: "낙서 시트", category: "REFERENCE", fileName: "doodle.png", fit: "contain", visibility: "safe" },
      { key: "turnaround", title: "삼면도", category: "REFERENCE", fileName: "turn.png", fit: "contain", visibility: "safe" },
    ];

    const albumKeyDefinitions = {
      figure: { key: "figure", title: "피규어", category: "FIGURE", fileName: "fig.png", fit: "cover", visibility: "safe", optional: true },
      magazine: { key: "magazine", title: "광고", category: "MAGAZINE", fileName: "mag.png", fit: "cover", visibility: "restricted", optional: true },
      sketch: { key: "sketch", title: "스케치북", category: "SCENE", fileName: "sketch.png", fit: "cover", visibility: "restricted", optional: true },
      bra: { key: "bra", title: "생활 정보", category: "MAGAZINE", fileName: "bra.png", fit: "cover", visibility: "restricted", optional: true },
      box: { key: "box", title: "박스티", category: "SCENE", fileName: "box.png", fit: "cover", visibility: "safe", optional: true },
      beach: { key: "beach", title: "해수욕장", category: "EVENT", fileName: "beach.png", fit: "cover", visibility: "safe", optional: true },
      sakura: { key: "sakura", title: "벚꽃축제", category: "EVENT", fileName: "sakura.png", fit: "cover", visibility: "safe", optional: true },
      valen: { key: "valen", title: "발렌타인", category: "EVENT", fileName: "valen.png", fit: "cover", visibility: "safe", optional: true },
	  school: { key: "school", title: "학교", category: "EVENT", fileName: "school.png", fit: "cover", visibility: "safe", optional: true },
	  maid: { key: "maid", title: "메이드", category: "EVENT", fileName: "maid.png", fit: "cover", visibility: "safe", optional: true },
	  japanFestival: { key: "japanFestival", title: "일본 축제", category: "EVENT", fileName: "japanFestival.png", fit: "cover", visibility: "safe", optional: true },
	  cookmag: { key: "cookmag", title: "요리잡지", category: "MAGAZINE", fileName: "cookmag.png", fit: "cover", visibility: "restricted", optional: true }
    };

    const imageVisibilityLabels = {
      safe: "공개",
      restricted: "제한",
      locked: "미해금"
    };

    const imageFileNames = {
      thumbnail: "thumb.png",
      illustration: "main.png",
      doodle: "doodle.png",
      turnaround: "turn.png"
    };


    function normalizeFolderName(value = "") {
      return String(value).trim().replace(/\s+/g, "");
    }

    function getCharacterFolder(characterData) {
      if (characterData.folder) return normalizeFolderName(characterData.folder);
      if (characterData.id) return normalizeFolderName(characterData.id);
      const source = characterData.images?.illustration ?? "";
      const match = source.match(/^assets\/characters\/([^/]+)\//);
      if (match) return match[1];
      return normalizeFolderName(characterData.en ?? characterData.name ?? "unknown");
    }

    function createDefaultImages(characterData) {
      const folder = getCharacterFolder(characterData);
      return Object.fromEntries(Object.entries(imageFileNames).map(([key, fileName]) => [key, `assets/characters/${folder}/${fileName}`]));
    }

    function createCharacterRecord(characterData) {
      return {
        ...characterData,
        images: {
          ...createDefaultImages(characterData),
          ...(characterData.images ?? {})
        }
      };
    }

    const characters = (window.CHARACTERS ?? [])
      .map(createCharacterRecord)
      .filter(characterData => !characterData.hidden);
    const tabThemes = [
      "linear-gradient(135deg, rgba(91,42,184,.12), transparent 32%), radial-gradient(circle at 50% 42%, rgba(154,104,232,.12), transparent 34%), linear-gradient(180deg, #fbf9ff, #f2edff)",
      "linear-gradient(135deg, rgba(221,79,179,.12), transparent 32%), radial-gradient(circle at 50% 42%, rgba(221,79,179,.12), transparent 34%), linear-gradient(180deg, #fff9fd, #f8eaf8)",
      "linear-gradient(135deg, rgba(80,189,200,.12), transparent 32%), radial-gradient(circle at 50% 42%, rgba(80,189,200,.12), transparent 34%), linear-gradient(180deg, #f9ffff, #e9f8fb)",
      "linear-gradient(135deg, rgba(230,176,73,.16), transparent 32%), radial-gradient(circle at 50% 42%, rgba(230,176,73,.14), transparent 34%), linear-gradient(180deg, #fffdf8, #fbf1df)",
      "linear-gradient(135deg, rgba(47,25,116,.14), transparent 32%), radial-gradient(circle at 50% 42%, rgba(91,42,184,.16), transparent 34%), linear-gradient(180deg, #fbf9ff, #ece6ff)"
    ];


    const libraryDataSource = window.CHARACTER_LIBRARY_DATA ?? {};
    const libraryAccessLabels = libraryDataSource.libraryAccessLabels ?? {
      public: "",
      admin: "관리자",
      private: "비공개"
    };
    const libraryPrivatePassword = String(libraryDataSource.libraryPrivatePassword ?? "");
    const libraryTreeSeeds = Array.isArray(libraryDataSource.libraryTreeSeeds)
      ? libraryDataSource.libraryTreeSeeds
      : [];

    const startScreen = document.querySelector("#startScreen");
    const startBackground = document.querySelector("#startBackground");
    const listScreen = document.querySelector("#listScreen");
    const generatorScreen = document.querySelector("#generatorScreen");
    const adventureScreen = document.querySelector("#adventureScreen");
    const libraryScreen = document.querySelector("#libraryScreen");
    const detailScreen = document.querySelector("#detailScreen");
    const screenFrame = document.querySelector("#screenFrame");
    const viewportStage = document.querySelector("#viewportStage");
    const appNavButtons = Array.from(document.querySelectorAll("[data-app-nav]"));
    const appPageTitle = document.querySelector("#appPageTitle");
    const appPageSummary = document.querySelector("#appPageSummary");
    const appTopbarKicker = document.querySelector("#appTopbarKicker");
    const appModeValue = document.querySelector("#appModeValue");
    const appModeCopy = document.querySelector("#appModeCopy");
    const appModeBadge = document.querySelector("#appModeBadge");
    const appSafeModeButton = document.querySelector("#appSafeModeButton");
    const appAdminModeButton = document.querySelector("#appAdminModeButton");
    const adminPasswordModal = document.querySelector("#adminPasswordModal");
    const adminPasswordInput = document.querySelector("#adminPasswordInput");
    const adminPasswordError = document.querySelector("#adminPasswordError");
    const adminPasswordCancel = document.querySelector("#adminPasswordCancel");
    const adminPasswordSubmit = document.querySelector("#adminPasswordSubmit");
    const homeCharacterCount = document.querySelector("#homeCharacterCount");
    const homeLibraryCount = document.querySelector("#homeLibraryCount");
    const homeModeStatus = document.querySelector("#homeModeStatus");
    const characterListWrap = document.querySelector("#characterListWrap");
    const characterGrid = document.querySelector("#characterGrid");
    const listCount = document.querySelector("#listCount");
    const characterSearch = document.querySelector("#characterSearch");
    const filterPanel = document.querySelector("#filterPanel");
    const filterOpenButton = document.querySelector("#filterOpenButton");
    const filterPopover = document.querySelector("#filterPopover");
    const filterPopoverBody = document.querySelector("#filterPopoverBody");
    const filterApplyButton = document.querySelector("#filterApplyButton");
    const filterResetButton = document.querySelector("#filterResetButton");
    const favoriteFilterToggle = document.querySelector("#favoriteFilterToggle");
    const filterConfirmModal = document.querySelector("#filterConfirmModal");
    const filterConfirmMessage = document.querySelector("#filterConfirmMessage");
    const filterConfirmYes = document.querySelector("#filterConfirmYes");
    const filterConfirmNo = document.querySelector("#filterConfirmNo");
    const searchStatus = document.querySelector("#searchStatus");
    const edgePrevPageButton = document.querySelector("#edgePrevPageButton");
    const edgeNextPageButton = document.querySelector("#edgeNextPageButton");
    const pageStatus = document.querySelector("#pageStatus");
    const closeLibraryButton = document.querySelector("#closeLibraryButton");
    const librarySearch = document.querySelector("#librarySearch");
    const libraryTree = document.querySelector("#libraryTree");
    const libraryDocKicker = document.querySelector("#libraryDocKicker");
    const libraryDocTitle = document.querySelector("#libraryDocTitle");
    const libraryDocSummary = document.querySelector("#libraryDocSummary");
    const libraryDocBody = document.querySelector("#libraryDocBody");
    const libraryRelatedCharacters = document.querySelector("#libraryRelatedCharacters");
    const libraryRelatedDocuments = document.querySelector("#libraryRelatedDocuments");
    const libraryRelatedNovels = document.querySelector("#libraryRelatedNovels");
    const libraryPasswordModal = document.querySelector("#libraryPasswordModal");
    const libraryPasswordInput = document.querySelector("#libraryPasswordInput");
    const libraryPasswordError = document.querySelector("#libraryPasswordError");
    const libraryPasswordCancel = document.querySelector("#libraryPasswordCancel");
    const libraryPasswordSubmit = document.querySelector("#libraryPasswordSubmit");
    const closeGeneratorButton = document.querySelector("#closeGeneratorButton");
    const generateCharacterButton = document.querySelector("#generateCharacterButton");
    const copyGeneratorButton = document.querySelector("#copyGeneratorButton");
    const copyGeneratorImagePromptButton = document.querySelector("#copyGeneratorImagePromptButton");
    const generatorRandomTabButton = document.querySelector("#generatorRandomTabButton");
    const generatorFollowupTabButton = document.querySelector("#generatorFollowupTabButton");
    const generatorRandomTabPanel = document.querySelector("#generatorRandomTabPanel");
    const generatorFollowupTabPanel = document.querySelector("#generatorFollowupTabPanel");
    const generatorFollowupCharacterNameInput = document.querySelector("#generatorFollowupCharacterNameInput");
    const copyFollowupSketchSheetPromptButton = document.querySelector("#copyFollowupSketchSheetPromptButton");
    const copyFollowupTurnaroundPromptButton = document.querySelector("#copyFollowupTurnaroundPromptButton");
    const copyFollowupMagazinePromptButton = document.querySelector("#copyFollowupMagazinePromptButton");
    const copyFollowupSketchbookPromptButton = document.querySelector("#copyFollowupSketchbookPromptButton");
    const copyFollowupBodyInfoPromptButton = document.querySelector("#copyFollowupBodyInfoPromptButton");
    const copyFollowupCookingMagazinePromptButton = document.querySelector("#copyFollowupCookingMagazinePromptButton");
    const generatorSketchbookRecentSelect = document.querySelector("#generatorSketchbookRecentSelect");
    const loadGeneratorSketchbookRecentButton = document.querySelector("#loadGeneratorSketchbookRecentButton");
    const generatorSketchbookRaceInput = document.querySelector("#generatorSketchbookRaceInput");
    const generatorSketchbookRoleInput = document.querySelector("#generatorSketchbookRoleInput");
    const generatorSketchbookPersonalityInput = document.querySelector("#generatorSketchbookPersonalityInput");
    const generatorSketchbookGenreInput = document.querySelector("#generatorSketchbookGenreInput");
    const copyNegativePromptButton = document.querySelector("#copyNegativePromptButton");
    const clearGeneratorLocksButton = document.querySelector("#clearGeneratorLocksButton");
    const generatorHistoryList = document.querySelector("#generatorHistoryList");
    const clearGeneratorHistoryButton = document.querySelector("#clearGeneratorHistoryButton");
    const generatorLockSummary = document.querySelector("#generatorLockSummary");
    const generatorPromptPreview = document.querySelector("#generatorPromptPreview");
    const negativePromptPreview = document.querySelector("#negativePromptPreview");
    const generatorSetPastePreview = document.querySelector("#generatorSetPastePreview");
    const openGeneratorSetPasteButton = document.querySelector("#openGeneratorSetPasteButton");
    const generatorSetPasteModal = document.querySelector("#generatorSetPasteModal");
    const generatorSetPasteText = document.querySelector("#generatorSetPasteText");
    const closeGeneratorSetPasteButton = document.querySelector("#closeGeneratorSetPasteButton");
    const cancelGeneratorSetPasteButton = document.querySelector("#cancelGeneratorSetPasteButton");
    const applyGeneratorSetPasteButton = document.querySelector("#applyGeneratorSetPasteButton");
    const generatorPromptModal = document.querySelector("#generatorPromptModal");
    const generatorPromptModalKicker = document.querySelector("#generatorPromptModalKicker");
    const generatorPromptModalTitle = document.querySelector("#generatorPromptModalTitle");
    const generatorPromptModalCopy = document.querySelector("#generatorPromptModalCopy");
    const generatorQuestionPromptText = document.querySelector("#generatorQuestionPromptText");
    const closeGeneratorQuestionPromptButton = document.querySelector("#closeGeneratorQuestionPromptButton");
    const cancelGeneratorQuestionPromptButton = document.querySelector("#cancelGeneratorQuestionPromptButton");
    const copyGeneratorQuestionPromptButton = document.querySelector("#copyGeneratorQuestionPromptButton");
    const generatorGrid = document.querySelector("#generatorGrid");
    const closeAdventureButton = document.querySelector("#closeAdventureButton");
    const adventureCharacterSelect = document.querySelector("#adventureCharacterSelect");
    const adventureStartButton = document.querySelector("#adventureStartButton");
    const adventureContinueButton = document.querySelector("#adventureContinueButton");
    const adventureResetButton = document.querySelector("#adventureResetButton");
    const adventureCharacterImage = document.querySelector("#adventureCharacterImage");
    const adventureCharacterName = document.querySelector("#adventureCharacterName");
    const adventureCharacterStats = document.querySelector("#adventureCharacterStats");
    const adventureHealthValue = document.querySelector("#adventureHealthValue");
    const adventureSanityValue = document.querySelector("#adventureSanityValue");
    const adventureTurnValue = document.querySelector("#adventureTurnValue");
    const adventureLocationValue = document.querySelector("#adventureLocationValue");
    const adventureInventoryList = document.querySelector("#adventureInventoryList");
    const adventureEventKicker = document.querySelector("#adventureEventKicker");
    const adventureEventTitle = document.querySelector("#adventureEventTitle");
    const adventureEventText = document.querySelector("#adventureEventText");
    const adventureResultText = document.querySelector("#adventureResultText");
    const adventureChoiceList = document.querySelector("#adventureChoiceList");
    const adventureNextButton = document.querySelector("#adventureNextButton");
    const adventureLogList = document.querySelector("#adventureLogList");
    const detailFavoriteButton = document.querySelector("#detailFavoriteButton");
    const backButton = document.querySelector("#backButton");
    const tabButtons = document.querySelectorAll(".tab-button");
    const illustrationSlot = document.querySelector("#illustrationSlot");
    const slotImage = document.querySelector("#slotImage");
    const imageModal = document.querySelector("#imageModal");
    const modalTitle = document.querySelector("#modalTitle");
    const modalMeta = document.querySelector("#modalMeta");
    const modalImage = document.querySelector("#modalImage");
    const modalImageStage = document.querySelector(".modal-image-stage");
    const modalPlaceholder = document.querySelector("#modalPlaceholder");
    const modalClose = document.querySelector("#modalClose");
    const modalPrev = document.querySelector("#modalPrev");
    const modalNext = document.querySelector("#modalNext");
    const albumGrid = document.querySelector("#albumGrid");
    const albumSubtitle = document.querySelector("#albumSubtitle");
    const detailLibraryCards = document.querySelector("#detailLibraryCards");
    const assetCheckButton = document.querySelector("#assetCheckButton");
    const assetCheckModal = document.querySelector("#assetCheckModal");
    const assetCheckBody = document.querySelector("#assetCheckBody");
    const assetCheckClose = document.querySelector("#assetCheckClose");
    const assetCheckOk = document.querySelector("#assetCheckOk");
    let currentCharacter = characters[0];
    let profileModeEnabled = true;
    let pendingAdminUnlockAction = null;
    let currentDetailTab = "status";
    let searchQuery = "";
    const activeFilters = {
      favorites: new Set(),
      genre: new Set(),
      race: new Set(),
      job: new Set()
    };
    const pendingFilters = {
      favorites: new Set(),
      genre: new Set(),
      race: new Set(),
      job: new Set()
    };
    let activeFilterCategory = "genre";
    const filterSearchQueries = {
      favorites: "",
      genre: "",
      race: "",
      job: ""
    };
    let filterConfirmResolver = null;
    let currentPage = 0;
    let pageDirection = "left";
    let totalListPages = 1;
    let lastWheelPageAt = 0;
    let albumRenderToken = 0;
    let currentAlbumPreviewKey = "illustration";
    let currentPreviewModalItem = null;
    let currentModalAlbumItems = [];
    let currentModalItemIndex = -1;
    let modalImageZoomed = false;
    let modalPanActive = false;
    let modalPanMoved = false;
    let modalSuppressNextClick = false;
    let modalPanPointerId = null;
    let modalPanStartX = 0;
    let modalPanStartY = 0;
    let modalPanStartScrollLeft = 0;
    let modalPanStartScrollTop = 0;
    const folderAssetCache = new Map();
    let pageSize = 12;
    const favoriteStorageKey = "character-ui-favorites";
    const favoriteIds = new Set(loadFavorites());
    const generatorCommonOptions = window.GENERATOR_COMMON_OPTIONS ?? {};
    const generatorGenreGroups = window.GENERATOR_GENRE_GROUPS ?? {};
    const generatorGenreRules = window.GENERATOR_GENRE_RULES ?? {};
    const generatorSpeciesGroups = window.GENERATOR_SPECIES_GROUPS ?? {};
    const generatorJobGroups = window.GENERATOR_JOB_GROUPS ?? {};
    const generatorWeaponGroups = window.GENERATOR_WEAPON_GROUPS ?? {};
    const generatorFields = window.GENERATOR_FIELDS ?? [];
    const generatorCountWeights = window.GENERATOR_COUNT_WEIGHTS ?? {};
    let generatorResult = {};
    const generatorHistoryStorageKey = "character-ui-generator-history-v1";
    let generatorHistory = loadGeneratorHistory();
    let selectedLibraryDocumentId = "";
    let selectedLibraryWorldCode = "";
    let pendingPrivateLibraryDocumentId = "";
    const collapsedLibraryFolderKeys = new Set();
    const lockedGeneratorKeys = new Set();
    const lockableGeneratorKeys = new Set(["genre", "race", "role", "colors"]);
    const generatorFieldGroups = [
      { title: "캐릭터 핵심", keys: ["genre", "race", "role", "personality", "visualAge"] },
      { title: "외형", keys: ["features", "hairstyle", "colors"] },
      { title: "복장 · 소품", keys: ["outfit", "fashionPoints", "weapon"] },
      { title: "연출 · 특수 요소", keys: ["power"] }
    ];
    const generatorNegativePrompt = [
      "low quality",
      "blurry",
      "bad anatomy",
      "distorted face",
      "extra fingers",
      "missing fingers",
      "deformed hands",
      "broken limbs",
      "duplicate character",
      "cropped body",
      "watermark",
      "logo",
      "signature",
      "unwanted text"
    ].join(", ");
    const loadedListImages = new Set();
    const characterAssetManifest = window.CHARACTER_ASSET_MANIFEST ?? {};

    function updateUiScale() {
      const designWidth = 1920;
      const designHeight = 1080;
      const minimumWidth = 1600;
      const minimumHeight = 900;
      const minimumScale = Math.min(minimumWidth / designWidth, minimumHeight / designHeight);
      const viewportWidth = Math.max(window.innerWidth || designWidth, 1);
      const viewportHeight = Math.max(window.innerHeight || designHeight, 1);
      const fitScale = Math.min(viewportWidth / designWidth, viewportHeight / designHeight, 1);
      const scale = Math.max(fitScale, minimumScale);
      const scaleText = scale.toFixed(6);

      document.documentElement.style.setProperty("--ui-scale", scaleText);
      document.documentElement.style.setProperty("--stage-width", `${Math.round(designWidth * scale)}px`);
      document.documentElement.style.setProperty("--stage-height", `${Math.round(designHeight * scale)}px`);

      if (viewportStage) {
        viewportStage.style.width = `${designWidth * scale}px`;
        viewportStage.style.height = `${designHeight * scale}px`;
      }

      if (screenFrame) {
        screenFrame.style.width = `${designWidth}px`;
        screenFrame.style.height = `${designHeight}px`;
      }
    }

    function loadFavorites() {
      try {
        const saved = localStorage.getItem(favoriteStorageKey);
        const parsed = JSON.parse(saved || "[]");
        return Array.isArray(parsed) ? parsed : [];
      } catch (error) {
        console.warn("즐겨찾기 데이터를 초기화합니다.", error);
        return [];
      }
    }

    function loadGeneratorHistory() {
      try {
        const saved = localStorage.getItem(generatorHistoryStorageKey);
        const parsed = JSON.parse(saved || "[]");
        if (!Array.isArray(parsed)) return [];
        return parsed
          .filter(entry => entry && typeof entry === "object" && entry.result && typeof entry.result === "object")
          .slice(0, 5);
      } catch (error) {
        console.warn("랜덤 생성기 최근 결과를 초기화합니다.", error);
        return [];
      }
    }

    function getCharacterId(characterData) {
      return characterData.en || characterData.name;
    }

    function normalizeDisplayValue(value, fallback = unregisteredValue) {
      if (value === undefined || value === null) return fallback;
      const text = String(value).trim();
      return text || fallback;
    }

    function isUnregisteredValue(value) {
      return normalizeDisplayValue(value) === unregisteredValue;
    }

    function getProfileBasicInfo(characterData, key) {
      const legacyInfoKey = key === "measurements" ? "sizes" : key;
      const value = characterData.profile?.basicInfo?.[key]
        ?? characterData.info?.[legacyInfoKey]
        ?? (key === "genre" ? characterData.genre : undefined);
      return normalizeDisplayValue(value);
    }

    function getCharacterShortIntro(characterData) {
      return normalizeDisplayValue(characterData.profile?.shortIntro ?? characterData.intro, "준비 중입니다.");
    }

    function getCharacterQuote(characterData) {
      return normalizeDisplayValue(characterData.profile?.quote ?? characterData.speech, "준비 중입니다.");
    }

    function getCharacterGenre(characterData) {
      return getProfileBasicInfo(characterData, "genre");
    }

    function getFilterValue(characterData, key) {
      if (key === "genre") return getCharacterGenre(characterData);
      if (key === "race") return getProfileBasicInfo(characterData, "race");
      if (key === "job") return getProfileBasicInfo(characterData, "job");
      return "";
    }

    function hasActiveFilters() {
      return Object.values(activeFilters).some(values => values.size > 0);
    }

    function getCategoryFilterKeys() {
      return ["genre", "race", "job"];
    }

    function getCategoryFilterCount() {
      return getCategoryFilterKeys().reduce((sum, key) => sum + activeFilters[key].size, 0);
    }

    function getFilterLabel(key) {
      return getFilterGroups().find(([groupKey]) => groupKey === key)?.[1] ?? key;
    }

    function getActiveFilterCount() {
      return Object.values(activeFilters).reduce((sum, values) => sum + values.size, 0);
    }

    function copyFilters(source, target) {
      Object.keys(target).forEach(key => {
        target[key].clear();
        source[key].forEach(value => target[key].add(value));
      });
    }

    function normalizeExclusiveFilters(filters, keepKey = activeFilterCategory) {
      getCategoryFilterKeys().forEach(key => {
        if (key !== keepKey) filters[key].clear();
      });
    }

    function resetListFilters() {
      Object.values(activeFilters).forEach(values => values.clear());
      Object.values(pendingFilters).forEach(values => values.clear());
      setFilterPopoverOpen(false);
      updateFavoriteFilterButton();
      currentPage = 0;
      pageDirection = "left";
      renderFilterPanel();
      renderCharacterList();
    }

    function createFilterOptions(key) {
      return [...new Set(characters.map(characterData => getFilterValue(characterData, key)).filter(Boolean))]
        .sort((first, second) => first.localeCompare(second, "ko"))
        .map(value => [value, value]);
    }

    function getFilterGroups() {
      return [
        ["genre", "\uC7A5\uB974"],
        ["race", "\uC885\uC871"],
        ["job", "\uC9C1\uC5C5"]
      ];
    }

    function updateFavoriteFilterButton() {
      const isActive = activeFilters.favorites.size > 0;
      favoriteFilterToggle.classList.toggle("is-active", isActive);
      favoriteFilterToggle.setAttribute("aria-pressed", String(isActive));
    }

    function setFilterPopoverOpen(isOpen) {
      filterPopover.classList.toggle("hidden", !isOpen);
      filterOpenButton.setAttribute("aria-expanded", String(isOpen));
    }

    function toggleFavoriteFilter() {
      if (activeFilters.favorites.size > 0) {
        activeFilters.favorites.clear();
      } else {
        activeFilters.favorites.add("favorites");
      }
      pendingFilters.favorites.clear();
      activeFilters.favorites.forEach(value => pendingFilters.favorites.add(value));
      updateFavoriteFilterButton();
      currentPage = 0;
      pageDirection = "left";
      renderFilterPanel();
      renderCharacterList();
    }

    function showFilterConfirm(message) {
      filterConfirmMessage.textContent = message;
      filterConfirmModal.classList.remove("hidden");
      return new Promise(resolve => {
        filterConfirmResolver = resolve;
      });
    }

    function closeFilterConfirm(result) {
      filterConfirmModal.classList.add("hidden");
      const resolver = filterConfirmResolver;
      filterConfirmResolver = null;
      if (resolver) resolver(result);
    }

    async function requestFilterCategorySwitch(nextKey) {
      if (nextKey === activeFilterCategory) return;
      const conflictingKey = getCategoryFilterKeys().find(key => key !== nextKey && pendingFilters[key].size > 0);
      if (conflictingKey) {
        const confirmed = await showFilterConfirm(`${getFilterLabel(conflictingKey)} 필터가 초기화 됩니다. 진행하시겠습니까?`);
        if (!confirmed) return;
        getCategoryFilterKeys().forEach(key => {
          if (key !== nextKey) pendingFilters[key].clear();
        });
      }
      activeFilterCategory = nextKey;
      renderFilterPanel();
    }

    function renderFilterPanel() {
      const filterGroups = getFilterGroups();
      const activeCount = getCategoryFilterCount();
      filterOpenButton.innerHTML = activeCount ? `\uD544\uD130 <b>${activeCount}</b>` : "\uD544\uD130";
      if (!filterGroups.some(([key]) => key === activeFilterCategory)) activeFilterCategory = "genre";
      const activeGroup = filterGroups.find(([key]) => key === activeFilterCategory) ?? filterGroups[0];
      const [activeKey, activeLabel] = activeGroup;
      filterPopoverBody.innerHTML = "";

      const tabs = document.createElement("div");
      tabs.className = "filter-category-tabs";
      filterGroups.forEach(([key, label]) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = `filter-category-button${key === activeKey ? " is-active" : ""}`;
        const count = pendingFilters[key].size;
        button.innerHTML = count ? `${label} <b>${count}</b>` : label;
        button.addEventListener("click", () => requestFilterCategorySwitch(key));
        tabs.appendChild(button);
      });

      const panel = document.createElement("section");
      panel.className = "filter-selection-panel";
      const panelTitle = document.createElement("h3");
      panelTitle.textContent = activeLabel;
      const searchInput = document.createElement("input");
      searchInput.className = "filter-search-input";
      searchInput.type = "search";
      searchInput.value = filterSearchQueries[activeKey] ?? "";
      searchInput.placeholder = `${activeLabel} \uAC80\uC0C9`;
      const options = document.createElement("div");
      options.className = "filter-options";

      const renderOptions = () => {
        options.innerHTML = "";
        const filterQuery = (filterSearchQueries[activeKey] ?? "").trim().toLowerCase();
        const filteredOptions = createFilterOptions(activeKey).filter(([, optionLabel]) => !filterQuery || optionLabel.toLowerCase().includes(filterQuery));
        filteredOptions.forEach(([value, optionLabel]) => {
          const option = document.createElement("label");
          option.className = activeKey === "favorites" ? "filter-option filter-option-switch" : "filter-option";
          const input = document.createElement("input");
          input.type = "checkbox";
          input.value = value;
          input.checked = pendingFilters[activeKey].has(value);
          input.addEventListener("change", () => {
            if (input.checked) {
              pendingFilters[activeKey].add(value);
            } else {
              pendingFilters[activeKey].delete(value);
            }
          });
          option.append(input, document.createTextNode(optionLabel));
          options.appendChild(option);
        });
        if (filteredOptions.length === 0) {
          const empty = document.createElement("div");
          empty.className = "filter-empty";
          empty.textContent = "\uAC80\uC0C9 \uACB0\uACFC \uC5C6\uC74C";
          options.appendChild(empty);
        }
      };

      searchInput.addEventListener("input", event => {
        filterSearchQueries[activeKey] = event.target.value;
        renderOptions();
      });
      renderOptions();
      panel.append(panelTitle, searchInput, options);
      filterPopoverBody.append(tabs, panel);
      filterResetButton.disabled = !hasActiveFilters();
    }
    function openFilterPopover() {
      if (!filterPopover.classList.contains("hidden")) {
        setFilterPopoverOpen(false);
        return;
      }
      copyFilters(activeFilters, pendingFilters);
      renderFilterPanel();
      setFilterPopoverOpen(true);
    }

    function applyPendingFilters() {
      normalizeExclusiveFilters(pendingFilters);
      copyFilters(pendingFilters, activeFilters);
      setFilterPopoverOpen(false);
      updateFavoriteFilterButton();
      currentPage = 0;
      pageDirection = "left";
      renderFilterPanel();
      renderCharacterList();
    }
    function characterMatchesFilters(characterData) {
      if (activeFilters.favorites.size > 0 && !favoriteIds.has(getCharacterId(characterData))) return false;
      return ["genre", "race", "job"].every(key => {
        const values = activeFilters[key];
        return values.size === 0 || values.has(getFilterValue(characterData, key));
      });
    }

    function saveFavorites() {
      try {
        localStorage.setItem(favoriteStorageKey, JSON.stringify([...favoriteIds]));
      } catch (error) {
        console.warn("즐겨찾기를 저장하지 못했습니다.", error);
      }
    }
