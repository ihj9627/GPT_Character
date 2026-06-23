// adventure-ui.js — Noct text adventure pilot UI and small engine.
const adventureScenario = (window.NOCT_ADVENTURE_SCENARIOS ?? [])[0] ?? null;
const adventureStorageKey = "character-ui-noct-adventure-state-v1";
let adventureState = loadAdventureState();

function getAdventureCharacterId(characterData) {
  return characterData?.en || characterData?.name || "";
}

function getAdventureCharacterById(characterId) {
  return characters.find(characterData => getAdventureCharacterId(characterData) === characterId) ?? characters[0] ?? null;
}

function getDefaultAdventureCharacterId() {
  const lena = characters.find(characterData => characterData.name === "레나" || characterData.en === "Lena");
  return getAdventureCharacterId(lena ?? characters[0]);
}

function getAdventureCharacterFolder(characterData) {
  if (!characterData) return "";
  if (typeof getCharacterFolder === "function") return getCharacterFolder(characterData);
  return String(characterData.folder ?? characterData.en ?? characterData.name ?? "").trim();
}

function loadAdventureState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(adventureStorageKey) || "null");
    if (!parsed || typeof parsed !== "object") return null;
    if (parsed.scenarioId !== "noct-funeral-trial-pilot") return null;

    // v2 migration: older saves were turn-indexed. Keep the save usable,
    // but move event lookup to explicit event IDs so choices can branch.
    if (!parsed.currentEventId && adventureScenario?.events?.length) {
      const index = Math.max(0, Math.min((parsed.turn || 1) - 1, adventureScenario.events.length - 1));
      parsed.currentEventId = adventureScenario.events[index]?.id ?? adventureScenario.events[0]?.id ?? null;
    }
    if (!Array.isArray(parsed.visitedEventIds)) parsed.visitedEventIds = [];
    parsed.pendingNextEventId = parsed.pendingNextEventId || null;
    return parsed;
  } catch (error) {
    console.warn("노크트 어드벤처 저장 데이터를 초기화합니다.", error);
    return null;
  }
}

function saveAdventureState() {
  if (!adventureState) {
    localStorage.removeItem(adventureStorageKey);
    return;
  }
  localStorage.setItem(adventureStorageKey, JSON.stringify(adventureState));
}

function clampAdventureValue(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

function createAdventureState(characterId) {
  const initialStats = adventureScenario?.initialStats ?? {};
  return {
    scenarioId: adventureScenario?.id ?? "noct-funeral-trial-pilot",
    characterId: characterId || getDefaultAdventureCharacterId(),
    active: true,
    completed: false,
    turn: 1,
    maxTurns: adventureScenario?.maxTurns ?? 30,
    health: clampAdventureValue(initialStats.health ?? 100),
    sanity: clampAdventureValue(initialStats.sanity ?? 100),
    hidden: {
      suspicion: Number(initialStats.suspicion ?? 0),
      clue: Number(initialStats.clue ?? 0),
      taint: Number(initialStats.taint ?? 0),
      blackCoffinTrust: Number(initialStats.blackCoffinTrust ?? 0),
      courtReputation: Number(initialStats.courtReputation ?? 0)
    },
    records: [],
    items: [],
    flags: [],
    visitedEventIds: [],
    currentEventId: adventureScenario?.events?.[0]?.id ?? null,
    pendingNextEventId: null,
    log: [],
    lastResult: "",
    awaitingNext: false,
    ending: null
  };
}

function getAdventureEventById(eventId) {
  if (!adventureScenario?.events?.length) return null;
  return adventureScenario.events.find(eventData => eventData.id === eventId) ?? null;
}

function getAdventureSequentialEvent(offset = 0) {
  if (!adventureScenario?.events?.length || !adventureState) return null;
  const currentIndex = adventureScenario.events.findIndex(eventData => eventData.id === adventureState.currentEventId);
  const fallbackIndex = currentIndex >= 0 ? currentIndex + offset : (adventureState.turn || 1) - 1 + offset;
  const index = Math.max(0, Math.min(fallbackIndex, adventureScenario.events.length - 1));
  return adventureScenario.events[index] ?? null;
}

function getCurrentAdventureEvent() {
  if (!adventureScenario || !adventureState) return null;
  return getAdventureEventById(adventureState.currentEventId) ?? getAdventureSequentialEvent(0);
}

function resolveAdventureNextEventId(eventData, choice) {
  if (!eventData || !adventureScenario?.events?.length) return null;
  if (choice?.nextEventId && getAdventureEventById(choice.nextEventId)) return choice.nextEventId;
  if (eventData.nextEventId && getAdventureEventById(eventData.nextEventId)) return eventData.nextEventId;

  const currentIndex = adventureScenario.events.findIndex(candidate => candidate.id === eventData.id);
  const nextEvent = adventureScenario.events[currentIndex + 1] ?? null;
  return nextEvent?.id ?? eventData.id;
}

function uniqueAdventurePush(target, values = []) {
  values.forEach(value => {
    if (value && !target.includes(value)) target.push(value);
  });
}

function hasAdventureAll(source = [], required = []) {
  return required.every(value => source.includes(value));
}

function hasAdventureAny(source = [], required = []) {
  if (!required.length) return true;
  return required.some(value => source.includes(value));
}

function isAdventureCharacterMatch(choice, characterData) {
  const ids = choice.characterIds ?? [];
  if (!ids.length) return true;
  const characterIds = [characterData?.en, characterData?.name, getAdventureCharacterId(characterData)].filter(Boolean);
  return ids.some(id => characterIds.includes(id));
}

function isAdventureChoiceAvailable(choice, characterData) {
  if (!adventureState) return false;
  if (!isAdventureCharacterMatch(choice, characterData)) return false;
  if (!hasAdventureAll(adventureState.records, choice.requiredRecords ?? [])) return false;
  if (!hasAdventureAll(adventureState.items, choice.requiredItems ?? [])) return false;
  if (!hasAdventureAll(adventureState.flags, choice.requiredFlags ?? [])) return false;
  if (!hasAdventureAny(adventureState.flags, choice.anyFlags ?? [])) return false;
  if (choice.minRecords && adventureState.records.length < choice.minRecords) return false;
  return true;
}

function applyAdventureEffects(effects = {}) {
  if (!adventureState) return;
  if (Object.prototype.hasOwnProperty.call(effects, "health")) {
    adventureState.health = clampAdventureValue(adventureState.health + Number(effects.health || 0));
  }
  if (Object.prototype.hasOwnProperty.call(effects, "sanity")) {
    adventureState.sanity = clampAdventureValue(adventureState.sanity + Number(effects.sanity || 0));
  }

  ["suspicion", "clue", "taint", "blackCoffinTrust", "courtReputation"].forEach(key => {
    if (Object.prototype.hasOwnProperty.call(effects, key)) {
      adventureState.hidden[key] = Number(adventureState.hidden[key] || 0) + Number(effects[key] || 0);
    }
  });
}

function addAdventureLog(title, result) {
  if (!adventureState) return;
  adventureState.log.unshift({
    turn: adventureState.turn,
    title,
    result
  });
  adventureState.log = adventureState.log.slice(0, 8);
}

function chooseAdventureOption(choiceIndex) {
  if (!adventureState || adventureState.completed || adventureState.awaitingNext) return;
  const eventData = getCurrentAdventureEvent();
  const characterData = getAdventureCharacterById(adventureState.characterId);
  const choices = (eventData?.choices ?? []).filter(choice => isAdventureChoiceAvailable(choice, characterData));
  const choice = choices[choiceIndex];
  if (!choice) return;

  applyAdventureEffects(choice.effects ?? {});
  uniqueAdventurePush(adventureState.records, choice.addRecords ?? []);
  uniqueAdventurePush(adventureState.items, choice.addItems ?? []);
  uniqueAdventurePush(adventureState.flags, choice.addFlags ?? []);

  adventureState.lastResult = choice.result || "선택의 결과가 조용히 기록되었다.";
  uniqueAdventurePush(adventureState.visitedEventIds, [eventData.id]);
  adventureState.pendingNextEventId = resolveAdventureNextEventId(eventData, choice);
  addAdventureLog(eventData.title, adventureState.lastResult);

  const gameOver = resolveAdventureGameOver();
  if (gameOver) {
    adventureState.completed = true;
    adventureState.active = false;
    adventureState.ending = gameOver;
    adventureState.awaitingNext = false;
  } else if (adventureState.turn >= adventureState.maxTurns) {
    adventureState.completed = true;
    adventureState.active = false;
    adventureState.ending = resolveAdventureEnding();
    adventureState.awaitingNext = false;
  } else {
    adventureState.awaitingNext = true;
  }

  saveAdventureState();
  renderAdventureScreen();
}

function resolveAdventureGameOver() {
  if (!adventureState) return null;
  if (adventureState.health <= 0) {
    return {
      title: "행동 불능",
      text: "흑관궁의 복도는 끝나지 않았다. 하지만 몸은 더 이상 다음 문까지 가지 못했다."
    };
  }
  if (adventureState.sanity <= 0) {
    return {
      title: "정신 붕괴",
      text: "기록의 이름들이 서로 뒤섞였다. 마지막으로 들은 것은 종소리였는지, 누군가의 증언이었는지 알 수 없었다."
    };
  }
  if ((adventureState.hidden.suspicion ?? 0) >= 22) {
    return {
      title: "흑관 심문",
      text: "당신의 증언은 멈췄다. 이제 흑관궁은 사건보다 당신을 먼저 기록하기 시작했다."
    };
  }
  if ((adventureState.hidden.taint ?? 0) >= 12) {
    return {
      title: "검은 점",
      text: "망령의 목소리는 너무 오래 남았다. 흑관 기록의 여백에 당신의 이름과 작은 검은 점이 함께 찍혔다."
    };
  }
  return null;
}

function matchesAdventureEndingCondition(condition = {}, characterData) {
  if (!adventureState) return false;
  if (condition.characterIds?.length) {
    const ids = [characterData?.en, characterData?.name, getAdventureCharacterId(characterData)].filter(Boolean);
    if (!condition.characterIds.some(id => ids.includes(id))) return false;
  }
  if (!hasAdventureAll(adventureState.flags, condition.flags ?? [])) return false;
  if (!hasAdventureAny(adventureState.flags, condition.anyFlags ?? [])) return false;
  if (condition.minClue && (adventureState.hidden.clue ?? 0) < condition.minClue) return false;
  if (condition.minTaint && (adventureState.hidden.taint ?? 0) < condition.minTaint) return false;
  if (condition.minRecords && adventureState.records.length < condition.minRecords) return false;
  return true;
}

function resolveAdventureEnding() {
  const characterData = getAdventureCharacterById(adventureState?.characterId);
  const ending = (adventureScenario?.endings ?? []).find(candidate => matchesAdventureEndingCondition(candidate.condition ?? {}, characterData));
  return ending ?? {
    title: "첫 판정 생존",
    text: "당신은 첫 판정을 살아서 넘겼다. 장례는 끝나지 않았고, 흑관궁의 문은 아직 완전히 열리지 않았다."
  };
}

function advanceAdventureTurn() {
  if (!adventureState || adventureState.completed) return;
  adventureState.turn = Math.min(adventureState.turn + 1, adventureState.maxTurns);

  const nextEventId = adventureState.pendingNextEventId;
  if (nextEventId && getAdventureEventById(nextEventId)) {
    adventureState.currentEventId = nextEventId;
  } else {
    adventureState.currentEventId = getAdventureSequentialEvent(1)?.id ?? adventureState.currentEventId;
  }

  adventureState.pendingNextEventId = null;
  adventureState.lastResult = "";
  adventureState.awaitingNext = false;
  saveAdventureState();
  renderAdventureScreen();
}

function startAdventureGame() {
  if (!adventureScenario) return;
  const selectedCharacterId = adventureCharacterSelect?.value || getDefaultAdventureCharacterId();
  adventureState = createAdventureState(selectedCharacterId);
  saveAdventureState();
  renderAdventureScreen();
}

function continueAdventureGame() {
  adventureState = loadAdventureState();
  renderAdventureScreen();
}

function resetAdventureGame() {
  adventureState = null;
  saveAdventureState();
  renderAdventureScreen();
}

function getAdventureConditionLabel(value, type = "normal") {
  if (type === "health") {
    if (value >= 80) return "양호";
    if (value >= 55) return "지침";
    if (value >= 30) return "부상";
    return "위독";
  }
  if (value >= 80) return "침착";
  if (value >= 55) return "흔들림";
  if (value >= 30) return "불안정";
  return "붕괴 직전";
}

function renderAdventureCharacterSelect() {
  if (!adventureCharacterSelect) return;
  const activeId = adventureState?.characterId || adventureCharacterSelect.value || getDefaultAdventureCharacterId();
  adventureCharacterSelect.innerHTML = "";
  characters.forEach(characterData => {
    const option = document.createElement("option");
    option.value = getAdventureCharacterId(characterData);
    option.textContent = `${characterData.name}${characterData.en ? ` / ${characterData.en}` : ""}`;
    adventureCharacterSelect.appendChild(option);
  });
  adventureCharacterSelect.value = activeId;
}

function renderAdventureCharacterPanel(characterData) {
  if (!characterData) return;
  const basicInfo = characterData.profile?.basicInfo ?? {};
  if (adventureCharacterName) {
    adventureCharacterName.textContent = `${characterData.name}${characterData.en ? ` / ${characterData.en}` : ""}`;
  }
  if (adventureCharacterImage) {
    const folder = getAdventureCharacterFolder(characterData);
    adventureCharacterImage.src = characterData.images?.illustration || `assets/characters/${folder}/main.png`;
    adventureCharacterImage.alt = `${characterData.name} 대표 이미지`;
  }
  if (adventureCharacterStats) {
    const rows = [
      ["종족", basicInfo.race ?? "미등록"],
      ["직업", basicInfo.job ?? "미등록"],
      ["무기", basicInfo.weapon ?? "미등록"],
      ["능력", basicInfo.ability ?? "미등록"]
    ];
    adventureCharacterStats.innerHTML = rows.map(([label, value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`).join("");
  }
}

function renderAdventureStatus(eventData) {
  if (adventureHealthValue) {
    adventureHealthValue.textContent = adventureState
      ? `${adventureState.health} · ${getAdventureConditionLabel(adventureState.health, "health")}`
      : "-";
  }
  if (adventureSanityValue) {
    adventureSanityValue.textContent = adventureState
      ? `${adventureState.sanity} · ${getAdventureConditionLabel(adventureState.sanity, "sanity")}`
      : "-";
  }
  if (adventureTurnValue) {
    adventureTurnValue.textContent = adventureState
      ? `${adventureState.turn} / ${adventureState.maxTurns}`
      : "-";
  }
  if (adventureLocationValue) {
    adventureLocationValue.textContent = eventData?.location ?? adventureScenario?.initialLocation ?? "-";
  }
}

function renderAdventureInventory() {
  if (!adventureInventoryList) return;
  if (!adventureState) {
    adventureInventoryList.innerHTML = `<p class="adventure-empty-note">게임을 시작하면 기록과 아이템이 여기에 표시됩니다.</p>`;
    return;
  }
  const chips = [
    ...adventureState.records.map(value => ({ type: "기록", value })),
    ...adventureState.items.map(value => ({ type: "아이템", value }))
  ];
  if (!chips.length) {
    adventureInventoryList.innerHTML = `<p class="adventure-empty-note">아직 보유한 기록이나 아이템이 없습니다.</p>`;
    return;
  }
  adventureInventoryList.innerHTML = chips
    .map(chip => `<span class="adventure-inventory-chip"><small>${chip.type}</small>${chip.value}</span>`)
    .join("");
}

function renderAdventureChoices(eventData, characterData) {
  if (!adventureChoiceList) return;
  adventureChoiceList.innerHTML = "";
  if (!adventureState || adventureState.completed || adventureState.awaitingNext || !eventData) return;

  const choices = (eventData.choices ?? []).filter(choice => isAdventureChoiceAvailable(choice, characterData));
  choices.forEach((choice, index) => {
    const button = document.createElement("button");
    button.className = "adventure-choice-button";
    button.type = "button";
    button.textContent = choice.label;
    button.addEventListener("click", () => chooseAdventureOption(index));
    adventureChoiceList.appendChild(button);
  });

  if (!choices.length) {
    const fallback = document.createElement("p");
    fallback.className = "adventure-empty-note";
    fallback.textContent = "지금 선택할 수 있는 행동이 없습니다.";
    adventureChoiceList.appendChild(fallback);
  }
}

function renderAdventureEvent() {
  const characterData = getAdventureCharacterById(adventureState?.characterId || adventureCharacterSelect?.value || getDefaultAdventureCharacterId());
  const eventData = getCurrentAdventureEvent();

  if (!adventureState) {
    if (adventureEventKicker) adventureEventKicker.textContent = "READY";
    if (adventureEventTitle) adventureEventTitle.textContent = "게임을 시작하세요";
    if (adventureEventText) adventureEventText.textContent = "캐릭터를 선택한 뒤 새로 시작을 누르면 노크트 파일럿이 시작됩니다.";
    adventureResultText?.classList.add("hidden");
    if (adventureResultText) adventureResultText.textContent = "";
    if (adventureNextButton) adventureNextButton.classList.add("hidden");
    if (adventureChoiceList) adventureChoiceList.innerHTML = "";
    return;
  }

  if (adventureState.completed && adventureState.ending) {
    if (adventureEventKicker) adventureEventKicker.textContent = "ENDING";
    if (adventureEventTitle) adventureEventTitle.textContent = adventureState.ending.title;
    if (adventureEventText) adventureEventText.textContent = adventureState.ending.text;
    if (adventureResultText) {
      adventureResultText.classList.toggle("hidden", !adventureState.lastResult);
      adventureResultText.textContent = adventureState.lastResult;
    }
    if (adventureChoiceList) adventureChoiceList.innerHTML = "";
    if (adventureNextButton) adventureNextButton.classList.add("hidden");
    return;
  }

  if (adventureEventKicker) adventureEventKicker.textContent = `${eventData?.location ?? ""} · ${adventureState.turn}/${adventureState.maxTurns}`;
  if (adventureEventTitle) adventureEventTitle.textContent = eventData?.title ?? "사건 없음";
  if (adventureEventText) adventureEventText.textContent = eventData?.text ?? "다음 사건을 찾지 못했습니다.";

  if (adventureResultText) {
    adventureResultText.classList.toggle("hidden", !adventureState.lastResult);
    adventureResultText.textContent = adventureState.lastResult;
  }

  if (adventureNextButton) {
    adventureNextButton.classList.toggle("hidden", !adventureState.awaitingNext);
  }

  renderAdventureChoices(eventData, characterData);
}

function renderAdventureLog() {
  if (!adventureLogList) return;
  if (!adventureState?.log?.length) {
    adventureLogList.innerHTML = `<p class="adventure-empty-note">아직 진행 로그가 없습니다.</p>`;
    return;
  }
  adventureLogList.innerHTML = adventureState.log.map(entry => `
    <article class="adventure-log-entry">
      <span>${entry.turn}턴</span>
      <strong>${entry.title}</strong>
      <p>${entry.result}</p>
    </article>
  `).join("");
}

function renderAdventureScreen() {
  if (!adventureScenario || !adventureScreen) return;
  renderAdventureCharacterSelect();

  const activeCharacterId = adventureState?.characterId || adventureCharacterSelect?.value || getDefaultAdventureCharacterId();
  const characterData = getAdventureCharacterById(activeCharacterId);
  const eventData = getCurrentAdventureEvent();

  if (adventureCharacterSelect && adventureState?.active) {
    adventureCharacterSelect.value = adventureState.characterId;
  }

  renderAdventureCharacterPanel(characterData);
  renderAdventureStatus(eventData);
  renderAdventureInventory();
  renderAdventureEvent();
  renderAdventureLog();

  if (adventureContinueButton) adventureContinueButton.disabled = !loadAdventureState();
  if (adventureResetButton) adventureResetButton.disabled = !loadAdventureState();
}

function initializeAdventureUi() {
  renderAdventureCharacterSelect();
  renderAdventureScreen();

  adventureCharacterSelect?.addEventListener("change", () => {
    if (!adventureState || adventureState.completed) renderAdventureScreen();
  });
  adventureStartButton?.addEventListener("click", startAdventureGame);
  adventureContinueButton?.addEventListener("click", continueAdventureGame);
  adventureResetButton?.addEventListener("click", resetAdventureGame);
  adventureNextButton?.addEventListener("click", advanceAdventureTurn);
  closeAdventureButton?.addEventListener("click", closeAdventure);
}

initializeAdventureUi();
