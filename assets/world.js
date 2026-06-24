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

  function worldIdByName(name) {
    if (!name) return "";
    const found = WORLDS.find(world => world.name === name || world.code === name);
    return found?.code || "";
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

  function imagePath(character, slot = "thumb") {
    const file = slot === "main" ? "main.webp" : `${slot}.webp`;
    return `assets/characters/${character.folder}/${file}`;
  }

  function onImageError(event) {
    const img = event.target;
    img.hidden = true;
    const parent = img.closest(".character-thumb, .profile-image");
    if (parent) parent.classList.add("is-missing-image");
  }

  window.worldArchiveImageFallback = onImageError;

  function navigate(nextState, options = {}) {
    const next = { ...state, ...nextState };
    state.view = next.view || "home";
    state.worldId = next.worldId || "";
    state.characterId = next.characterId || "";
    state.storyId = next.storyId || "";
    state.search = next.search ?? state.search;

    const historyState = {
      view: state.view,
      worldId: state.worldId,
      characterId: state.characterId,
      storyId: state.storyId
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
    if (key === "character" && charactersById.has(value)) return { view: "character", characterId: value, worldId: getCharacterWorldId(value) };
    if (key === "story" && storiesById.has(value)) {
      const story = storiesById.get(value);
      return { view: "reader", storyId: value, worldId: story.worldId, characterId: story.characterId || "" };
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
          <p class="hero-text">기존 PC/모바일 안정판은 유지하고, 이 페이지는 세계관을 먼저 고른 뒤 캐릭터와 소설을 함께 감상하는 새 개편판입니다.</p>
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
            <p class="section-desc">각 세계를 선택하면 소속 캐릭터, 세계별 시리즈, 캐릭터별 단편을 한 화면에서 볼 수 있습니다.</p>
          </div>
        </div>
        <div class="world-grid">${worldCards}</div>
      </section>
    `;
  }

  function renderWorldView(worldId) {
    const world = worldById.get(worldId) || WORLDS[0];
    const worldCharacters = getCharactersForWorld(world.code);
    const worldStories = getWorldStories(world.code);
    const characterStories = getCharacterStories(world.code);

    return `
      <section class="hero">
        <div class="hero-inner">
          <div class="inline-actions">
            <button class="back-button" type="button" data-action="home">← 세계 선택</button>
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
      <div class="world-layout">
        <aside class="world-rail" aria-label="세계관 바로가기">
          ${WORLDS.map(item => `
            <button class="chip-button ${item.code === world.code ? "is-active" : ""}" type="button" data-action="select-world" data-world-id="${escapeHtml(item.code)}">${escapeHtml(item.name)}</button>
          `).join("")}
        </aside>
        <div class="world-content">
          ${renderWorldStorySection(world.code, worldStories)}
          ${renderCharacterStorySection(world.code, characterStories)}
          ${renderCharacterSection(world.code, worldCharacters)}
        </div>
      </div>
    `;
  }

  function renderWorldStorySection(worldId, worldStories) {
    const groups = groupStoriesBySeries(worldStories);
    const content = groups.length
      ? `<div class="series-grid">${groups.map(renderSeriesCard).join("")}</div>`
      : `<div class="empty-panel">아직 등록된 세계별 시리즈 소설이 없습니다.</div>`;

    return `
      <section class="section" id="world-stories">
        <div class="section-head">
          <div>
            <span class="section-kicker">World Novels</span>
            <h2 class="section-title">세계 소설</h2>
            <p class="section-desc">특정 캐릭터가 아니라 세계와 시리즈에 속한 소설입니다.</p>
          </div>
        </div>
        ${content}
      </section>
    `;
  }

  function groupStoriesBySeries(stories) {
    const seriesMap = new Map();
    stories.forEach(story => {
      const seriesKey = story.seriesId || "standalone";
      if (!seriesMap.has(seriesKey)) {
        seriesMap.set(seriesKey, {
          id: seriesKey,
          name: story.seriesName || "단독 소설",
          seasons: new Map()
        });
      }
      const series = seriesMap.get(seriesKey);
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
        stories: season.stories.sort((a, b) => (a.episode || 0) - (b.episode || 0) || (a.title || "").localeCompare(b.title || "", "ko"))
      }))
    }));
  }

  function renderSeriesCard(series) {
    return `
      <article class="series-card">
        <div class="series-body">
          <span class="card-kicker">Series</span>
          <h3>${escapeHtml(series.name)}</h3>
          <div class="season-list">
            ${series.seasons.map(season => `
              <div>
                <p class="muted">${escapeHtml(season.name)} · ${season.stories.length}편</p>
                <div class="story-list">
                  ${season.stories.map(story => renderStoryButton(story, "compact")).join("")}
                </div>
              </div>
            `).join("")}
          </div>
        </div>
      </article>
    `;
  }

  function renderCharacterStorySection(worldId, stories) {
    const byCharacter = new Map();
    stories.forEach(story => {
      if (!byCharacter.has(story.characterId)) byCharacter.set(story.characterId, []);
      byCharacter.get(story.characterId).push(story);
    });

    const groups = Array.from(byCharacter.entries())
      .map(([characterId, items]) => ({ characterId, character: charactersById.get(characterId), stories: items }))
      .filter(group => group.character)
      .sort((a, b) => a.character.name.localeCompare(b.character.name, "ko"));

    const content = groups.length
      ? `<div class="series-grid">${groups.map(group => `
          <article class="series-card">
            <div class="series-body">
              <span class="card-kicker">Character Shorts</span>
              <h3>${escapeHtml(group.character.name)}</h3>
              <p>${escapeHtml(group.character.profile?.shortIntro || "")}</p>
              <div class="story-list">${group.stories.map(story => renderStoryButton(story, "compact")).join("")}</div>
            </div>
          </article>
        `).join("")}</div>`
      : `<div class="empty-panel">아직 등록된 캐릭터 단편이 없습니다.</div>`;

    return `
      <section class="section" id="character-stories">
        <div class="section-head">
          <div>
            <span class="section-kicker">Character Shorts</span>
            <h2 class="section-title">캐릭터 단편소설</h2>
            <p class="section-desc">세계 안에 속한 캐릭터별 단편도 새 개편판에서 함께 볼 수 있습니다.</p>
          </div>
        </div>
        ${content}
      </section>
    `;
  }

  function renderCharacterSection(worldId, worldCharacters) {
    return `
      <section class="section" id="characters">
        <div class="section-head">
          <div>
            <span class="section-kicker">Characters</span>
            <h2 class="section-title">소속 캐릭터</h2>
            <p class="section-desc">캐릭터를 선택하면 프로필과 해당 캐릭터의 단편소설을 볼 수 있습니다.</p>
          </div>
        </div>
        <div class="character-grid">
          ${worldCharacters.map(renderCharacterCard).join("")}
        </div>
      </section>
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
            <span class="pill">${escapeHtml(info.genre || "-")}</span>
            <span class="pill">${escapeHtml(info.job || "-")}</span>
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
      : `<button class="back-button" type="button" data-action="select-world" data-world-id="${escapeHtml(story.worldId)}">← ${escapeHtml(worldName)}</button>`;

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
      navigate({ view: "home", worldId: "", characterId: "", storyId: "" });
      return;
    }

    if (action === "select-world") {
      navigate({ view: "world", worldId: target.dataset.worldId || "", characterId: "", storyId: "" });
      return;
    }

    if (action === "select-character") {
      const characterId = target.dataset.characterId || "";
      const character = charactersById.get(characterId);
      navigate({ view: "character", characterId, worldId: getCharacterWorldId(character), storyId: "" });
      return;
    }

    if (action === "read-story") {
      const storyId = target.dataset.storyId || "";
      const story = storiesById.get(storyId);
      navigate({ view: "reader", storyId, worldId: story?.worldId || "", characterId: story?.characterId || "" });
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
    render();
    window.scrollTo({ top: 0, behavior: "auto" });
  });

  const initialRoute = routeFromHash();
  state.view = initialRoute.view || "home";
  state.worldId = initialRoute.worldId || "";
  state.characterId = initialRoute.characterId || "";
  state.storyId = initialRoute.storyId || "";
  window.history.replaceState({
    view: state.view,
    worldId: state.worldId,
    characterId: state.characterId,
    storyId: state.storyId
  }, "", makeHash(state));
  render();
})();
