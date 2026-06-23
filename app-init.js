// app-init.js — split from character-ui.js during B-stage code structure cleanup.
if (homeCharacterCount) {
      homeCharacterCount.textContent = String(characters.filter(characterData => !characterData.hidden).length);
    }
    if (homeLibraryCount) {
      homeLibraryCount.textContent = String(getLibraryDocuments().length);
    }

    appNavButtons.forEach(button => {
      button.addEventListener("click", () => {
        const target = button.dataset.appNav;
        if (target === "home") {
          openHome();
          return;
        }
        if (target === "characters") {
          openList();
          return;
        }
        if (target === "library") {
          openLibrary();
          return;
        }
        if (target === "generator") {
          openGenerator();
          return;
        }
        if (target === "adventure") {
          openAdventure();
        }
      });
    });

    appSafeModeButton?.addEventListener("click", () => setAccessMode(true));
    appAdminModeButton?.addEventListener("click", () => requestAdminMode());

    tabButtons.forEach(button => {
      button.addEventListener("click", () => setDetailTab(button.dataset.tab));
    });


    detailFavoriteButton.addEventListener("click", toggleCurrentFavorite);

    startBackground?.addEventListener("error", () => {
      startBackground.hidden = true;
      startScreen?.classList.add("no-start-image");
    });
    closeLibraryButton.addEventListener("click", closeLibrary);
    closeGeneratorButton.addEventListener("click", closeGenerator);
    generateCharacterButton.addEventListener("click", handleGenerateCharacter);
    copyGeneratorButton.addEventListener("click", copyGeneratorPrompt);
    copyGeneratorImagePromptButton?.addEventListener("click", copyGeneratorImagePrompt);
    generatorRandomTabButton?.addEventListener("click", () => setGeneratorMainTab("random"));
    generatorFollowupTabButton?.addEventListener("click", () => setGeneratorMainTab("followup"));
    copyFollowupSketchSheetPromptButton?.addEventListener("click", openFollowupSketchSheetPromptModal);
    copyFollowupTurnaroundPromptButton?.addEventListener("click", openFollowupTurnaroundPromptModal);
    copyFollowupMagazinePromptButton?.addEventListener("click", openFollowupMagazinePromptModal);
    copyFollowupSketchbookPromptButton?.addEventListener("click", openFollowupSketchbookPromptModal);
    copyFollowupBodyInfoPromptButton?.addEventListener("click", openFollowupBodyInfoPromptModal);
    copyFollowupCookingMagazinePromptButton?.addEventListener("click", openFollowupCookingMagazinePromptModal);
    loadGeneratorSketchbookRecentButton?.addEventListener("click", loadSelectedGeneratorSketchbookRecentEntry);
    copyNegativePromptButton?.addEventListener("click", copyNegativeGeneratorPrompt);
    closeGeneratorQuestionPromptButton?.addEventListener("click", closeGeneratorQuestionPromptModal);
    cancelGeneratorQuestionPromptButton?.addEventListener("click", closeGeneratorQuestionPromptModal);
    copyGeneratorQuestionPromptButton?.addEventListener("click", copyGeneratorQuestionPromptFromModal);
    openGeneratorSetPasteButton?.addEventListener("click", openGeneratorSetPasteModal);
    closeGeneratorSetPasteButton?.addEventListener("click", closeGeneratorSetPasteModal);
    cancelGeneratorSetPasteButton?.addEventListener("click", closeGeneratorSetPasteModal);
    applyGeneratorSetPasteButton?.addEventListener("click", applyGeneratorSetPasteFromModal);
    generatorSetPasteModal?.addEventListener("click", event => {
      if (event.target === generatorSetPasteModal) {
        closeGeneratorSetPasteModal();
      }
    });
    generatorPromptModal?.addEventListener("click", event => {
      if (event.target === generatorPromptModal) {
        closeGeneratorQuestionPromptModal();
      }
    });
    clearGeneratorLocksButton?.addEventListener("click", clearGeneratorLocks);
    clearGeneratorHistoryButton?.addEventListener("click", clearGeneratorHistory);
    filterOpenButton.addEventListener("click", openFilterPopover);
    favoriteFilterToggle.addEventListener("click", toggleFavoriteFilter);
    filterApplyButton.addEventListener("click", applyPendingFilters);
    filterResetButton.addEventListener("click", resetListFilters);
    filterConfirmYes.addEventListener("click", () => closeFilterConfirm(true));
    filterConfirmNo.addEventListener("click", () => closeFilterConfirm(false));
    filterConfirmModal.addEventListener("click", event => {
      if (event.target === filterConfirmModal) closeFilterConfirm(false);
    });

    librarySearch?.addEventListener("input", () => {
      renderLibraryTree();
    });

    libraryTree?.addEventListener("click", event => {
      const folderToggle = event.target.closest("[data-library-folder-toggle]");
      if (folderToggle) {
        const folderKey = folderToggle.dataset.libraryFolderToggle;
        if (folderKey) {
          if (collapsedLibraryFolderKeys.has(folderKey)) {
            collapsedLibraryFolderKeys.delete(folderKey);
          } else {
            collapsedLibraryFolderKeys.add(folderKey);
          }
        }
        const folderDocumentId = folderToggle.dataset.libraryFolderDocument;
        const folderWorldCode = folderToggle.dataset.libraryWorld;
        if (folderDocumentId) {
          requestLibraryDocument(folderDocumentId);
        } else if (folderWorldCode && typeof renderLibraryWorldIntro === "function") {
          renderLibraryWorldIntro(folderWorldCode);
        } else {
          renderLibraryTree();
        }
        return;
      }

      const documentButton = event.target.closest("[data-library-document]");
      if (!documentButton) return;
      requestLibraryDocument(documentButton.dataset.libraryDocument);
    });

    libraryRelatedCharacters?.addEventListener("click", event => {
      const characterButton = event.target.closest("[data-library-character]");
      if (!characterButton) return;
      const characterName = characterButton.dataset.libraryCharacter;
      const characterIndex = characters.findIndex(characterData => characterData.name === characterName || characterData.en === characterName);
      if (characterIndex >= 0) openDetail(characterIndex);
    });

    libraryDocBody?.addEventListener("click", event => {
      const profileButton = event.target.closest("[data-library-profile-character]");
      if (!profileButton) return;
      const characterName = profileButton.dataset.libraryProfileCharacter;
      const characterIndex = characters.findIndex(characterData => characterData.name === characterName || characterData.en === characterName);
      if (characterIndex >= 0) openDetail(characterIndex);
    });

    libraryRelatedDocuments?.addEventListener("click", event => {
      const documentButton = event.target.closest("[data-library-document]");
      if (!documentButton) return;
      openLibrary(documentButton.dataset.libraryDocument);
    });

    detailLibraryCards?.addEventListener("click", event => {
      const detailLibraryTrigger = event.target.closest("[data-detail-library-document]");
      if (!detailLibraryTrigger) return;
      openDetailLibraryDocument(detailLibraryTrigger.dataset.detailLibraryDocument);
    });

    detailLibraryCards?.addEventListener("keydown", event => {
      if (event.key !== "Enter" && event.key !== " ") return;
      const detailLibraryTrigger = event.target.closest("[data-detail-library-document]");
      if (!detailLibraryTrigger) return;
      event.preventDefault();
      openDetailLibraryDocument(detailLibraryTrigger.dataset.detailLibraryDocument);
    });

    libraryPasswordCancel?.addEventListener("click", closeLibraryPasswordModal);
    libraryPasswordSubmit?.addEventListener("click", submitLibraryPassword);
    libraryPasswordInput?.addEventListener("keydown", event => {
      if (event.key === "Enter") {
        event.preventDefault();
        submitLibraryPassword();
      }
    });
    libraryPasswordModal?.addEventListener("click", event => {
      if (event.target === libraryPasswordModal) closeLibraryPasswordModal();
    });

    adminPasswordCancel?.addEventListener("click", closeAdminPasswordModal);
    adminPasswordSubmit?.addEventListener("click", submitAdminPassword);
    adminPasswordInput?.addEventListener("keydown", event => {
      if (event.key === "Enter") {
        event.preventDefault();
        submitAdminPassword();
      }
    });
    adminPasswordModal?.addEventListener("click", event => {
      if (event.target === adminPasswordModal) closeAdminPasswordModal();
    });

    characterSearch.addEventListener("input", event => {
      searchQuery = event.target.value;
      currentPage = 0;
      pageDirection = "left";
      renderCharacterList();
    });

    edgePrevPageButton.addEventListener("click", () => changeListPage(-1));
    edgeNextPageButton.addEventListener("click", () => changeListPage(1));
    characterListWrap.addEventListener("wheel", event => {
      if (Math.abs(event.deltaY) < 18) return;
      event.preventDefault();
      const now = Date.now();
      if (now - lastWheelPageAt < 420) return;
      lastWheelPageAt = now;
      changeListPage(event.deltaY > 0 ? 1 : -1);
    }, { passive: false });

    backButton.addEventListener("click", openList);
    modalClose.addEventListener("click", closeImageModal);
    modalPrev?.addEventListener("click", () => moveImageModal(-1));
    modalNext?.addEventListener("click", () => moveImageModal(1));
    modalImage.addEventListener("click", (event) => {
      event.stopPropagation();
      if (modalSuppressNextClick) {
        modalSuppressNextClick = false;
        return;
      }
      if (modalImage.hidden) return;
      setModalZoom(!modalImageZoomed);
    });

    modalImageStage?.addEventListener("pointerdown", (event) => {
      if (!modalImageZoomed || event.button !== 0) return;
      const canPan = modalImageStage.scrollWidth > modalImageStage.clientWidth || modalImageStage.scrollHeight > modalImageStage.clientHeight;
      if (!canPan) return;
      modalPanActive = true;
      modalPanMoved = false;
      modalPanPointerId = event.pointerId;
      modalPanStartX = event.clientX;
      modalPanStartY = event.clientY;
      modalPanStartScrollLeft = modalImageStage.scrollLeft;
      modalPanStartScrollTop = modalImageStage.scrollTop;
      modalImageStage.classList.add("is-panning");
      modalImageStage.setPointerCapture?.(event.pointerId);
      event.preventDefault();
    });

    modalImageStage?.addEventListener("pointermove", (event) => {
      if (!modalPanActive || event.pointerId !== modalPanPointerId) return;
      const deltaX = event.clientX - modalPanStartX;
      const deltaY = event.clientY - modalPanStartY;
      if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
        modalPanMoved = true;
      }
      modalImageStage.scrollLeft = modalPanStartScrollLeft - deltaX;
      modalImageStage.scrollTop = modalPanStartScrollTop - deltaY;
      event.preventDefault();
    });

    function finishModalPan(event) {
      if (!modalPanActive || event.pointerId !== modalPanPointerId) return;
      modalPanActive = false;
      modalPanPointerId = null;
      modalImageStage?.classList.remove("is-panning");
      modalImageStage?.releasePointerCapture?.(event.pointerId);
      if (modalPanMoved) {
        modalSuppressNextClick = true;
        window.setTimeout(() => {
          modalSuppressNextClick = false;
        }, 0);
      }
    }

    modalImageStage?.addEventListener("pointerup", finishModalPan);
    modalImageStage?.addEventListener("pointercancel", finishModalPan);
    assetCheckButton?.addEventListener("click", runAssetCheck);
    assetCheckClose?.addEventListener("click", closeAssetCheckModal);
    assetCheckOk?.addEventListener("click", closeAssetCheckModal);
    assetCheckModal?.addEventListener("click", (event) => {
      if (event.target === assetCheckModal) {
        closeAssetCheckModal();
      }
    });
    imageModal.addEventListener("click", (event) => {
      if (event.target === imageModal) {
        closeImageModal();
      }
    });
    window.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !filterConfirmModal.classList.contains("hidden")) {
        closeFilterConfirm(false);
        return;
      }
      if (event.key === "Escape" && assetCheckModal && !assetCheckModal.classList.contains("hidden")) {
        closeAssetCheckModal();
        return;
      }
      if (event.key === "Escape" && libraryPasswordModal && !libraryPasswordModal.classList.contains("hidden")) {
        closeLibraryPasswordModal();
        return;
      }
      if (event.key === "Escape" && adminPasswordModal && !adminPasswordModal.classList.contains("hidden")) {
        closeAdminPasswordModal();
        return;
      }
      if (!imageModal.classList.contains("hidden")) {
        if (event.key === "Escape") {
          event.preventDefault();
          closeImageModal();
          return;
        }
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          moveImageModal(-1);
          return;
        }
        if (event.key === "ArrowRight") {
          event.preventDefault();
          moveImageModal(1);
        }
      }
    });
    window.addEventListener("resize", () => {
      updateUiScale();
      if (!listScreen.classList.contains("hidden")) {
        currentPage = 0;
        renderCharacterList();
      }
    });
    updateUiScale();
    updateShellSection("home");
    updateFavoriteFilterButton();
    renderFilterPanel();
    renderCharacterList();
    updateAssetCheckButtonVisibility();
