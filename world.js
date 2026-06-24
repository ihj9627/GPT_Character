(() => {
  "use strict";

  const app = document.getElementById("app");
  const searchInput = document.getElementById("globalSearch");

  const RAW_CHARACTERS = Array.isArray(window.CHARACTERS) ? window.CHARACTERS : [];
  const RAW_STORIES = Array.isArray(window.STORY_DATA) ? window.STORY_DATA : [];
  const TAXONOMY = window.STORY_TAXONOMY || {};
  const WORLDS = Array.isArray(TAXONOMY.genreGroups) ? TAXONOMY.genreGroups : [];

  const state = {
    view: "home",
    worldId: "",
    characterId: "",
    storyId: "",
    seriesId: "",
    search: ""
  };

  let readerRequestId = 0;

  const escapeHtml = value => String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

  const stripNumberPrefix = value => String(value || "").replace(/^\d{3}-/, "");

  const characterIdOf = character => stripNumberPrefix(character?.folder || character?.id || character?.en || character?.name);

  const characters = RAW_CHARACTERS
    .filter(character => character && !character.hidden)
    .map(character => ({ ...character, id: characterIdOf(character) }));

  const charactersById = new Map(characters.map(character => [character.id, character]));
  const storiesById = new Map(RAW_STORIES.map(story => [story.id, story]));

  const worldById = new Map(WORLDS.map(world => [world.code, world]));
  const characterWorldId = new Map();

  WORLDS.forEach(world => {
    (world.characters || []).forEach(characterId => {
      characterWorldId.set(characterId, world.code);
    });
  });

  function worldIdByName(name) {
    if (!name) return "";
    const found = WORLDS.find(world => world.name === name || world.code === name);
    return found?.code || "";
  }

  function getWorldName(worldId) {
    return worldById.get(worldId)?.name || worldId || "미분류";
  }

  function getCharacterName(characterId) {
    return charactersById.get(characterId)?.name || TAXONOMY.characterIndex?.[characterId]?.characterName || characterId || "";
  }

  function getCharacterWorldId(character) {
    const id = typeof character === "string" ? character : character?.id;
    return characterWorldId.get(id) || worldIdByName(typeof character === "string" ? "" : character?.profile?.basicInfo?.world) || "";
  }

  function getCharactersForWorld(worldId) {
    const world = worldById.get(worldId);
    const ids = world?.characters || [];
    return ids.map(id => charactersById.get(id)).filter(Boolean);
  }

  function getWorldStories(worldId) {
    return RAW_STORIES
      .filter(story => story.worldId === worldId && (story.scope === "world" || story.type === "world-story" || !story.characterId))
      .sort((a, b) => (a.seriesName || "").localeCompare(b.seriesName || "", "ko") || (a.episode || 0) - (b.episode || 0) || (a.title || "").localeCompare(b.title || "", "ko"));
  }

  function getCharacterStories(worldId) {
    return RAW_STORIES
      .filter(story => story.worldId === worldId && story.characterId)
      .sort((a, b) => getCharacterName(a.characterId).localeCompare(getCharacterName(b.characterId), "ko") || (a.title || "").localeCompare(b.title || "", "ko"));
  }

  function getStoriesForCharacter(characterId) {
    return RAW_STORIES
      .filter(story => story.characterId === characterId)
      .sort((a, b) => (a.typeName || "").localeCompare(b.typeName || "", "ko") || (a.title || "").localeCompare(b.title || "", "ko"));
  }

  function getCharacterStoryGroups(worldId) {
    const byCharacter = new Map();
    getCharacterStories(worldId).forEach(story => {
      if (!byCharacter.has(story.characterId)) byCharacter.set(story.characterId, []);
      byCharacter.get(story.characterId).push(story);
    });

    const orderedCharacters = getCharactersForWorld(worldId);
    const ordered = orderedCharacters
      .filter(character => byCharacter.has(character.id))
      .map(character => ({
        character,
        stories: byCharacter.get(character.id)
      }));

    Array.from(byCharacter.entries()).forEach(([characterId, stories]) => {
      if (ordered.some(group => group.character.id === characterId)) return;
      const character = charactersById.get(characterId);
      if (character) ordered.push({ character, stories });
    });

    return ordered;
  }

  function groupStoriesBySeries(stories) {
    const seriesMap = new Map();
    stories.forEach(story => {
      const seriesKey = story.seriesId || "standalone";
      if (!seriesMap.has(seriesKey)) {
        seriesMap.set(seriesKey, {
          id: seriesKey,
          name: story.seriesName || "단독 소설",
          seasons: new Map(),
          stories: []
        });
      }

      const series = seriesMap.get(seriesKey);
      series.stories.push(story);

      const seasonKey = story.seasonId || "season";
      if (!series.seasons.has(seasonKey)) {
        series.seasons.set(seasonKey, {
          id: seasonKey,
          name: story.seasonName || "시즌",
          stories: []
        });
      }
      series.seasons.get(seasonKey).stories.push(story);
    });

    return Array.from(seriesMap.values()).map(series => ({
      ...series,
      seasons: Array.from(series.seasons.values()).map(season => ({
        ...season,
        stories: season.stories.sort(sortStoryByEpisode)
      })).sort((a, b) => (a.name || "").localeCompare(b.name || "", "ko"))
    })).sort((a, b) => (a.name || "").localeCompare(b.name || "", "ko"));
  }

  function sortStoryByEpisode(a, b) {
    return (a.episode || 0) - (b.episode || 0) || (a.title || "").localeCompare(b.title || "", "ko");
  }

  function getSeriesForWorld(worldId, seriesId) {
    return groupStoriesBySeries(getWorldStories(worldId)).find(series => series.id === seriesId) || null;
  }

  function imagePath(character, slot = "thumb") {
    const file = slot === "main" ? "main.webp" : `${slot}.webp`;
    return `assets/characters/${character.folder}/${file}`;
  }

  function onImageError(event) {
    const img = event.target;
    img.hidden = true;
    const parent = img.closest(".character-thumb, .profile-image, .mini-thumb");
    if (parent) parent.classList.add("is-missing-image");
  }

  window.worldArchiveImageFallback = onImageError;

  function navigate(nextState, options = {}) {
    const next = { ...state, ...nextState };
    state.view = next.view || "home";
    state.worldId = next.worldId || "";
    state.characterId = next.characterId || "";
    state.storyId = next.storyId || "";
    state.seriesId = next.seriesId || "";
    state.search = next.search ?? state.search;

    const historyState = {
      view: state.view,
      worldId: state.worldId,
      characterId: state.characterId,
      storyId: state.storyId,
      seriesId: state.seriesId
    };

    if (options.replace) {
      window.history.replaceState(historyState, "", makeHash(historyState));
    } else {
      window.history.pushState(historyState, "", makeHash(historyState));
    }

    render();
    if (!options.keepScroll) window.scrollTo({ top: 0, behavior: "auto" });
  }

  function makeHash(route) {
    if (route.view === "world" && route.worldId) return `#world=${encodeURIComponent(route.worldId)}`;
    if (route.view === "world-characters" && route.worldId) return `#world-characters=${encodeURIComponent(route.worldId)}`;
    if (route.view === "world-novels" && route.worldId) return `#world-novels=${encodeURIComponent(route.worldId)}`;
    if (route.view === "series" && route.worldId && route.seriesId) return `#series=${encodeURIComponent(`${route.worldId}::${route.seriesId}`)}`;
    if (route.view === "character" && route.characterId) return `#character=${encodeURIComponent(route.characterId)}`;
    if (route.view === "reader" && route.storyId) return `#story=${encodeURIComponent(route.storyId)}`;
    return "#home";
  }

  function routeFromHash() {
    const hash = window.location.hash.replace(/^#/, "");
    if (!hash || hash === "home") return { view: "home" };

    const [key, rawValue] = hash.split("=");
    const value = decodeURIComponent(rawValue || "");

    if (key === "world" && worldById.has(value)) return { view: "world", worldId: value };
    if (key === "world-characters" && worldById.has(value)) return { view: "world-characters", worldId: value };
    if (key === "world-novels" && worldById.has(value)) return { view: "world-novels", worldId: value };
    if (key === "series") {
      const [worldId, seriesId] = value.split("::");
      if (worldById.has(worldId) && getSeriesForWorld(worldId, seriesId)) {
        return { view: "series", worldId, seriesId };
      }
    }
    if (key === "character" && charactersById.has(value)) return { view: "character", characterId: value, worldId: getCharacterWorldId(value) };
    if (key === "story" && storiesById.has(value)) {
      const story = storiesById.get(value);
      return { view: "reader", storyId: value, worldId: story.worldId, characterId: story.characterId || "", seriesId: story.seriesId || "" };
    }
    return { view: "home" };
  }

  function render() {
    readerRequestId += 1;

    if (!RAW_CHARACTERS.length || !RAW_STORIES.length || !WORLDS.length) {
      app.innerHTML = `<section class="error-panel"><h1>데이터를 찾지 못했습니다.</h1><p>characters.js, story-data.js, story-taxonomy.js를 확인해주세요.</p></section>`;
      return;
    }

    const searchSection = renderSearchSection();

    if (state.view === "world") {
      app.innerHTML = `${renderWorldView(state.worldId)}${searchSection}`;
      return;
    }

    if (state.view === "world-characters") {
      app.innerHTML = `${renderWorldCharactersView(state.worldId)}${searchSection}`;
      return;
    }

    if (state.view === "world-novels") {
      app.innerHTML = `${renderWorldNovelsView(state.worldId)}${searchSection}`;
      return;
    }

    if (state.view === "series") {
      app.innerHTML = `${renderSeriesView(state.worldId, state.seriesId)}${searchSection}`;
      return;
    }

    if (state.view === "character") {
      app.innerHTML = `${renderCharacterView(state.characterId)}${searchSection}`;
      return;
    }

    if (state.view === "reader") {
      app.innerHTML = renderReaderShell(state.storyId);
      renderReaderBody(state.storyId);
      return;
    }

    app.innerHTML = `${renderHome()}${searchSection}`;
  }

  function renderHome() {
    const worldCards = WORLDS.map(world => {
      const worldCharacters = getCharactersForWorld(world.code);
      const worldStories = getWorldStories(world.code);
      const characterStories = getCharacterStories(world.code);
      return `
        <button class="world-card" type="button" data-action="select-world" data-world-id="${escapeHtml(world.code)}">
          <span class="card-kicker">${escapeHtml(world.coreGenre || "World")}</span>
          <h3>${escapeHtml(world.name)}</h3>
          <p>${escapeHtml(world.description || "")}</p>
          <span class="mini-divider"></span>
          <span class="world-meta">
            <span class="pill">캐릭터 ${worldCharacters.length}</span>
            <span class="pill">세계 소설 ${worldStories.length}</span>
            <span class="pill">캐릭터 단편 ${characterStories.length}</span>
          </span>
        </button>
      `;
    }).join("");

    const totalWorldStories = RAW_STORIES.filter(story => story.scope === "world" || story.type === "world-story").length;
    const totalCharacterStories = RAW_STORIES.filter(story => story.characterId).length;

    return `
      <section class="hero">
        <div class="hero-inner">
          <span class="hero-kicker">Next Archive View</span>
          <h1 class="hero-title">세계부터 들어가는 감상 아카이브</h1>
          <p class="hero-text">기존 PC/모바일 안정판은 유지하고, 이 페이지는 세계관을 먼저 고른 뒤 캐릭터와 소설을 단계적으로 감상하는 새 개편판입니다.</p>
          <div class="hero-actions">
            <button class="primary-button" type="button" data-action="select-world" data-world-id="noct">노크트 먼저 보기</button>
            <a class="soft-button" href="#world-list">전체 세계 보기</a>
          </div>
          <div class="stat-strip">
            <span class="stat-card"><strong>${WORLDS.length}</strong><span>세계관</span></span>
            <span class="stat-card"><strong>${characters.length}</strong><span>캐릭터</span></span>
            <span class="stat-card"><strong>${totalWorldStories}</strong><span>세계 소설</span></span>
            <span class="stat-card"><strong>${totalCharacterStories}</strong><span>캐릭터 단편</span></span>
          </div>
        </div>
      </section>
      <section id="world-list" class="section">
        <div class="section-head">
          <div>
            <span class="section-kicker">World Select</span>
            <h2 class="section-title">세계 선택</h2>
            <p class="section-desc">세계에 들어간 뒤 캐릭터 또는 소설을 골라 더 깊게 이동합니다.</p>
          </div>
        </div>
        <div class="world-grid">${worldCards}</div>
      </section>
    `;
  }

  function renderWorldHero(world, worldCharacters, worldStories, characterStories, extraActions = "") {
    return `
      <section class="hero">
        <div class="hero-inner">
          <div class="inline-actions">
            <button class="back-button" type="button" data-action="home">← 세계 선택</button>
            ${extraActions}
          </div>
          <span class="hero-kicker">${escapeHtml(world.coreGenre || "World")}</span>
          <h1 class="hero-title">${escapeHtml(world.name)}</h1>
          <p class="hero-text">${escapeHtml(world.description || "")}</p>
          <div class="stat-strip">
            <span class="stat-card"><strong>${worldCharacters.length}</strong><span>소속 캐릭터</span></span>
            <span class="stat-card"><strong>${worldStories.length}</strong><span>세계 소설</span></span>
            <span class="stat-card"><strong>${characterStories.length}</strong><span>캐릭터 단편</span></span>
          </div>
        </div>
      </section>
    `;
  }

  function renderWorldRail(activeWorldId) {
    return `
      <aside class="world-rail" aria-label="세계관 바로가기">
        ${WORLDS.map(item => `
          <button class="chip-button ${item.code === activeWorldId ? "is-active" : ""}" type="button" data-action="select-world" data-world-id="${escapeHtml(item.code)}">${escapeHtml(item.name)}</button>
        `).join("")}
      </aside>
    `;
  }

  function renderWorldLayout(worldId, content) {
    return `
      <div class="world-layout">
        ${renderWorldRail(worldId)}
        <div class="world-content">${content}</div>
      </div>
    `;
  }

  function renderWorldView(worldId) {
    const world = worldById.get(worldId) || WORLDS[0];
    const worldCharacters = getCharactersForWorld(world.code);
    const worldStories = getWorldStories(world.code);
    const characterStories = getCharacterStories(world.code);
    const storySeries = groupStoriesBySeries(worldStories);
    const shortGroups = getCharacterStoryGroups(world.code);

    const content = `
      <section class="section">
        <div class="section-head">
          <div>
            <span class="section-kicker">World Home</span>
            <h2 class="section-title">${escapeHtml(world.name)} 입장</h2>
            <p class="section-desc">이 화면에서는 전체 목록을 펼치지 않고, 캐릭터와 소설 중 어디로 들어갈지 먼저 고릅니다.</p>
          </div>
        </div>
        <div class="entry-grid">
          <button class="entry-card" type="button" data-action="select-world-characters" data-world-id="${escapeHtml(world.code)}">
            <span class="card-kicker">Characters</span>
            <h3>캐릭터</h3>
            <p>소속 캐릭터 ${worldCharacters.length}명을 카드로 봅니다.</p>
            <span class="entry-arrow">보기 →</span>
          </button>
          <button class="entry-card" type="button" data-action="select-world-novels" data-world-id="${escapeHtml(world.code)}">
            <span class="card-kicker">Novels</span>
            <h3>소설</h3>
            <p>세계 소설과 캐릭터 단편을 한 번 더 나눠서 봅니다.</p>
            <span class="world-meta">
              <span class="pill">시리즈 ${storySeries.length}</span>
              <span class="pill">세계 소설 ${worldStories.length}</span>
              <span class="pill">단편 ${characterStories.length}</span>
            </span>
            <span class="entry-arrow">보기 →</span>
          </button>
        </div>
      </section>
      <section class="section">
        <div class="section-head">
          <div>
            <span class="section-kicker">Preview</span>
            <h2 class="section-title">요약 미리보기</h2>
            <p class="section-desc">세계 홈에는 일부만 보여주고, 전체 목록은 각 섹션에서 확인합니다.</p>
          </div>
        </div>
        <div class="summary-grid">
          <div class="summary-card">
            <span class="card-kicker">Characters</span>
            <h3>대표 캐릭터</h3>
            <div class="mini-character-row">
              ${worldCharacters.slice(0, 6).map(renderMiniCharacter).join("")}
            </div>
          </div>
          <div class="summary-card">
            <span class="card-kicker">Novels</span>
            <h3>읽을거리</h3>
            <p class="muted">세계 시리즈 ${storySeries.length}개, 캐릭터 단편 보유 캐릭터 ${shortGroups.length}명.</p>
            <button class="soft-button" type="button" data-action="select-world-novels" data-world-id="${escapeHtml(world.code)}">소설로 이동</button>
          </div>
        </div>
      </section>
    `;

    return `${renderWorldHero(world, worldCharacters, worldStories, characterStories)}${renderWorldLayout(world.code, content)}`;
  }

  function renderWorldCharactersView(worldId) {
    const world = worldById.get(worldId) || WORLDS[0];
    const worldCharacters = getCharactersForWorld(world.code);
    const worldStories = getWorldStories(world.code);
    const characterStories = getCharacterStories(world.code);

    const content = `
      <section class="section">
        <div class="section-head">
          <div>
            <span class="section-kicker">Characters</span>
            <h2 class="section-title">${escapeHtml(world.name)} 캐릭터</h2>
            <p class="section-desc">16:9 썸네일을 그대로 살린 시네마틱 카드형 목록입니다.</p>
          </div>
          <div class="section-actions">
            <button class="back-button" type="button" data-action="select-world" data-world-id="${escapeHtml(world.code)}">← ${escapeHtml(world.name)} 홈</button>
            <button class="soft-button" type="button" data-action="select-world-novels" data-world-id="${escapeHtml(world.code)}">소설 보기</button>
          </div>
        </div>
        <div class="character-grid">
          ${worldCharacters.map(renderCharacterCard).join("")}
        </div>
      </section>
    `;

    return `${renderWorldHero(world, worldCharacters, worldStories, characterStories)}${renderWorldLayout(world.code, content)}`;
  }

  function renderWorldNovelsView(worldId) {
    const world = worldById.get(worldId) || WORLDS[0];
    const worldCharacters = getCharactersForWorld(world.code);
    const worldStories = getWorldStories(world.code);
    const characterStories = getCharacterStories(world.code);
    const seriesGroups = groupStoriesBySeries(worldStories);
    const shortGroups = getCharacterStoryGroups(world.code);

    const worldNovelContent = seriesGroups.length
      ? `<div class="series-grid">${seriesGroups.map(series => renderSeriesSummaryCard(world.code, series)).join("")}</div>`
      : `<div class="empty-panel">아직 등록된 세계별 시리즈 소설이 없습니다.</div>`;

    const characterShortContent = shortGroups.length
      ? `<div class="series-grid">${shortGroups.map(renderCharacterShortCard).join("")}</div>`
      : `<div class="empty-panel">아직 등록된 캐릭터 단편이 없습니다.</div>`;

    const content = `
      <section class="section">
        <div class="section-head">
          <div>
            <span class="section-kicker">Novels</span>
            <h2 class="section-title">${escapeHtml(world.name)} 소설</h2>
            <p class="section-desc">읽을거리는 소설로 한 번 묶고, 안에서 세계 소설과 캐릭터 단편을 분리합니다.</p>
          </div>
          <div class="section-actions">
            <button class="back-button" type="button" data-action="select-world" data-world-id="${escapeHtml(world.code)}">← ${escapeHtml(world.name)} 홈</button>
            <button class="soft-button" type="button" data-action="select-world-characters" data-world-id="${escapeHtml(world.code)}">캐릭터 보기</button>
          </div>
        </div>
        <div class="entry-grid is-compact">
          <div class="summary-card">
            <span class="card-kicker">World Novels</span>
            <h3>세계 소설</h3>
            <p class="muted">시리즈와 시즌 중심으로 읽는 장편/연작입니다.</p>
            <span class="world-meta"><span class="pill">시리즈 ${seriesGroups.length}</span><span class="pill">총 ${worldStories.length}편</span></span>
          </div>
          <div class="summary-card">
            <span class="card-kicker">Character Shorts</span>
            <h3>캐릭터 단편</h3>
            <p class="muted">캐릭터별로 묶은 단편 소설입니다.</p>
            <span class="world-meta"><span class="pill">캐릭터 ${shortGroups.length}명</span><span class="pill">총 ${characterStories.length}편</span></span>
          </div>
        </div>
      </section>
      <section class="section">
        <div class="section-head">
          <div>
            <span class="section-kicker">World Novels</span>
            <h2 class="section-title">세계 소설</h2>
            <p class="section-desc">시리즈 카드를 먼저 고른 뒤 시즌과 에피소드 목록으로 들어갑니다.</p>
          </div>
        </div>
        ${worldNovelContent}
      </section>
      <section class="section">
        <div class="section-head">
          <div>
            <span class="section-kicker">Character Shorts</span>
            <h2 class="section-title">캐릭터 단편</h2>
            <p class="section-desc">캐릭터를 고르면 해당 캐릭터의 프로필과 단편 목록으로 이동합니다.</p>
          </div>
        </div>
        ${characterShortContent}
      </section>
    `;

    return `${renderWorldHero(world, worldCharacters, worldStories, characterStories)}${renderWorldLayout(world.code, content)}`;
  }

  function renderSeriesView(worldId, seriesId) {
    const world = worldById.get(worldId) || WORLDS[0];
    const worldCharacters = getCharactersForWorld(world.code);
    const worldStories = getWorldStories(world.code);
    const characterStories = getCharacterStories(world.code);
    const series = getSeriesForWorld(world.code, seriesId);

    if (!series) {
      return `<section class="error-panel"><h1>시리즈를 찾지 못했습니다.</h1></section>`;
    }

    const content = `
      <section class="section">
        <div class="section-head">
          <div>
            <span class="section-kicker">Series</span>
            <h2 class="section-title">${escapeHtml(series.name)}</h2>
            <p class="section-desc">${escapeHtml(world.name)}의 세계 소설 시리즈입니다. 시즌 안에서 읽을 화를 선택합니다.</p>
          </div>
          <div class="section-actions">
            <button class="back-button" type="button" data-action="select-world-novels" data-world-id="${escapeHtml(world.code)}">← 소설</button>
          </div>
        </div>
        <div class="season-list">
          ${series.seasons.map(season => `
            <article class="series-card">
              <div class="series-body">
                <span class="card-kicker">Season</span>
                <h3>${escapeHtml(season.name)}</h3>
                <p class="muted">${season.stories.length}편</p>
                <div class="story-list">
                  ${season.stories.map(story => renderStoryButton(story, "compact")).join("")}
                </div>
              </div>
            </article>
          `).join("")}
        </div>
      </section>
    `;

    return `${renderWorldHero(world, worldCharacters, worldStories, characterStories)}${renderWorldLayout(world.code, content)}`;
  }

  function renderSeriesSummaryCard(worldId, series) {
    const totalStories = series.stories.length;
    const seasonLabels = series.seasons.map(season => `${season.name} ${season.stories.length}편`).join(" · ");

    return `
      <button class="series-card" type="button" data-action="select-series" data-world-id="${escapeHtml(worldId)}" data-series-id="${escapeHtml(series.id)}">
        <span class="series-body">
          <span class="card-kicker">World Series</span>
          <h3>${escapeHtml(series.name)}</h3>
          <p>${escapeHtml(seasonLabels || "시즌 정보 없음")}</p>
          <span class="world-meta">
            <span class="pill">총 ${totalStories}편</span>
            <span class="pill">들어가기 →</span>
          </span>
        </span>
      </button>
    `;
  }

  function renderCharacterShortCard(group) {
    const firstStory = group.stories[0];
    return `
      <button class="series-card" type="button" data-action="select-character" data-character-id="${escapeHtml(group.character.id)}">
        <span class="series-body">
          <span class="card-kicker">Character Shorts</span>
          <span class="mini-row">
            <span class="mini-thumb">
              <img src="${escapeHtml(imagePath(group.character, "thumb"))}" alt="${escapeHtml(group.character.name)}" loading="lazy" onerror="worldArchiveImageFallback(event)">
            </span>
            <span>
              <h3>${escapeHtml(group.character.name)}</h3>
              <p>${escapeHtml(firstStory?.title || group.character.profile?.shortIntro || "")}</p>
            </span>
          </span>
          <span class="world-meta">
            <span class="pill">단편 ${group.stories.length}편</span>
            <span class="pill">프로필로 이동 →</span>
          </span>
        </span>
      </button>
    `;
  }

  function renderMiniCharacter(character) {
    return `
      <button class="mini-character" type="button" data-action="select-character" data-character-id="${escapeHtml(character.id)}">
        <span class="mini-thumb">
          <img src="${escapeHtml(imagePath(character, "thumb"))}" alt="${escapeHtml(character.name)}" loading="lazy" onerror="worldArchiveImageFallback(event)">
        </span>
        <span>${escapeHtml(character.name)}</span>
      </button>
    `;
  }

  function renderCharacterCard(character) {
    const info = character.profile?.basicInfo || {};
    return `
      <button class="character-card" type="button" data-action="select-character" data-character-id="${escapeHtml(character.id)}">
        <span class="character-thumb">
          <img src="${escapeHtml(imagePath(character, "thumb"))}" alt="${escapeHtml(character.name)}" loading="lazy" onerror="worldArchiveImageFallback(event)">
        </span>
        <span class="character-body">
          <span class="card-kicker">${escapeHtml(character.en || character.id)}</span>
          <h3>${escapeHtml(character.name)}</h3>
          <p>${escapeHtml(character.profile?.shortIntro || "")}</p>
          <span class="world-meta">
            <span class="pill">${escapeHtml(info.gender || "-")}</span>
            <span class="pill">${escapeHtml(info.world || getWorldName(getCharacterWorldId(character)) || "-")}</span>
            <span class="pill">${escapeHtml(info.genre || "-")}</span>
          </span>
          <span class="character-quote">${escapeHtml(character.profile?.quote || "")}</span>
        </span>
      </button>
    `;
  }

  function renderStoryButton(story, mode = "") {
    const characterLabel = story.characterId ? getCharacterName(story.characterId) : story.seriesName || story.typeName || "소설";
    return `
      <button class="story-card ${mode === "compact" ? "is-compact" : ""}" type="button" data-action="read-story" data-story-id="${escapeHtml(story.id)}">
        <span class="story-body">
          <span class="card-kicker">${escapeHtml(characterLabel)}</span>
          <h3>${escapeHtml(story.title)}</h3>
          ${mode === "compact" ? "" : `<p>${escapeHtml(story.summary || "")}</p>`}
        </span>
      </button>
    `;
  }

  function renderCharacterView(characterId) {
    const character = charactersById.get(characterId);
    if (!character) return `<section class="error-panel"><h1>캐릭터를 찾지 못했습니다.</h1></section>`;

    const info = character.profile?.basicInfo || {};
    const worldId = getCharacterWorldId(character);
    const stories = getStoriesForCharacter(character.id);

    const infoKeys = [
      ["성별", "gender"],
      ["소속세계", "world"],
      ["장르", "genre"],
      ["종족", "race"],
      ["직업", "job"],
      ["나이", "age"],
      ["성격", "personality"],
      ["능력", "ability"],
      ["무기", "weapon"],
      ["신장", "height"]
    ];

    return `
      <section class="profile-panel">
        <div class="profile-hero">
          <div class="profile-image">
            <img src="${escapeHtml(imagePath(character, "main"))}" alt="${escapeHtml(character.name)}" loading="eager" onerror="worldArchiveImageFallback(event)">
          </div>
          <div class="profile-info">
            <div class="inline-actions">
              <button class="back-button" type="button" data-action="select-world" data-world-id="${escapeHtml(worldId)}">← ${escapeHtml(getWorldName(worldId))}</button>
              <button class="soft-button" type="button" data-action="select-world-characters" data-world-id="${escapeHtml(worldId)}">캐릭터 목록</button>
            </div>
            <h1>${escapeHtml(character.name)}</h1>
            <div class="en-name">${escapeHtml(character.en || character.id)}</div>
            <p class="profile-intro">${escapeHtml(character.profile?.shortIntro || "")}</p>
            <blockquote class="profile-quote">${escapeHtml(character.profile?.quote || "")}</blockquote>
            <div class="info-grid">
              ${infoKeys.map(([label, key]) => `
                <span class="info-item"><span>${escapeHtml(label)}</span><strong>${escapeHtml(info[key] || "-")}</strong></span>
              `).join("")}
            </div>
          </div>
        </div>
      </section>
      <section class="section">
        <div class="section-head">
          <div>
            <span class="section-kicker">Character Stories</span>
            <h2 class="section-title">캐릭터 단편소설</h2>
            <p class="section-desc">이 캐릭터에 직접 연결된 단편입니다.</p>
          </div>
        </div>
        <div class="story-list">
          ${stories.length ? stories.map(story => renderStoryButton(story, "compact")).join("") : `<div class="empty-panel">등록된 단편소설이 없습니다.</div>`}
        </div>
      </section>
    `;
  }

  function renderReaderShell(storyId) {
    const story = storiesById.get(storyId);
    if (!story) return `<section class="error-panel"><h1>소설을 찾지 못했습니다.</h1></section>`;

    const worldName = getWorldName(story.worldId);
    const backTarget = story.characterId
      ? `<button class="back-button" type="button" data-action="select-character" data-character-id="${escapeHtml(story.characterId)}">← ${escapeHtml(getCharacterName(story.characterId))}</button>`
      : story.seriesId
        ? `<button class="back-button" type="button" data-action="select-series" data-world-id="${escapeHtml(story.worldId)}" data-series-id="${escapeHtml(story.seriesId)}">← ${escapeHtml(story.seriesName || "시리즈")}</button>`
        : `<button class="back-button" type="button" data-action="select-world-novels" data-world-id="${escapeHtml(story.worldId)}">← ${escapeHtml(worldName)} 소설</button>`;

    return `
      <article class="reader-shell">
        <header class="reader-head">
          <div class="inline-actions">${backTarget}</div>
          <div class="reader-meta">
            <span class="pill">${escapeHtml(worldName)}</span>
            <span class="pill">${escapeHtml(story.typeName || story.seriesName || "소설")}</span>
          </div>
          <h1 class="reader-title">${escapeHtml(story.title)}</h1>
          <p class="section-desc">${escapeHtml(story.summary || "")}</p>
        </header>
        <div id="readerBody" class="reader-body">본문을 불러오는 중입니다.</div>
        ${renderRelatedCharacters(story)}
      </article>
    `;
  }

  async function renderReaderBody(storyId) {
    const requestId = readerRequestId;
    const story = storiesById.get(storyId);
    const body = document.getElementById("readerBody");
    if (!story || !body) return;

    try {
      const response = await fetch(story.file);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const markdown = await response.text();
      if (requestId !== readerRequestId) return;
      body.innerHTML = renderMarkdown(stripDuplicateTitle(markdown, story.title));
    } catch (error) {
      if (requestId !== readerRequestId) return;
      body.innerHTML = `<p>본문을 불러오지 못했습니다.</p><p class="muted">${escapeHtml(story.file)}</p>`;
    }
  }

  function stripDuplicateTitle(markdown, title) {
    const source = String(markdown || "");
    const firstLine = source.split(/\n/, 1)[0] || "";
    const normalizedHeading = firstLine.replace(/^#{1,3}\s+/, "").trim();
    if (normalizedHeading && normalizedHeading === String(title || "").trim()) {
      return source.slice(firstLine.length).replace(/^\n+/, "");
    }
    return source;
  }

  function renderMarkdown(markdown) {
    const lines = String(markdown || "").replace(/\r\n/g, "\n").split("\n");
    const html = [];
    let paragraph = [];

    const flushParagraph = () => {
      if (!paragraph.length) return;
      html.push(`<p>${paragraph.map(escapeHtml).join("<br>")}</p>`);
      paragraph = [];
    };

    lines.forEach(line => {
      const trimmed = line.trim();

      if (!trimmed) {
        flushParagraph();
        return;
      }

      if (/^---+$/.test(trimmed)) {
        flushParagraph();
        html.push("<hr>");
        return;
      }

      const heading = trimmed.match(/^(#{1,3})\s+(.+)$/);
      if (heading) {
        flushParagraph();
        const level = heading[1].length;
        html.push(`<h${level}>${escapeHtml(heading[2])}</h${level}>`);
        return;
      }

      if (trimmed.startsWith(">")) {
        flushParagraph();
        html.push(`<blockquote>${escapeHtml(trimmed.replace(/^>\s?/, ""))}</blockquote>`);
        return;
      }

      paragraph.push(line);
    });

    flushParagraph();
    return html.join("\n");
  }

  function renderRelatedCharacters(story) {
    const ids = Array.isArray(story.relatedCharacterIds) && story.relatedCharacterIds.length
      ? story.relatedCharacterIds
      : story.characterId ? [story.characterId] : [];

    const uniqueIds = Array.from(new Set(ids)).filter(id => charactersById.has(id));
    if (!uniqueIds.length) return "";

    return `
      <section class="related-panel">
        <h2>관련 캐릭터</h2>
        <div class="related-chips">
          ${uniqueIds.map(id => `
            <button class="character-chip" type="button" data-action="select-character" data-character-id="${escapeHtml(id)}">${escapeHtml(getCharacterName(id))}</button>
          `).join("")}
        </div>
      </section>
    `;
  }

  function renderSearchSection() {
    const query = state.search.trim();
    if (!query) return "";

    const normalized = query.toLocaleLowerCase("ko");
    const matchedWorlds = WORLDS.filter(world => [world.name, world.code, world.coreGenre, world.description].some(value => String(value || "").toLocaleLowerCase("ko").includes(normalized)));
    const matchedCharacters = characters.filter(character => [
      character.name,
      character.en,
      character.profile?.shortIntro,
      character.profile?.quote,
      character.profile?.basicInfo?.world,
      character.profile?.basicInfo?.genre,
      character.profile?.basicInfo?.job
    ].some(value => String(value || "").toLocaleLowerCase("ko").includes(normalized))).slice(0, 12);
    const matchedStories = RAW_STORIES.filter(story => [
      story.title,
      story.typeName,
      story.seriesName,
      story.seasonName,
      story.summary,
      getWorldName(story.worldId),
      story.characterId ? getCharacterName(story.characterId) : ""
    ].some(value => String(value || "").toLocaleLowerCase("ko").includes(normalized))).slice(0, 16);

    if (!matchedWorlds.length && !matchedCharacters.length && !matchedStories.length) {
      return `
        <section class="section search-panel">
          <div class="section-head"><div><span class="section-kicker">Search</span><h2 class="section-title">검색 결과 없음</h2></div></div>
          <p class="muted">${escapeHtml(query)}에 맞는 항목을 찾지 못했습니다.</p>
        </section>
      `;
    }

    return `
      <section class="section search-panel">
        <div class="section-head">
          <div>
            <span class="section-kicker">Search</span>
            <h2 class="section-title">검색 결과</h2>
            <p class="section-desc">${escapeHtml(query)} 기준 결과입니다.</p>
          </div>
        </div>
        ${matchedWorlds.length ? `<h3>세계</h3><div class="world-grid">${matchedWorlds.map(world => `
          <button class="world-card" type="button" data-action="select-world" data-world-id="${escapeHtml(world.code)}"><span class="card-kicker">${escapeHtml(world.coreGenre || "")}</span><h3>${escapeHtml(world.name)}</h3><p>${escapeHtml(world.description || "")}</p></button>
        `).join("")}</div>` : ""}
        ${matchedCharacters.length ? `<h3>캐릭터</h3><div class="character-grid">${matchedCharacters.map(renderCharacterCard).join("")}</div>` : ""}
        ${matchedStories.length ? `<h3>소설</h3><div class="story-list">${matchedStories.map(story => renderStoryButton(story, "compact")).join("")}</div>` : ""}
      </section>
    `;
  }

  document.addEventListener("click", event => {
    const target = event.target.closest("[data-action]");
    if (!target) return;

    const action = target.dataset.action;
    if (action === "home") {
      navigate({ view: "home", worldId: "", characterId: "", storyId: "", seriesId: "" });
      return;
    }

    if (action === "select-world") {
      navigate({ view: "world", worldId: target.dataset.worldId || "", characterId: "", storyId: "", seriesId: "" });
      return;
    }

    if (action === "select-world-characters") {
      navigate({ view: "world-characters", worldId: target.dataset.worldId || "", characterId: "", storyId: "", seriesId: "" });
      return;
    }

    if (action === "select-world-novels") {
      navigate({ view: "world-novels", worldId: target.dataset.worldId || "", characterId: "", storyId: "", seriesId: "" });
      return;
    }

    if (action === "select-series") {
      navigate({ view: "series", worldId: target.dataset.worldId || "", seriesId: target.dataset.seriesId || "", characterId: "", storyId: "" });
      return;
    }

    if (action === "select-character") {
      const characterId = target.dataset.characterId || "";
      const character = charactersById.get(characterId);
      navigate({ view: "character", characterId, worldId: getCharacterWorldId(character), storyId: "", seriesId: "" });
      return;
    }

    if (action === "read-story") {
      const storyId = target.dataset.storyId || "";
      const story = storiesById.get(storyId);
      navigate({ view: "reader", storyId, worldId: story?.worldId || "", characterId: story?.characterId || "", seriesId: story?.seriesId || "" });
    }
  });

  if (searchInput) {
    searchInput.addEventListener("input", event => {
      state.search = event.target.value || "";
      render();
    });
  }

  window.addEventListener("popstate", event => {
    const next = event.state || routeFromHash();
    state.view = next.view || "home";
    state.worldId = next.worldId || "";
    state.characterId = next.characterId || "";
    state.storyId = next.storyId || "";
    state.seriesId = next.seriesId || "";
    render();
    window.scrollTo({ top: 0, behavior: "auto" });
  });

  const initialRoute = routeFromHash();
  state.view = initialRoute.view || "home";
  state.worldId = initialRoute.worldId || "";
  state.characterId = initialRoute.characterId || "";
  state.storyId = initialRoute.storyId || "";
  state.seriesId = initialRoute.seriesId || "";
  window.history.replaceState({
    view: state.view,
    worldId: state.worldId,
    characterId: state.characterId,
    storyId: state.storyId,
    seriesId: state.seriesId
  }, "", makeHash(state));
  render();
})();
