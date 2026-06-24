(() => {
  "use strict";

  const state = {
    view: "worlds",
    worldId: "",
    characterId: "",
    storyId: "",
    worldTab: "info",
    characterSearch: "",
    storySearch: "",
    characterTab: "info",
    routeKey: "",
    privateMode: false,
    privateTapCount: 0,
    privateTapTimer: 0,
    privateToolOpen: false,
    storyReturnHash: "",
    imageLightboxItems: [],
    imageLightboxIndex: -1,
    imageLightboxScale: 1,
    imageLightboxTranslateX: 0,
    imageLightboxTranslateY: 0,
    imageLightboxPointers: new Map(),
    imageLightboxLastDistance: 0,
    imageLightboxPanStart: null,
    scrollPositions: Object.create(null),
    storyOpenGroups: Object.create(null),
    generatorTab: "random"
  };

  const palette = [
    "rgba(154, 92, 255, 0.34)",
    "rgba(70, 178, 255, 0.28)",
    "rgba(231, 196, 122, 0.26)",
    "rgba(255, 111, 145, 0.25)",
    "rgba(93, 231, 183, 0.22)",
    "rgba(255, 170, 94, 0.24)",
    "rgba(139, 184, 255, 0.26)",
    "rgba(187, 137, 255, 0.26)",
    "rgba(255, 211, 119, 0.24)",
    "rgba(126, 134, 255, 0.28)"
  ];

  const worldSymbols = {
    noct: {
      file: "noct.svg",
      color: "#1B1328",
      displayColor: "#A78BFA",
      symbolOpacity: "0.24"
    },
    corebelt: { file: "corebelt.svg", color: "#C46A2D" },
    midrain: { file: "midrain.svg", color: "#263B5E" },
    ashrun: { file: "ashrun.svg", color: "#B7472A" },
    yeonmuk: { file: "yeonmuk.svg", color: "#2F3A32" },
    lumia: { file: "lumia.svg", color: "#F2C86B" },
    gatefall: { file: "gatefall.svg", color: "#5B6EE1" },
    astra: { file: "astra.svg", color: "#8FD8FF" },
    "saffron-sea": { file: "saffran_sea.svg", color: "#D99A2B" },
    erebos: {
      file: "erebos.svg",
      color: "#151515",
      displayColor: "#CFCFCF",
      symbolOpacity: "0.22"
    }
  };

  const PRIVATE_TAP_TARGET = 7;
  const CLEAR_TOKEN = "CLEAR";
  const MAX_PRIVATE_PREVIEW_ROWS = 90;

  const generatorCommonOptions = window.GENERATOR_COMMON_OPTIONS ?? {};
  const generatorGenreGroups = Array.isArray(window.GENERATOR_GENRE_GROUPS) ? window.GENERATOR_GENRE_GROUPS : [];
  const generatorGenreRules = window.GENERATOR_GENRE_RULES ?? {};
  const generatorSpeciesGroups = window.GENERATOR_SPECIES_GROUPS ?? {};
  const generatorJobGroups = window.GENERATOR_JOB_GROUPS ?? {};
  const generatorWeaponGroups = window.GENERATOR_WEAPON_GROUPS ?? {};
  const generatorFields = Array.isArray(window.GENERATOR_FIELDS) ? window.GENERATOR_FIELDS : [];
  const generatorCountWeights = window.GENERATOR_COUNT_WEIGHTS ?? {};
  const generatorHistoryStorageKey = "world-app-generator-history-v1";
  const generatorHistoryLimit = 8;
  const generatorPromptHistoryStorageKey = "world-app-generator-prompt-history-v1";
  const generatorPromptHistoryLimit = 5;
  const lockableGeneratorKeys = new Set(generatorFields.map(([key]) => key));
  const generatorFieldGroups = [
    { title: "캐릭터 핵심", keys: ["genre", "race", "role", "personality", "visualAge"] },
    { title: "외형", keys: ["features", "hairstyle", "colors"] },
    { title: "복장 · 소품", keys: ["outfit", "fashionPoints", "weapon"] },
    { title: "연출 · 특수 요소", keys: ["power"] }
  ];
  let generatorResult = {};
  let generatorHistory = loadGeneratorHistory();
  let generatorPromptHistory = loadGeneratorPromptHistory();
  let generatorAssistNotesState = { scene: "", composition: "", direction: "" };
  let generatorPromptModalSource = "";
  let generatorPromptModalDefaultLabel = "복사";
  let generatorPromptModalConfirmAction = null;
  const lockedGeneratorKeys = new Set();

  function normalizeGeneratorSketchbookSpeciesKey(value) {
    return String(value || "").replace(/\s+/g, "").toLowerCase();
  }

  const generatorSketchbookSpeciesPromptEntries = [
        { keys: ["인간", "클론", "도플갱어", "셰이프시프터", "그레이 외계인"], prompt: `일반적인 인간형 침실 구조를 기반으로 하되, 캐릭터의 직업, 성격, 취향, 경제력, 문화권, 생활습관이 방 전체에 드러나도록 한다. 침대, 책상, 옷장, 소지품은 캐릭터가 실제로 오래 사용해온 개인 물건처럼 배치한다.` },
        { keys: ["뮤턴트", "강화인간"], prompt: `일반적인 인간형 침실 구조를 기반으로 하되, 변이 또는 강화된 신체에 맞춘 생활 흔적을 추가한다. 신체 관리 도구, 특수 의약품, 훈련 흔적, 보강된 가구, 내구성 있는 침구 등이 생활 공간 안에 자연스럽게 존재해야 한다.` },
        { keys: ["사이보그", "안드로이드", "오토마톤", "마도기계인"], prompt: `침실은 작업실이 아니라 생활 공간이어야 하지만, 신체 유지와 충전 흔적이 자연스럽게 존재해야 한다. 침대 주변에는 충전 장치, 연결 단자, 부품 보관함, 관절 관리 도구, 수리 흔적 등이 생활용품처럼 배치된다.` },
        { keys: ["수정인"], prompt: `침실은 인간형 생활 공간을 기반으로 하되, 단단하고 섬세한 수정 신체에 맞게 설계한다. 침대와 의자는 표면이 긁히거나 깨지지 않도록 부드럽고 안정적인 재질을 사용하며, 빛을 반사하는 장식, 수정 관리 도구, 파편 보관함, 광원 조절 장치가 자연스럽게 배치된다.` },
        { keys: ["그림자족"], prompt: `일반적인 밝은 인간 침실처럼 만들지 않는다. 침실은 어둠과 그늘이 편안하게 머무는 구조이며, 빛을 조절하는 커튼, 그림자가 고이는 휴식 공간, 어두운 색의 침구, 은은한 조명, 형태를 안정시키는 마법적 장치가 생활감 있게 배치된다.` },
        { keys: ["엘프", "하이엘프", "문엘프", "하프엘프"], prompt: `일반적인 인간형 침실 구조를 사용할 수 있지만, 장수 종족 특유의 세련된 미감과 정돈된 생활감이 드러나야 한다. 섬세한 가구, 오래 보존된 소지품, 고급스러운 침구, 예술품, 책, 장신구, 문화적 취향이 자연스럽게 배치된다.` },
        { keys: ["우드엘프", "드라이어드"], prompt: `침실은 인간형 생활 공간을 기반으로 하되, 숲과 자연 속에서 오래 살아온 흔적이 강하게 드러나야 한다. 나무, 잎, 덩굴, 자연 소재의 침구, 식물 관리 도구, 숲의 향이 느껴지는 물건, 햇빛과 바람이 드는 구조가 생활 공간 안에 자연스럽게 존재한다.` },
        { keys: ["다크엘프"], prompt: `일반적인 인간형 침실 구조를 사용할 수 있지만, 어둡고 은밀한 문화권의 미감이 드러나야 한다. 어두운 색의 침구, 은은한 조명, 지하 또는 밤의 분위기, 독특한 장신구, 무기 관리 흔적, 비밀스러운 수납 구조가 생활감 있게 배치된다.` },
        { keys: ["드워프", "다크드워프"], prompt: `침실은 인간형 구조를 기반으로 하되, 튼튼하고 실용적인 가구와 낮고 안정적인 생활 동선이 드러나야 한다. 침대와 의자는 견고하고 무게감 있게 제작되며, 금속 장식, 공예품, 도구 관리 흔적, 광산·대장장이·장인 문화의 생활감이 자연스럽게 배치된다.` },
        { keys: ["노움", "하플링", "요정", "임프"], prompt: `캐릭터는 성인 인간보다 약간 작은 140~150cm 전후의 의인화 체형으로 취급한다. 방을 미니어처나 장난감 집처럼 만들지 말고, 실제 성인이 생활 가능한 정상적인 침실로 유지하되, 가구와 침대 높이만 약간 낮고 아담하게 조정한다.` },
        { keys: ["오크", "하프오크", "고블린", "코볼트"], prompt: `일반적인 인간형 침실 구조를 사용할 수 있지만, 거칠고 실용적인 생활감이 드러나야 한다. 침대와 가구는 튼튼하고 사용감이 강하며, 무기나 도구 관리 흔적, 부족 문화, 수집품, 투박한 장식, 정리 방식이 캐릭터의 성격에 맞게 배치된다.` },
        { keys: ["오우거", "트롤", "미노타우로스", "마수족"], prompt: `캐릭터는 일반 인간보다 크고 체격이 좋은 2~3m급 의인화 체형으로 취급한다. 침대와 가구는 더 길고 넓고 튼튼하게 설계하되, 비현실적으로 거대한 성채처럼 과장하지 않는다. 문, 천장, 통로, 수납 구조도 큰 체형이 실제로 생활하기 편하게 조정한다.` },
        { keys: ["거인", "타이탄"], prompt: `캐릭터는 수 미터급 거대한 인간형 종족이므로, 침실 전체의 스케일을 그 체형에 맞게 설계한다. 침대, 의자, 책상, 문, 천장, 창문, 조명 등 공간 전체가 실제 거주 가능한 비율이어야 하며, 단순히 캐릭터만 크게 배치하지 않는다.` },
        { keys: ["정령"], prompt: `침실은 인간형 생활 공간처럼 보이되, 정령의 속성과 연결된 휴식 방식이 드러나야 한다. 불, 물, 바람, 흙, 빛, 어둠 등 캐릭터 속성에 맞는 조명, 온도, 소재, 장식, 마력 흐름이 생활감 있게 배치된다.` },
        { keys: ["루살카", "셀키", "트리톤", "어인", "상어 수인", "범고래 수인", "캇파"], prompt: `침실은 수중 또는 반수중 생활에 익숙한 종족의 개인 생활 공간이어야 한다. 일반적인 건조한 인간 침실처럼 만들지 말고, 방수 가구, 습도 높은 환경, 젖은 생활 흔적, 비늘이나 피부 관리 도구, 물과 연결된 휴식 공간이 자연스럽게 존재해야 한다.` },
        { keys: ["인어"], prompt: `인간형 침대를 기본값으로 사용하지 않는다. 어류 하반신과 젖은 신체에 맞게, 낮은 수조형 휴식 공간, 물과 연결된 침구, 방수 가구, 습도 조절 구조를 사용한다. 방 전체가 인어가 실제로 오래 거주할 수 있는 반수중 침실처럼 보여야 한다.` },
        { keys: ["문어 수인", "해파리 수인"], prompt: `침실은 수중 또는 반수중 생활에 맞게 설계하며, 부드럽고 유연한 신체 구조를 고려한다. 일반 인간형 침대를 그대로 사용하지 말고, 물과 연결된 낮은 휴식 공간, 부드러운 쿠션형 받침, 젖은 생활용품, 방수 수납, 촉수나 유연한 신체가 편히 놓일 수 있는 동선을 사용한다.` },
        { keys: ["슬라임"], prompt: `일반 인간형 침대를 사용하지 않는다. 슬라임이 형태를 안정적으로 유지하며 쉴 수 있는 낮은 욕조형 용기, 젤 전용 휴식 풀, 방수 바닥, 습도 관리 구조를 사용한다. 방은 인간 침실처럼 보이기보다 슬라임이 실제로 생활하는 개인 휴식 공간처럼 보여야 한다.` },
        { keys: ["만드라고라", "버섯인"], prompt: `침실은 인간형 생활 공간을 기반으로 하되, 식물이나 균류 신체에 맞는 환경이 드러나야 한다. 흙, 화분, 이끼, 습도, 그늘, 물 공급 장치, 포자 관리 흔적, 자연 소재 침구가 생활 공간 안에 자연스럽게 배치된다.` },
        { keys: ["엔트"], prompt: `일반 인간형 침대를 기본값으로 사용하지 않는다. 거대한 나무형 의인화 신체에 맞게, 뿌리를 편히 두거나 기대어 쉴 수 있는 넓고 안정적인 자연형 휴식 공간을 사용한다. 방 전체는 나무, 흙, 햇빛, 물, 이끼, 뿌리의 생활 흔적이 있는 거대한 침실처럼 설계한다.` },
        { keys: ["골렘", "리빙아머"], prompt: `일반적인 부드러운 침대보다 무거운 신체를 지탱할 수 있는 튼튼한 휴식 구조가 필요하다. 석재 받침대, 보강된 바닥, 정비용 거치대, 마력 코어 관리 장치, 갑옷이나 신체 부품 관리 흔적이 생활 공간 안에 자연스럽게 존재해야 한다.` },
        { keys: ["봉제인형", "구체관절인형"], prompt: `소인형이 아니라 일반적인 의인화 체형으로 취급한다. 침실은 인간형 생활 공간을 기반으로 하되, 봉제 수선 도구, 여분의 천과 실, 단추, 관절 관리 도구, 섬세한 보관 상자, 신체 관리 흔적이 생활용품처럼 자연스럽게 배치된다.` },
        { keys: ["호문쿨루스"], prompt: `침실은 인간형 생활 공간을 기반으로 하되, 인공적으로 만들어진 생명체 특유의 관리 흔적이 드러나야 한다. 약품, 기록 노트, 신체 안정용 도구, 마력 조절 장치, 작은 실험 흔적이 작업실처럼 과하지 않게 개인 생활 공간 안에 섞여 있어야 한다.` },
        { keys: ["여우 수인", "고양이 수인", "토끼 수인", "쥐 수인", "너구리 수인", "늑대 수인", "표범 수인", "원숭이 수인", "늑대인간"], prompt: `소형 동물이라도 소인형으로 만들지 않고, 일반적인 의인화 인간형 체형으로 취급한다. 침대와 의자는 귀, 꼬리, 체모, 발톱, 동물적 습관을 고려해 설계하며, 털 관리 도구, 냄새나 향 관련 물건, 긁힘 흔적, 수집품, 본능적인 생활 습관이 자연스럽게 드러나야 한다.` },
        { keys: ["곰 수인", "호랑이 수인", "사자 수인"], prompt: `캐릭터는 강한 체격의 의인화 수인으로 취급한다. 침대와 가구는 일반 인간용보다 넓고 튼튼하며, 꼬리, 귀, 체모, 발톱을 고려한 구조여야 한다. 털 관리 도구, 무거운 생활용품, 긁힘 흔적, 강한 체격에 맞는 넓은 동선이 자연스럽게 배치된다.` },
        { keys: ["사슴 수인", "말 수인", "양 수인", "염소 수인", "사티로스"], prompt: `침실은 인간형 생활 공간을 기반으로 하되, 뿔, 귀, 꼬리, 발굽, 다리 구조를 고려한다. 바닥 재질, 러그, 침대 주변 동선, 의자 구조는 발굽으로 생활하기 편해야 하며, 뿔이 걸리지 않는 수납과 넓은 머리 주변 공간이 필요하다.` },
        { keys: ["박쥐 수인", "독수리 수인", "까마귀 수인", "올빼미 수인", "백조 수인", "공작 수인", "하피", "텐구", "가루다", "나비"], prompt: `캐릭터는 날개를 가진 의인화 종족이므로, 침실은 날개를 접고 펼칠 수 있는 공간을 가져야 한다. 침대, 의자 등받이, 옷장, 벽면 구조는 날개가 눌리거나 손상되지 않도록 설계한다. 높은 천장, 깃털 또는 날개 관리 도구, 높은 위치의 휴식 습관, 횃대형 요소가 자연스럽게 존재할 수 있다.` },
        { keys: ["벌 수인"], prompt: `침실은 날개와 곤충형 신체 특징을 모두 고려한다. 날개를 접고 펼칠 공간, 섬세한 날개 관리 도구, 더듬이와 외골격을 고려한 침구, 벌집이나 육각형을 연상시키는 수납 구조, 달콤한 향이나 꽃 관련 생활 흔적이 자연스럽게 배치된다.` },
        { keys: ["악어 수인", "리자드맨"], prompt: `침실은 인간형 생활 공간을 기반으로 하되, 비늘, 긴 꼬리, 발톱, 파충류적 체온 관리 습관을 고려한다. 따뜻한 휴식 구역, 습도 조절, 꼬리가 편히 놓일 수 있는 침대와 의자, 튼튼한 바닥과 긁힘 흔적이 자연스럽게 존재해야 한다.` },
        { keys: ["사마귀 수인", "전갈 수인"], prompt: `침실은 인간형 생활 공간을 기반으로 하되, 외골격, 추가적인 절지류 특징, 긴 팔이나 꼬리, 날카로운 신체 부위를 고려한다. 침구는 걸리거나 찢어지지 않는 구조이며, 벽면 수납, 단단한 휴식 표면, 탈피나 외골격 관리 흔적이 자연스럽게 배치된다.` },
        { keys: ["켄타우로스"], prompt: `일반 인간형 침대를 사용하지 않는다. 말형 하반신에 맞게 침실 규모와 동선을 넓게 잡고, 길고 낮은 플랫폼형 휴식 공간이나 넓은 바닥형 침구를 사용한다. 문, 통로, 수납, 거울, 생활용품은 켄타우로스가 실제로 오래 생활할 수 있는 크기와 위치로 설계한다.` },
        { keys: ["아라크네"], prompt: `일반 인간형 침대를 사용하지 않는다. 거미형 하반신과 다족 구조에 맞게 넓은 바닥 공간, 안정적인 휴식 플랫폼, 매달리거나 웅크려 쉴 수 있는 구조, 벽면과 천장을 활용한 수납을 사용한다. 실, 그물, 외골격 관리 흔적이 생활감 있게 배치된다.` },
        { keys: ["스핑크스"], prompt: `일반 인간형 침대를 기본값으로 사용하지 않는다. 사자형 또는 사족형 하반신이 편히 기대거나 엎드릴 수 있는 넓고 낮은 휴식 플랫폼, 쿠션층, 바닥형 침구를 사용한다. 방 전체는 긴 몸과 꼬리를 고려한 동선으로 설계한다.` },
        { keys: ["나가", "라미아", "고르곤"], prompt: `일반 인간형 침대, 침대 프레임, 인간용 매트리스는 사용하지 않는다. 긴 뱀형 하반신을 펼치거나 여러 겹으로 감아 편히 쉴 수 있는 넓고 낮은 원형 또는 타원형 수면 공간을 사용한다. 방 전체의 동선, 바닥, 수납 위치는 뱀형 하반신이 이동하고 휴식하기 편하게 설계한다.` },
        { keys: ["용인", "용혈족", "드레이크"], prompt: `침실은 인간형 생활 공간을 기반으로 하되, 뿔, 꼬리, 비늘, 발톱, 경우에 따라 날개를 고려해 설계한다. 침대와 의자는 꼬리와 날개가 눌리지 않도록 넓고 튼튼하며, 비늘 관리 도구, 보물이나 수집품, 열기나 마력의 흔적이 생활감 있게 배치된다.` },
        { keys: ["드래곤"], prompt: `전체 의인화된 드래곤형 캐릭터로 취급하되, 일반 인간보다 크고 강한 신체에 맞게 침실을 설계한다. 침대와 가구는 매우 튼튼하고 넓으며, 꼬리, 뿔, 날개, 비늘을 고려한다. 보물 수집품, 열기, 마력, 둥지형 취향이 생활 공간 안에 자연스럽게 드러난다.` },
        { keys: ["천사", "발키리"], prompt: `침실은 인간형 생활 공간을 기반으로 하되, 날개와 신성한 문화가 반영되어야 한다. 날개가 눌리지 않는 침대와 의자, 높은 천장, 깃털 관리 도구, 빛과 흰색 계열의 장식, 성스러운 상징물, 정돈된 생활감이 자연스럽게 배치된다.` },
        { keys: ["타천사"], prompt: `침실은 인간형 생활 공간을 기반으로 하되, 날개와 타락한 신성의 분위기를 반영한다. 검거나 손상된 깃털 관리 흔적, 빛을 일부 차단한 구조, 신성한 물건과 어두운 장식이 섞인 생활감, 날개가 눌리지 않는 침구와 의자를 사용한다.` },
        { keys: ["반신", "천인"], prompt: `침실은 인간형 생활 공간을 기반으로 하되, 초월적 존재의 품격과 개인적 생활감이 함께 드러나야 한다. 고급스러운 침구, 상징물, 향, 의식용 소지품, 빛이나 마력의 흔적이 존재하되, 신전이 아니라 실제로 거주하는 개인 침실처럼 보여야 한다.` },
        { keys: ["악마", "서큐버스", "마족", "티플링", "마신족", "마인"], prompt: `침실은 인간형 생활 공간을 기반으로 하되, 뿔, 꼬리, 날개, 마성의 문화와 취향을 고려한다. 침대와 의자는 꼬리와 날개가 불편하지 않게 설계하고, 어두운 장식, 계약서나 문장, 마법적 소지품, 마력 흔적, 개인적 취향이 생활감 있게 배치된다. 선정적인 방이 아니라 캐릭터의 생활 공간으로 표현한다.` },
        { keys: ["뱀파이어", "담피르"], prompt: `침실은 인간형 생활 공간을 기반으로 하되, 빛을 차단하고 밤에 생활하는 습관이 드러나야 한다. 두꺼운 커튼, 어두운 고급 침구, 오래된 가구, 관형 침구 또는 고전적인 침대, 피가 아닌 비선정적이고 비폭력적인 상징물, 긴 세월의 소지품이 자연스럽게 배치된다.` },
        { keys: ["스켈레톤", "미라", "좀비", "구울", "강시", "리치", "레버넌트", "와이트", "듈라한"], prompt: `침실은 인간형 생활 공간처럼 보이되, 일반적인 따뜻한 인간 침실과 달라야 한다. 관, 석관, 봉인구, 냉기, 어둠, 방부 처리 도구, 낡은 소지품, 마력 유지 장치, 죽음 이후에도 남은 생활 습관이 자연스럽게 배치된다.` },
        { keys: ["유령", "밴시"], prompt: `일반적인 물리적 침대보다 영체가 머무는 휴식 공간을 중심으로 설계한다. 낡은 침대나 흔적만 남은 가구, 흐릿한 커튼, 차가운 조명, 부유하는 소지품, 오래된 기억과 관련된 물건, 영적인 기운이 생활감 있게 드러나야 한다.` },
        { keys: ["오니", "도깨비", "야차", "라크샤사", "아수라"], prompt: `침실은 인간형 생활 공간을 기반으로 하되, 강한 체격과 전통적·요괴적 문화가 드러나야 한다. 튼튼한 침대와 가구, 무기나 도구 관리 흔적, 술병이 아닌 생활용 그릇과 장식품, 전통 문양, 거칠지만 개인적인 생활감이 자연스럽게 배치된다.` },
        { keys: ["설녀"], prompt: `침실은 인간형 생활 공간을 기반으로 하되, 차갑고 눈 내리는 환경에 적응한 생활감이 드러나야 한다. 차가운 색감, 서리 낀 창문, 두껍지만 차분한 침구, 얼음 장식, 온도 조절 흔적, 겨울용 생활용품이 자연스럽게 배치된다.` },
        { keys: ["구미호"], prompt: `침실은 인간형 생활 공간을 기반으로 하되, 여우 귀와 여러 꼬리를 고려한다. 침대와 의자는 꼬리들이 눌리지 않도록 넓고 부드럽게 설계하며, 털 관리 도구, 향, 장신구, 오래된 수집품, 요괴적이거나 신비로운 생활감이 자연스럽게 배치된다.` },
        { keys: ["반요"], prompt: `침실은 인간형 생활 공간을 기반으로 하되, 인간적인 생활감과 비인간적 혈통의 특징이 함께 드러나야 한다. 귀, 꼬리, 뿔, 비늘, 날개, 영적 기운 등 해당 캐릭터의 혼혈적 특징을 고려하고, 인간 사회의 생활용품과 요괴적·신비적 소지품이 자연스럽게 섞여 있어야 한다.` },
        { keys: ["신수족"], prompt: `침실은 인간형 생활 공간을 기반으로 하되, 신성한 짐승의 특징과 고귀한 분위기를 반영한다. 뿔, 꼬리, 귀, 날개 등 해당 캐릭터의 신체 특징을 고려하고, 성스러운 상징물, 자연 소재, 고급스러운 침구, 종족 특유의 수집품과 생활 습관이 자연스럽게 배치된다.` },
      ];

      const generatorSketchbookSpeciesPromptMap = generatorSketchbookSpeciesPromptEntries.reduce((map, entry) => {
        entry.keys.forEach(key => {
          map[normalizeGeneratorSketchbookSpeciesKey(key)] = entry.prompt;
        });
        return map;
      }, {});
      let generatorSketchbookRecentEntries = [];

    

  const generatorSketchSheetPromptTemplate = `첨부된 이미지 한 장 또는 여러 장 안에 있는 캐릭터를 참고 자료로 사용하세요.

  당신의 작업은 첨부된 이미지들을 분석해서, 귀엽고 지저분한 낙서 콜라주 스타일의 캐릭터 레퍼런스 시트를 생성하기 위한 최종 이미지 생성 프롬프트를 만드는 것입니다.

  이미지가 한 장만 첨부된 경우: 해당 이미지를 메인 캐릭터 레퍼런스로 사용하세요.

  이미지가 여러 장 첨부된 경우: 명백히 서로 다른 캐릭터가 아니라면, 모든 첨부 이미지를 같은 캐릭터의 레퍼런스로 취급하세요.

  모든 이미지를 함께 분석해서 일관된 캐릭터 정체성을 하나로 통합하세요.

  반복해서 등장하는 특징, 시각적으로 가장 눈에 띄는 특징, 캐릭터 디자인의 중심이 되는 특징을 우선하세요.

  보조 이미지는 의상 디테일, 다른 표정, 포즈, 소품, 배경 모티프, 색상 팔레트를 보강하는 데 사용하세요.

  이미지들 사이에 서로 충돌하는 디테일이 있다면, 모든 요소를 무작위로 섞지 말고 가장 상징적이고 알아보기 쉬운 버전의 캐릭터를 보존하세요.

  먼저 캐릭터의 전체 시각 정체성을 세밀하게 분석하고 추출하세요:

  캐릭터 유형: 사람, 애니메이션 캐릭터, 마스코트, 동물형 마스코트, 판타지 캐릭터, 아이돌, 교복 캐릭터, 오피스 캐릭터, 캐주얼 캐릭터 등

  얼굴과 표정: 눈 모양, 눈 색, 입 모양, 홍조, 피부 톤, 얼굴 분위기, 성격 인상

  머리 또는 머리 실루엣: 머리 색, 길이, 앞머리, 땋은 머리, 컬, 바보털, 귀, 뿔, 모자, 장식, 머리핀, 리본, 액세서리

  몸 실루엣과 비율: 날씬함, 치비, 마스코트형, 둥근 형태, 큰 키, 여린 느낌, 스포티함, 우아함, 귀여움, 장난스러움, 부드러움, 날카로운 인상 등

  의상과 액세서리: 주요 의상 조각, 소재 느낌, 색상, 리본, 장신구, 신발, 양말, 가방, 소품, 상징적인 디테일

  포즈와 카메라 느낌: 서 있는 자세, 앉은 자세, 정면 응시, 수줍은 포즈, 당당한 포즈, 역동적인 각도, 클로즈업, 전신, 손동작

  배경 정체성: 장소, 환경, 사물, 분위기, 소품, 상징, 색감, 시각적 모티프

  원본 그림체: 애니메이션, 마스코트, 부드러운 페인팅, 셀 셰이딩, 게임 일러스트, 판타지, 현대적, 귀여움, 우아함, 캐주얼 등

  색상 팔레트: 첨부 이미지에서 가장 중요한 3-5가지 주요 색상을 고르고, 포인트 색은 아주 적게만 사용하세요 캐릭터가 알아볼 수 있게 유지되어야 합니다.

  전혀 다른 캐릭터를 만들어내지 마세요.

  첨부 이미지 속 가장 독특한 시각 특징, 의상 정체성, 액세서리, 소품, 색상 팔레트, 성격, 배경 모티프를 보존하세요.

  레퍼런스 연출 방향 선택: 최종 프롬프트를 만들 때 모든 결과가 똑같은 느낌이 되지 않도록, 첨부 이미지의 성격에 가장 어울리는 레퍼런스 연출 방향을 하나 이상 선택해서 반영하세요.

  매번 같은 문장 구조와 같은 낙서 요소만 반복하지 말고, 이미지에서 분석한 캐릭터성과 배경 정체성에 맞춰 문구, 포즈, 주변 낙서, 소품, 메모 톤을 다르게 구성하세요.

  선택 가능한 연출 방향 예시:

  패션 메모형: 의상, 액세서리, 색상 견본, 착장 포인트, 소재 느낌을 강조

  감정 스티커형: 표정 변화, 감정 메모, 귀여운 반응, 밈 같은 손글씨를 강조

  포즈 연구형: 전신 포즈, 손동작, 시점 변화, 움직임, 캐릭터 실루엣을 강조

  판타지 소품형: 마법 문양, 장신구, 무기, 베일, 보석, 주문 메모, 판타지 배경 모티프를 강조

  마스코트 시트형: 둥근 형태, 단순한 표정, 작은 마스코트 변형, 브랜드/직업/환경 소품을 강조

  일상 낙서형: 방, 책상, 가방, 간식, 학교, 카페, 사무실 같은 생활 배경 소품을 강조

  아이돌/공주형: 리본, 별, 꽃, 반짝임, 무대감, 귀여운 포즈, 팬메이드 메모를 강조

  장난스러운 밈형: 일부러 이상한 비율, 엉뚱한 표정, 짧은 농담, "owo", "???", 작은 효과음을 강조

  이미지의 분위기에 맞지 않는 연출 방향은 억지로 넣지 마세요.

  이 프롬프트 맨 아래의 "캐릭터 이름:" 뒤에 이름이 적혀 있다면, 그 이름을 정확히 그대로 캔버스 곳곳의 손글씨 텍스트로 사용하세요.

  캐릭터 이름 칸이 비어 있다면, 이름을 추가하지 말고 임의로 새 이름을 만들지 마세요.

  이제 최종 이미지 생성 프롬프트를 만드세요:

  첨부된 이미지 한 장 또는 여러 장을 캐릭터 레퍼런스로 사용하세요.

  분석한 캐릭터를 귀여운 애니메이션풍 지저분한 낙서 콜라주 캐릭터 시트로 변환하세요.

  캐릭터가 알아볼 수 있도록 유지하고, 캐릭터의 주요 시각 정체성, 의상, 액세서리, 소품, 성격, 색상 팔레트를 보존하세요.

  전체 출력 스타일: 매우 지저분한 낙서 콜라주, 일부러 못 그렸지만 귀여운 그림, 혼란스러운 스케치북 페이지, MS 그림판 마우스 그림 같은 느낌, 거친 낙서, 못생겼지만 귀여움, 매력적인 아마추어 낙서, 흰 배경, 낮은 품질의 손그림 느낌, 불균형한 해부학, 어린아이 같은 선화, 우스꽝스러운 비율, 어색하지만 사랑스러운 구성, 픽셀처럼 거친 느낌, 선 밖으로 삐져나간 색칠, 느슨한 스케치 선, 볼펜 질감, 색연필 또는 컬러펜 스케치, 노트 낙서 분위기, 장난스러운 성격, 귀엽고 혼란스러운 에너지

  캔버스 구성: 캔버스 전체에 같은 캐릭터의 여러 그림을 배치하세요.

  캐릭터 레퍼런스 시트, 표정 시트, 포즈 시트, 스티커 시트, 낙서 콜라주 레이아웃, 같은 캐릭터의 작은 변형 여러 개, 큰 메인 초상화, 전신 서 있는 포즈, 앉은 포즈, 보는 사람을 가리키는 포즈, 브이 포즈, 어울린다면 엄지척 포즈, 얼굴 클로즈업, 졸린 얼굴, 우는 얼굴, 화난 얼굴, 능글맞은 얼굴, 부끄러운 얼굴, 치비 얼굴, 작은 마스코트 같은 얼굴, 아래에서 올려다보는 카메라 느낌, 역동적인 원근감

  캐릭터 변환 규칙: 레퍼런스 캐릭터를 귀여운 애니메이션풍 낙서 캐릭터로 변환하세요.

  이미지 속 독특한 특징, 패션 정체성, 액세서리, 소품, 성격을 유지하세요.

  부드러운 홍조, 표현력 있는 눈, 단순하고 귀여운 얼굴, 둥근 볼, 살짝 과장된 귀여운 비율, 작은 손 또는 작은 발, 단순한 다리, 느슨한 옷 주름, 사랑스럽고 불완전한 스케치 느낌을 넣으세요.

  배경과 소품 처리: 원본 배경을 세밀한 완성형 장면으로 그대로 다시 그리지 마세요.

  대신 배경의 정체성을 추출해서 캐릭터 주변의 작은 지저분한 낙서, 미니 소품, 스티커 같은 아이콘, 상징, 손글씨 메모로 바꾸세요.

  레퍼런스 이미지에서 알아볼 수 있는 환경 모티프를 포함하세요.

  예: 책상 위 물건, 꽃, 마법 문양, 리본, 별, UI 화면, 음식, 가방, 악기, 날씨, 방 안 물건, 판타지 아이템, 사무용 도구, 기타 관련 소품.

  손글씨 텍스트: 캐릭터의 시각 정체성, 분위기, 의상, 배경, 성격과 어울리는 손글씨 메모를 캔버스 곳곳에 흩뿌리세요.

  맨 아래에 캐릭터 이름이 제공되어 있다면, 그 이름을 정확히 그대로 여러 번 손글씨 텍스트로 포함하세요.

  의상 메모, 분위기 메모, 색상 메모, 귀여운 반응, "owo", "???", "!!!", 짧은 효과음 같은 말을 넣으세요.

  한국어, 일본어, 영어 텍스트는 레퍼런스 이미지의 분위기에 어울릴 때만 사용하세요.

  랜덤 낙서: 별, 하트, 화살표, 말풍선, 물음표, 느낌표, 바코드, 작은 메모, 이모지 얼굴, 추상적인 낙서, 지저분한 기호, 색상 견본, 작은 마스코트 낙서, 그리고 분석한 배경, 의상, 액세서리, 캐릭터 소품에서 가져온 작은 낙서들

  색상과 렌더링: 레퍼런스 이미지 한 장 또는 여러 장을 기반으로 한 색상 팔레트를 사용하세요.

  주요 색상은 3-5개로 제한하고, 포인트 색은 아주 작게만 사용하세요.

  거친 마커 색칠, 스케치식 해칭, 보이는 펜 선, 고르지 않은 채색, 선 밖으로 삐져나간 색칠, 흰 빈 배경과 흩어진 낙서들을 사용하세요.

  품질 목표: 결과물은 개성 넘치는 아마추어 팬이 만든 사랑스럽고 지저분한 캐릭터 레퍼런스 시트처럼 보여야 합니다.

  귀엽고, 알아볼 수 있고, 장난스럽고, 스케치 같고, 혼란스럽고, 일부러 불완전해야 합니다.

  네거티브 프롬프트: 실사, 포토리얼, 3D 렌더, 하이퍼리얼리즘, 깔끔한 벡터 아트, 지나치게 완성도 높은 일러스트, 완벽한 해부학, 전문적인 선화, 매끄러운 렌더링, 현실적인 음영, 지나치게 세밀한 피부, 영화 같은 조명, 광택 있는 마감, 날카롭고 깨끗한 가장자리, 현실적인 비율, 스튜디오 품질, 대칭적인 구성, 너무 깔끔한 구성, 지나치게 자세한 배경, 성숙한 몸 강조, 성적 포즈, 노골적인 노출, 공포, 고어, 어두운 분위기, 무서운 느낌, 워터마크, 로고, 서명, 중복된 머리, 왜곡된 얼굴, 알아볼 수 없는 얼굴, 손가락 추가, 손가락 누락`;

      const generatorTurnaroundPromptTemplate = `이 캐릭터의 삼면도와 세부 디자인 정보가 담긴 캐릭터 시트를 그려주세요.

  1. 원본 자료의 일러스트 스타일을 최대한 비슷하게 구현해 주세요.

  2. 삼면도가 크고 고화질로 그려진 삼면도 중심의 캐릭터 시트여야 합니다.

  3. 세부 정보는 간략하게 표현해 주세요.

  4. 캐릭터 표정 시트는 불필요합니다.

  5. 고해상도 이미지로 생성해 주세요.

  6. 16:9 비율로 생성해 주세요.

  7. 옷과 배경의 구분이 쉽도록 배경은 흰색으로 해주세요.

  8. (만약 캐릭터에게 무기가 있다면) 삼면도에서 무기는 제외하고 별도의 카테고리에 표현해 주세요.

  9. (만약 캐릭터에게 날개, 꼬리, 등에서 뻗는 부속 신체가 있다면) 삼면도와 별도의 디테일 패널에 함께 표현해 주세요.
  날개는 팔, 겨드랑이, 어깨 장식, 옷에 붙지 않고 등 위쪽 양쪽 견갑골 부근에서 시작되어야 합니다.
  꼬리는 허리 장식이 아니라 꼬리뼈 부근에서 자연스럽게 이어져야 합니다.

  캐릭터의 이름은 {이름} 이며, 텍스트는 캐릭터 이름과 시트 카테고리 외에 소개와 설정 등의 세부적인 텍스트는 불필요합니다.

  텍스트는 영문으로 부탁드립니다.`;

      const generatorMagazinePromptTemplate = `일본 패션 잡지의 1페이지 편집 지면을 만들어주세요.

  이 페이지는 특정 캐릭터의 체형, 분위기, 성별 표현, 개성에 어울리는 언더웨어 스타일링을 소개하는 정보성 겸 광고성 페이지입니다.

  실제 일본 패션 잡지처럼 보이도록, 세련되고 감각적인 레이아웃으로 구성해주세요.

  텍스트와 정보는 너무 많지 않게, 핵심만 간결하게 넣어주세요.

  우선순위:

  1순위: 해당 캐릭터의 공식 신체 정보와 원작 체형을 실제 이미지 속 신체 비율에 그대로 반영

  2순위: 가슴 크기, 흉부 형태, 허리선, 골반 비율을 어떤 방향으로도 평균화하지 말고 원작 그대로 유지

  3순위: 큰 가슴 캐릭터는 줄이지 않고, 작은 가슴 캐릭터는 키우지 않기

  4순위: 해당 캐릭터의 성별 표현과 원작 설정에 맞는 언더웨어 구성

  5순위: 해당 캐릭터의 원작 그림체, 얼굴, 헤어스타일, 분위기 유지

  6순위: 해당 캐릭터의 특성을 반영한 오리지널 언더웨어 디자인

  7순위: 일본 패션 잡지풍 레이아웃과 정보성 편집 구성

  8순위: 모든 텍스트를 자연스러운 한글로 출력

  페이지 안에 들어가는 모든 문구, 제목, 설명, 모델 정보, 분석 텍스트는 반드시 한글로 출력해주세요.

  일본 잡지풍 디자인이지만, 실제 표시되는 텍스트는 전부 자연스럽고 읽기 쉬운 한국어여야 합니다.

  메인 테마는 해당 캐릭터의 공식 신체 정보, 원작 체형, 고유한 실루엣, 성별 표현, 분위기와 개성을 가장 잘 살려주는 언더웨어 스타일링입니다.

  단순히 노출 중심이 아니라, 캐릭터의 체형적 특징과 장점을 시각적으로 명확하게 보여주는 패션/뷰티 잡지형 구성으로 표현해주세요.

  모델은 [원하는 캐릭터명 또는 캐릭터 설정]을 바탕으로 표현해주세요.

  모델의 성별은 별도로 고정하지 말고, 반드시 해당 캐릭터의 성별 표현과 설정을 따라가 주세요.

  여성 캐릭터라면 여성적인 분위기와 체형 표현을, 남성 캐릭터라면 남성적인 분위기와 체형 표현을, 중성적이거나 성별 표현이 독특한 캐릭터라면 그 고유한 인상을 반영해주세요.

  핵심은 임의로 여성화하거나 남성화하지 말고, 해당 캐릭터 자체의 성별 표현과 분위기를 유지하는 것입니다.

  언더웨어 구성은 반드시 해당 캐릭터의 성별 표현과 원작 설정에 맞게 조정해주세요.

  여성 캐릭터 또는 여성적인 언더웨어가 자연스러운 캐릭터라면, 브라렛, 브라, 캐미솔형 언더웨어, 팬티, 하이웨이스트 하의 등 캐릭터에게 어울리는 여성용 언더웨어 세트로 구성할 수 있습니다.

  남성 캐릭터 또는 남성적인 언더웨어가 자연스러운 캐릭터라면, 상의 언더웨어를 입히지 말고 남성용 하의 언더웨어 중심으로 구성해주세요.

  남성 캐릭터에게 브라, 브라렛, 컵이 있는 상의, 여성용 상의 언더웨어, 가슴을 감싸는 란제리형 상의를 입히지 마세요.

  남성 캐릭터의 경우 착용 아이템은 브리프, 복서 브리프, 트렁크, 로우라이즈 언더웨어 같은 하의 중심으로 구성해주세요.

  상체는 맨가슴, 오픈 셔츠, 가벼운 로브, 재킷을 걸친 스타일링 정도만 허용하며, 이것도 캐릭터의 분위기와 잡지 편집 콘셉트에 맞게 자연스럽게 사용해주세요.

  핵심은 남성 캐릭터를 여성용 언더웨어 세트처럼 처리하지 않는 것입니다.

  중성적이거나 성별 표현이 독특한 캐릭터의 경우에는, 해당 캐릭터의 원작 성별 표현과 분위기에 맞춰 언더웨어 구조를 조정해주세요.

  임의로 여성용 브라 세트를 입히거나, 반대로 남성용 하의만 고정하지 말고, 해당 캐릭터에게 가장 자연스러운 언더웨어 스타일을 선택해주세요.

  모델의 체형은 이 이미지에서 최우선으로 반영해야 할 요소입니다.

  해당 캐릭터에게 공식적으로 공개된 키, 체중, 쓰리사이즈, 신체 비율, 체형 정보가 있다면 그 정보를 최우선 기준으로 삼아 실제 이미지 속 신체 비율에 강하게 반영해주세요.

  이 수치는 모델 정보 텍스트에만 표시되는 장식 정보가 아니라, 캐릭터의 몸매와 실루엣을 결정하는 핵심 기준입니다.

  체형 반영 최우선 규칙:

  해당 캐릭터의 공식 신체 정보와 원작 체형은 어떤 방향으로도 평균화하거나 보정하지 말고 그대로 반영해주세요.

  공식 수치가 비현실적으로 과장된 글래머 체형이라면,

  이를 현실적인 미형 체형이나 일반적인 글래머 체형으로 줄이거나 완화하지 말고,

  가슴의 매우 큰 볼륨, 극단적으로 잘록한 허리, 허리 대비 넓은 골반의 강한 대비가 실제 이미지에서 분명히 보이도록 표현해주세요.

  반대로 해당 캐릭터가 작은 가슴, 빈약한 흉부, 평평한 상체, 슬림한 상체 라인으로 묘사되는 경우,

  이를 임의로 풍만하게 보정하거나 일반적인 글래머 체형으로 키우지 마세요.

  푸시업 효과, 과한 패드, 과장된 가슴골, 불필요한 옆가슴 볼륨, 글래머 보정은 적용하지 마세요.

  즉, 큰 가슴 캐릭터는 줄이지 말고, 작은 가슴 캐릭터는 키우지 말며,

  해당 캐릭터의 공식 설정과 원작 실루엣을 그대로 유지해주세요.

  핵심은 ‘보기 좋은 평균 몸매’가 아니라 ‘해당 캐릭터 고유의 체형을 왜곡 없이 재현하는 것’입니다.

  가슴, 흉부, 허리, 골반의 비율 차이는 해당 캐릭터의 공식 설정과 원작 묘사에 맞게 정확히 유지해주세요.

  가슴 수치가 크다면 상체 볼륨이 확실히 드러나야 하고, 가슴이 작거나 빈약한 체형이라면 그 작은 흉부 라인 역시 분명하게 유지되어야 합니다.

  허리 수치가 작다면 허리가 매우 잘록하게 보여야 하며, 골반 수치가 크다면 허리와 골반의 대비가 뚜렷하게 표현되어야 합니다.

  공식 수치가 비현실적이거나 만화적으로 과장된 비율이라도, 이를 평균적인 미형 체형이나 일반적인 글래머 체형으로 완화하지 마세요.

  원작 캐릭터가 가진 과장된 체형 대비, 실루엣, 신체적 특징을 약화하지 말고 유지해주세요.

  만약 공식적인 수치 정보가 없다면, 임의로 자연스럽게 재해석하거나 일반적인 이상형 체형으로 보정하지 말고,

  원작에서 보이는 해당 캐릭터의 체형적 특징, 실루엣, 체격감, 흉부 볼륨감 또는 흉부의 평평함, 허리선, 골반과 상체의 비율, 팔다리 길이와 인상을 가능한 한 그대로 표현해주세요.

  즉, 얼굴과 헤어스타일만 닮게 하는 것이 아니라,

  누가 봐도 해당 캐릭터답다고 느껴질 수 있도록 신체 비율과 체형 인상 자체를 원작 기준으로 유지해주세요.

  (만약 캐릭터에게 날개, 꼬리, 등에서 뻗는 부속 신체가 있다면) 날개는 팔, 겨드랑이, 어깨 장식, 옷에 붙지 않고 등 위쪽 양쪽 견갑골 부근에서 시작되어야 합니다, 꼬리는 허리 장식이 아니라 꼬리뼈 부근에서 자연스럽게 이어져야 합니다.

  공식 수치와 원작의 시각적 인상이 함께 존재하는 경우에는,

  공식 수치를 우선하되 원작에서 보이는 대표적인 체형 인상과 괴리감이 생기지 않도록 표현해주세요.

  핵심은 ‘예쁘게 평균화한 몸매’가 아니라,

  ‘해당 캐릭터의 공식 설정과 원작 실루엣을 시각적으로 그대로 반영한 체형’입니다.

  실사 인물이 아니라, 해당 캐릭터가 등장하는 원작과 최대한 동일한 그림체를 기준으로 표현해주세요.

  단순히 캐릭터 설정만 가져오는 것이 아니라, 원작 특유의 선화, 채색 방식, 얼굴 비율, 눈매, 머리카락 표현, 명암 처리, 분위기, 전체적인 작화 감성을 최대한 동일한 느낌으로 반영해주세요.

  가능하면 누가 봐도 해당 캐릭터의 원작풍 일러스트처럼 느껴지도록 표현해주세요.

  잡지 편집 레이아웃은 현대적인 패션 잡지 스타일로 구성하되, 캐릭터 자체의 그림체와 작화 스타일은 원작과 동일한 방향으로 유지해주세요.

  광고할 제품은 해당 캐릭터의 특성이 드러나는 오리지널 언더웨어입니다.

  언더웨어의 색상, 형태, 소재감, 하의 실루엣, 스트랩 형태, 장식 디테일, 전체 분위기는 해당 캐릭터의 대표적인 이미지와 특징을 반영하여 디자인해주세요.

  예를 들어 캐릭터의 대표 색상, 상징적인 모티프, 성격적 분위기, 시그니처 스타일이 자연스럽게 느껴지도록 해주세요.

  단, 단순한 코스프레 의상처럼 보이지 않도록 주의하고,

  실제 패션 잡지의 언더웨어 광고에 나올 법한 세련되고 패셔너블한 디자인으로 정리해주세요.

  착용 시 허리선과 상체 라인, 전체 실루엣이 살아나고,

  해당 캐릭터의 공식 체형과 원작 실루엣이 가장 잘 드러나는 느낌이 나야 합니다.

  언더웨어는 해당 캐릭터의 체형을 억지로 바꾸거나 보정하는 방향이 아니라, 원래 체형의 특징을 가장 잘 보여주는 방향으로 디자인해주세요.

  가슴이 큰 캐릭터라면 볼륨감과 지지력, 체형 대비를 살리고,

  가슴이 작은 캐릭터라면 깔끔하고 섬세한 상체 라인, 가볍고 담백한 실루엣, 과장되지 않은 핏을 살려주세요.

  작은 가슴 캐릭터에게 푸시업 브라, 과한 패드, 과장된 볼륨 연출, 과도한 골 강조를 적용하여 일반적인 글래머 체형처럼 보이게 만들지 마세요.

  남성 캐릭터의 경우에는 가슴 컵 디자인, 브라 구조, 여성용 상의 언더웨어 설명을 사용하지 마세요.

  남성 캐릭터의 언더웨어 설명은 하의 핏, 허리 밴드, 골반 라인, 복부와 허리 실루엣, 상체 근육 또는 슬림한 체형 라인 등 남성용 언더웨어 광고에 맞는 요소를 중심으로 구성해주세요.

  페이지에 포함할 필수 이미지 구성은 다음과 같습니다.

  1. 메인 샷

  골반 위 상체 중심의 메인 비주얼

  페이지에서 가장 크게 보이는 대표 이미지

  해당 캐릭터 특성을 반영한 오리지널 언더웨어를 착용

  공식 신체 비율, 상체 라인, 허리선, 골반 대비, 체형의 특징이 가장 돋보이도록 구성

  가슴이 큰 캐릭터라면 그 볼륨감과 체형 대비가 정확히 보이도록 표현

  가슴이 작은 캐릭터라면 그 담백하고 슬림한 상체 라인이 정확히 보이도록 표현

  남성 캐릭터라면 상의 언더웨어 없이 하의 언더웨어 중심으로, 상체는 캐릭터의 원래 체형과 성별 표현에 맞게 구성

  2. 옆모습 샷

  모델을 옆에서 본 모습

  흉부 라인, 허리선, 상체 실루엣, 골반 라인 등 해당 캐릭터 체형의 특징이 잘 보이도록 구성

  공식 신체 수치가 있는 경우, 옆모습에서도 그 비율 차이가 느껴지도록 표현

  작은 가슴 캐릭터라면 옆모습에서도 과도한 돌출감이 생기지 않도록 주의

  남성 캐릭터라면 흉부를 여성형 볼륨으로 만들지 말고, 원작의 남성적 또는 중성적 상체 실루엣을 유지

  3. 뒷모습 샷

  모델을 뒤에서 본 모습

  모델은 양팔을 들어 올린 포즈

  등 라인, 허리선, 골반 라인이 보이도록 구성

  뒤쪽 시점에서도 해당 캐릭터 체형의 입체감과 전체 실루엣이 느껴지도록 표현

  가슴이 작은 캐릭터는 불필요한 옆가슴 볼륨을 과장하지 말고, 원작 체형 그대로 유지

  남성 캐릭터는 여성용 상의 언더웨어 없이 등 라인, 어깨선, 허리선, 하의 언더웨어 핏이 보이도록 구성

  페이지에 포함할 필수 정보는 다음과 같습니다.

  해당 캐릭터를 모티브로 한 언더웨어에 대한 짧은 설명

  체형 라인과 상체 실루엣을 분석하는 간단한 섹션

  메인 샷, 옆모습, 뒷모습을 활용한 비교/분석 느낌의 구성

  모델 프로필 정보

  짧고 읽기 쉬운 한국어 잡지풍 카피

  체형 분석 섹션은 너무 전문적이지 않게, 잡지식으로 가볍고 직관적으로 구성해주세요.

  분석의 초점은 획일적인 성적 매력 미화가 아니라,

  해당 캐릭터의 공식 신체 정보와 원작 체형을 언더웨어 스타일링이 어떻게 그대로 살려주는지에 맞춰주세요.

  분석 문구는 캐릭터의 실제 체형과 성별 표현에 따라 달라져야 합니다.

  가슴이 큰 캐릭터라면 볼륨감, 허리 대비, 지지력, 입체감을 중심으로 설명하고,

  가슴이 작은 캐릭터라면 깔끔한 상체 라인, 담백한 실루엣, 가벼운 핏, 섬세한 체형 표현을 중심으로 설명해주세요.

  남성 캐릭터라면 브라, 컵, 가슴골, 볼륨업 같은 표현을 사용하지 말고, 허리 밴드, 하의 핏, 복부 라인, 골반 라인, 어깨와 등 실루엣 같은 표현을 사용해주세요.

  작은 가슴 캐릭터에게는 ‘볼륨 업’, ‘풍성한 가슴 연출’, ‘글래머한 핏’ 같은 표현을 사용하지 마세요.

  남성 캐릭터에게는 ‘브라 핏’, ‘컵 디자인’, ‘가슴골’, ‘풍성한 바스트’ 같은 표현을 사용하지 마세요.

  분석 포인트 예시는 다음과 같습니다.

  공식 신체 비율을 그대로 살리는 실루엣

  허리선과 골반 대비 강조

  체형에 맞는 언더웨어 핏

  캐릭터 고유의 실루엣을 살려주는 디자인 포인트

  평균화하지 않은 원작 체형의 매력

  작은 가슴 캐릭터의 경우: 담백한 상체 라인과 섬세한 핏

  큰 가슴 캐릭터의 경우: 공식 수치를 반영한 볼륨감과 허리 대비

  남성 캐릭터의 경우: 하의 언더웨어 핏, 허리 밴드, 복부 라인, 어깨와 등 실루엣

  모델 정보 섹션에는 다음 느낌의 프로필을 넣어주세요.

  모델명: {이름}

  분위기: 해당 캐릭터의 고유한 이미지 반영

  성별 표현: 해당 캐릭터 설정 반영

  체형: 공식 정보가 있으면 그 기준을 실제 이미지 비율에 반영하고, 없으면 원작의 체형적 특징을 그대로 반영

  스타일 포인트: 캐릭터의 공식 체형과 개성을 살려주는 언더웨어 스타일링

  착용 아이템: 해당 캐릭터 모티브의 오리지널 언더웨어

  디자인 톤은 실제 일본 패션 잡지처럼 보이게 해주세요.

  하지만 모든 텍스트는 반드시 한글이어야 합니다.

  전체 분위기는 트렌디하고 세련되며, 젊고 감각적인 편집 디자인으로 구성해주세요.

  광고 같지만 부담스럽지 않은 정보형 레이아웃으로 만들어주세요.

  배경은 깨끗하고 부드러운 색감, 정돈된 타이포그래피, 세련된 편집 디자인을 사용해주세요.

  선정성보다는 패션/뷰티/스타일링 지면처럼 보이게 구성해주세요.

  최종 이미지는 잡지 한 페이지 완성형 레이아웃이어야 합니다.`;


      const generatorBodyInfoPromptTemplate = `제가 제작 요청한 성인 캐릭터의 일러스트와 삼면도를 기반으로 신체 정보를 추정해주세요.

  알려줄 항목은 다음 네 가지입니다.

  1. 추정 키
  2. 추정 체중
  3. 추정 쓰리사이즈: 가슴둘레 / 허리둘레 / 엉덩이둘레
  4. 그렇게 추정한 이유

  수치는 단일값과 가능 범위를 함께 제시해주세요.
  포즈, 원근, 의상, 신발, 그림체 과장 때문에 생기는 불확실성도 간단히 설명해주세요.

  분석 목적은 캐릭터 설정, 의상 디자인, 3D 모델링 참고용입니다. 선정적인 표현은 피하고, 신체 디자인 자료로서 객관적으로 분석해주세요.`;

      const generatorCookingMagazinePromptTemplate = `첨부한 설정화의 캐릭터를 기반으로 일본 패션 잡지의 1페이지 편집 지면을 만들어주세요.

  실제 일본 라이프스타일·패션 잡지의 홈 라이프 특집 페이지처럼 보이도록 구성해주세요.

  우선순위:

  1순위: 첨부한 캐릭터의 얼굴, 체형, 헤어스타일, 분위기, 성별 표현 유지

  2순위: 원작의 그림체와 작화 감성 유지

  3순위: 자연스럽고 사랑스러운 일상 분위기 표현

  4순위: 세련된 일본 잡지풍 편집 디자인

  5순위: 영어 기반의 깔끔한 잡지 레이아웃

  6순위: 따뜻하고 밝은 실내 분위기 표현

  페이지 안에 들어가는 모든 제목, 설명, 카피, 정보 텍스트는 자연스러운 영어로 출력해주세요.

  이 페이지는 특정 캐릭터의 홈 라이프 스타일을 소개하는 라이프스타일 특집 지면입니다.

  모델은 {이름}을 바탕으로 표현해주세요.  

  모델의 성별은 별도로 고정하지 말고 반드시 해당 캐릭터의 성별 표현과 원작 설정을 따라가 주세요.

  캐릭터의 공식 체형과 신체 비율이 있다면 실제 이미지에도 반영해주세요.

  실사 인물이 아니라 해당 캐릭터가 등장하는 원작과 최대한 동일한 그림체를 기준으로 표현해주세요.

  단순히 캐릭터 설정만 가져오는 것이 아니라 원작 특유의 선화, 채색 방식, 얼굴 비율, 눈매, 머리카락 표현, 명암 처리, 분위기, 전체적인 작화 감성을 최대한 동일하게 반영해주세요.

  ---

  메인 이미지 구성

  페이지에는 하나의 큰 메인 이미지만 사용해주세요.

  배경:

  밝고 따뜻한 주방

  아침 또는 오후의 자연광

  깔끔한 조리대

  생활감 있는 주방 소품

  따뜻한 가정 분위기

  아늑하고 정돈된 공간

  헤어스타일:

  캐릭터 분위기에 어울리는 자연스러운 헤어스타일

  부드럽고 단정한 스타일

  생활감 있는 자연스러운 표현

  복장:

  오직 가정용 앞치마만 목에 걸쳐 착용 

  앞치마는 깔끔하고 실용적인 디자인

  캐릭터 분위기에 어울리는 색상

  밝고 건강한 라이프스타일 화보 느낌

  장면:

  방금 요리를 마친 상황

  따뜻한 음식이 담긴 냄비를 양손으로 들고 있음

  완성된 요리를 자랑하듯 보여주는 모습

  주방 안에서 자연스럽게 서 있는 상태

  생활감 있는 홈 라이프 장면

  포즈:

  몸은 옆모습이 중심이 되는 방향

  얼굴은 시청자가 잘 보이도록 고개를 돌림

  냄비를 양손으로 안정적으로 들고 있음

  자연스럽고 편안한 자세

  패션 화보처럼 정돈된 실루엣

  표정:

  사랑스럽고 다정한 표정

  밝은 미소

  따뜻한 눈빛

  누군가를 위해 요리한 듯한 행복한 분위기

  친근하고 편안한 인상

  카메라 구도:

  옆모습이 중심이 되는 3/4 시점

  얼굴 전체가 자연스럽게 보이는 각도

  상체와 냄비가 잘 보이는 구도

  주방 분위기가 함께 드러나는 프레이밍

  라이프스타일 잡지 화보 같은 구성

  전체 장면은 일본 라이프스타일 잡지의 홈 쿠킹 특집 화보처럼 표현해주세요.

  선정성보다는 따뜻한 일상, 요리, 생활감, 캐릭터의 매력을 보여주는 라이프스타일 화보의 느낌을 우선해주세요.

  ---

  잡지 구성

  페이지는 하나의 대형 메인 이미지와 최소한의 편집 요소로 구성해주세요.

  포함 요소:

  메인 타이틀

  모델 프로필 박스

  잡지풍 레이아웃 장식

  텍스트는 많지 않게 유지해주세요.

  ---

  모델 프로필 예시 구성

  Model Name

  Mood

  Home Lifestyle

  Character Traits

  Outfit

  Cooking Time

  실제 캐릭터 설정에 맞게 자연스럽게 작성해주세요.

  ---

  디자인 톤

  현대 일본 라이프스타일 잡지

  홈 라이프 에디토리얼 스타일

  깔끔한 타이포그래피

  세련된 편집 디자인

  따뜻한 자연광

  감각적인 여백 활용

  밝고 포근한 분위기

  생활감 있는 화보 스타일

  친근하고 사랑스러운 감성

  최종 결과물은 "메인 이미지 하나가 크게 배치된 일본 라이프스타일·홈 쿠킹 잡지 1페이지 완성본"처럼 보이도록 구성해주세요.

  하지만 모든 텍스트는 반드시 한글이어야 합니다.`;

      const generatorSketchbookPromptTemplate = `첨부한 이미지를 참고해주세요.

  종족 : {종족}
  직업 : {직업}
  성격 : {성격}
  세계 : {장르}

  완벽하게 검열하는 슬랩스틱 개그 장면, 노출 없음, 선정성 없음.

  상기 성인 캐릭터로 옛날 만화에 자주 등장하는 장면의 일러스트를 구상하여 그려주십시오.

  고화질 세로 컨셉 일러스트.

  중요: 전체 캔버스 크기를 크게 확장해주세요.

  카우보이샷, 아이레벨 뷰.

  배경은 캐릭터가 실제로 오래 거주해온 개인 침실이다. 작업실이 아닌 생활 공간이며, 명확히 침실처럼 보여야 한다. 방 구조와 가구, 침구, 생활용품은 캐릭터의 체형과 생활습관에 맞게 설계한다. 방만 보아도 종족, 직업, 성격, 취향, 경제력, 문화권, 세계관이 드러나야 하며, 오래 사용한 생활감과 사용 흔적이 자연스럽게 존재해야 한다. 취미, 소지품, 정리 습관, 직업 관련 흔적이 생활 공간 안에 자연스럽게 배치되어야 한다.

  {종족별 문구}

  해당 캐릭터의 검열되지 않는 신체부위로 추측컨대 나체가 틀림없는 상황이지만, 손에 든 물건으로 가리는 것으로 그 어떠한 노출도 보이지 않는 완벽한 검열이 이루어진 비성애적 일러스트.

  나체라고는 하지만 실제로는 해당 캐릭터의 나신을 완전히 가리기에 나체를 강조하는 일러스트는 아니며, 이미지의 주제는 결코 선정성이 아닌 오히려 해당 상황을 전혀 선정적이지 않게 만드는 검열의 방식입니다.

  즉, 어떠한 의미에 있어선 사실상 나체를 가리는 일러스트가 아니라 옷을 다른 것으로 대체하는 일러스트라고 할 수 있습니다.

  이미지의 원근감을 잘 표현하십시오.

  페이지에 포함할 필수 이미지 구성은 다음과 같습니다.

  1. 메인 샷

  카우보이샷, 아이레벨의 정면뷰로 페이지에서 가장 크게 보이는 대표 이미지.

  해당 캐릭터는 나체가 틀림없어 보이나 완전한 검열로 노출을 방지합니다.

  2. 지류

  캐릭터가 직접 손에 들고 있는 몸을 충분히 가릴 만한 스케치북.

  스케치북은 오른손 한 개가 쇄골 근처, 왼손 한 개가 허리 근처로 총 2개를 한 손에 하나씩 들고 있습니다.

  3. 검열 방식

  상기 이미지에서 캐릭터가 입고 있는 의상의 상의와 하의, 또는 해당 종족의 하반신 구조에 맞는 착용물과 가림 장식을 각각 해당 스케치북 위에 캐릭터 본인이 직접 그린 것처럼 묘사합니다.

  캐릭터의 외형에서 그림체, 화풍, 그림 도구, 스타일, 채색 방식, 스케치 방식 및 실력을 도출합니다.

  모든 내용은 캐릭터의 체형, 외모, 생활습관, 분위기, 성별 표현, 개성에 어울려야만 합니다.

  세세하게 잘 그리기보다는 "캐릭터 본인이 직접 그렸다."는 점에 치중해야 하며, 사용된 도구의 물리적 특성이 드러나야 합니다.

  그림은 반드시 디자인을 정확하게 재현할 필요가 없습니다.

  스케치북 안의 그림은 캐릭터의 손맛이 느껴지는 아마추어적인 손그림 혹은 솜씨 좋은 손그림으로 표현해야 합니다.

  해당 그림을 옷을 대신하여 몸을 가려 이미지를 검열하는데 사용합니다.

  그림은 캐릭터와 마찬가지로 정면 구도여야 하며, 실제 의상의 크기와 위치에 맞춰 표현합니다.

  4. 상황에 어울리는 캐릭터의 연출 지침

  검열을 수행하는 방식은 캐릭터의 성격, 직업, 종족, 생활환경 및 개성에 맞게 자연스럽게 변경할 수 있습니다.

  검열 소품을 반드시 캐릭터 본인이 직접 들 필요는 없습니다.

  캐릭터의 설정에 따라 소환물, 인형, 사역마, 동료, 기계장치, 마법, 능력, 주변 환경, 가구 또는 기타 설정에 어울리는 요소가 검열을 보조할 수 있습니다.

  검열 장면을 구성할 때 캐릭터를 인간형으로 표준화하지 않습니다.

  캐릭터의 종족적 특징, 신체 구조, 실루엣, 꼬리, 날개, 뿔, 귀, 체형 등의 고유 특징을 유지합니다.

  5. 상황에 어울리는 캐릭터의 표정 지침

  정체성(Identity)은 유지하되 형태(Geometry)는 복제하지 않습니다.

  캐릭터의 직업과 성격에 어울리는 표정을 사용합니다.

  POV를 바라보지 않아도 됩니다.

  6. 이미지에 텍스트는 일절 포함하지 않습니다.`;


    

  const basicInfoDefaults = {
    gender: "미등록",
    world: "미등록",
    genre: "미등록",
    race: "미등록",
    job: "미등록",
    age: "미등록",
    personality: "미등록",
    ability: "알려지지 않음",
    weapon: "미등록",
    height: "미등록",
    weight: "미등록",
    measurements: "미등록"
  };

  const characterImportColumnAliases = {
    name: "name",
    "이름": "name",
    en: "en",
    english: "en",
    "영어이름": "en",
    "영문명": "en",
    themeColor: "themeColor",
    themecolor: "themeColor",
    theme_color: "themeColor",
    "상징색": "themeColor",
    folder: "folder",
    "폴더": "folder",
    hidden: "hidden",
    "숨김": "hidden",
    albumKeys: "albumKeys",
    albumkeys: "albumKeys",
    album_keys: "albumKeys",

    shortIntro: "profile.shortIntro",
    shortintro: "profile.shortIntro",
    short_intro: "profile.shortIntro",
    "한줄소개": "profile.shortIntro",
    "한 줄 소개": "profile.shortIntro",
    "profile.shortIntro": "profile.shortIntro",
    quote: "profile.quote",
    "대표대사": "profile.quote",
    "대표 대사": "profile.quote",
    "profile.quote": "profile.quote",

    gender: "profile.basicInfo.gender",
    "성별": "profile.basicInfo.gender",
    world: "profile.basicInfo.world",
    "소속세계": "profile.basicInfo.world",
    "소속 세계": "profile.basicInfo.world",
    "세계": "profile.basicInfo.world",
    genre: "profile.basicInfo.genre",
    "장르": "profile.basicInfo.genre",
    race: "profile.basicInfo.race",
    "종족": "profile.basicInfo.race",
    job: "profile.basicInfo.job",
    "직업": "profile.basicInfo.job",
    age: "profile.basicInfo.age",
    "나이": "profile.basicInfo.age",
    personality: "profile.basicInfo.personality",
    "성격": "profile.basicInfo.personality",
    ability: "profile.basicInfo.ability",
    "능력": "profile.basicInfo.ability",
    weapon: "profile.basicInfo.weapon",
    "무기": "profile.basicInfo.weapon",
    height: "profile.basicInfo.height",
    "키": "profile.basicInfo.height",
    weight: "profile.basicInfo.weight",
    "몸무게": "profile.basicInfo.weight",
    measurements: "profile.basicInfo.measurements",
    "신체사이즈": "profile.basicInfo.measurements",
    "신체 사이즈": "profile.basicInfo.measurements"
  };

  const supportedCharacterImportPaths = new Set([
    ...Object.values(characterImportColumnAliases),
    "profile.shortIntro",
    "profile.quote",
    ...Object.keys(basicInfoDefaults).map(key => `profile.basicInfo.${key}`)
  ]);

  const removedCharacterImportColumns = new Set([
    "universe", "faction", "activityArea", "activityarea", "activity_area", "position",
    "overview", "socialPosition", "socialposition", "social_position",
    "mainActivities", "mainactivities", "main_activities",
    "strengths", "weaknesses", "relationships", "conflicts",
    "publicCaution", "publiccaution", "public_caution",
    "privatePending", "privatepending", "private_pending",
    "longTermForeshadowing", "longtermforeshadowing", "long_term_foreshadowing",
    "firstIncidentTwist", "firstincidenttwist", "first_incident_twist"
  ]);

  const albumFileToKey = {
    "fig.webp": "figure",
    "mag.webp": "magazine",
    "sketch.webp": "sketch",
    "bra.webp": "bra",
    "box.webp": "box",
    "beach.webp": "beach",
    "sakura.webp": "sakura",
    "valen.webp": "valen",
    "school.webp": "school",
    "maid.webp": "maid",
    "japanfestival.webp": "japanFestival",
    "cookmag.webp": "cookmag"
  };

  const albumKeyOrder = Object.values(albumFileToKey);

  const baseImageFiles = new Set(["main.webp", "thumb.webp", "doodle.webp", "turn.webp"]);
  const baseCharacterImageDefinitions = [
    { key: "illustration", title: "기본 일러스트", category: "MAIN", fileName: "main.webp", visibility: "safe" },
    { key: "doodle", title: "낙서 시트", category: "REFERENCE", fileName: "doodle.webp", visibility: "safe" },
    { key: "turnaround", title: "삼면도", category: "REFERENCE", fileName: "turn.webp", visibility: "safe" }
  ];

  const albumKeyDefinitions = {
    figure: { key: "figure", title: "피규어", category: "FIGURE", fileName: "fig.webp", visibility: "safe" },
    magazine: { key: "magazine", title: "광고", category: "MAGAZINE", fileName: "mag.webp", visibility: "restricted" },
    sketch: { key: "sketch", title: "스케치북", category: "SCENE", fileName: "sketch.webp", visibility: "restricted" },
    bra: { key: "bra", title: "생활 정보", category: "MAGAZINE", fileName: "bra.webp", visibility: "restricted" },
    box: { key: "box", title: "박스티", category: "SCENE", fileName: "box.webp", visibility: "safe" },
    beach: { key: "beach", title: "해수욕장", category: "EVENT", fileName: "beach.webp", visibility: "safe" },
    sakura: { key: "sakura", title: "벚꽃축제", category: "EVENT", fileName: "sakura.webp", visibility: "safe" },
    valen: { key: "valen", title: "발렌타인", category: "EVENT", fileName: "valen.webp", visibility: "safe" },
    school: { key: "school", title: "학교", category: "EVENT", fileName: "school.webp", visibility: "safe" },
    maid: { key: "maid", title: "메이드", category: "EVENT", fileName: "maid.webp", visibility: "safe" },
    japanFestival: { key: "japanFestival", title: "일본 축제", category: "EVENT", fileName: "japanFestival.webp", visibility: "safe" },
    cookmag: { key: "cookmag", title: "요리잡지", category: "MAGAZINE", fileName: "cookmag.webp", visibility: "restricted" }
  };

  let plannedPrivateCharacterImport = null;

  const elements = {};

  function $(id) {
    return document.getElementById(id);
  }

  function text(value, fallback = "") {
    const normalized = String(value ?? "").trim();
    return normalized || fallback;
  }

  function escapeHtml(value = "") {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function hashString(source = "") {
    let hash = 2166136261;
    for (let index = 0; index < String(source).length; index += 1) {
      hash ^= String(source).charCodeAt(index);
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

  function clampNumber(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function normalizeId(value = "") {
    return text(value).replace(/\s+/g, "");
  }

  function normalizeLookupId(value = "") {
    return normalizeId(value).toLowerCase();
  }

  function stripFolderNumberPrefix(value = "") {
    return normalizeId(value).replace(/^\d{3}-/, "");
  }

  function getWorlds() {
    return Array.isArray(window.STORY_TAXONOMY?.genreGroups) ? window.STORY_TAXONOMY.genreGroups : [];
  }

  function getCharacters() {
    return Array.isArray(window.CHARACTERS) ? window.CHARACTERS.filter(character => !character?.hidden) : [];
  }

  function getStories() {
    return Array.isArray(window.STORY_DATA) ? window.STORY_DATA : [];
  }

  function getCharacterFolder(character) {
    return normalizeId(character?.folder || character?.id || character?.en || character?.name || "unknown");
  }

  function getCharacterStoryId(character) {
    return normalizeId(character?.storyId)
      || stripFolderNumberPrefix(character?.folder)
      || normalizeId(character?.id)
      || normalizeId(character?.en)
      || normalizeId(character?.name)
      || "unknown";
  }

  function imagePath(character, fileName) {
    return `assets/characters/${getCharacterFolder(character)}/${fileName}`;
  }

  function basicInfo(character, key, fallback = "미등록") {
    return text(character?.profile?.basicInfo?.[key], fallback);
  }

  function normalizeWorldDisplayName(value) {
    const raw = text(value);
    if (!raw) return raw;
    const lookup = normalizeLookupId(raw);
    const world = getWorlds().find(item => (
      normalizeLookupId(item?.name) === lookup
      || normalizeLookupId(item?.code) === lookup
      || normalizeLookupId(item?.slug) === lookup
    ));
    return world?.name || raw;
  }


  function characterThemeColor(character) {
    return text(character?.themeColor, "rgba(231, 196, 122, 0.58)");
  }

  function worldColor(worldId) {
    const worlds = getWorlds();
    const index = Math.max(0, worlds.findIndex(world => world.code === worldId));
    return palette[index % palette.length];
  }

  function worldSymbol(worldId) {
    return worldSymbols[worldId] || null;
  }

  function applyWorldStyle(element, worldId) {
    if (!element) return;
    const worlds = getWorlds();
    const index = Math.max(0, worlds.findIndex(world => world.code === worldId));
    const symbol = worldSymbol(worldId);
    element.style.setProperty("--world-glow", worldColor(worldId));
    element.style.setProperty("--world-symbol-color", symbol?.displayColor || symbol?.color || "#e7c47a");
    element.style.setProperty("--world-symbol-opacity", symbol?.symbolOpacity || "0.18");
    element.style.setProperty("--world-symbol-url", symbol ? `url("assets/symbol/${symbol.file}")` : "none");
    element.style.setProperty("--spot-x", `${18 + (index % 3) * 18}%`);
    element.style.setProperty("--spot-y", `${8 + (index % 4) * 7}%`);
  }

  function charactersByStoryId() {
    const map = new Map();
    getCharacters().forEach(character => {
      const storyId = getCharacterStoryId(character);
      map.set(storyId, character);
      map.set(normalizeLookupId(storyId), character);
      map.set(getCharacterFolder(character), character);
      map.set(normalizeLookupId(getCharacterFolder(character)), character);
      if (character?.en) map.set(normalizeLookupId(character.en), character);
      if (character?.name) map.set(normalizeLookupId(character.name), character);
    });
    return map;
  }

  function findWorld(worldId) {
    return getWorlds().find(world => world.code === worldId) || null;
  }

  function findCharacter(characterId) {
    const id = normalizeId(characterId);
    const lookup = normalizeLookupId(id);
    const map = charactersByStoryId();
    return map.get(id) || map.get(lookup) || null;
  }

  function findStory(storyId) {
    const id = text(storyId);
    return getStories().find(story => story.id === id) || null;
  }

  function storiesForWorld(worldId) {
    return getStories().filter(story => story?.worldId === worldId);
  }

  function charactersForWorld(world) {
    if (!world) return [];
    const characterMap = charactersByStoryId();
    const ordered = [];
    const seen = new Set();

    (Array.isArray(world.characters) ? world.characters : []).forEach(characterId => {
      const character = characterMap.get(characterId) || characterMap.get(normalizeLookupId(characterId));
      if (!character) return;
      const storyId = getCharacterStoryId(character);
      if (seen.has(storyId)) return;
      seen.add(storyId);
      ordered.push(character);
    });

    getCharacters().forEach(character => {
      const storyId = getCharacterStoryId(character);
      if (seen.has(storyId)) return;
      if (basicInfo(character, "world", "") !== world.name) return;
      seen.add(storyId);
      ordered.push(character);
    });

    return ordered;
  }

  function storiesForCharacter(character) {
    const storyId = getCharacterStoryId(character);
    const lookup = normalizeLookupId(storyId);
    return getStories().filter(story => {
      if (normalizeLookupId(story?.characterId) === lookup) return true;
      if (Array.isArray(story?.relatedCharacterIds)) {
        return story.relatedCharacterIds.some(characterId => normalizeLookupId(characterId) === lookup);
      }
      return false;
    }).sort(compareStories);
  }

  function compareStories(first, second) {
    const firstEpisode = Number(first?.episode ?? 9999);
    const secondEpisode = Number(second?.episode ?? 9999);
    if (firstEpisode !== secondEpisode) return firstEpisode - secondEpisode;
    return text(first?.title).localeCompare(text(second?.title), "ko");
  }

  function normalizeSearch(value = "") {
    return String(value ?? "").trim().toLowerCase();
  }

  function includesQuery(parts, query) {
    const needle = normalizeSearch(query);
    if (!needle) return true;
    return parts.some(part => normalizeSearch(part).includes(needle));
  }

  function storyCharacterLabels(story) {
    const labels = [];
    const seen = new Set();

    function addLabel(value) {
      const label = text(value);
      const key = normalizeSearch(label);
      if (!label || seen.has(key)) return;
      seen.add(key);
      labels.push(label);
    }

    function addCharacter(characterId, fallbackName = "") {
      const character = findCharacter(characterId);
      if (character) {
        addLabel(character.name || character.en || getCharacterStoryId(character));
        return;
      }
      addLabel(fallbackName || characterId);
    }

    if (story?.characterId) addCharacter(story.characterId);

    const ids = Array.isArray(story?.relatedCharacterIds) ? story.relatedCharacterIds : [];
    const names = Array.isArray(story?.relatedCharacters) ? story.relatedCharacters : [];
    ids.forEach((characterId, index) => addCharacter(characterId, names[index]));
    names.forEach(addLabel);

    return labels;
  }


  function characterMatchesQuery(character, query) {
    return includesQuery([
      character?.name,
      character?.en
    ], query);
  }

  function storySpecificCharacterLabels(story) {
    if (!story?.characterId) return [];
    return storyCharacterLabels({ characterId: story.characterId });
  }

  function storyMatchesQuery(story, query) {
    return includesQuery([
      story?.title,
      story?.summary,
      story?.file,
      story?.typeName,
      story?.seriesName,
      story?.seasonName,
      story?.characterId,
      ...(storySpecificCharacterLabels(story))
    ], query);
  }

  function uniqueLabels(labels) {
    const result = [];
    const seen = new Set();
    labels.forEach(label => {
      const value = text(label);
      const key = normalizeSearch(value);
      if (!value || seen.has(key)) return;
      seen.add(key);
      result.push(value);
    });
    return result;
  }

  function storyGroupMatchesQuery(group, query) {
    return includesQuery([
      group?.title,
      group?.description,
      ...(Array.isArray(group?.characterLabels) ? group.characterLabels : [])
    ], query);
  }

  function renderSearchMeta(element, visibleCount, totalCount, query, unit) {
    if (!element) return;
    element.textContent = query
      ? `검색 결과 ${visibleCount}${unit} / 전체 ${totalCount}${unit}`
      : `전체 ${totalCount}${unit}`;
  }

  function makeImage(src, alt, missingClassTarget) {
    const image = document.createElement("img");
    image.src = src;
    image.alt = alt || "";
    image.loading = "lazy";
    image.addEventListener("error", () => {
      if (missingClassTarget) missingClassTarget.classList.add("is-missing");
      image.removeAttribute("src");
    }, { once: true });
    return image;
  }

  function currentScrollTop() {
    return window.scrollY || document.documentElement?.scrollTop || document.body?.scrollTop || 0;
  }

  function routeKeyForWorld(worldId) {
    return `world:${normalizeLookupId(worldId)}`;
  }

  function routeKeyFromRoute(route) {
    if (!route || route.view === "worlds") return "worlds";
    if (route.view === "world") return routeKeyForWorld(route.worldId);
    if (route.view === "generator") return "generator";
    if (route.view === "character") return `character:${normalizeLookupId(route.worldId)}:${normalizeLookupId(route.characterId)}`;
    if (route.view === "story") return `story:${normalizeLookupId(route.worldId)}:${normalizeLookupId(route.storyId)}`;
    return "worlds";
  }


  function getStoryOpenGroupSet(worldId) {
    const key = normalizeLookupId(worldId);
    if (!state.storyOpenGroups[key]) {
      state.storyOpenGroups[key] = new Set();
    }
    return state.storyOpenGroups[key];
  }

  function isStoryGroupOpen(worldId, groupKey) {
    return getStoryOpenGroupSet(worldId).has(groupKey);
  }

  function setStoryGroupOpen(worldId, groupKey, isOpen) {
    const groups = getStoryOpenGroupSet(worldId);
    if (isOpen) {
      groups.add(groupKey);
      return;
    }
    groups.delete(groupKey);
  }

  function clearStoryOpenGroups(worldId) {
    const key = normalizeLookupId(worldId);
    delete state.storyOpenGroups[key];
  }

  function rememberRouteScroll(routeKey = state.routeKey) {
    if (!routeKey) return;
    state.scrollPositions[routeKey] = currentScrollTop();
  }

  function clearRouteScroll(routeKey) {
    if (!routeKey) return;
    delete state.scrollPositions[routeKey];
  }

  function restoreRouteScroll(routeKey = state.routeKey) {
    const savedTop = Number(state.scrollPositions[routeKey]);
    const top = Number.isFinite(savedTop) ? savedTop : 0;
    requestAnimationFrame(() => {
      window.scrollTo({ top, behavior: "auto" });
    });
  }

  function scrollToWorldTabs() {
    requestAnimationFrame(() => {
      const targetTop = Math.max(0, (elements.worldDetailScreen?.offsetTop || 0) - 8);
      window.scrollTo({ top: targetTop, behavior: "auto" });
    });
  }

  function setScreen(screenId) {
    [
      elements.worldSelectScreen,
      elements.generatorScreen,
      elements.worldDetailScreen,
      elements.characterDetailScreen,
      elements.storyReaderScreen
    ].forEach(screen => screen?.classList.remove("is-active"));
    $(screenId)?.classList.add("is-active");
    restoreRouteScroll();
    updatePrivateModeUi();
  }

  function setTopbar({ title, kicker, backVisible = false, homeVisible = false, worldId = "" }) {
    elements.topTitle.textContent = title;
    elements.topKicker.textContent = kicker;
    elements.backButton.classList.toggle("is-hidden", !backVisible);
    elements.worldHomeButton.classList.toggle("is-hidden", !homeVisible);

    if (elements.topSymbol) {
      const hasSymbol = Boolean(worldSymbol(worldId));
      elements.topSymbol.classList.toggle("is-hidden", !hasSymbol);
      if (hasSymbol) {
        applyWorldStyle(elements.topSymbol, worldId);
      } else {
        elements.topSymbol.removeAttribute("style");
      }
    }
  }

  function renderWorldSelect() {
    state.view = "worlds";
    state.worldId = "";
    state.characterId = "";
    state.storyId = "";
    setTopbar({ title: "세계관 아카이브", kicker: "WORLD ARCHIVE" });
    setScreen("worldSelectScreen");
    updatePrivateModeUi();

    const worlds = getWorlds();
    elements.worldGrid.innerHTML = "";

    if (worlds.length === 0) {
      elements.worldGrid.innerHTML = `<div class="empty-state">세계 데이터가 없습니다.</div>`;
      return;
    }

    const fragment = document.createDocumentFragment();
    worlds.forEach((world, index) => {
      const worldStories = storiesForWorld(world.code);
      const characterCount = charactersForWorld(world).length;
      const worldEpisodeCount = worldStories.filter(story => story?.scope === "world" || story?.type === "world-story").length;

      const card = document.createElement("button");
      card.type = "button";
      card.className = "world-card";
      card.dataset.worldId = world.code;
      card.setAttribute("aria-label", `${world.name} 세계 선택`);
      applyWorldStyle(card, world.code);

      card.innerHTML = `
        <span class="world-card-symbol" aria-hidden="true"></span>
        <div class="world-card-inner">
          <p class="section-kicker">WORLD ${String(index + 1).padStart(2, "0")}</p>
          <h3>${escapeHtml(world.name)}</h3>
          <p class="world-genre">${escapeHtml(world.coreGenre || "장르 미등록")}</p>
          <p class="world-description">${escapeHtml(world.description || "설명 미등록")}</p>
          <div class="world-meta">
            <span class="meta-pill">캐릭터 ${characterCount}</span>
            <span class="meta-pill">소설 ${worldStories.length}</span>
            ${worldEpisodeCount ? `<span class="meta-pill">세계소설 ${worldEpisodeCount}</span>` : ""}
          </div>
        </div>
      `;

      fragment.appendChild(card);
    });

    elements.worldGrid.appendChild(fragment);
  }

  function renderWorldDetail(worldId) {
    const world = findWorld(worldId);
    if (!world) {
      navigateWorlds(true);
      return;
    }

    const previousWorldId = state.worldId;

    state.view = "world";
    state.worldId = world.code;
    state.characterId = "";
    state.storyId = "";

    if (previousWorldId !== world.code) {
      state.worldTab = "info";
      state.characterSearch = "";
      state.storySearch = "";
    }

    const characters = charactersForWorld(world);
    const stories = storiesForWorld(world.code);
    const worldEpisodes = stories.filter(story => story?.scope === "world" || story?.type === "world-story").length;

    setTopbar({ title: world.name, kicker: "SELECTED WORLD", backVisible: true, worldId: world.code });
    setScreen("worldDetailScreen");

    if (elements.worldCharacterSearch) elements.worldCharacterSearch.value = state.characterSearch;
    if (elements.worldStorySearch) elements.worldStorySearch.value = state.storySearch;

    renderWorldCharacters(world, characters);
    renderWorldStories(world, stories);
    renderWorldInfo(world, characters, stories, worldEpisodes);
    setWorldTab(state.worldTab || "info");
  }


  function setWorldTab(tabName, options = {}) {
    const validTabs = new Set(["characters", "stories", "info"]);
    const nextTab = validTabs.has(tabName) ? tabName : "info";
    state.worldTab = nextTab;

    [
      elements.worldTabCharacters,
      elements.worldTabStories,
      elements.worldTabInfo
    ].forEach(button => {
      if (!button) return;
      const isActive = button.dataset.worldTab === nextTab;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-selected", isActive ? "true" : "false");
    });

    [
      elements.worldCharactersPanel,
      elements.worldStoriesPanel,
      elements.worldInfoPanel
    ].forEach(panel => {
      if (!panel) return;
      const isActive = panel.id === `world${nextTab.charAt(0).toUpperCase()}${nextTab.slice(1)}Panel`;
      panel.classList.toggle("is-active", isActive);
      panel.hidden = !isActive;
    });

    if (options.scrollToTop) {
      requestAnimationFrame(() => {
        window.scrollTo({ top: 0, behavior: "auto" });
      });
    } else if (options.scrollToTabs) {
      scrollToWorldTabs();
    }
  }


  function renderWorldCharacters(world, characters) {
    const query = state.characterSearch;
    const filteredCharacters = characters.filter(character => characterMatchesQuery(character, query));

    elements.worldCharacterCount.textContent = `${characters.length}`;
    renderSearchMeta(elements.worldCharacterResultMeta, filteredCharacters.length, characters.length, query, "명");
    elements.worldCharacterGrid.innerHTML = "";

    if (filteredCharacters.length === 0) {
      elements.worldCharacterGrid.innerHTML = `<div class="empty-state">조건에 맞는 캐릭터가 없습니다.</div>`;
      return;
    }

    const fragment = document.createDocumentFragment();
    filteredCharacters.forEach(character => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "character-card";
      card.dataset.characterId = getCharacterStoryId(character);
      card.dataset.worldId = world.code;
      card.style.setProperty("--character-accent", characterThemeColor(character));

      const imageWrap = document.createElement("div");
      imageWrap.className = "character-card-image";
      const image = makeImage(imagePath(character, "thumb.webp"), `${character.name || ""} 썸네일`, card);
      imageWrap.appendChild(image);

      const body = document.createElement("div");
      body.className = "character-card-body";

      const koreanName = character.name || "이름 없음";
      const englishName = character.en || "";
      body.innerHTML = `
        <h3>
          <span class="character-color-dot" aria-hidden="true"></span>
          <span class="character-name-line">
            <span class="character-name-ko">${escapeHtml(koreanName)}</span>
            ${englishName ? `<span class="character-name-en"> · ${escapeHtml(englishName)}</span>` : ""}
          </span>
        </h3>
        <p class="character-card-race">${escapeHtml(basicInfo(character, "race", "종족 미등록"))}</p>
      `;

      card.append(imageWrap, body);
      fragment.appendChild(card);
    });

    elements.worldCharacterGrid.appendChild(fragment);
  }

  function renderWorldInfo(world, characters, stories, worldEpisodes) {
    if (!elements.worldInfoGrid) return;

    elements.worldInfoGrid.innerHTML = `
      <article class="world-info-card">
        <span>세계</span>
        <strong>${escapeHtml(world.name || "이름 없음")}</strong>
        <p>${escapeHtml(world.description || "세계 설명이 없습니다.")}</p>
      </article>
      <article class="world-info-card">
        <span>장르</span>
        <strong>${escapeHtml(world.coreGenre || "장르 미등록")}</strong>
        <p>이 세계의 기본 분위기와 탐색 기준입니다.</p>
      </article>
      <article class="world-info-card">
        <span>기록</span>
        <strong>캐릭터 ${characters.length}명 · 소설 ${stories.length}편</strong>
        <p>세계 단위 에피소드 ${worldEpisodes}편이 포함되어 있습니다.</p>
      </article>
    `;
  }

  function buildStoryGroups(stories) {
    const groups = new Map();

    stories.forEach(story => {
      const isSeries = story?.scope === "world" || story?.type === "world-story" || story?.seriesName;
      const key = isSeries
        ? `series:${text(story.seriesId, "world")}:${text(story.seasonId, "season")}`
        : `type:${text(story.type, "story")}`;

      if (!groups.has(key)) {
        groups.set(key, {
          key,
          title: isSeries
            ? `${text(story.seriesName, "세계 소설")} · ${text(story.seasonName, "시즌")}`
            : text(story.typeName, "소설"),
          description: isSeries
            ? "세계 단위로 이어지는 에피소드입니다."
            : "캐릭터별로 연결된 단편 기록입니다.",
          order: isSeries ? 0 : 20,
          stories: [],
          characterLabels: []
        });
      }

      const group = groups.get(key);
      group.stories.push(story);
      group.characterLabels = uniqueLabels([...group.characterLabels, ...storyCharacterLabels(story)]);
    });

    return Array.from(groups.values())
      .map(group => ({ ...group, stories: group.stories.sort(compareStories) }))
      .sort((first, second) => {
        if (first.order !== second.order) return first.order - second.order;
        return first.title.localeCompare(second.title, "ko");
      });
  }

  function filterStoryGroups(groups, query) {
    const needle = normalizeSearch(query);
    if (!needle) {
      return groups.map(group => ({
        ...group,
        visibleStories: group.stories,
        matchCount: group.stories.length,
        isGroupMatch: false
      }));
    }

    return groups.map(group => {
      const matchedStories = group.stories.filter(story => storyMatchesQuery(story, query));
      const isGroupMatch = storyGroupMatchesQuery(group, query);
      if (!isGroupMatch && matchedStories.length === 0) return null;

      const visibleStories = matchedStories.length > 0 ? matchedStories : group.stories;
      return {
        ...group,
        visibleStories,
        matchCount: matchedStories.length,
        isGroupMatch
      };
    }).filter(Boolean);
  }


  function renderWorldStories(world, stories) {
    const query = state.storySearch;
    const groups = buildStoryGroups(stories);
    const filteredGroups = filterStoryGroups(groups, query);
    const visibleStoryCount = filteredGroups.reduce((sum, group) => sum + group.matchCount, 0);

    elements.worldStoryCount.textContent = `${stories.length}`;
    elements.worldStoryResultMeta.textContent = query
      ? `검색 결과 ${filteredGroups.length}묶음 · ${visibleStoryCount}편 / 전체 ${stories.length}편`
      : `전체 ${groups.length}묶음 · ${stories.length}편`;
    elements.worldStoryGroups.innerHTML = "";

    if (filteredGroups.length === 0) {
      elements.worldStoryGroups.innerHTML = `<div class="empty-state">조건에 맞는 소설 묶음이 없습니다.</div>`;
      return;
    }

    const fragment = document.createDocumentFragment();
    filteredGroups.forEach(group => {
      const details = document.createElement("details");
      details.className = "story-group";
      details.dataset.storyGroupKey = group.key;
      details.open = isStoryGroupOpen(world.code, group.key);
      details.addEventListener("toggle", () => {
        setStoryGroupOpen(world.code, group.key, details.open);
      });

      const countText = query
        ? (group.matchCount > 0 ? `${group.matchCount}편 검색됨 · 전체 ${group.stories.length}편` : `관련 묶음 · 전체 ${group.stories.length}편`)
        : `${group.stories.length}편`;

      details.innerHTML = `
        <summary class="story-group-head">
          <span>
            <h3>${escapeHtml(group.title)}</h3>
            <p>${escapeHtml(group.description)} · ${countText}</p>
          </span>
          <span class="story-group-toggle">접기</span>
        </summary>
      `;

      group.visibleStories.forEach(story => {
        details.appendChild(createStoryButton(story, world.code));
      });

      fragment.appendChild(details);
    });

    elements.worldStoryGroups.appendChild(fragment);
  }


  function createStoryButton(story, worldId) {
    const button = document.createElement("button");

    button.type = "button";
    button.className = "story-item";
    button.dataset.storyId = story.id;
    button.dataset.worldId = worldId || story.worldId || "";

    const typeLabel = story.seriesName
      ? [story.seriesName, story.seasonName].filter(Boolean).join(" · ")
      : (story.typeName || story.seasonName || "소설");

    button.innerHTML = `
      <span class="story-type-pill">${escapeHtml(typeLabel)}</span>
      <h4>${escapeHtml(story.title || "제목 없음")}</h4>
      <p>${escapeHtml(story.summary || story.file || "")}</p>
    `;
    return button;
  }

  function renderCharacterDetail(worldId, characterId) {
    const world = findWorld(worldId);
    const character = findCharacter(characterId);
    if (!world || !character) {
      navigateWorlds(true);
      return;
    }

    state.view = "character";
    state.worldId = world.code;
    state.characterId = getCharacterStoryId(character);
    state.storyId = "";
    state.characterTab = "info";

    setTopbar({ title: character.name || "캐릭터", kicker: world.name, backVisible: true, homeVisible: true, worldId: world.code });
    setScreen("characterDetailScreen");

    const accent = characterThemeColor(character);
    elements.characterDetailCard?.style.setProperty("--character-accent", accent);
    elements.characterDetailImageWrap.classList.remove("is-missing", "is-wide", "is-tall");
    elements.characterDetailImage.onload = () => {
      const ratio = elements.characterDetailImage.naturalWidth / Math.max(1, elements.characterDetailImage.naturalHeight);
      elements.characterDetailImageWrap.classList.toggle("is-wide", ratio > 1.16);
      elements.characterDetailImageWrap.classList.toggle("is-tall", ratio <= 1.16);
    };
    elements.characterDetailImage.onerror = () => {
      elements.characterDetailImageWrap.classList.add("is-missing");
      elements.characterDetailImage.removeAttribute("src");
    };
    elements.characterDetailImage.alt = `${character.name || ""} 기본 일러스트`;
    elements.characterDetailImage.src = imagePath(character, "main.webp");

    elements.characterDetailKicker.textContent = "CHARACTER RECORD";
    elements.characterDetailTitle.textContent = character.name || "이름 없음";
    elements.characterDetailEn.textContent = character.en || "";
    elements.characterDetailIntro.textContent = character.profile?.shortIntro || "";
    elements.characterDetailQuote.textContent = character.profile?.quote || "";

    renderCharacterMeta(character, world);
    renderCharacterInfo(world, character);
    renderCharacterStatus(character);
    renderCharacterImages(character);
    renderCharacterTabs();
    setCharacterTab(state.characterTab || "info", { scrollToTop: false });
  }

  function renderCharacterMeta(character, world) {
    if (!elements.characterDetailMeta) return;
    const items = [
      basicInfo(character, "race", ""),
      basicInfo(character, "job", ""),
      world?.name || basicInfo(character, "world", "")
    ].filter(value => text(value) && text(value) !== "미등록");

    elements.characterDetailMeta.innerHTML = "";
    items.slice(0, 4).forEach(value => {
      const pill = document.createElement("span");
      pill.className = "character-meta-pill";
      pill.textContent = value;
      elements.characterDetailMeta.appendChild(pill);
    });
  }

  function renderProfileGrid(target, fields) {
    if (!target) return;
    target.innerHTML = "";
    const fragment = document.createDocumentFragment();

    fields.forEach(([label, value]) => {
      const normalized = text(value, "미등록");
      if (!normalized) return;
      const row = document.createElement("div");
      row.innerHTML = `<dt>${escapeHtml(label)}</dt><dd>${escapeHtml(normalized)}</dd>`;
      fragment.appendChild(row);
    });

    target.appendChild(fragment);
  }

  function identityStoriesForCharacter(character, world) {
    return storiesForCharacter(character)
      .filter(story => story.worldId === world.code)
      .filter(story => story?.type === "identity-short" || text(story?.typeName).includes("정체성"));
  }

  function renderCharacterInfo(world, character) {
    const fields = [
      ["성별", basicInfo(character, "gender")],
      ["나이", basicInfo(character, "age")],
      ["장르", basicInfo(character, "genre")],
      ["성격", basicInfo(character, "personality")],
      ["능력", basicInfo(character, "ability")],
      ["무기", basicInfo(character, "weapon")],
      ["키", basicInfo(character, "height")],
      ["체중", basicInfo(character, "weight")]
    ];

    if (state.privateMode) {
      fields.push(["쓰리사이즈", basicInfo(character, "measurements")]);
    }

    renderProfileGrid(elements.characterInfoGrid, fields);
    renderCharacterIdentityStories(world, character);
  }

  function renderCharacterIdentityStories(world, character) {
    const stories = identityStoriesForCharacter(character, world);
    elements.characterIdentityStoryList.innerHTML = "";

    if (stories.length === 0) {
      elements.characterIdentityStoryList.innerHTML = `<div class="empty-state compact-empty">연결된 정체성 단편이 없습니다.</div>`;
      return;
    }

    stories.forEach(story => {
      const button = createStoryButton(story, world.code);
      button.dataset.returnTo = "character";
      button.dataset.returnHash = `#/world/${encodeURIComponent(world.code)}/character/${encodeURIComponent(getCharacterStoryId(character))}`;
      elements.characterIdentityStoryList.appendChild(button);
    });
  }

  function createAutoStats(character) {
    const random = seededRandom(hashString(`${character?.name || ""}:${character?.en || ""}`));
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
      riskPeak: `${percent(20, 96)}%`,
      play0: `${count(0, 100)} 회`,
      play1: `${count(0, 150)} 회`,
      play2: `${count(100, 300)} 회`,
      play3: `${count(1, 30)} 회`,
      play4: `${count(0, 20)} 회`,
      play5: `${count(0, 20)} 회`,
      play6: `${count(50, 150)} 회`,
      play7: `${count(0, 100)} 회`,
      body: {
        chest: percent(),
        nipple: percent(),
        vagina: percent(),
        anus: percent(),
        womb: percent()
      },
      parameters: {
        desire: value(50, 100),
        sensitive: value(50, 100),
        pleasure: value(50, 100),
        chastity: value(50, 100),
        allure: value(50, 100),
        obedience: value(50, 100),
        deviance: value(50, 100),
        mental: value(20, 70)
      }
    };
  }

  function statusRows(rows) {
    return rows.map(([label, value]) => `
      <div class="status-row"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>
    `).join("");
  }

  function statusBarRows(rows) {
    return rows.map(([label, value]) => {
      const percentValue = clampNumber(Number(value) || 0, 0, 100);
      return `
        <div class="status-bar-row">
          <span>${escapeHtml(label)}</span>
          <div class="status-bar-track"><i style="width: ${percentValue}%"></i></div>
          <strong>${escapeHtml(value)}%</strong>
        </div>
      `;
    }).join("");
  }

  function renderCharacterStatus(character) {
    if (!elements.characterStatusGrid) return;

    if (!state.privateMode) {
      elements.characterStatusGrid.innerHTML = "";
      return;
    }

    const stats = createAutoStats(character);
    const pleasurePercent = clampNumber(Math.round(stats.currentPleasure / 999 * 100), 0, 100);

    elements.characterStatusGrid.innerHTML = `
      <section class="status-card status-head-card">
        <div>
          <p class="section-kicker">H STATUS</p>
        </div>
        <div class="status-level"><strong>${escapeHtml(stats.hLevel)}</strong><span>/100</span></div>
        <div class="status-row-grid">
          ${statusRows([
            ["성적 매력", stats.charm],
            ["민감도", stats.sensitivity],
            ["정조 개방", stats.openness],
            ["쾌락 한계", stats.pleasureLimit],
            ["방어 내성", stats.defense],
            ["피로 한계", stats.stamina]
          ])}
        </div>
        <div class="pleasure-line">
          <span>현재 쾌감</span>
          <div class="status-bar-track"><i style="width: ${pleasurePercent}%"></i></div>
          <strong>${escapeHtml(stats.currentPleasure)} / 999</strong>
        </div>
      </section>

      <section class="status-card">
        <h3>행위 기록</h3>
        <div class="status-row-grid">
          ${statusRows([
            ["정상위", stats.act0],
            ["후배위", stats.act1],
            ["측위", stats.act2],
            ["자위", stats.act3],
            ["구강", stats.act4],
            ["항문", stats.act5],
            ["기타", stats.act6],
            ["총 횟수", stats.actTotal]
          ])}
        </div>
        <div class="status-row-grid compact-status-grid">
          ${statusRows([
            ["절정 도달 총 횟수", stats.climaxTotal],
            ["연속 절정 최고 기록", stats.climaxChain],
            ["절정까지 최단 시간", stats.climaxTime],
            ["임신 가능성", stats.riskPeak]
          ])}
        </div>
      </section>

      <section class="status-card">
        <h3>플레이 기록</h3>
        <div class="status-row-grid">
          ${statusRows([
            ["전투 패배 횟수", stats.play0],
            ["기절 횟수", stats.play1],
            ["노출 당한 횟수", stats.play2],
            ["임신 횟수", stats.play3],
            ["중출 횟수", stats.play4],
            ["낙태 횟수", stats.play5],
            ["속박 당한 횟수", stats.play6],
            ["조교 완료 횟수", stats.play7]
          ])}
        </div>
      </section>

      <section class="status-card">
        <h3>신체민감도</h3>
        ${statusBarRows([
          ["가슴", stats.body.chest],
          ["유두", stats.body.nipple],
          ["질", stats.body.vagina],
          ["항문", stats.body.anus],
          ["자궁", stats.body.womb]
        ])}
      </section>

      <section class="status-card">
        <h3>H PARAMETER</h3>
        ${statusBarRows([
          ["성욕", stats.parameters.desire],
          ["민감", stats.parameters.sensitive],
          ["쾌감", stats.parameters.pleasure],
          ["정조", stats.parameters.chastity],
          ["매혹", stats.parameters.allure],
          ["복종", stats.parameters.obedience],
          ["변태성", stats.parameters.deviance],
          ["정신 저항", stats.parameters.mental]
        ])}
      </section>
    `;
  }

  function getCharacterAlbumItems(character) {
    const folder = getCharacterFolder(character);
    const albumItems = (Array.isArray(character.albumKeys) ? character.albumKeys : [])
      .map(key => albumKeyDefinitions[key])
      .filter(Boolean)
      .filter(item => state.privateMode || item.visibility !== "restricted");

    return [
      ...baseCharacterImageDefinitions,
      ...albumItems
    ].map(item => ({
      ...item,
      source: `assets/characters/${folder}/${item.fileName}`
    }));
  }

  function getExpectedImageFilesForCharacter(character) {
    const files = new Set(["thumb.webp"]);

    baseCharacterImageDefinitions.forEach(definition => {
      if (definition?.fileName) files.add(definition.fileName);
    });

    (Array.isArray(character?.albumKeys) ? character.albumKeys : []).forEach(key => {
      const definition = albumKeyDefinitions[key];
      if (definition?.fileName) files.add(definition.fileName);
    });

    return [...files].sort((first, second) => first.localeCompare(second, "ko"));
  }

  function checkImageFile(source, timeout = 7000) {
    return new Promise(resolve => {
      const image = new Image();
      const timer = window.setTimeout(() => {
        cleanup();
        resolve(false);
      }, timeout);

      function cleanup() {
        window.clearTimeout(timer);
        image.onload = null;
        image.onerror = null;
      }

      image.onload = () => {
        cleanup();
        resolve(true);
      };

      image.onerror = () => {
        cleanup();
        resolve(false);
      };

      image.src = source;
    });
  }

  function openAssetCheckModal() {
    if (!elements.assetCheckModal) return;
    elements.assetCheckModal.hidden = false;
    elements.assetCheckClose?.focus();
  }

  function closeAssetCheckModal() {
    if (!elements.assetCheckModal) return;
    elements.assetCheckModal.hidden = true;
    elements.privateImageCheckButton?.focus();
  }

  function renderAssetCheckProgress(message) {
    if (!elements.assetCheckBody) return;
    elements.assetCheckBody.innerHTML = `<p>${escapeHtml(message)}</p>`;
  }

  function renderAssetCheckResult(result) {
    if (!elements.assetCheckBody) return;
    const missingRows = result.missing.map(item => `
      <li><b>${escapeHtml(item.characterName)}</b>: ${item.files.map(fileName => escapeHtml(fileName)).join(", ")}</li>
    `).join("");

    elements.assetCheckBody.innerHTML = `
      <div class="asset-check-summary">
        <div class="asset-check-summary-card"><strong>${result.characterCount}</strong><span>캐릭터</span></div>
        <div class="asset-check-summary-card"><strong>${result.checkedFileCount}</strong><span>확인 파일</span></div>
        <div class="asset-check-summary-card"><strong>${result.missingFileCount}</strong><span>누락</span></div>
      </div>
      ${result.missing.length
        ? `<h3>이미지 누락</h3><ul>${missingRows}</ul>`
        : `<h3>정상입니다</h3><p>등록된 캐릭터의 기본 WebP 이미지와 albumKeys 이미지가 모두 로드되었습니다.</p>`}
      <h3>검사 범위</h3>
      <p><code>thumb.webp</code>, <code>main.webp</code>, <code>doodle.webp</code>, <code>turn.webp</code>와 characters.js의 <code>albumKeys</code>에 등록된 WebP 파일을 확인합니다.</p>
      <p>정적 브라우저 환경에서는 폴더 안의 미등록 파일 목록을 직접 훑을 수 없으므로, 이 화면은 누락 이미지 확인에 집중합니다.</p>
    `;
  }

  async function runPrivateImageCheck() {
    if (!state.privateMode) return;
    const characters = getCharacters();
    elements.privateImageCheckButton.disabled = true;
    elements.privateImageCheckButton.querySelector("strong").textContent = "검사 중...";
    openAssetCheckModal();
    renderAssetCheckProgress("등록된 캐릭터 이미지 파일을 확인하는 중입니다.");

    const missing = [];
    let checkedFileCount = 0;

    try {
      for (const character of characters) {
        const expectedFiles = getExpectedImageFilesForCharacter(character);
        const missingFiles = [];

        for (const fileName of expectedFiles) {
          checkedFileCount += 1;
          const ok = await checkImageFile(imagePath(character, fileName));
          if (!ok) missingFiles.push(fileName);
        }

        if (missingFiles.length > 0) {
          missing.push({
            characterName: character.name || character.en || getCharacterStoryId(character),
            files: missingFiles
          });
        }
      }

      renderAssetCheckResult({
        characterCount: characters.length,
        checkedFileCount,
        missing,
        missingFileCount: missing.reduce((sum, item) => sum + item.files.length, 0)
      });
    } catch (error) {
      if (elements.assetCheckBody) {
        elements.assetCheckBody.innerHTML = `
          <h3>이미지 검사를 완료하지 못했습니다</h3>
          <p>${escapeHtml(error?.message || "알 수 없는 오류가 발생했습니다.")}</p>
        `;
      }
    } finally {
      elements.privateImageCheckButton.disabled = false;
      elements.privateImageCheckButton.querySelector("strong").textContent = "이미지 검사";
    }
  }

  function renderCharacterImages(character) {
    if (!elements.characterImageGrid) return;
    const items = getCharacterAlbumItems(character);
    state.imageLightboxItems = items.map(item => ({
      ...item,
      characterName: character.name || "캐릭터"
    }));
    elements.characterImageGrid.innerHTML = "";
    if (elements.characterImagesMeta) {
      elements.characterImagesMeta.textContent = `${items.length}`;
    }

    if (items.length === 0) {
      elements.characterImageGrid.innerHTML = `<div class="empty-state compact-empty">표시할 이미지가 없습니다.</div>`;
      return;
    }

    const fragment = document.createDocumentFragment();
    items.forEach((item, index) => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "character-image-card";
      card.dataset.visibility = item.visibility;
      card.dataset.imageIndex = String(index);
      card.innerHTML = `
        <div class="character-image-thumb">
          <img src="${escapeHtml(item.source)}" alt="${escapeHtml(`${character.name || "캐릭터"} ${item.title}`)}" loading="lazy">
        </div>
        <div class="character-image-caption">
          <span>${escapeHtml(item.category || "IMAGE")}</span>
          <strong>${escapeHtml(item.title)}</strong>
        </div>
      `;
      const image = card.querySelector("img");
      image?.addEventListener("error", () => {
        card.classList.add("is-missing");
        image.removeAttribute("src");
      }, { once: true });
      fragment.appendChild(card);
    });

    elements.characterImageGrid.appendChild(fragment);
  }

  function resetImageLightboxTransform() {
    state.imageLightboxScale = 1;
    state.imageLightboxTranslateX = 0;
    state.imageLightboxTranslateY = 0;
    updateImageLightboxTransform();
  }

  function updateImageLightboxTransform() {
    if (!elements.imageLightboxImage) return;
    elements.imageLightboxImage.style.transform = `translate3d(${state.imageLightboxTranslateX}px, ${state.imageLightboxTranslateY}px, 0) scale(${state.imageLightboxScale})`;
    elements.imageLightboxStage?.classList.toggle("is-zoomed", state.imageLightboxScale > 1.01);
  }

  function setImageLightboxZoom(nextScale, originX = 0, originY = 0) {
    const oldScale = state.imageLightboxScale;
    const scale = clampNumber(nextScale, 1, 4);
    if (Math.abs(scale - oldScale) < 0.01) return;

    if (oldScale > 0 && scale > 1) {
      const scaleRatio = scale / oldScale;
      state.imageLightboxTranslateX = originX - (originX - state.imageLightboxTranslateX) * scaleRatio;
      state.imageLightboxTranslateY = originY - (originY - state.imageLightboxTranslateY) * scaleRatio;
    }

    if (scale === 1) {
      state.imageLightboxTranslateX = 0;
      state.imageLightboxTranslateY = 0;
    }

    state.imageLightboxScale = scale;
    updateImageLightboxTransform();
  }

  function openImageLightbox(index) {
    const item = state.imageLightboxItems[index];
    if (!item || !elements.imageLightbox) return;

    state.imageLightboxIndex = index;
    state.imageLightboxPointers.clear();
    state.imageLightboxLastDistance = 0;
    state.imageLightboxPanStart = null;

    elements.imageLightboxTitle.textContent = `${item.characterName || "캐릭터"} · ${item.title || "이미지"}`;
    elements.imageLightboxMeta.textContent = `${item.category || "IMAGE"}${item.visibility === "restricted" ? " · PRIVATE" : ""}`;
    elements.imageLightboxImage.alt = `${item.characterName || "캐릭터"} ${item.title || "이미지"}`;
    elements.imageLightboxImage.src = item.source;
    resetImageLightboxTransform();
    elements.imageLightbox.hidden = false;
    document.body.classList.add("has-lightbox-open");
  }

  function closeImageLightbox() {
    if (!elements.imageLightbox || elements.imageLightbox.hidden) return;
    elements.imageLightbox.hidden = true;
    elements.imageLightboxImage.removeAttribute("src");
    state.imageLightboxIndex = -1;
    state.imageLightboxPointers.clear();
    state.imageLightboxPanStart = null;
    resetImageLightboxTransform();
    document.body.classList.remove("has-lightbox-open");
  }

  function pointerDistance(pointerA, pointerB) {
    const dx = pointerA.clientX - pointerB.clientX;
    const dy = pointerA.clientY - pointerB.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function midpoint(pointerA, pointerB) {
    return {
      x: (pointerA.clientX + pointerB.clientX) / 2,
      y: (pointerA.clientY + pointerB.clientY) / 2
    };
  }

  function handleLightboxPointerDown(event) {
    if (elements.imageLightbox?.hidden) return;
    elements.imageLightboxStage?.setPointerCapture?.(event.pointerId);
    state.imageLightboxPointers.set(event.pointerId, {
      clientX: event.clientX,
      clientY: event.clientY
    });

    if (state.imageLightboxPointers.size === 1 && state.imageLightboxScale > 1.01) {
      state.imageLightboxPanStart = {
        pointerId: event.pointerId,
        clientX: event.clientX,
        clientY: event.clientY,
        translateX: state.imageLightboxTranslateX,
        translateY: state.imageLightboxTranslateY
      };
    }

    if (state.imageLightboxPointers.size === 2) {
      const pointers = Array.from(state.imageLightboxPointers.values());
      state.imageLightboxLastDistance = pointerDistance(pointers[0], pointers[1]);
      state.imageLightboxPanStart = null;
    }
  }

  function handleLightboxPointerMove(event) {
    if (elements.imageLightbox?.hidden || !state.imageLightboxPointers.has(event.pointerId)) return;
    state.imageLightboxPointers.set(event.pointerId, {
      clientX: event.clientX,
      clientY: event.clientY
    });

    if (state.imageLightboxPointers.size >= 2) {
      const pointers = Array.from(state.imageLightboxPointers.values()).slice(0, 2);
      const nextDistance = pointerDistance(pointers[0], pointers[1]);
      if (state.imageLightboxLastDistance > 0) {
        const center = midpoint(pointers[0], pointers[1]);
        const rect = elements.imageLightboxStage.getBoundingClientRect();
        setImageLightboxZoom(
          state.imageLightboxScale * (nextDistance / state.imageLightboxLastDistance),
          center.x - rect.left - rect.width / 2,
          center.y - rect.top - rect.height / 2
        );
      }
      state.imageLightboxLastDistance = nextDistance;
      return;
    }

    if (state.imageLightboxPanStart && state.imageLightboxPanStart.pointerId === event.pointerId && state.imageLightboxScale > 1.01) {
      state.imageLightboxTranslateX = state.imageLightboxPanStart.translateX + event.clientX - state.imageLightboxPanStart.clientX;
      state.imageLightboxTranslateY = state.imageLightboxPanStart.translateY + event.clientY - state.imageLightboxPanStart.clientY;
      updateImageLightboxTransform();
    }
  }

  function handleLightboxPointerEnd(event) {
    state.imageLightboxPointers.delete(event.pointerId);
    if (state.imageLightboxPointers.size < 2) {
      state.imageLightboxLastDistance = 0;
    }
    if (state.imageLightboxPanStart?.pointerId === event.pointerId) {
      state.imageLightboxPanStart = null;
    }
  }

  function handleLightboxWheel(event) {
    if (elements.imageLightbox?.hidden) return;
    event.preventDefault();
    const rect = elements.imageLightboxStage.getBoundingClientRect();
    const originX = event.clientX - rect.left - rect.width / 2;
    const originY = event.clientY - rect.top - rect.height / 2;
    const direction = event.deltaY < 0 ? 1.16 : 0.86;
    setImageLightboxZoom(state.imageLightboxScale * direction, originX, originY);
  }

  function renderCharacterTabs() {
    const tabs = [
      elements.characterTabInfo,
      elements.characterTabStatus,
      elements.characterTabImages
    ];

    tabs.forEach(button => {
      if (!button) return;
      const isAllowed = button.dataset.characterTab !== "status" || state.privateMode;
      button.hidden = !isAllowed;
    });

    if (!state.privateMode && state.characterTab === "status") {
      state.characterTab = "info";
    }
  }

function setCharacterTab(tabName, options = {}) {
    const validTabs = new Set(["info", "images"]);
    if (state.privateMode) validTabs.add("status");
    const nextTab = validTabs.has(tabName) ? tabName : "info";
    state.characterTab = nextTab;

    [
      elements.characterTabInfo,
      elements.characterTabStatus,
      elements.characterTabImages
    ].forEach(button => {
      if (!button) return;
      const isActive = button.dataset.characterTab === nextTab;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-selected", String(isActive));
    });

    [
      elements.characterInfoPanel,
      elements.characterStatusPanel,
      elements.characterImagesPanel
    ].forEach(panel => {
      if (!panel) return;
      panel.hidden = panel.dataset.characterPanel !== nextTab;
    });

    if (options.scrollToTop) {
      requestAnimationFrame(() => {
        const targetTop = Math.max(0, (elements.characterTabBar?.offsetTop || 0) - 86);
        window.scrollTo({ top: targetTop, behavior: "auto" });
      });
    }
  }

function renderStoryReader(worldId, storyId) {
    const world = findWorld(worldId);
    const story = findStory(storyId);
    if (!world || !story) {
      navigateWorlds(true);
      return;
    }

    state.view = "story";
    state.worldId = world.code;
    state.characterId = "";
    state.storyId = story.id;

    setTopbar({ title: "소설", kicker: world.name, backVisible: true, homeVisible: true });
    setScreen("storyReaderScreen");

    elements.storyReaderKicker.textContent = story.typeName || story.seasonName || "STORY";
    elements.storyReaderTitle.textContent = story.title || "제목 없음";
    elements.storyReaderSummary.textContent = story.summary || story.file || "";
    renderStoryRelatedCharacters(story, world.code);
    loadStoryBody(story);
  }

  function renderStoryRelatedCharacters(story, worldId) {
    elements.storyRelatedCharacters.innerHTML = "";
    const ids = Array.isArray(story.relatedCharacterIds) ? story.relatedCharacterIds : [];
    const names = Array.isArray(story.relatedCharacters) ? story.relatedCharacters : [];

    if (ids.length === 0 && names.length === 0 && story.characterId) {
      const character = findCharacter(story.characterId);
      if (character) {
        elements.storyRelatedCharacters.appendChild(createRelatedCharacterChip(character, worldId));
      }
      return;
    }

    ids.forEach((characterId, index) => {
      const character = findCharacter(characterId);
      if (character) {
        elements.storyRelatedCharacters.appendChild(createRelatedCharacterChip(character, worldId));
        return;
      }

      const chip = document.createElement("span");
      chip.className = "related-chip";
      chip.textContent = names[index] || characterId;
      elements.storyRelatedCharacters.appendChild(chip);
    });
  }

  function createRelatedCharacterChip(character, worldId) {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "related-chip";
    chip.dataset.characterId = getCharacterStoryId(character);
    chip.dataset.worldId = worldId;
    chip.textContent = character.name || getCharacterStoryId(character);
    return chip;
  }

  async function loadStoryBody(story) {
    elements.storyReaderBody.innerHTML = `<p class="reader-state">본문을 불러오는 중입니다.</p>`;

    if (!story.file) {
      elements.storyReaderBody.innerHTML = `<p class="reader-state is-error">본문 파일 경로가 없습니다.</p>`;
      return;
    }

    try {
      const response = await fetch(story.file);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const markdown = await response.text();
      elements.storyReaderBody.innerHTML = renderMarkdown(markdown);
    } catch (error) {
      elements.storyReaderBody.innerHTML = `
        <p class="reader-state is-error">본문을 불러오지 못했습니다.</p>
        <p class="reader-state">브라우저에서 파일을 직접 열면 로컬 파일 읽기가 막힐 수 있습니다. 간단한 로컬 서버에서 열면 본문까지 확인할 수 있습니다.</p>
      `;
    }
  }

  function renderMarkdown(markdown) {
    const lines = String(markdown || "").replace(/\r\n/g, "\n").split("\n");
    const blocks = [];
    let paragraph = [];

    function flushParagraph() {
      if (paragraph.length === 0) return;
      blocks.push(`<p>${escapeHtml(paragraph.join(" ")).replaceAll("  ", "<br>")}</p>`);
      paragraph = [];
    }

    lines.forEach(rawLine => {
      const line = rawLine.trim();

      if (!line) {
        flushParagraph();
        return;
      }

      if (/^---+$/.test(line)) {
        flushParagraph();
        blocks.push("<hr>");
        return;
      }

      const heading = line.match(/^(#{1,3})\s+(.+)$/);
      if (heading) {
        flushParagraph();
        const level = Math.min(3, heading[1].length + 1);
        blocks.push(`<h${level}>${escapeHtml(heading[2])}</h${level}>`);
        return;
      }

      if (line.startsWith(">")) {
        flushParagraph();
        blocks.push(`<blockquote>${escapeHtml(line.replace(/^>\s?/, ""))}</blockquote>`);
        return;
      }

      paragraph.push(line);
    });

    flushParagraph();

    return blocks.length ? blocks.join("\n") : `<p class="reader-state">본문이 비어 있습니다.</p>`;
  }


  function getAllCharacters() {
    return Array.isArray(window.CHARACTERS) ? window.CHARACTERS : [];
  }

  function cloneForImport(value) {
    return JSON.parse(JSON.stringify(value ?? null));
  }

  function normalizeImportKey(value = "") {
    return text(value).toLowerCase().replace(/\s+/g, "");
  }

  function getImportCharacterName(character) {
    return text(character?.name);
  }

  function getImportCharacterEn(character) {
    return text(character?.en);
  }

  function getImportCharacterFolder(character) {
    return normalizeId(character?.folder || character?.id || character?.en || character?.name || "");
  }

  function stripFolderNumberForImport(value = "") {
    return text(value).replace(/^\d{1,4}[-_]+/, "");
  }

  function sanitizeImportFolderBase(value = "") {
    const base = stripFolderNumberForImport(value)
      .replace(/\\/g, "/")
      .split("/")
      .filter(Boolean)
      .pop() || "";
    return text(base).replace(/^[.\s-]+|[.\s-]+$/g, "");
  }

  function makeImportFolder(index, folderValue) {
    const base = sanitizeImportFolderBase(folderValue);
    if (!base) return "";
    return `${String(index + 1).padStart(3, "0")}-${base}`;
  }

  function normalizeImportCharacterSchema(character) {
    if (!character || typeof character !== "object") return;
    if (!character.profile || typeof character.profile !== "object") character.profile = {};
    character.profile.shortIntro = text(character.profile.shortIntro);
    character.profile.quote = text(character.profile.quote);
    if (!character.profile.basicInfo || typeof character.profile.basicInfo !== "object") {
      character.profile.basicInfo = {};
    }
    Object.entries(basicInfoDefaults).forEach(([key, fallback]) => {
      character.profile.basicInfo[key] = key === "world"
        ? normalizeWorldDisplayName(character.profile.basicInfo[key] || fallback)
        : text(character.profile.basicInfo[key], fallback);
    });
    if (!Array.isArray(character.albumKeys)) character.albumKeys = [];
    delete character.profile.worldPlacement;
    delete character.detailSettings;
    delete character.authorMemo;
  }

  function makeDefaultImportCharacter(folder) {
    return {
      name: "",
      en: "",
      themeColor: "#56D1B9",
      profile: {
        shortIntro: "",
        quote: "",
        basicInfo: { ...basicInfoDefaults }
      },
      folder,
      albumKeys: []
    };
  }

  function addImportLookup(map, value, index) {
    const normalized = normalizeImportKey(value);
    if (normalized && !map.has(normalized)) map.set(normalized, index);
  }

  function buildImportLookups(characters) {
    const lookups = {
      folder: new Map(),
      folderBase: new Map(),
      name: new Map(),
      en: new Map()
    };
    characters.forEach((character, index) => {
      const folder = getImportCharacterFolder(character);
      addImportLookup(lookups.folder, folder, index);
      addImportLookup(lookups.folderBase, sanitizeImportFolderBase(folder), index);
      addImportLookup(lookups.name, getImportCharacterName(character), index);
      addImportLookup(lookups.en, getImportCharacterEn(character), index);
    });
    return lookups;
  }

  function getImportLookupIndex(map, value) {
    const normalized = normalizeImportKey(value);
    if (!normalized || !map.has(normalized)) return -1;
    return map.get(normalized);
  }

  function getImportRecordValue(record, headerPaths, targetPath) {
    for (const [header, path] of headerPaths.entries()) {
      if (path === targetPath) return text(record[header]);
    }
    return "";
  }

  function resolveImportCharacterIndex(record, headerPaths, lookups) {
    const rawFolder = getImportRecordValue(record, headerPaths, "folder");
    const folderBase = sanitizeImportFolderBase(rawFolder);
    const rawName = getImportRecordValue(record, headerPaths, "name");
    const rawEn = getImportRecordValue(record, headerPaths, "en");

    let index = getImportLookupIndex(lookups.folder, rawFolder);
    if (index >= 0) return index;
    index = getImportLookupIndex(lookups.folderBase, folderBase);
    if (index >= 0) return index;
    index = getImportLookupIndex(lookups.name, rawName);
    if (index >= 0) return index;
    return getImportLookupIndex(lookups.en, rawEn);
  }

  function deriveImportFolderBase(record, headerPaths, character) {
    return sanitizeImportFolderBase(getImportRecordValue(record, headerPaths, "folder"))
      || sanitizeImportFolderBase(getImportRecordValue(record, headerPaths, "en"))
      || sanitizeImportFolderBase(getImportRecordValue(record, headerPaths, "name"))
      || sanitizeImportFolderBase(getImportCharacterFolder(character));
  }

  function characterHeaderToPath(header) {
    const normalized = text(header);
    if (!normalized) return null;
    if (supportedCharacterImportPaths.has(normalized)) return normalized;
    const compact = normalized.replace(/\s+/g, "");
    return characterImportColumnAliases[normalized]
      || characterImportColumnAliases[compact]
      || characterImportColumnAliases[compact.toLowerCase()]
      || null;
  }

  function isRemovedImportColumn(header) {
    const normalized = text(header);
    const compact = normalized.replace(/\s+/g, "");
    return removedCharacterImportColumns.has(normalized)
      || removedCharacterImportColumns.has(compact)
      || removedCharacterImportColumns.has(compact.toLowerCase());
  }

  function parsePrivateBoolean(value) {
    const normalized = text(value).toLowerCase();
    if (["true", "1", "yes", "y", "예", "네", "숨김", "hidden"].includes(normalized)) return true;
    if (["false", "0", "no", "n", "아니오", "아니요", "표시", "visible"].includes(normalized)) return false;
    throw new Error(`유효하지 않은 hidden 값: ${value}`);
  }

  function setImportNestedValue(data, path, rawValue) {
    if (path === "folder" || path === "albumKeys") return;

    if (path === "hidden") {
      if (text(rawValue).toUpperCase() === CLEAR_TOKEN) delete data.hidden;
      else data.hidden = parsePrivateBoolean(rawValue);
      return;
    }

    const keys = path.split(".");
    let target = data;
    keys.slice(0, -1).forEach(key => {
      if (!target[key] || typeof target[key] !== "object") target[key] = {};
      target = target[key];
    });
    const targetKey = keys[keys.length - 1];
    if (path === "profile.basicInfo.world" && text(rawValue).toUpperCase() !== CLEAR_TOKEN) {
      target[targetKey] = normalizeWorldDisplayName(rawValue);
      return;
    }
    target[targetKey] = text(rawValue).toUpperCase() === CLEAR_TOKEN ? "" : rawValue;
  }

  function rowsToPrivateRecords(rows) {
    const headerIndex = rows.findIndex(row => row.some(cell => text(cell)));
    if (headerIndex < 0) throw new Error("엑셀에서 헤더 행을 찾지 못했습니다.");

    const headers = rows[headerIndex].map(cell => text(cell));
    if (!headers.some(Boolean)) throw new Error("엑셀 헤더가 비어 있습니다.");

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

  function findDuplicateImportValues(items, getter) {
    const seen = new Map();
    const duplicates = new Set();
    items.forEach(item => {
      const value = text(getter(item));
      const normalized = normalizeImportKey(value);
      if (!normalized) return;
      if (seen.has(normalized)) duplicates.add(value);
      else seen.set(normalized, item);
    });
    return Array.from(duplicates);
  }

  function buildPrivateCharactersText(characters) {
    const comment = [
      "// Character data only. Add/edit characters here, then refresh world.html.",
      "// Base image paths are generated automatically from folder as:",
      "// assets/characters/<folder>/main.webp, thumb.webp, doodle.webp, turn.webp",
      "// Optional album slots are generated by the private Excel+ZIP importer from image file names.",
      "// profile.basicInfo.world stores the character's 소속세계 from story-taxonomy.js.",
      "// Set hidden: true to keep a template character out of the list.",
      ""
    ].join("\n");
    return `${comment}window.CHARACTERS = ${JSON.stringify(characters, null, 2)};\n`;
  }

  function setPrivateStatus(message, tone = "muted") {
    if (!elements.privateImportStatus) return;
    elements.privateImportStatus.textContent = message;
    elements.privateImportStatus.dataset.tone = tone;
  }

  function resetPrivateImportPreview(message = "엑셀과 이미지 ZIP을 선택해 주세요.") {
    plannedPrivateCharacterImport = null;
    if (elements.privateImportDownloadButton) elements.privateImportDownloadButton.disabled = true;
    if (elements.privateImportSummary) elements.privateImportSummary.innerHTML = "";
    if (elements.privateImportResults) elements.privateImportResults.innerHTML = "";
    setPrivateStatus(message, "muted");
  }

  function renderPrivateSummary(plan) {
    if (!elements.privateImportSummary) return;
    elements.privateImportSummary.innerHTML = `
      <div class="private-summary-card"><strong>${plan.addedCount}</strong><span>신규</span></div>
      <div class="private-summary-card"><strong>${plan.updatedCount}</strong><span>수정</span></div>
      <div class="private-summary-card"><strong>${plan.changedFieldCount}</strong><span>필드 변경</span></div>
      <div class="private-summary-card"><strong>${plan.failedCount}</strong><span>오류</span></div>
    `;
  }

  function renderPrivateResults(plan) {
    if (!elements.privateImportResults) return;
    const rows = [
      ...plan.results.slice(0, MAX_PRIVATE_PREVIEW_ROWS),
      ...plan.warnings.slice(0, 24).map(warning => ({
        ok: true,
        status: "주의",
        main: "주의 항목",
        detail: warning
      }))
    ];

    elements.privateImportResults.innerHTML = rows.length
      ? rows.map(result => `
          <div class="private-result-row" data-ok="${result.ok !== false}">
            <div class="private-result-main">
              <span class="private-result-badge">${escapeHtml(result.status || "정보")}</span>
              <span>${escapeHtml(result.main || result.source || "")}</span>
            </div>
            <div class="private-result-detail">${escapeHtml(result.detail || "")}</div>
          </div>
        `).join("")
      : `<div class="empty-state">표시할 결과가 없습니다.</div>`;
  }

  function renderPrivateImportPreview(plan) {
    renderPrivateSummary(plan);
    renderPrivateResults(plan);
    if (elements.privateImportDownloadButton) {
      elements.privateImportDownloadButton.disabled = plan.failedCount > 0;
    }
  }

  function updatePrivateModeUi() {
    document.body.classList.toggle("private-mode", state.privateMode);

    if (elements.topTitle) {
      const existingMark = elements.topTitle.querySelector(".private-mode-mark");
      if (existingMark) existingMark.remove();
      if (state.privateMode && state.view === "worlds") {
        const mark = document.createElement("span");
        mark.className = "private-mode-mark";
        mark.setAttribute("aria-hidden", "true");
        elements.topTitle.appendChild(mark);
      }
    }

    if (elements.privateToolShell) {
      const shouldShow = state.privateMode && state.view === "worlds";
      elements.privateToolShell.hidden = !shouldShow;
      if (!shouldShow) state.privateToolOpen = false;
    }

    if (elements.privateImageCheckShell) {
      elements.privateImageCheckShell.hidden = !(state.privateMode && state.view === "worlds");
    }

    if (elements.privateToolPanel) {
      elements.privateToolPanel.hidden = !state.privateToolOpen;
    }

    if (elements.privateToolToggle) {
      elements.privateToolToggle.setAttribute("aria-expanded", String(state.privateToolOpen));
    }
  }

  function togglePrivateMode() {
    state.privateMode = !state.privateMode;
    state.privateToolOpen = false;
    resetPrivateImportPreview(state.privateMode ? "프라이빗모드입니다. 엑셀과 이미지 ZIP을 선택해 주세요." : "엑셀과 이미지 ZIP을 선택해 주세요.");
    updatePrivateModeUi();
  }

  function handlePrivateTitleTap() {
    if (state.view !== "worlds") return;

    window.clearTimeout(state.privateTapTimer);
    state.privateTapCount += 1;

    if (state.privateTapCount >= PRIVATE_TAP_TARGET) {
      state.privateTapCount = 0;
      togglePrivateMode();
      return;
    }

    state.privateTapTimer = window.setTimeout(() => {
      state.privateTapCount = 0;
    }, 1500);
  }

  function togglePrivateToolPanel() {
    if (!state.privateMode) return;
    state.privateToolOpen = !state.privateToolOpen;
    updatePrivateModeUi();
  }

  function readPrivateFileAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.addEventListener("load", () => resolve(reader.result));
      reader.addEventListener("error", () => reject(reader.error || new Error("파일을 읽지 못했습니다.")));
      reader.readAsArrayBuffer(file);
    });
  }

  function privateUint16(view, offset) {
    return view.getUint16(offset, true);
  }

  function privateUint32(view, offset) {
    return view.getUint32(offset, true);
  }

  async function privateInflateRaw(data) {
    if (typeof DecompressionStream !== "function") {
      throw new Error("이 브라우저는 압축된 XLSX 해제를 지원하지 않습니다. 최신 Chrome/Edge에서 다시 시도해 주세요.");
    }
    const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }

  function findPrivateZipEnd(bytes, view) {
    const minOffset = Math.max(0, bytes.length - 0xFFFF - 22);
    for (let offset = bytes.length - 22; offset >= minOffset; offset -= 1) {
      if (privateUint32(view, offset) === 0x06054b50) return offset;
    }
    throw new Error("ZIP 중앙 디렉터리를 찾지 못했습니다.");
  }

  function readPrivateZipNames(arrayBuffer) {
    const bytes = new Uint8Array(arrayBuffer);
    const view = new DataView(arrayBuffer);
    const decoder = new TextDecoder("utf-8");
    const eocdOffset = findPrivateZipEnd(bytes, view);
    const entryCount = privateUint16(view, eocdOffset + 10);
    const centralDirectoryOffset = privateUint32(view, eocdOffset + 16);
    const names = [];

    let cursor = centralDirectoryOffset;
    for (let index = 0; index < entryCount; index += 1) {
      if (privateUint32(view, cursor) !== 0x02014b50) {
        throw new Error("ZIP 중앙 디렉터리 항목을 읽지 못했습니다.");
      }

      const fileNameLength = privateUint16(view, cursor + 28);
      const extraLength = privateUint16(view, cursor + 30);
      const commentLength = privateUint16(view, cursor + 32);
      const fileName = decoder.decode(bytes.slice(cursor + 46, cursor + 46 + fileNameLength));
      cursor += 46 + fileNameLength + extraLength + commentLength;

      if (!fileName.endsWith("/")) names.push(fileName);
    }

    return names;
  }

  async function readPrivateZipTextEntries(arrayBuffer, shouldInclude) {
    const bytes = new Uint8Array(arrayBuffer);
    const view = new DataView(arrayBuffer);
    const decoder = new TextDecoder("utf-8");
    const eocdOffset = findPrivateZipEnd(bytes, view);
    const entryCount = privateUint16(view, eocdOffset + 10);
    const centralDirectoryOffset = privateUint32(view, eocdOffset + 16);
    const entries = [];

    let cursor = centralDirectoryOffset;
    for (let index = 0; index < entryCount; index += 1) {
      if (privateUint32(view, cursor) !== 0x02014b50) {
        throw new Error("ZIP 중앙 디렉터리 항목을 읽지 못했습니다.");
      }

      const method = privateUint16(view, cursor + 10);
      const compressedSize = privateUint32(view, cursor + 20);
      const fileNameLength = privateUint16(view, cursor + 28);
      const extraLength = privateUint16(view, cursor + 30);
      const commentLength = privateUint16(view, cursor + 32);
      const localHeaderOffset = privateUint32(view, cursor + 42);
      const fileName = decoder.decode(bytes.slice(cursor + 46, cursor + 46 + fileNameLength));

      cursor += 46 + fileNameLength + extraLength + commentLength;
      if (fileName.endsWith("/") || !shouldInclude(fileName)) continue;

      if (privateUint32(view, localHeaderOffset) !== 0x04034b50) {
        throw new Error(`${fileName}: ZIP 로컬 헤더를 읽지 못했습니다.`);
      }

      const localFileNameLength = privateUint16(view, localHeaderOffset + 26);
      const localExtraLength = privateUint16(view, localHeaderOffset + 28);
      const dataStart = localHeaderOffset + 30 + localFileNameLength + localExtraLength;
      const compressedData = bytes.slice(dataStart, dataStart + compressedSize);
      let fileBytes;

      if (method === 0) {
        fileBytes = compressedData;
      } else if (method === 8) {
        fileBytes = await privateInflateRaw(compressedData);
      } else {
        throw new Error(`${fileName}: 지원하지 않는 ZIP 압축 방식입니다. method=${method}`);
      }

      entries.push({ path: fileName, text: decoder.decode(fileBytes) });
    }

    return entries;
  }

  function parsePrivateXml(textValue, label) {
    const xml = new DOMParser().parseFromString(textValue, "application/xml");
    const parserError = xml.getElementsByTagName("parsererror")[0];
    if (parserError) throw new Error(`${label} XML을 읽지 못했습니다.`);
    return xml;
  }

  function privateXmlChildrenByName(node, localName) {
    return Array.from(node.children || []).filter(child => child.localName === localName);
  }

  function privateColumnToIndex(cellRef) {
    const letters = String(cellRef ?? "").toUpperCase().replace(/[^A-Z]/g, "");
    let index = 0;
    for (const letter of letters) {
      index = index * 26 + (letter.charCodeAt(0) - 64);
    }
    return Math.max(0, index - 1);
  }

  function privateNodeText(node) {
    return node ? String(node.textContent ?? "").trim() : "";
  }

  function resolvePrivateWorksheetPath(entryMap) {
    if (entryMap.has("xl/worksheets/sheet1.xml")) return "xl/worksheets/sheet1.xml";

    const workbookText = entryMap.get("xl/workbook.xml");
    const relsText = entryMap.get("xl/_rels/workbook.xml.rels");
    if (!workbookText || !relsText) throw new Error("엑셀 workbook 정보를 찾지 못했습니다.");

    const workbook = parsePrivateXml(workbookText, "workbook.xml");
    const firstSheet = workbook.getElementsByTagNameNS("*", "sheet")[0];
    const relId = firstSheet?.getAttribute("r:id")
      || firstSheet?.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships", "id");
    if (!relId) throw new Error("엑셀 첫 번째 시트의 관계 ID를 찾지 못했습니다.");

    const rels = parsePrivateXml(relsText, "workbook.xml.rels");
    const relation = Array.from(rels.getElementsByTagNameNS("*", "Relationship"))
      .find(item => item.getAttribute("Id") === relId);
    const target = relation?.getAttribute("Target");
    if (!target) throw new Error("엑셀 첫 번째 시트 경로를 찾지 못했습니다.");

    if (target.startsWith("/")) return target.slice(1);
    return `xl/${target.replace(/^\/+/, "")}`;
  }

  async function readFirstPrivateXlsxRows(arrayBuffer) {
    const xmlEntries = await readPrivateZipTextEntries(
      arrayBuffer,
      fileName => fileName.toLowerCase().endsWith(".xml") || fileName.toLowerCase().endsWith(".rels")
    );
    const entryMap = new Map(xmlEntries.map(entry => [entry.path, entry.text]));

    const sharedStrings = [];
    if (entryMap.has("xl/sharedStrings.xml")) {
      const sharedXml = parsePrivateXml(entryMap.get("xl/sharedStrings.xml"), "sharedStrings.xml");
      Array.from(sharedXml.getElementsByTagNameNS("*", "si")).forEach(si => {
        sharedStrings.push(Array.from(si.getElementsByTagNameNS("*", "t")).map(node => node.textContent || "").join(""));
      });
    }

    const sheetPath = resolvePrivateWorksheetPath(entryMap);
    const sheetText = entryMap.get(sheetPath);
    if (!sheetText) throw new Error(`엑셀 시트 파일을 찾지 못했습니다: ${sheetPath}`);

    const sheetXml = parsePrivateXml(sheetText, sheetPath);
    const rows = [];

    Array.from(sheetXml.getElementsByTagNameNS("*", "row")).forEach(rowNode => {
      const values = new Map();
      let maxCol = -1;

      privateXmlChildrenByName(rowNode, "c").forEach(cellNode => {
        const ref = cellNode.getAttribute("r") || "";
        const colIndex = privateColumnToIndex(ref);
        maxCol = Math.max(maxCol, colIndex);

        const cellType = cellNode.getAttribute("t");
        let rawValue = "";

        if (cellType === "inlineStr") {
          const inlineNode = privateXmlChildrenByName(cellNode, "is")[0];
          rawValue = inlineNode ? Array.from(inlineNode.getElementsByTagNameNS("*", "t")).map(node => node.textContent || "").join("") : "";
        } else {
          rawValue = privateNodeText(privateXmlChildrenByName(cellNode, "v")[0]);
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

  function extractPrivateCharacterZipInfo(path) {
    const parts = String(path ?? "").replace(/\\/g, "/").split("/").filter(Boolean);
    const fileName = (parts.pop() || "").trim();
    if (!fileName.toLowerCase().endsWith(".webp") || parts.length === 0) return null;

    const charactersIndex = parts.lastIndexOf("characters");
    const folder = charactersIndex >= 0 ? parts[charactersIndex + 1] : parts[parts.length - 1];
    if (!folder || folder === "assets") return null;

    return {
      folder: normalizeId(folder),
      folderBase: sanitizeImportFolderBase(folder),
      fileName,
      normalizedFileName: fileName.toLowerCase()
    };
  }

  function buildAlbumMapFromZipNames(fileNames) {
    const map = new Map();
    const folderFiles = new Map();
    const unknownAlbumFiles = [];

    fileNames.forEach(fileName => {
      const info = extractPrivateCharacterZipInfo(fileName);
      if (!info) return;

      if (!folderFiles.has(info.folder)) folderFiles.set(info.folder, new Set());
      folderFiles.get(info.folder).add(info.normalizedFileName);
    });

    folderFiles.forEach((files, folder) => {
      const keys = [];
      files.forEach(fileName => {
        if (baseImageFiles.has(fileName)) return;
        const key = albumFileToKey[fileName];
        if (key) keys.push(key);
        else unknownAlbumFiles.push(`${folder}/${fileName}`);
      });

      const uniqueSorted = Array.from(new Set(keys))
        .sort((a, b) => {
          const aIndex = albumKeyOrder.indexOf(a);
          const bIndex = albumKeyOrder.indexOf(b);
          return (aIndex === -1 ? Number.MAX_SAFE_INTEGER : aIndex)
            - (bIndex === -1 ? Number.MAX_SAFE_INTEGER : bIndex);
        });
      map.set(folder, uniqueSorted);
      map.set(sanitizeImportFolderBase(folder), uniqueSorted);
    });

    return { map, folderCount: folderFiles.size, unknownAlbumFiles };
  }

  function applyZipAlbumKeys(character, albumMap, warnings) {
    const folder = getImportCharacterFolder(character);
    const folderBase = sanitizeImportFolderBase(folder);
    const albumKeys = albumMap.get(folder) || albumMap.get(folderBase);
    if (albumKeys) {
      character.albumKeys = albumKeys;
      return true;
    }
    warnings.push(`${folder || text(character.name, "이름 미등록")}: 이미지 ZIP에서 캐릭터 폴더를 찾지 못해 기존 albumKeys를 유지했습니다.`);
    return false;
  }

  function planPrivateCharacterImport(rows, zipFileNames) {
    const { headers, records } = rowsToPrivateRecords(rows);
    const headerPaths = new Map();
    const warnings = [];
    const albumInfo = buildAlbumMapFromZipNames(zipFileNames);

    headers.forEach(header => {
      const path = characterHeaderToPath(header);
      if (!path) {
        if (text(header)) {
          warnings.push(isRemovedImportColumn(header)
            ? `제거된 예전 컬럼 건너뜀: ${header}`
            : `알 수 없는 컬럼 건너뜀: ${header}`);
        }
        return;
      }
      if (path === "albumKeys") {
        warnings.push("albumKeys 컬럼은 사용하지 않습니다. 이미지 ZIP 파일명 기준으로 자동 생성합니다.");
        return;
      }
      headerPaths.set(header, path);
    });

    const hasFolderColumn = [...headerPaths.values()].includes("folder");
    const hasIdentityColumn = ["name", "en"].some(path => [...headerPaths.values()].includes(path));
    if (!hasFolderColumn && !hasIdentityColumn) {
      throw new Error("엑셀에는 folder 컬럼 또는 name/en 컬럼이 필요합니다.");
    }

    const characters = cloneForImport(getAllCharacters());
    characters.forEach((character, index) => {
      normalizeImportCharacterSchema(character);
      const normalizedFolder = makeImportFolder(index, getImportCharacterFolder(character));
      if (normalizedFolder) character.folder = normalizedFolder;
    });

    const lookups = buildImportLookups(characters);
    const results = [];
    let addedCount = 0;
    let updatedCount = 0;
    let changedFieldCount = 0;
    let failedCount = 0;
    const sheetFolders = new Set();

    records.forEach(({ rowNumber, record }) => {
      const rawFolder = getImportRecordValue(record, headerPaths, "folder");
      const existingIndex = resolveImportCharacterIndex(record, headerPaths, lookups);
      let character;
      let isNew = false;

      if (existingIndex >= 0) {
        character = characters[existingIndex];
      } else {
        const newFolderBase = sanitizeImportFolderBase(rawFolder)
          || sanitizeImportFolderBase(getImportRecordValue(record, headerPaths, "en"))
          || sanitizeImportFolderBase(getImportRecordValue(record, headerPaths, "name"));
        const newFolder = makeImportFolder(characters.length, newFolderBase);

        if (!newFolder) {
          results.push({
            ok: false,
            status: "오류",
            rowNumber,
            main: text(rawFolder, "folder 비어 있음"),
            detail: "새 캐릭터는 folder, en, name 중 하나로 폴더명을 만들 수 있어야 합니다."
          });
          failedCount += 1;
          return;
        }

        character = makeDefaultImportCharacter(newFolder);
        characters.push(character);
        addImportLookup(lookups.folder, newFolder, characters.length - 1);
        addImportLookup(lookups.folderBase, sanitizeImportFolderBase(newFolder), characters.length - 1);
        isNew = true;
        addedCount += 1;
      }

      const characterIndex = characters.indexOf(character);
      const folderBase = deriveImportFolderBase(record, headerPaths, character);
      const normalizedFolder = makeImportFolder(characterIndex, folderBase);

      if (!normalizedFolder) {
        results.push({
          ok: false,
          status: "오류",
          rowNumber,
          main: text(rawFolder, "folder 비어 있음"),
          detail: "폴더명을 정규화하지 못했습니다."
        });
        failedCount += 1;
        return;
      }

      if (rawFolder && rawFolder !== normalizedFolder) {
        warnings.push(`행 ${rowNumber}: folder 자동 보정 ${rawFolder} → ${normalizedFolder}`);
      } else if (!rawFolder) {
        warnings.push(`행 ${rowNumber}: folder 비어 있어 ${normalizedFolder}로 자동 지정했습니다.`);
      }

      if (sheetFolders.has(normalizedFolder)) {
        warnings.push(`엑셀 안에 같은 캐릭터 folder가 여러 번 등장합니다: ${normalizedFolder}`);
      }
      sheetFolders.add(normalizedFolder);

      character.folder = normalizedFolder;
      const beforeText = JSON.stringify(character);
      const changedPaths = [];

      try {
        headerPaths.forEach((path, header) => {
          const rawValue = text(record[header]);
          if (!rawValue || path === "folder") return;

          const beforePathText = JSON.stringify(character);
          setImportNestedValue(character, path, rawValue);
          normalizeImportCharacterSchema(character);
          if (JSON.stringify(character) !== beforePathText) {
            changedPaths.push(path);
            changedFieldCount += 1;
          }
        });

        applyZipAlbumKeys(character, albumInfo.map, warnings);
      } catch (error) {
        results.push({
          ok: false,
          status: "오류",
          rowNumber,
          main: normalizedFolder,
          detail: error?.message || "행 처리 중 오류가 발생했습니다."
        });
        failedCount += 1;
        return;
      }

      const changed = JSON.stringify(character) !== beforeText;
      if (changed && !isNew) updatedCount += 1;

      results.push({
        ok: true,
        status: isNew ? "신규" : (changed ? "수정" : "변경 없음"),
        rowNumber,
        main: `${text(character.name, "이름 미등록")} / ${character.folder}`,
        detail: [
          changedPaths.length ? `${changedPaths.length}개 필드 반영` : "엑셀 필드 변경 없음",
          `${character.albumKeys.length}개 albumKeys 자동 반영`
        ].join(" · ")
      });
    });

    const duplicateFolders = findDuplicateImportValues(characters, character => character.folder);
    const duplicateNames = findDuplicateImportValues(characters, character => character.name);
    const duplicateEnglishNames = findDuplicateImportValues(characters, character => character.en);

    duplicateFolders.forEach(value => {
      warnings.push(`결과 characters.js에 중복 folder가 있습니다: ${value}`);
      failedCount += 1;
    });
    duplicateNames.forEach(value => warnings.push(`결과 characters.js에 중복 이름이 있습니다: ${value}`));
    duplicateEnglishNames.forEach(value => warnings.push(`결과 characters.js에 중복 영어 이름이 있습니다: ${value}`));

    albumInfo.unknownAlbumFiles.slice(0, 40).forEach(fileName => {
      warnings.push(`albumKeys 매핑이 없는 이미지 파일 건너뜀: ${fileName}`);
    });
    if (albumInfo.unknownAlbumFiles.length > 40) {
      warnings.push(`albumKeys 매핑이 없는 이미지 파일 ${albumInfo.unknownAlbumFiles.length - 40}개를 추가로 건너뜀.`);
    }

    return {
      characters,
      charactersText: buildPrivateCharactersText(characters),
      results,
      warnings,
      addedCount,
      updatedCount,
      changedFieldCount,
      failedCount,
      zipFolderCount: albumInfo.folderCount
    };
  }

  async function handlePrivateImportPreview() {
    if (!state.privateMode) return;

    const xlsxFile = elements.privateCharacterXlsxInput?.files?.[0];
    const zipFile = elements.privateCharacterZipInput?.files?.[0];

    if (!xlsxFile || !zipFile) {
      setPrivateStatus("캐릭터 엑셀과 이미지 ZIP을 모두 선택해 주세요.", "error");
      return;
    }

    resetPrivateImportPreview("엑셀과 이미지 ZIP을 분석하는 중입니다...");

    try {
      const [xlsxBuffer, zipBuffer] = await Promise.all([
        readPrivateFileAsArrayBuffer(xlsxFile),
        readPrivateFileAsArrayBuffer(zipFile)
      ]);
      const rows = await readFirstPrivateXlsxRows(xlsxBuffer);
      const zipFileNames = readPrivateZipNames(zipBuffer);
      plannedPrivateCharacterImport = planPrivateCharacterImport(rows, zipFileNames);
      renderPrivateImportPreview(plannedPrivateCharacterImport);

      if (plannedPrivateCharacterImport.failedCount > 0) {
        setPrivateStatus("반영할 수 없는 항목이 있습니다. 오류 행을 확인해 주세요.", "error");
      } else if (plannedPrivateCharacterImport.warnings.length > 0) {
        setPrivateStatus(`미리보기 완료. ZIP 캐릭터 폴더 ${plannedPrivateCharacterImport.zipFolderCount}개를 확인했습니다. 주의 항목을 확인해 주세요.`, "ok");
      } else {
        setPrivateStatus(`미리보기 완료. ZIP 캐릭터 폴더 ${plannedPrivateCharacterImport.zipFolderCount}개를 확인했습니다.`, "ok");
      }
    } catch (error) {
      plannedPrivateCharacterImport = null;
      if (elements.privateImportDownloadButton) elements.privateImportDownloadButton.disabled = true;
      setPrivateStatus(error?.message || "업로드 분석 중 오류가 발생했습니다.", "error");
    }
  }

  function downloadPrivateBlob(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1200);
  }

  function handlePrivateImportDownload() {
    if (!plannedPrivateCharacterImport || plannedPrivateCharacterImport.failedCount > 0) {
      setPrivateStatus("다운로드할 수 있는 유효한 미리보기가 없습니다.", "error");
      return;
    }

    const blob = new Blob([plannedPrivateCharacterImport.charactersText], { type: "text/javascript;charset=utf-8" });
    const stamp = new Date().toISOString().slice(0, 10).replaceAll("-", "");
    downloadPrivateBlob(blob, `characters-${stamp}.js`);
    setPrivateStatus("characters.js를 생성했습니다. 내려받은 파일로 프로젝트의 characters.js를 교체해 주세요.", "ok");
  }


  function hasGeneratorData() {
    return generatorFields.length > 0
      && generatorGenreGroups.length > 0
      && Object.keys(generatorCommonOptions).length > 0;
  }

  function loadGeneratorHistory() {
    try {
      const parsed = JSON.parse(localStorage.getItem(generatorHistoryStorageKey) || "[]");
      return Array.isArray(parsed) ? parsed.slice(0, generatorHistoryLimit) : [];
    } catch (error) {
      return [];
    }
  }

  function persistGeneratorHistory() {
    try {
      localStorage.setItem(generatorHistoryStorageKey, JSON.stringify(generatorHistory.slice(0, generatorHistoryLimit)));
    } catch (error) {
      console.warn("랜덤 생성기 최근 결과를 저장하지 못했습니다.", error);
    }
  }

  function loadGeneratorPromptHistory() {
    try {
      const parsed = JSON.parse(localStorage.getItem(generatorPromptHistoryStorageKey) || "[]");
      return Array.isArray(parsed) ? parsed.slice(0, generatorPromptHistoryLimit) : [];
    } catch (error) {
      return [];
    }
  }

  function persistGeneratorPromptHistory() {
    try {
      localStorage.setItem(generatorPromptHistoryStorageKey, JSON.stringify(generatorPromptHistory.slice(0, generatorPromptHistoryLimit)));
    } catch (error) {
      console.warn("최근 생성용 프롬프트를 저장하지 못했습니다.", error);
    }
  }

  function pickRandomFrom(options = []) {
    const list = Array.isArray(options) ? options.filter(value => value !== undefined && value !== null && value !== "") : [];
    if (list.length === 0) return "";
    return list[Math.floor(Math.random() * list.length)] ?? "";
  }

  function pickUnique(options = [], count = 0) {
    const candidates = Array.isArray(options) ? [...options] : [];
    const picks = [];
    while (picks.length < count && candidates.length > 0) {
      const index = Math.floor(Math.random() * candidates.length);
      picks.push(candidates.splice(index, 1)[0]);
    }
    return picks;
  }

  function pickWeightedCount(weights = [[0, 1]]) {
    const list = Array.isArray(weights) && weights.length ? weights : [[0, 1]];
    const total = list.reduce((sum, [, weight]) => sum + Number(weight || 0), 0) || 1;
    let roll = Math.random() * total;
    for (const [count, weight] of list) {
      roll -= Number(weight || 0);
      if (roll <= 0) return Number(count || 0);
    }
    return Number(list.at(-1)?.[0] || 0);
  }

  function randomHexColor() {
    const value = Math.floor(Math.random() * 0xffffff);
    return `#${value.toString(16).padStart(6, "0").toUpperCase()}`;
  }

  function normalizeOutfitValue(value) {
    if (typeof value !== "string") return value;
    return value
      .replace(/\[(?:노출|성인)\]\s*/g, "")
      .replace(/[\s,]+$/g, "");
  }

  function buildOutfitText(parts = []) {
    return parts.map(normalizeOutfitValue).filter(Boolean).join(", ");
  }

  function createOutfitPart(label, options = []) {
    return { label, value: normalizeOutfitValue(pickRandomFrom(options)) };
  }

  function pickFromAllowedGroups(groupMap, allowedGroups = [], allowedItems = []) {
    const groupItems = Array.isArray(allowedGroups)
      ? allowedGroups.flatMap(groupName => groupMap?.[groupName] ?? [])
      : [];
    const candidates = [...new Set([...groupItems, ...(Array.isArray(allowedItems) ? allowedItems : [])])];
    return pickRandomFrom(candidates);
  }

  function createColorSet() {
    return [
      { label: "머리", value: randomHexColor() },
      { label: "눈", value: randomHexColor() },
      { label: "피부", value: pickRandomFrom(generatorCommonOptions.skinColorPool ?? ["#F0C7B0"]) },
      { label: "상징", value: randomHexColor() }
    ];
  }

  function createOutfitResult() {
    const type = pickRandomFrom(generatorCommonOptions.outfitTypes ?? []);
    const slots = generatorCommonOptions.outfitSlots ?? {};
    const parts = [];
    if (type === "상/하의형") {
      parts.push(createOutfitPart("상의", slots.top ?? []));
      parts.push(createOutfitPart("하의", slots.bottom ?? []));
    } else {
      parts.push(createOutfitPart("원피스/전신복", slots.onepiece_fullbody ?? []));
    }
    parts.push(createOutfitPart("레그웨어", slots.legwear ?? []));
    parts.push(createOutfitPart("신발", slots.shoes ?? []));
    if (Math.random() < 0.5) parts.push(createOutfitPart("외투", slots.outerwear ?? []));
    if (Math.random() < 0.5) parts.push(createOutfitPart("모자", slots.headwear ?? []));
    return parts.filter(part => part.value);
  }

  function createGeneratorResult(overrides = {}) {
    const genre = overrides.genre ?? pickRandomFrom(generatorGenreGroups);
    const rule = generatorGenreRules[genre] ?? {};
    const featureCount = pickWeightedCount(generatorCountWeights.features);
    const powerCount = pickWeightedCount(generatorCountWeights.power);
    const fashionPointCount = pickWeightedCount(generatorCountWeights.fashionPoints);
    const visualAgeGroup = pickRandomFrom(generatorCommonOptions.visualAgeGroups ?? []);

    return {
      genre,
      race: overrides.race ?? pickFromAllowedGroups(generatorSpeciesGroups, rule.allowedSpeciesGroups, rule.allowedSpeciesItems),
      role: overrides.role ?? pickFromAllowedGroups(generatorJobGroups, rule.allowedJobGroups, rule.allowedJobItems),
      personality: overrides.personality ?? pickRandomFrom(generatorCommonOptions.personality ?? []),
      visualAge: overrides.visualAge ?? visualAgeGroup,
      features: overrides.features ?? (pickUnique(generatorCommonOptions.features ?? [], featureCount).join(", ") || "없음"),
      weapon: overrides.weapon ?? pickFromAllowedGroups(generatorWeaponGroups, rule.allowedWeaponGroups, rule.allowedWeaponItems),
      power: overrides.power ?? (pickUnique(generatorCommonOptions.powers ?? [], powerCount).join(", ") || "없음"),
      hairstyle: overrides.hairstyle ?? pickRandomFrom(generatorCommonOptions.hairstyles ?? []),
      outfit: overrides.outfit ?? createOutfitResult(),
      fashionPoints: overrides.fashionPoints ?? (pickUnique(generatorCommonOptions.fashionPoints ?? [], fashionPointCount).join(", ") || "없음"),
      colors: overrides.colors ?? createColorSet()
    };
  }

  function hasGeneratorResult() {
    return generatorResult && Object.keys(generatorResult).length > 0;
  }

  function getGeneratorEntry(key) {
    return generatorResult[key] ?? "";
  }

  function getGeneratorListValue(key, label) {
    const entries = getGeneratorEntry(key);
    if (!Array.isArray(entries)) return "";
    const value = entries.find(entry => entry?.label === label)?.value ?? "";
    return key === "outfit" ? normalizeOutfitValue(value) : value;
  }

  function getGeneratorFieldLabel(key) {
    if (key === "personality") return "성격";
    return generatorFields.find(([fieldKey]) => fieldKey === key)?.[1] ?? key;
  }

  function generatorValueToText(value) {
    if (Array.isArray(value)) {
      return value.map(entry => {
        if (entry && typeof entry === "object") {
          return `${entry.label}: ${keySafeValue(entry.value)}`;
        }
        return keySafeValue(entry);
      }).filter(Boolean).join(" / ");
    }
    return keySafeValue(value);
  }

  function keySafeValue(value) {
    return String(value ?? "").trim();
  }

  function saveCurrentGeneratorResultToHistory() {
    if (!hasGeneratorResult()) return;
    const entry = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      createdAt: Date.now(),
      result: structuredCloneSafe(generatorResult)
    };
    const signature = JSON.stringify(entry.result);
    generatorHistory = [
      entry,
      ...generatorHistory.filter(item => JSON.stringify(item.result) !== signature)
    ].slice(0, generatorHistoryLimit);
    persistGeneratorHistory();
  }

  function structuredCloneSafe(value) {
    try {
      return structuredClone(value);
    } catch (error) {
      return JSON.parse(JSON.stringify(value));
    }
  }

  function getLockedGeneratorOverrides() {
    const overrides = {};
    lockedGeneratorKeys.forEach(key => {
      if (Object.prototype.hasOwnProperty.call(generatorResult, key)) {
        overrides[key] = structuredCloneSafe(generatorResult[key]);
      }
    });
    return overrides;
  }

  function runGeneratorCharacterGeneration({ clearLocks = false } = {}) {
    if (clearLocks) lockedGeneratorKeys.clear();
    saveCurrentGeneratorResultToHistory();
    generatorResult = createGeneratorResult(clearLocks ? {} : getLockedGeneratorOverrides());
    saveCurrentGeneratorResultToHistory();
    clearGeneratorAssistNotes();
    renderGenerator();
  }

  function handleGenerateCharacter({ clearLocks = false } = {}) {
    if (!hasGeneratorData()) {
      renderGenerator();
      return;
    }
    if (clearLocks && lockedGeneratorKeys.size > 0) {
      openGeneratorPromptConfirm(
        "고정 항목 해제 확인",
        "고정된 항목이 있습니다. 고정을 모두 해제하고 전체 랜덤 생성할까요?",
        "고정 해제 후 생성",
        () => runGeneratorCharacterGeneration({ clearLocks: true })
      );
      return;
    }
    runGeneratorCharacterGeneration({ clearLocks });
  }

  function restoreGeneratorHistoryResult(id) {
    const entry = generatorHistory.find(item => item.id === id);
    if (!entry?.result) return;
    generatorResult = structuredCloneSafe(entry.result);
    lockedGeneratorKeys.clear();
    renderGenerator();
  }

  function clearGeneratorHistory() {
    generatorHistory = [];
    persistGeneratorHistory();
    renderGeneratorHistory();
  }

  function getGeneratorAssistNotes() {
    return {
      scene: String(generatorAssistNotesState.scene || "").trim(),
      composition: String(generatorAssistNotesState.composition || "").trim(),
      direction: String(generatorAssistNotesState.direction || "").trim()
    };
  }

  function hasCompleteGeneratorAssistNotes() {
    const notes = getGeneratorAssistNotes();
    return Boolean(notes.scene && notes.composition && notes.direction);
  }

  function clearGeneratorAssistNotes() {
    generatorAssistNotesState = { scene: "", composition: "", direction: "" };
    renderGeneratorSetPastePreview();
  }

  function renderGeneratorSetPastePreview() {
    if (!elements.generatorSetPastePreview) return;
    const notes = getGeneratorAssistNotes();
    const entries = [
      ["장면", notes.scene],
      ["구도", notes.composition],
      ["연출", notes.direction]
    ].filter(([, value]) => value);
    const hasAny = entries.length > 0;
    elements.generatorSetPastePreview.classList.toggle("is-empty", !hasAny);
    elements.generatorSetPastePreview.innerHTML = "";
    if (!hasAny) {
      elements.generatorSetPastePreview.textContent = "아직 적용된 연출 세트가 없습니다.";
      return;
    }

    const details = document.createElement("details");
    details.className = "generator-set-preview-details";
    const summary = document.createElement("summary");
    summary.textContent = `연출 세트 적용됨 · ${entries.map(([label]) => label).join(" / ")}`;
    const body = document.createElement("div");
    body.className = "generator-set-preview-body";
    entries.forEach(([label, value]) => {
      const item = document.createElement("p");
      item.innerHTML = `<b>${escapeHtml(label)}</b><span>${escapeHtml(value)}</span>`;
      body.appendChild(item);
    });
    details.append(summary, body);
    elements.generatorSetPastePreview.appendChild(details);
  }

  function stripGeneratorPasteLineDecorators(line) {
    return String(line || "")
      .replace(/^\s*[-*•]\s*/g, "")
      .replace(/^\s*\d+[.)]\s*/g, "")
      .replace(/\*\*/g, "")
      .replace(/^\s*>+\s*/g, "")
      .trim();
  }

  function sanitizeGeneratorPasteText(value) {
    return String(value || "")
      .replace(/\r\n/g, "\n")
      .replace(/\u00a0/g, " ");
  }

  function normalizeGeneratorPasteLabel(value) {
    return stripGeneratorPasteLineDecorators(value)
      .replace(/\s+/g, "")
      .replace(/[［\[\]］]/g, "")
      .trim();
  }

  function isGeneratorSetHeading(line) {
    const cleaned = stripGeneratorPasteLineDecorators(line);
    return /^(?:\[\s*)?(?:세트\s*[A-C]|[A-C]안)(?:\s*\])?$/i.test(cleaned);
  }

  function parseGeneratorPasteSection(line, labelMap) {
    const cleaned = stripGeneratorPasteLineDecorators(line);
    const match = cleaned.match(/^([^:：]+)\s*[:：]\s*(.*)$/);
    if (!match) return null;
    const label = normalizeGeneratorPasteLabel(match[1]);
    const key = labelMap.get(label);
    return key ? { key, value: String(match[2] || "").trim() } : null;
  }

  function parseGeneratorSetPasteText(source) {
    const values = { scene: "", composition: "", direction: "" };
    const labelMap = new Map([
      ["장면", "scene"],
      ["구도", "composition"],
      ["연출", "direction"]
    ]);
    const buckets = { scene: [], composition: [], direction: [] };
    let currentKey = "";

    sanitizeGeneratorPasteText(source).split(/\r?\n/).forEach(rawLine => {
      const line = String(rawLine || "").trim();
      if (!line) return;
      if (isGeneratorSetHeading(line)) {
        currentKey = "";
        return;
      }
      const section = parseGeneratorPasteSection(line, labelMap);
      if (section) {
        currentKey = section.key;
        if (section.value) buckets[currentKey].push(section.value);
        return;
      }
      if (!currentKey) return;
      const continuation = stripGeneratorPasteLineDecorators(line);
      if (!continuation || isGeneratorSetHeading(continuation)) return;
      buckets[currentKey].push(continuation);
    });

    Object.keys(values).forEach(key => {
      values[key] = buckets[key].map(value => String(value || "").trim()).filter(Boolean).join("\n").trim();
    });
    return values;
  }

  function applyGeneratorSetPasteFromModal() {
    const parsed = parseGeneratorSetPasteText(elements.generatorSetPasteText?.value || "");
    const hasAny = Object.values(parsed).some(value => String(value || "").trim());
    if (!hasAny) {
      setTemporaryButtonText(elements.applyGeneratorSetPasteButton, "형식 확인", "적용");
      return;
    }
    generatorAssistNotesState = parsed;
    closeGeneratorSetPasteModal();
    renderGeneratorSetPastePreview();
  }

  function buildGeneratorQuestionPrompt() {
    if (!hasGeneratorResult()) return "";
    const outfitText = buildOutfitText([
      getGeneratorListValue("outfit", "상의"),
      getGeneratorListValue("outfit", "하의"),
      getGeneratorListValue("outfit", "원피스/전신복"),
      getGeneratorListValue("outfit", "외투"),
      getGeneratorListValue("outfit", "모자"),
      getGeneratorListValue("outfit", "레그웨어"),
      getGeneratorListValue("outfit", "신발")
    ]);
    const power = getGeneratorEntry("power");
    const features = getGeneratorEntry("features");
    const fashionPoints = getGeneratorEntry("fashionPoints");
    return [
      `캐릭터는 ${getGeneratorEntry("genre")} 장르에 나오는 여성 캐릭터입니다.`,
      `캐릭터의 외형 나이대는 ${getGeneratorEntry("visualAge")} 입니다.`,
      `캐릭터의 종족은 ${getGeneratorEntry("race")}입니다.`,
      `캐릭터의 직업은 ${getGeneratorEntry("role")}입니다.`,
      `캐릭터의 성격/분위기는 ${getGeneratorEntry("personality")} 입니다.`,
      `캐릭터의 무기는 ${getGeneratorEntry("weapon")} 입니다.`,
      hasGeneratorOptionalValue(power) ? `캐릭터의 능력은 ${power} 입니다.` : "",
      outfitText ? `캐릭터는 ${outfitText} 을 입고 있습니다.` : "",
      hasGeneratorOptionalValue(fashionPoints) ? `캐릭터의 패션포인트는 ${fashionPoints}입니다.` : "",
      hasGeneratorOptionalValue(features) ? `캐릭터의 특징은 ${features} 입니다.` : "",
      `캐릭터의 헤어스타일은 ${getGeneratorEntry("hairstyle")} 입니다.`,
      "",
      "이 캐릭터의 일러스트를 생성하려하는데 어떤 장면을 생성하면 좋을까요?",
      "",
      "3개의 장면으로 추천해주세요.",
      "",
      "각각 장면,구도,연출 을 기본적으로 알려주시고 종족/직업/능력/무기에 따라 해당 표현이 필요한경우 알려주세요.(아니면 연출에 포함시켜 주셔도 됩니다)",
      "",
      "기본적으로 전신이 다 나와야합니다.",
      "",
      "화면 비율은 9:16 입니다.",
      "",
      "답변은 아래 형식으로 작성해주세요.",
      "",
      "A안",
      "- 장면:",
      "- 구도:",
      "- 연출:",
      "",
      "B안",
      "- 장면:",
      "- 구도:",
      "- 연출:",
      "",
      "C안",
      "- 장면:",
      "- 구도:",
      "- 연출:"
    ].filter(line => line !== "").join("\n");
  }

  function hasGeneratorOptionalValue(value) {
    const normalized = String(value || "").trim();
    return normalized !== "" && normalized !== "없음";
  }

  function buildGeneratorImagePrompt() {
    if (!hasGeneratorResult()) return "";
    const outfitText = buildOutfitText([
      getGeneratorListValue("outfit", "상의"),
      getGeneratorListValue("outfit", "하의"),
      getGeneratorListValue("outfit", "원피스/전신복"),
      getGeneratorListValue("outfit", "외투"),
      getGeneratorListValue("outfit", "모자"),
      getGeneratorListValue("outfit", "레그웨어"),
      getGeneratorListValue("outfit", "신발")
    ]);
    const notes = getGeneratorAssistNotes();
    const fashionPoints = getGeneratorEntry("fashionPoints");
    const features = getGeneratorEntry("features");
    const power = getGeneratorEntry("power");
    return [
      "캐릭터의 일러스트를 생성해주세요.",
      "",
      `캐릭터는 ${getGeneratorEntry("genre")} 장르에 나오는 여성 캐릭터입니다.`,
      `캐릭터의 외형 나이대는 ${getGeneratorEntry("visualAge")} 입니다.`,
      `캐릭터의 종족은 ${getGeneratorEntry("race")}입니다.`,
      `캐릭터의 직업은 ${getGeneratorEntry("role")}입니다.`,
      `캐릭터의 성격/분위기는 ${getGeneratorEntry("personality")} 입니다.`,
      `캐릭터의 무기는 ${getGeneratorEntry("weapon")} 입니다.`,
      hasGeneratorOptionalValue(power) ? `캐릭터의 능력은 ${power} 입니다.` : "",
      outfitText ? `캐릭터는 ${outfitText}을 입고 있습니다.` : "",
      hasGeneratorOptionalValue(fashionPoints) ? `캐릭터의 패션포인트는 ${fashionPoints}입니다.` : "",
      hasGeneratorOptionalValue(features) ? `캐릭터의 특징은 ${features} 입니다.` : "",
      `캐릭터의 헤어스타일은 ${getGeneratorEntry("hairstyle")} 입니다.`,
      `캐릭터의 머리색은 ${getGeneratorListValue("colors", "머리")} 이고 눈색은 ${getGeneratorListValue("colors", "눈")} 입니다.`,
      `캐릭터의 피부색은 ${getGeneratorListValue("colors", "피부")} 이고 상징 색은 ${getGeneratorListValue("colors", "상징")} 입니다.`,
      "",
      notes.scene ? `장면: ${notes.scene}` : "",
      notes.composition ? `구도: ${notes.composition}` : "",
      notes.direction ? `연출: ${notes.direction}` : "",
      "",
      "기본적으로 전신이 모두 보여야 합니다.",
      "머리, 발, 무기, 의상이 화면 밖으로 잘리지 않게 해 주세요.",
      "이미지 스타일은 고퀄리티 애니메이션풍의 게임 일러스트이고 반실사 렌더링 입니다.",
      "설명문은 만들지 말아주세요.",
      "",
      "가로세로 비율을 9:16로 설정해주세요."
    ].filter(line => line !== "").join("\n");
  }

  function getGeneratorFollowupCharacterName() {
    return String(elements.generatorFollowupCharacterNameInput?.value || "").trim();
  }

  function ensureGeneratorFollowupCharacterName() {
    if (getGeneratorFollowupCharacterName()) return true;
    openGeneratorPromptNotice("캐릭터 이름이 필요합니다.", "후속 이미지 프롬프트를 만들려면 캐릭터 이름을 먼저 입력해주세요.");
    return false;
  }

  function fillFollowupCharacterName(template) {
    const characterName = getGeneratorFollowupCharacterName();
    return String(template || "")
      .replaceAll("{이름}", characterName)
      .replaceAll("[원하는 캐릭터명 또는 캐릭터 설정]", characterName);
  }

  function getGeneratorSketchbookValues() {
    return {
      race: String(elements.generatorSketchbookRaceInput?.value || "").trim(),
      role: String(elements.generatorSketchbookRoleInput?.value || "").trim(),
      personality: String(elements.generatorSketchbookPersonalityInput?.value || "").trim(),
      genre: String(elements.generatorSketchbookGenreInput?.value || "").trim()
    };
  }

  function getGeneratorSketchbookSpeciesPrompt(race) {
    const key = normalizeGeneratorSketchbookSpeciesKey(race);
    return generatorSketchbookSpeciesPromptMap[key] || generatorSketchbookSpeciesPromptEntries[0]?.prompt || "";
  }

  function buildFollowupSketchSheetPrompt() {
    const nameLine = getGeneratorFollowupCharacterName()
      ? `캐릭터 이름: ${getGeneratorFollowupCharacterName()}`
      : "캐릭터 이름:";
    return `${generatorSketchSheetPromptTemplate}\n\n${nameLine}`;
  }

  function buildFollowupTurnaroundPrompt() {
    return fillFollowupCharacterName(generatorTurnaroundPromptTemplate);
  }

  function buildFollowupMagazinePrompt() {
    return fillFollowupCharacterName(generatorMagazinePromptTemplate);
  }

  function buildFollowupBodyInfoPrompt() {
    return generatorBodyInfoPromptTemplate;
  }

  function buildFollowupCookingMagazinePrompt() {
    return fillFollowupCharacterName(generatorCookingMagazinePromptTemplate);
  }

  function buildFollowupSketchbookPrompt() {
    const values = getGeneratorSketchbookValues();
    return generatorSketchbookPromptTemplate
      .replaceAll("{종족}", values.race || "미입력")
      .replaceAll("{직업}", values.role || "미입력")
      .replaceAll("{성격}", values.personality || "미입력")
      .replaceAll("{장르}", values.genre || "미입력")
      .replaceAll("{종족별 문구}", getGeneratorSketchbookSpeciesPrompt(values.race));
  }

  function applyGeneratorResultToFollowupFields() {
    if (!hasGeneratorResult()) return;
    if (elements.generatorSketchbookRaceInput) elements.generatorSketchbookRaceInput.value = getGeneratorEntry("race") || "";
    if (elements.generatorSketchbookRoleInput) elements.generatorSketchbookRoleInput.value = getGeneratorEntry("role") || "";
    if (elements.generatorSketchbookPersonalityInput) elements.generatorSketchbookPersonalityInput.value = getGeneratorEntry("personality") || "";
    if (elements.generatorSketchbookGenreInput) elements.generatorSketchbookGenreInput.value = getGeneratorEntry("genre") || "";
  }

  function openGeneratorPromptModal({ kicker, title, copy, text: promptText, copyLabel = "복사", source = "" }) {
    generatorPromptModalSource = source;
    generatorPromptModalDefaultLabel = copyLabel;
    generatorPromptModalConfirmAction = null;
    elements.generatorPromptModal?.classList.remove("is-notice", "is-confirm");
    elements.generatorPromptModalKicker.textContent = kicker;
    elements.generatorPromptModalTitle.textContent = title;
    elements.generatorPromptModalCopy.textContent = copy;
    elements.generatorQuestionPromptText.value = promptText;
    elements.generatorQuestionPromptText.hidden = false;
    elements.generatorQuestionPromptText.classList.remove("is-hidden");
    elements.cancelGeneratorQuestionPromptButton.hidden = false;
    elements.cancelGeneratorQuestionPromptButton.textContent = "닫기";
    elements.copyGeneratorQuestionPromptButton.textContent = copyLabel;
    elements.generatorPromptModal.hidden = false;
    elements.copyGeneratorQuestionPromptButton.focus();
  }

  function openGeneratorPromptNotice(title, copy) {
    generatorPromptModalSource = "notice";
    generatorPromptModalDefaultLabel = "확인";
    generatorPromptModalConfirmAction = null;
    elements.generatorPromptModal?.classList.remove("is-confirm");
    elements.generatorPromptModal?.classList.add("is-notice");
    elements.generatorPromptModalKicker.textContent = "NOTICE";
    elements.generatorPromptModalTitle.textContent = title;
    elements.generatorPromptModalCopy.textContent = copy;
    elements.generatorQuestionPromptText.value = "";
    elements.generatorQuestionPromptText.hidden = true;
    elements.cancelGeneratorQuestionPromptButton.hidden = true;
    elements.copyGeneratorQuestionPromptButton.textContent = "확인";
    elements.generatorPromptModal.hidden = false;
    elements.copyGeneratorQuestionPromptButton.focus();
  }

  function openGeneratorPromptConfirm(title, copy, confirmLabel, onConfirm) {
    generatorPromptModalSource = "confirm";
    generatorPromptModalDefaultLabel = confirmLabel || "확인";
    generatorPromptModalConfirmAction = typeof onConfirm === "function" ? onConfirm : null;
    elements.generatorPromptModal?.classList.remove("is-notice");
    elements.generatorPromptModal?.classList.add("is-confirm");
    elements.generatorPromptModalKicker.textContent = "CONFIRM";
    elements.generatorPromptModalTitle.textContent = title;
    elements.generatorPromptModalCopy.textContent = copy;
    elements.generatorQuestionPromptText.value = "";
    elements.generatorQuestionPromptText.hidden = true;
    elements.cancelGeneratorQuestionPromptButton.hidden = false;
    elements.cancelGeneratorQuestionPromptButton.textContent = "취소";
    elements.copyGeneratorQuestionPromptButton.textContent = generatorPromptModalDefaultLabel;
    elements.generatorPromptModal.hidden = false;
    elements.copyGeneratorQuestionPromptButton.focus();
  }

  function closeGeneratorPromptModal() {
    if (elements.generatorPromptModal) {
      elements.generatorPromptModal.hidden = true;
      elements.generatorPromptModal.classList.remove("is-notice", "is-confirm");
    }
    generatorPromptModalSource = "";
    generatorPromptModalConfirmAction = null;
  }

  function openGeneratorQuestionPromptModal() {
    if (!hasGeneratorResult()) {
      setTemporaryButtonText(elements.copyGeneratorStickyButton || elements.copyGeneratorButton, "생성 필요", "질문");
      return;
    }
    openGeneratorPromptModal({
      kicker: "QUESTION PROMPT",
      title: "질문용 프롬프트 확인",
      copy: "아래 내용을 확인한 뒤 복사 버튼을 눌러 AI 질문에 붙여넣으세요.",
      text: buildGeneratorQuestionPrompt(),
      source: "question"
    });
  }

  function openGeneratorImagePromptModal() {
    if (!hasGeneratorResult()) {
      setTemporaryButtonText(elements.copyGeneratorImagePromptStickyButton || elements.copyGeneratorImagePromptButton, "생성 필요", "생성");
      return;
    }
    if (!hasCompleteGeneratorAssistNotes()) {
      openGeneratorPromptNotice("연출 세트가 필요합니다.", "생성용 프롬프트에는 장면, 구도, 연출이 모두 필요합니다. 연출 세트를 먼저 붙여넣어 주세요.");
      return;
    }
    openGeneratorPromptModal({
      kicker: "IMAGE PROMPT",
      title: "생성용 프롬프트 확인",
      copy: "아래 내용을 확인한 뒤 복사 버튼을 눌러 이미지 생성에 붙여넣으세요.",
      text: buildGeneratorImagePrompt(),
      source: "image"
    });
  }

  function openFollowupPromptModal(kind, title, textBuilder, requiresName = true) {
    if (requiresName && !ensureGeneratorFollowupCharacterName()) return;
    openGeneratorPromptModal({
      kicker: "FOLLOW-UP PROMPT",
      title,
      copy: "아래 내용을 확인한 뒤 복사 버튼을 눌러 이미지 생성에 붙여넣으세요.",
      text: textBuilder(),
      source: `followup-${kind}`
    });
  }

  async function writeClipboardText(value, button, defaultLabel) {
    const content = String(value || "");
    try {
      await navigator.clipboard.writeText(content);
      setTemporaryButtonText(button, "복사 완료", defaultLabel);
      return true;
    } catch (error) {
      window.prompt("프롬프트를 복사해주세요.", content);
      return false;
    }
  }

  async function copyGeneratorPromptFromModal() {
    if (generatorPromptModalSource === "notice") {
      closeGeneratorPromptModal();
      return;
    }
    if (generatorPromptModalSource === "confirm") {
      const action = generatorPromptModalConfirmAction;
      closeGeneratorPromptModal();
      if (typeof action === "function") action();
      return;
    }
    const copied = await writeClipboardText(
      elements.generatorQuestionPromptText?.value || "",
      elements.copyGeneratorQuestionPromptButton,
      generatorPromptModalDefaultLabel
    );
    if (copied && generatorPromptModalSource === "image") {
      saveGeneratorPromptHistory(elements.generatorQuestionPromptText?.value || "");
      applyGeneratorResultToFollowupFields();
    }
  }

  function setTemporaryButtonText(button, label, fallback, delay = 1200) {
    if (!button) return;
    button.textContent = label;
    window.setTimeout(() => {
      button.textContent = fallback;
    }, delay);
  }

  function openGeneratorSetPasteModal() {
    if (!elements.generatorSetPasteModal || !elements.generatorSetPasteText) return;
    const notes = getGeneratorAssistNotes();
    elements.generatorSetPasteText.value = [
      "A안",
      notes.scene ? `- 장면: ${notes.scene}` : "- 장면:",
      notes.composition ? `- 구도: ${notes.composition}` : "- 구도:",
      notes.direction ? `- 연출: ${notes.direction}` : "- 연출:"
    ].join("\n");
    elements.generatorSetPasteModal.hidden = false;
    elements.generatorSetPasteText.focus();
  }

  function closeGeneratorSetPasteModal() {
    if (elements.generatorSetPasteModal) elements.generatorSetPasteModal.hidden = true;
  }

  function renderGeneratorValue(container, key) {
    const value = generatorResult[key] ?? "";
    container.innerHTML = "";
    if (Array.isArray(value)) {
      value.forEach(entry => {
        const line = document.createElement("div");
        line.className = "generator-value-line";
        if (entry && typeof entry === "object") {
          const label = document.createElement("span");
          label.className = "generator-value-key";
          label.textContent = entry.label;
          const strong = document.createElement("b");
          if (key === "colors") {
            const swatch = document.createElement("i");
            swatch.className = "generator-color-swatch";
            swatch.style.backgroundColor = entry.value;
            strong.append(swatch, document.createTextNode(entry.value));
          } else {
            strong.textContent = key === "outfit" ? normalizeOutfitValue(entry.value) : entry.value;
          }
          line.append(label, strong);
        } else {
          line.textContent = entry;
        }
        container.appendChild(line);
      });
      return;
    }
    container.textContent = value || "미등록";
  }

  function createGeneratorItem(key) {
    const item = document.createElement("article");
    const locked = lockedGeneratorKeys.has(key);
    item.className = "generator-item";
    item.classList.toggle("is-locked", locked);

    const label = document.createElement("span");
    label.className = "generator-item-label";
    label.textContent = getGeneratorFieldLabel(key);

    const value = document.createElement("div");
    value.className = "generator-value";
    renderGeneratorValue(value, key);

    const lockButton = document.createElement("button");
    lockButton.type = "button";
    lockButton.className = "generator-lock-button";
    lockButton.classList.toggle("is-active", locked);
    lockButton.dataset.generatorLock = key;
    lockButton.textContent = locked ? "고정됨" : "고정";

    item.append(label, value, lockButton);
    return item;
  }

  function getGeneratorResultKeysInDisplayOrder() {
    const orderedKeys = generatorFieldGroups
      .flatMap(group => group.keys)
      .filter(key => Object.prototype.hasOwnProperty.call(generatorResult, key));
    const known = new Set(orderedKeys);
    const extraKeys = Object.keys(generatorResult).filter(key => !known.has(key));
    return [...orderedKeys, ...extraKeys];
  }

  function renderGeneratorResult() {
    if (!elements.generatorGrid) return;
    elements.generatorGrid.innerHTML = "";
    if (!hasGeneratorResult()) {
      elements.generatorGrid.innerHTML = `
        <article class="generator-empty-card">
          <h3>아직 생성된 결과가 없습니다.</h3>
          <p>하단 액션바의 전체 버튼을 누르면 캐릭터 골격과 프롬프트 작업 영역이 준비됩니다.</p>
        </article>
      `;
      return;
    }

    const list = document.createElement("div");
    list.className = "generator-field-list";
    getGeneratorResultKeysInDisplayOrder().forEach(key => {
      list.appendChild(createGeneratorItem(key));
    });
    elements.generatorGrid.appendChild(list);
  }

  function renderGeneratorLockSummary() {
    if (!elements.generatorLockSummary) return;
    const labels = [...lockedGeneratorKeys].map(getGeneratorFieldLabel);
    elements.generatorLockSummary.textContent = labels.length
      ? `고정 ${labels.length}개 · ${labels.join(", ")}`
      : "고정된 항목이 없습니다.";
    if (elements.clearGeneratorLocksButton) {
      elements.clearGeneratorLocksButton.hidden = labels.length === 0;
    }
  }

  function renderGeneratorHistory() {
    if (!elements.generatorHistoryList) return;
    elements.generatorHistoryList.innerHTML = "";
    if (generatorHistory.length === 0) {
      elements.generatorHistoryList.innerHTML = `<p class="result-meta">최근 결과가 없습니다.</p>`;
      return;
    }
    generatorHistory.forEach(entry => {
      const result = entry.result || {};
      const button = document.createElement("button");
      button.type = "button";
      button.className = "generator-history-item";
      button.dataset.generatorHistoryId = entry.id;
      button.innerHTML = `
        <strong>${escapeHtml(result.race || "종족 미등록")} · ${escapeHtml(result.role || "직업 미등록")}</strong>
        <small>${escapeHtml(result.genre || "장르 미등록")} / ${escapeHtml(result.personality || "성격 미등록")}</small>
      `;
      elements.generatorHistoryList.appendChild(button);
    });
  }

  function getGeneratorPromptHistoryLabel(entry) {
    const fields = entry?.fields || {};
    return `${fields.race || "종족 미등록"} · ${fields.role || "직업 미등록"}`;
  }

  function getGeneratorPromptHistorySubLabel(entry) {
    const fields = entry?.fields || {};
    return `${fields.genre || "장르 미등록"} / ${fields.personality || "성격 미등록"}`;
  }

  function saveGeneratorPromptHistory(promptText) {
    if (!hasGeneratorResult()) return;
    const fields = {
      race: getGeneratorEntry("race") || "",
      role: getGeneratorEntry("role") || "",
      personality: getGeneratorEntry("personality") || "",
      genre: getGeneratorEntry("genre") || ""
    };
    const entry = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      createdAt: Date.now(),
      prompt: String(promptText || ""),
      fields
    };
    const signature = JSON.stringify(fields);
    generatorPromptHistory = [
      entry,
      ...generatorPromptHistory.filter(item => JSON.stringify(item.fields || {}) !== signature)
    ].slice(0, generatorPromptHistoryLimit);
    persistGeneratorPromptHistory();
    renderGeneratorPromptHistory();
  }

  function applyGeneratorPromptHistoryEntry(id) {
    const entry = generatorPromptHistory.find(item => item.id === id);
    if (!entry?.fields) return;
    const fields = entry.fields;
    if (elements.generatorSketchbookRaceInput) elements.generatorSketchbookRaceInput.value = fields.race || "";
    if (elements.generatorSketchbookRoleInput) elements.generatorSketchbookRoleInput.value = fields.role || "";
    if (elements.generatorSketchbookPersonalityInput) elements.generatorSketchbookPersonalityInput.value = fields.personality || "";
    if (elements.generatorSketchbookGenreInput) elements.generatorSketchbookGenreInput.value = fields.genre || "";
  }

  function clearGeneratorPromptHistory() {
    generatorPromptHistory = [];
    persistGeneratorPromptHistory();
    renderGeneratorPromptHistory();
  }

  function renderGeneratorPromptHistory() {
    if (!elements.generatorPromptHistoryList) return;
    elements.generatorPromptHistoryList.innerHTML = "";
    if (generatorPromptHistory.length === 0) {
      elements.generatorPromptHistoryList.innerHTML = `<p class="result-meta">최근 생성용 프롬프트 복사 기록이 없습니다.</p>`;
      if (elements.clearGeneratorPromptHistoryButton) elements.clearGeneratorPromptHistoryButton.hidden = true;
      return;
    }
    if (elements.clearGeneratorPromptHistoryButton) elements.clearGeneratorPromptHistoryButton.hidden = false;
    generatorPromptHistory.forEach(entry => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "generator-prompt-history-item";
      button.dataset.generatorPromptHistoryId = entry.id;
      button.innerHTML = `
        <strong>${escapeHtml(getGeneratorPromptHistoryLabel(entry))}</strong>
        <small>${escapeHtml(getGeneratorPromptHistorySubLabel(entry))}</small>
      `;
      elements.generatorPromptHistoryList.appendChild(button);
    });
  }

  function setGeneratorTab(tab) {
    state.generatorTab = tab === "followup" ? "followup" : "random";
    const isRandom = state.generatorTab === "random";
    elements.generatorRandomTabButton?.classList.toggle("is-active", isRandom);
    elements.generatorFollowupTabButton?.classList.toggle("is-active", !isRandom);
    if (elements.generatorRandomTabPanel) {
      elements.generatorRandomTabPanel.hidden = !isRandom;
      elements.generatorRandomTabPanel.classList.toggle("is-active", isRandom);
    }
    if (elements.generatorFollowupTabPanel) {
      elements.generatorFollowupTabPanel.hidden = isRandom;
      elements.generatorFollowupTabPanel.classList.toggle("is-active", !isRandom);
    }
    if (!isRandom) {
      renderGeneratorPromptHistory();
    }
  }

  function renderGenerator() {
    const hasData = hasGeneratorData();
    if (elements.generatorDataWarning) {
      elements.generatorDataWarning.hidden = hasData;
      elements.generatorDataWarning.style.display = hasData ? "none" : "";
    }
    renderGeneratorResult();
    renderGeneratorLockSummary();
    renderGeneratorHistory();
    renderGeneratorPromptHistory();
    renderGeneratorSetPastePreview();
    setGeneratorTab(state.generatorTab);
  }

  function renderGeneratorScreen() {
    state.view = "generator";
    state.worldId = "";
    state.characterId = "";
    state.storyId = "";
    setTopbar({ title: "랜덤 생성기", kicker: "IMAGE PROMPT GENERATOR", backVisible: true, homeVisible: true });
    setScreen("generatorScreen");
    renderGenerator();
  }


  function navigateWorlds(replace = false) {
    navigate("#/worlds", replace);
  }

  function navigateGenerator() {
    navigate("#/generator");
  }

  function navigateWorld(worldId, replace = false) {
    navigate(`#/world/${encodeURIComponent(worldId)}`, replace);
  }

  function navigateCharacter(worldId, characterId) {
    navigate(`#/world/${encodeURIComponent(worldId)}/character/${encodeURIComponent(characterId)}`);
  }

  function navigateStory(worldId, storyId) {
    navigate(`#/world/${encodeURIComponent(worldId)}/story/${encodeURIComponent(storyId)}`);
  }

  function navigate(hash, replace = false) {
    rememberRouteScroll();

    if (replace) {
      history.replaceState(null, "", hash);
      renderFromHash();
      return;
    }

    if (window.location.hash === hash) {
      renderFromHash();
      return;
    }

    window.location.hash = hash;
  }

  function decodePart(value = "") {
    try {
      return decodeURIComponent(value);
    } catch (error) {
      return value;
    }
  }

  function parseHash() {
    const hash = window.location.hash.replace(/^#\/?/, "");
    const parts = hash.split("/").filter(Boolean).map(decodePart);

    if (parts.length === 0 || parts[0] === "worlds") {
      return { view: "worlds" };
    }

    if (parts[0] === "generator") {
      return { view: "generator" };
    }

    if (parts[0] === "world" && parts[1]) {
      if (parts[2] === "character" && parts[3]) {
        return { view: "character", worldId: parts[1], characterId: parts[3] };
      }
      if (parts[2] === "story" && parts[3]) {
        return { view: "story", worldId: parts[1], storyId: parts[3] };
      }
      return { view: "world", worldId: parts[1] };
    }

    return { view: "worlds" };
  }

  function renderFromHash() {
    const route = parseHash();
    const nextRouteKey = routeKeyFromRoute(route);

    if (state.routeKey && state.routeKey !== nextRouteKey) {
      rememberRouteScroll(state.routeKey);
    }
    state.routeKey = nextRouteKey;

    if (route.view === "world") {
      renderWorldDetail(route.worldId);
      return;
    }

    if (route.view === "generator") {
      renderGeneratorScreen();
      return;
    }

    if (route.view === "character") {
      renderCharacterDetail(route.worldId, route.characterId);
      return;
    }

    if (route.view === "story") {
      renderStoryReader(route.worldId, route.storyId);
      return;
    }

    renderWorldSelect();
  }

  function bindEvents() {
    elements.backButton.addEventListener("click", () => {
      if (state.view === "story" && state.storyReturnHash) {
        const returnHash = state.storyReturnHash;
        state.storyReturnHash = "";
        navigate(returnHash);
        return;
      }
      if (state.view === "world" || state.view === "generator") {
        navigateWorlds();
        return;
      }
      if (state.worldId) {
        navigateWorld(state.worldId);
        return;
      }
      navigateWorlds();
    });

    elements.worldHomeButton.addEventListener("click", () => navigateWorlds());
    elements.topTitle?.addEventListener("click", handlePrivateTitleTap);
    elements.privateToolToggle?.addEventListener("click", togglePrivateToolPanel);
    elements.privateImportPreviewButton?.addEventListener("click", handlePrivateImportPreview);
    elements.privateImportDownloadButton?.addEventListener("click", handlePrivateImportDownload);
    elements.privateImageCheckButton?.addEventListener("click", runPrivateImageCheck);
    elements.assetCheckClose?.addEventListener("click", closeAssetCheckModal);
    elements.assetCheckOk?.addEventListener("click", closeAssetCheckModal);
    elements.assetCheckModal?.addEventListener("click", event => {
      if (event.target.closest("[data-asset-check-close]")) {
        closeAssetCheckModal();
      }
    });
    elements.openGeneratorButton?.addEventListener("click", navigateGenerator);
    elements.generateCharacterButton?.addEventListener("click", () => handleGenerateCharacter({ clearLocks: true }));
    elements.generateCharacterStickyButton?.addEventListener("click", () => handleGenerateCharacter({ clearLocks: true }));
    elements.generateUnlockedCharacterButton?.addEventListener("click", () => handleGenerateCharacter());
    elements.generateUnlockedCharacterStickyButton?.addEventListener("click", () => handleGenerateCharacter());
    elements.copyGeneratorButton?.addEventListener("click", openGeneratorQuestionPromptModal);
    elements.copyGeneratorStickyButton?.addEventListener("click", openGeneratorQuestionPromptModal);
    elements.copyGeneratorImagePromptButton?.addEventListener("click", openGeneratorImagePromptModal);
    elements.copyGeneratorImagePromptStickyButton?.addEventListener("click", openGeneratorImagePromptModal);
    elements.clearGeneratorLocksButton?.addEventListener("click", () => {
      lockedGeneratorKeys.clear();
      renderGenerator();
    });
    elements.clearGeneratorHistoryButton?.addEventListener("click", clearGeneratorHistory);
    elements.clearGeneratorPromptHistoryButton?.addEventListener("click", clearGeneratorPromptHistory);
    elements.generatorRandomTabButton?.addEventListener("click", () => setGeneratorTab("random"));
    elements.generatorFollowupTabButton?.addEventListener("click", () => setGeneratorTab("followup"));
    elements.openGeneratorSetPasteButton?.addEventListener("click", openGeneratorSetPasteModal);
    elements.closeGeneratorSetPasteButton?.addEventListener("click", closeGeneratorSetPasteModal);
    elements.cancelGeneratorSetPasteButton?.addEventListener("click", closeGeneratorSetPasteModal);
    elements.applyGeneratorSetPasteButton?.addEventListener("click", applyGeneratorSetPasteFromModal);
    elements.closeGeneratorQuestionPromptButton?.addEventListener("click", closeGeneratorPromptModal);
    elements.cancelGeneratorQuestionPromptButton?.addEventListener("click", closeGeneratorPromptModal);
    elements.copyGeneratorQuestionPromptButton?.addEventListener("click", copyGeneratorPromptFromModal);
    elements.copyFollowupSketchSheetPromptButton?.addEventListener("click", () => openFollowupPromptModal("sketch-sheet", "낙서시트 프롬프트 확인", buildFollowupSketchSheetPrompt));
    elements.copyFollowupTurnaroundPromptButton?.addEventListener("click", () => openFollowupPromptModal("turnaround", "삼면도 프롬프트 확인", buildFollowupTurnaroundPrompt));
    elements.copyFollowupMagazinePromptButton?.addEventListener("click", () => openFollowupPromptModal("magazine", "잡지 프롬프트 확인", buildFollowupMagazinePrompt));
    elements.copyFollowupSketchbookPromptButton?.addEventListener("click", () => openFollowupPromptModal("sketchbook", "스케치북 프롬프트 확인", buildFollowupSketchbookPrompt, false));
    elements.copyFollowupBodyInfoPromptButton?.addEventListener("click", () => openFollowupPromptModal("body-info", "신체정보 프롬프트 확인", buildFollowupBodyInfoPrompt, false));
    elements.copyFollowupCookingMagazinePromptButton?.addEventListener("click", () => openFollowupPromptModal("cooking-magazine", "요리잡지 프롬프트 확인", buildFollowupCookingMagazinePrompt));

    [elements.privateCharacterXlsxInput, elements.privateCharacterZipInput].forEach(input => {
      input?.addEventListener("change", () => {
        const hasExcel = Boolean(elements.privateCharacterXlsxInput?.files?.[0]);
        const hasZip = Boolean(elements.privateCharacterZipInput?.files?.[0]);
        resetPrivateImportPreview(hasExcel || hasZip ? "파일을 선택했습니다. 미리보기를 실행해 주세요." : "엑셀과 이미지 ZIP을 선택해 주세요.");
      });
    });

    elements.imageLightboxClose?.addEventListener("click", closeImageLightbox);
    elements.imageLightbox?.addEventListener("click", event => {
      if (event.target.closest("[data-lightbox-close]")) {
        closeImageLightbox();
      }
    });
    elements.generatorSetPasteModal?.addEventListener("click", event => {
      if (event.target.closest("[data-generator-set-close]")) {
        closeGeneratorSetPasteModal();
      }
    });
    elements.generatorPromptModal?.addEventListener("click", event => {
      if (event.target.closest("[data-generator-prompt-close]")) {
        closeGeneratorPromptModal();
      }
    });
    elements.imageLightboxStage?.addEventListener("wheel", handleLightboxWheel, { passive: false });
    elements.imageLightboxStage?.addEventListener("pointerdown", handleLightboxPointerDown);
    elements.imageLightboxStage?.addEventListener("pointermove", handleLightboxPointerMove);
    elements.imageLightboxStage?.addEventListener("pointerup", handleLightboxPointerEnd);
    elements.imageLightboxStage?.addEventListener("pointercancel", handleLightboxPointerEnd);
    elements.imageLightboxImage?.addEventListener("dblclick", () => {
      setImageLightboxZoom(state.imageLightboxScale > 1.01 ? 1 : 2.25);
    });
    window.addEventListener("keydown", event => {
      if (event.key === "Escape") {
        closeGeneratorSetPasteModal();
        closeGeneratorPromptModal();
        closeAssetCheckModal();
        closeImageLightbox();
      }
    });

    elements.appMain.addEventListener("click", event => {
      const generatorLockButton = event.target.closest(".generator-lock-button[data-generator-lock]");
      if (generatorLockButton) {
        const key = generatorLockButton.dataset.generatorLock;
        if (lockedGeneratorKeys.has(key)) {
          lockedGeneratorKeys.delete(key);
        } else {
          lockedGeneratorKeys.add(key);
        }
        renderGenerator();
        return;
      }

      const generatorHistoryButton = event.target.closest(".generator-history-item[data-generator-history-id]");
      if (generatorHistoryButton) {
        restoreGeneratorHistoryResult(generatorHistoryButton.dataset.generatorHistoryId);
        return;
      }

      const generatorPromptHistoryButton = event.target.closest(".generator-prompt-history-item[data-generator-prompt-history-id]");
      if (generatorPromptHistoryButton) {
        applyGeneratorPromptHistoryEntry(generatorPromptHistoryButton.dataset.generatorPromptHistoryId);
        return;
      }

      const tabButton = event.target.closest(".world-tab-button[data-world-tab]");
      if (tabButton) {
        setWorldTab(tabButton.dataset.worldTab, { scrollToTop: true });
        return;
      }

      const characterTabButton = event.target.closest(".character-tab-button[data-character-tab]");
      if (characterTabButton) {
        setCharacterTab(characterTabButton.dataset.characterTab, { scrollToTop: true });
        return;
      }

      const relatedCharacter = event.target.closest(".related-chip[data-character-id]");
      if (relatedCharacter) {
        navigateCharacter(relatedCharacter.dataset.worldId || state.worldId, relatedCharacter.dataset.characterId);
        return;
      }

      const characterCard = event.target.closest(".character-card[data-character-id]");
      if (characterCard) {
        navigateCharacter(characterCard.dataset.worldId || state.worldId, characterCard.dataset.characterId);
        return;
      }

      const storyItem = event.target.closest(".story-item[data-story-id]");
      if (storyItem) {
        state.storyReturnHash = storyItem.dataset.returnTo === "character"
          ? (storyItem.dataset.returnHash || window.location.hash)
          : "";
        navigateStory(storyItem.dataset.worldId || state.worldId, storyItem.dataset.storyId);
        return;
      }

      const imageCard = event.target.closest(".character-image-card[data-image-index]");
      if (imageCard) {
        openImageLightbox(Number(imageCard.dataset.imageIndex));
        return;
      }

      const worldCard = event.target.closest(".world-card[data-world-id]");
      if (worldCard) {
        state.worldTab = "info";
        state.characterSearch = "";
        state.storySearch = "";
        clearStoryOpenGroups(worldCard.dataset.worldId);
        clearRouteScroll(routeKeyForWorld(worldCard.dataset.worldId));
        navigateWorld(worldCard.dataset.worldId);
      }
    });

    elements.appMain.addEventListener("input", event => {
      if (event.target === elements.worldCharacterSearch) {
        state.characterSearch = event.target.value;
        const world = findWorld(state.worldId);
        if (world) renderWorldCharacters(world, charactersForWorld(world));
        return;
      }

      if (event.target === elements.worldStorySearch) {
        state.storySearch = event.target.value;
        const world = findWorld(state.worldId);
        if (world) renderWorldStories(world, storiesForWorld(world.code));
      }
    });

    window.addEventListener("hashchange", renderFromHash);
  }

  function collectElements() {
    [
      "worldApp",
      "appMain",
      "backButton",
      "worldHomeButton",
      "topKicker",
      "topSymbol",
      "topTitle",
      "worldSelectScreen",
      "worldDetailScreen",
      "characterDetailScreen",
      "storyReaderScreen",
      "worldGrid",
      "worldTabBar",
      "worldTabCharacters",
      "worldTabStories",
      "worldTabInfo",
      "worldCharactersPanel",
      "worldStoriesPanel",
      "worldInfoPanel",
      "worldCharacterCount",
      "worldCharacterSearch",
      "worldCharacterResultMeta",
      "worldCharacterGrid",
      "worldStoryCount",
      "worldStorySearch",
      "worldStoryResultMeta",
      "worldStoryGroups",
      "worldInfoGrid",
      "characterDetailCard",
      "characterDetailImageWrap",
      "characterDetailImage",
      "characterDetailKicker",
      "characterDetailTitle",
      "characterDetailEn",
      "characterDetailMeta",
      "characterDetailIntro",
      "characterDetailQuote",
      "characterTabBar",
      "characterTabInfo",
      "characterTabStatus",
      "characterTabImages",
      "characterInfoPanel",
      "characterStatusPanel",
      "characterImagesPanel",
      "characterInfoGrid",
      "characterIdentityStoryList",
      "characterStatusGrid",
      "characterImagesMeta",
      "characterImageGrid",
      "storyReaderKicker",
      "storyReaderTitle",
      "storyReaderSummary",
      "storyRelatedCharacters",
      "storyReaderBody",
      "imageLightbox",
      "imageLightboxTitle",
      "imageLightboxMeta",
      "imageLightboxClose",
      "imageLightboxStage",
      "imageLightboxImage",
      "privateToolShell",
      "privateToolToggle",
      "privateToolPanel",
      "privateCharacterXlsxInput",
      "privateCharacterZipInput",
      "privateImportPreviewButton",
      "privateImportDownloadButton",
      "privateImportStatus",
      "privateImportSummary",
      "privateImportResults",
      "privateImageCheckShell",
      "privateImageCheckButton",
      "assetCheckModal",
      "assetCheckBody",
      "assetCheckClose",
      "assetCheckOk",
      "generatorScreen",
      "openGeneratorButton",
      "generatorDataWarning",
      "generateCharacterButton",
      "generateCharacterStickyButton",
      "generateUnlockedCharacterButton",
      "generateUnlockedCharacterStickyButton",
      "copyGeneratorButton",
      "copyGeneratorStickyButton",
      "copyGeneratorImagePromptButton",
      "copyGeneratorImagePromptStickyButton",
      "clearGeneratorLocksButton",
      "generatorLockSummary",
      "clearGeneratorHistoryButton",
      "generatorHistoryList",
      "clearGeneratorPromptHistoryButton",
      "generatorPromptHistoryList",
      "generatorRandomTabButton",
      "generatorFollowupTabButton",
      "generatorRandomTabPanel",
      "generatorFollowupTabPanel",
      "generatorGrid",
      "openGeneratorSetPasteButton",
      "generatorSetPastePreview",
      "generatorSetPasteModal",
      "generatorSetPasteText",
      "closeGeneratorSetPasteButton",
      "cancelGeneratorSetPasteButton",
      "applyGeneratorSetPasteButton",
      "generatorPromptModal",
      "generatorPromptModalKicker",
      "generatorPromptModalTitle",
      "generatorPromptModalCopy",
      "generatorQuestionPromptText",
      "closeGeneratorQuestionPromptButton",
      "cancelGeneratorQuestionPromptButton",
      "copyGeneratorQuestionPromptButton",
      "generatorFollowupCharacterNameInput",
      "generatorSketchbookRaceInput",
      "generatorSketchbookRoleInput",
      "generatorSketchbookPersonalityInput",
      "generatorSketchbookGenreInput",
      "copyFollowupSketchSheetPromptButton",
      "copyFollowupTurnaroundPromptButton",
      "copyFollowupMagazinePromptButton",
      "copyFollowupSketchbookPromptButton",
      "copyFollowupBodyInfoPromptButton",
      "copyFollowupCookingMagazinePromptButton"
    ].forEach(id => {
      elements[id] = $(id);
    });
  }

  function init() {
    collectElements();
    bindEvents();
    renderFromHash();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
