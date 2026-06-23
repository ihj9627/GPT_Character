// app-shell.js — split from character-ui.js during B-stage code structure cleanup.
const appSectionMeta = {
      home: {
        title: "홈",
        kicker: "HOME",
        summary: "아카이브 상태 요약",
        activeNav: "home"
      },
      characters: {
        title: "Browse Ready",
        kicker: "ARCHIVE STATUS",
        summary: "검색 · 필터 · 즐겨찾기 탐색",
        activeNav: "characters"
      },
      detail: {
        title: "Selected Record",
        kicker: "FILE STATUS",
        summary: "프로필 · 서재 · 이미지 앨범",
        activeNav: "characters"
      },
      library: {
        title: "Story Shelf",
        kicker: "STORY SHELF",
        summary: "소설 열람",
        activeNav: "library"
      },
      generator: {
        title: "Prompt Builder",
        kicker: "GENERATOR STATUS",
        summary: "GPT IMAGE2 프롬프트 생성",
        activeNav: "generator"
      },
      adventure: {
        title: "노크트 어드벤처",
        kicker: "TEXT ADVENTURE",
        summary: "흑관궁의 장례 재판 파일럿",
        activeNav: "adventure"
      }
    };

    function updateShellMode() {
      const adminMode = isLibraryAdminMode();
      const modeLabel = adminMode ? "관리자모드" : "일반모드";
      const modeCopy = adminMode
        ? "관리자 자료 보기"
        : "공개 자료 보기";

      document.body.classList.toggle("admin-mode", adminMode);
      if (appModeValue) appModeValue.textContent = modeLabel;
      if (appModeCopy) appModeCopy.textContent = modeCopy;
      if (appModeBadge) appModeBadge.textContent = modeLabel;
      if (homeModeStatus) homeModeStatus.textContent = modeLabel;
      if (appSafeModeButton) appSafeModeButton.classList.toggle("is-active", !adminMode);
      if (appAdminModeButton) {
        appAdminModeButton.classList.toggle("is-active", adminMode);
        appAdminModeButton.textContent = adminMode ? "관리자모드" : "관리자 잠금";
        appAdminModeButton.setAttribute("aria-pressed", String(adminMode));
      }
    }

    function updateShellSection(sectionKey) {
      const sectionData = appSectionMeta[sectionKey] ?? appSectionMeta.home;
      const shelfStoryCount = sectionKey === "library" && typeof getLibraryDocuments === "function"
        ? getLibraryDocuments().length
        : null;
      document.body.dataset.appSection = sectionKey;
      if (appPageTitle) {
        appPageTitle.textContent = shelfStoryCount === null ? sectionData.title : `${shelfStoryCount} Stories`;
      }
      if (appTopbarKicker) appTopbarKicker.textContent = sectionData.kicker;
      if (appPageSummary) {
        appPageSummary.textContent = shelfStoryCount === null ? sectionData.summary : `소설 ${shelfStoryCount}편 등록`;
      }
      appNavButtons.forEach(button => {
        button.classList.toggle("is-active", button.dataset.appNav === sectionData.activeNav);
      });
      updateShellMode();
    }

    function closeAdminPasswordModal() {
      if (!adminPasswordModal) return;
      adminPasswordModal.classList.add("hidden");
      pendingAdminUnlockAction = null;
      if (adminPasswordError) adminPasswordError.textContent = "";
      if (adminPasswordInput) adminPasswordInput.value = "";
    }

    function openAdminPasswordModal(onUnlock = null) {
      if (isLibraryAdminMode()) {
        if (typeof onUnlock === "function") onUnlock();
        return;
      }
      pendingAdminUnlockAction = typeof onUnlock === "function" ? onUnlock : null;
      if (!adminPasswordModal) {
        pendingAdminUnlockAction = null;
        return;
      }
      adminPasswordModal.classList.remove("hidden");
      if (adminPasswordError) adminPasswordError.textContent = "";
      if (adminPasswordInput) {
        adminPasswordInput.value = "";
        setTimeout(() => adminPasswordInput.focus(), 0);
      }
    }

    function submitAdminPassword() {
      const password = adminPasswordInput?.value ?? "";
      if (password !== libraryPrivatePassword) {
        if (adminPasswordError) adminPasswordError.textContent = "비밀번호가 맞지 않습니다.";
        adminPasswordInput?.focus();
        return;
      }

      const unlockAction = pendingAdminUnlockAction;
      closeAdminPasswordModal();
      setAccessMode(false);
      if (typeof unlockAction === "function") unlockAction();
    }

    function requestAdminMode(onUnlock = null) {
      openAdminPasswordModal(onUnlock);
    }

    function setAccessMode(enableProfileMode) {
      profileModeEnabled = enableProfileMode;
      updateAssetCheckButtonVisibility();
      updateShellMode();
      detailScreen?.classList.toggle("profile-mode", profileModeEnabled);
      if (profileModeEnabled && !detailScreen.classList.contains("hidden") && currentDetailTab === "status") {
        setDetailTab("profile");
      }
      if (!libraryScreen.classList.contains("hidden")) {
        const selectedDocument = getLibraryDocument(selectedLibraryDocumentId);
        if (selectedLibraryWorldCode && typeof renderLibraryWorldIntro === "function") {
          renderLibraryWorldIntro(selectedLibraryWorldCode);
        } else if (selectedDocument && isLibraryDocumentVisible(selectedDocument) && !isLibraryPrivateLocked(selectedDocument)) {
          renderLibraryTree();
          renderLibraryDocument(selectedLibraryDocumentId);
        } else {
          selectedLibraryDocumentId = "";
          renderLibraryTree();
          renderLibraryEmptyDocument();
        }
      }
      if (!detailScreen.classList.contains("hidden") && currentDetailTab === "images") {
        renderImageAlbum();
      }
    }

    function openHome() {
      closeLibraryPasswordModal();
      closeAdminPasswordModal();
      generatorScreen.classList.add("hidden");
      adventureScreen.classList.add("hidden");
      libraryScreen.classList.add("hidden");
      detailScreen.classList.add("hidden");
      listScreen.classList.add("hidden");
      startScreen.classList.remove("hidden");
      updateShellSection("home");
    }

    function openGenerator() {
      startScreen.classList.add("hidden");
      listScreen.classList.add("hidden");
      libraryScreen.classList.add("hidden");
      detailScreen.classList.add("hidden");
      generatorScreen.classList.remove("hidden");
      adventureScreen.classList.add("hidden");
      updateShellSection("generator");
      renderGeneratorResult();
    }

    function openAdventure() {
      startScreen.classList.add("hidden");
      listScreen.classList.add("hidden");
      generatorScreen.classList.add("hidden");
      libraryScreen.classList.add("hidden");
      detailScreen.classList.add("hidden");
      adventureScreen.classList.remove("hidden");
      updateShellSection("adventure");
      if (typeof renderAdventureScreen === "function") renderAdventureScreen();
    }

    function closeAdventure() {
      adventureScreen.classList.add("hidden");
      openList();
    }


    function closeGenerator() {
      startScreen.classList.add("hidden");
      generatorScreen.classList.add("hidden");
      adventureScreen.classList.add("hidden");
      libraryScreen.classList.add("hidden");
      detailScreen.classList.add("hidden");
      listScreen.classList.remove("hidden");
      updateShellSection("characters");
      updateAssetCheckButtonVisibility();
    }

