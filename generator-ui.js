// generator-ui.js — split from character-ui.js during B-stage code structure cleanup.
function pickRandomFrom(options) {
      return options[Math.floor(Math.random() * options.length)] ?? "";
    }

    function pickUnique(options, count) {
      const candidates = [...options];
      const picks = [];
      while (picks.length < count && candidates.length > 0) {
        const index = Math.floor(Math.random() * candidates.length);
        picks.push(candidates.splice(index, 1)[0]);
      }
      return picks;
    }

    function pickWeightedCount(weights = [[0, 1]]) {
      const total = weights.reduce((sum, [, weight]) => sum + weight, 0);
      let roll = Math.random() * total;
      for (const [count, weight] of weights) {
        roll -= weight;
        if (roll <= 0) return count;
      }
      return weights.at(-1)?.[0] ?? 0;
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
	  const groupItems = allowedGroups.flatMap(groupName => groupMap[groupName] ?? []);

	  const candidates = [
		...new Set([
			...groupItems,
			...allowedItems
		])
	  ];
	  
      return pickRandomFrom(candidates);
    }

    function createColorSet() {
      return [
        { label: "\uBA38\uB9AC", value: randomHexColor() },
        { label: "\uB208", value: randomHexColor() },
        { label: "\uD53C\uBD80", value: pickRandomFrom(generatorCommonOptions.skinColorPool ?? ["#F0C7B0"]) },
        { label: "\uC0C1\uC9D5", value: randomHexColor() }
      ];
    }

    function createOutfitResult() {
      const type = pickRandomFrom(generatorCommonOptions.outfitTypes ?? []);
      const slots = generatorCommonOptions.outfitSlots ?? {};
      const parts = [];
      if (type === "\uC0C1/\uD558\uC758\uD615") {
        parts.push(createOutfitPart("\uC0C1\uC758", slots.top ?? []));
        parts.push(createOutfitPart("\uD558\uC758", slots.bottom ?? []));
      } else {
        parts.push(createOutfitPart("\uC6D0\uD53C\uC2A4/\uC804\uC2E0\uBCF5", slots.onepiece_fullbody ?? []));
      }
      parts.push(createOutfitPart("\uB808\uADF8\uC6E8\uC5B4", slots.legwear ?? []));
      parts.push(createOutfitPart("\uC2E0\uBC1C", slots.shoes ?? []));
      if (Math.random() < 0.5) parts.push(createOutfitPart("\uC678\uD22C", slots.outerwear ?? []));
      if (Math.random() < 0.5) parts.push(createOutfitPart("\uBAA8\uC790", slots.headwear ?? []));
      return parts.filter(part => part.value);
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

    function compactJoin(parts) {
      return parts.filter(Boolean).join(" ");
    }

    let generatorPromptModalDefaultLabel = "복사";
    let generatorPromptModalSource = "";
    let generatorPromptModalNoticeMode = false;
    let generatorPromptModalNoticeAfterClose = null;
    let generatorMainActiveTab = "random";

    const generatorSketchbookRecentStorageKey = "orvia-generator-sketchbook-recent-v1";
    const generatorSketchbookRecentLimit = 5;
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

    function setGeneratorMainTab(tab) {
      const nextTab = tab === "followup" ? "followup" : "random";
      const isRandom = nextTab === "random";
      generatorMainActiveTab = nextTab;

      if (generatorRandomTabButton) {
        generatorRandomTabButton.classList.toggle("is-active", isRandom);
        generatorRandomTabButton.setAttribute("aria-selected", isRandom ? "true" : "false");
      }
      if (generatorFollowupTabButton) {
        generatorFollowupTabButton.classList.toggle("is-active", !isRandom);
        generatorFollowupTabButton.setAttribute("aria-selected", isRandom ? "false" : "true");
      }
      if (generatorRandomTabPanel) {
        generatorRandomTabPanel.hidden = !isRandom;
        generatorRandomTabPanel.classList.toggle("hidden", !isRandom);
        generatorRandomTabPanel.classList.toggle("is-active", isRandom);
      }
      if (generatorFollowupTabPanel) {
        generatorFollowupTabPanel.hidden = isRandom;
        generatorFollowupTabPanel.classList.toggle("hidden", isRandom);
        generatorFollowupTabPanel.classList.toggle("is-active", !isRandom);
      }
      if (!isRandom) {
        refreshGeneratorSketchbookRecentControls({ autoApplyLatest: true });
      }
    }

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


    function fillFollowupCharacterName(template) {
      const characterName = getGeneratorFollowupCharacterName();
      return String(template || "")
        .replaceAll("{이름}", characterName)
        .replaceAll("[원하는 캐릭터명 또는 캐릭터 설정]", characterName);
    }


    function getGeneratorFollowupCharacterName() {
      return String(generatorFollowupCharacterNameInput?.value || "").trim();
    }

    function ensureGeneratorFollowupCharacterName() {
      if (getGeneratorFollowupCharacterName()) return true;
      showGeneratorPromptSiteNotice({
        title: "캐릭터 이름이 필요합니다.",
        copy: "후속 이미지 프롬프트를 만들려면 캐릭터 이름을 먼저 입력해주세요.",
        afterClose: () => generatorFollowupCharacterNameInput?.focus()
      });
      return false;
    }

    function getGeneratorSketchbookInputValue(input) {
      return String(input?.value || "").trim();
    }

    function getGeneratorSketchbookValues() {
      return {
        race: getGeneratorSketchbookInputValue(generatorSketchbookRaceInput),
        role: getGeneratorSketchbookInputValue(generatorSketchbookRoleInput),
        personality: getGeneratorSketchbookInputValue(generatorSketchbookPersonalityInput),
        genre: getGeneratorSketchbookInputValue(generatorSketchbookGenreInput)
      };
    }

    function setGeneratorSketchbookValues(values = {}) {
      if (generatorSketchbookRaceInput) generatorSketchbookRaceInput.value = values.race ?? "";
      if (generatorSketchbookRoleInput) generatorSketchbookRoleInput.value = values.role ?? "";
      if (generatorSketchbookPersonalityInput) generatorSketchbookPersonalityInput.value = values.personality ?? "";
      if (generatorSketchbookGenreInput) generatorSketchbookGenreInput.value = values.genre ?? "";
    }

    function areGeneratorSketchbookFieldsEmpty() {
      const values = getGeneratorSketchbookValues();
      return !values.race && !values.role && !values.personality && !values.genre;
    }

    function normalizeGeneratorSketchbookSpeciesKey(value = "") {
      return String(value).trim().toLowerCase().replace(/\s+/g, "");
    }

    function getGeneratorSketchbookSpeciesPrompt(race) {
      const key = normalizeGeneratorSketchbookSpeciesKey(race);
      return generatorSketchbookSpeciesPromptMap[key] ?? "";
    }

    function buildFollowupSketchbookPrompt() {
      const values = getGeneratorSketchbookValues();
      return generatorSketchbookPromptTemplate
        .replaceAll("{종족}", values.race)
        .replaceAll("{직업}", values.role)
        .replaceAll("{성격}", values.personality)
        .replaceAll("{장르}", values.genre)
        .replaceAll("{종족별 문구}", getGeneratorSketchbookSpeciesPrompt(values.race))
        .replace(/\n{3,}/g, "\n\n")
        .trim();
    }

    function createGeneratorSketchbookRecentSummary(values = {}) {
      return [
        values.race,
        values.role,
        values.personality,
        values.genre
      ].filter(Boolean).join(" · ") || "스케치북 정보";
    }

    function normalizeGeneratorSketchbookRecentEntry(entry) {
      const values = {
        race: String(entry?.race || "").trim(),
        role: String(entry?.role || "").trim(),
        personality: String(entry?.personality || "").trim(),
        genre: String(entry?.genre || "").trim()
      };
      if (!values.race && !values.role && !values.personality && !values.genre) return null;
      return {
        id: String(entry?.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
        savedAt: String(entry?.savedAt || new Date().toISOString()),
        summary: createGeneratorSketchbookRecentSummary(values),
        ...values
      };
    }

    function loadGeneratorSketchbookRecentEntries() {
      try {
        const parsed = JSON.parse(localStorage.getItem(generatorSketchbookRecentStorageKey) || "[]");
        generatorSketchbookRecentEntries = Array.isArray(parsed)
          ? parsed.map(normalizeGeneratorSketchbookRecentEntry).filter(Boolean).slice(0, generatorSketchbookRecentLimit)
          : [];
      } catch (error) {
        generatorSketchbookRecentEntries = [];
      }
    }

    function persistGeneratorSketchbookRecentEntries() {
      try {
        localStorage.setItem(
          generatorSketchbookRecentStorageKey,
          JSON.stringify(generatorSketchbookRecentEntries.slice(0, generatorSketchbookRecentLimit))
        );
      } catch (error) {
        // Ignore storage failures; prompt copying should continue to work.
      }
    }

    function isSameGeneratorSketchbookRecentEntry(first, second) {
      return ["race", "role", "personality", "genre"].every(key => String(first?.[key] || "") === String(second?.[key] || ""));
    }

    function captureCurrentGeneratorSketchbookContext() {
      if (!hasGeneratorResult()) return null;
      return normalizeGeneratorSketchbookRecentEntry({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        savedAt: new Date().toISOString(),
        race: getGeneratorEntry("race"),
        role: getGeneratorEntry("role"),
        personality: getGeneratorEntry("personality"),
        genre: getGeneratorEntry("genre")
      });
    }

    function renderGeneratorSketchbookRecentChoices() {
      if (!generatorSketchbookRecentSelect) return;
      generatorSketchbookRecentSelect.innerHTML = "";

      if (generatorSketchbookRecentEntries.length === 0) {
        const option = document.createElement("option");
        option.value = "";
        option.textContent = "최근 복사본 없음";
        generatorSketchbookRecentSelect.appendChild(option);
        generatorSketchbookRecentSelect.disabled = true;
        if (loadGeneratorSketchbookRecentButton) loadGeneratorSketchbookRecentButton.disabled = true;
        return;
      }

      generatorSketchbookRecentEntries.forEach((entry, index) => {
        const option = document.createElement("option");
        option.value = entry.id;
        option.textContent = `#${index + 1} ${entry.summary}`;
        generatorSketchbookRecentSelect.appendChild(option);
      });

      generatorSketchbookRecentSelect.disabled = false;
      generatorSketchbookRecentSelect.value = generatorSketchbookRecentEntries[0]?.id || "";
      if (loadGeneratorSketchbookRecentButton) loadGeneratorSketchbookRecentButton.disabled = false;
    }

    function applyGeneratorSketchbookRecentEntry(entry) {
      if (!entry) return;
      setGeneratorSketchbookValues(entry);
      if (generatorSketchbookRecentSelect) generatorSketchbookRecentSelect.value = entry.id;
    }

    function loadSelectedGeneratorSketchbookRecentEntry() {
      const entry = generatorSketchbookRecentEntries.find(item => item.id === generatorSketchbookRecentSelect?.value)
        ?? generatorSketchbookRecentEntries[0];
      applyGeneratorSketchbookRecentEntry(entry);
    }

    function autoApplyLatestGeneratorSketchbookRecentEntry() {
      if (!areGeneratorSketchbookFieldsEmpty()) return;
      applyGeneratorSketchbookRecentEntry(generatorSketchbookRecentEntries[0]);
    }

    function refreshGeneratorSketchbookRecentControls({ autoApplyLatest = false } = {}) {
      loadGeneratorSketchbookRecentEntries();
      renderGeneratorSketchbookRecentChoices();
      if (autoApplyLatest) autoApplyLatestGeneratorSketchbookRecentEntry();
    }

    function saveCurrentGeneratorImagePromptContextToSketchbookRecent() {
      const entry = captureCurrentGeneratorSketchbookContext();
      if (!entry) return;
      generatorSketchbookRecentEntries = [
        entry,
        ...generatorSketchbookRecentEntries.filter(item => !isSameGeneratorSketchbookRecentEntry(item, entry))
      ].slice(0, generatorSketchbookRecentLimit);
      persistGeneratorSketchbookRecentEntries();
      renderGeneratorSketchbookRecentChoices();
      if (generatorMainActiveTab === "followup") {
        autoApplyLatestGeneratorSketchbookRecentEntry();
      }
    }

    function buildFollowupSketchSheetPrompt() {
      const characterName = getGeneratorFollowupCharacterName();
      const nameLine = characterName ? `캐릭터 이름: ${characterName}` : "캐릭터 이름:";
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

    function buildFollowupComingSoonPrompt(kind) {
      const characterName = getGeneratorFollowupCharacterName();
      return [
        `${kind} 프롬프트는 아직 등록되지 않았습니다.`,
        "",
        "다음 단계에서 해당 프롬프트 문구를 알려주시면 이 버튼에 연결하겠습니다.",
        "",
        characterName ? `현재 캐릭터 이름: ${characterName}` : "현재 캐릭터 이름: "
      ].join("\n");
    }


    function hasGeneratorResult() {
      return generatorResult && Object.keys(generatorResult).length > 0;
    }

    function buildGeneratorPrompt() {
      if (!hasGeneratorResult()) return "";
      const outfitText = buildOutfitText([
        getGeneratorListValue("outfit", "\uC0C1\uC758"),
        getGeneratorListValue("outfit", "\uD558\uC758"),
        getGeneratorListValue("outfit", "\uC6D0\uD53C\uC2A4/\uC804\uC2E0\uBCF5"),
        getGeneratorListValue("outfit", "\uC678\uD22C"),
        getGeneratorListValue("outfit", "\uBAA8\uC790"),
        getGeneratorListValue("outfit", "\uB808\uADF8\uC6E8\uC5B4"),
        getGeneratorListValue("outfit", "\uC2E0\uBC1C")
      ]);
      const fashionPoints = getGeneratorEntry("fashionPoints");
      const features = getGeneratorEntry("features");
      return [
        "\uCE90\uB9AD\uD130\uC758 \uC77C\uB7EC\uC2A4\uD2B8\uB97C \uC0DD\uC131\uD574\uC8FC\uC138\uC694.",
        "",
        `\uCE90\uB9AD\uD130\uB294 ${getGeneratorEntry("genre")} \uC7A5\uB974\uC5D0 \uB098\uC624\uB294 \uC5EC\uC131 \uCE90\uB9AD\uD130\uC785\uB2C8\uB2E4.`,
        "",
        `\uCE90\uB9AD\uD130\uC758 \uC678\uD615 \uB098\uC774\uB300\uB294 ${getGeneratorEntry("visualAge")} \uC785\uB2C8\uB2E4.`,
        "",
        `\uCE90\uB9AD\uD130\uC758 \uC885\uC871\uC740 ${getGeneratorEntry("race")}\uC785\uB2C8\uB2E4.`,
        "",
        `\uCE90\uB9AD\uD130\uC758 \uC9C1\uC5C5\uC740 ${getGeneratorEntry("role")}\uC785\uB2C8\uB2E4.`,
        "",
        `\uCE90\uB9AD\uD130\uC758 \uC131\uACA9/\uBD84\uC704\uAE30\uB294 ${getGeneratorEntry("personality")} \uC785\uB2C8\uB2E4.`,
        "",
        `\uCE90\uB9AD\uD130\uC758 \uBB34\uAE30\uB294 ${getGeneratorEntry("weapon")} \uC785\uB2C8\uB2E4.`,
        "",
        getGeneratorEntry("power") === "\uC5C6\uC74C"
          ? "\uCE90\uB9AD\uD130\uC758 \uB2A5\uB825\uC740 \uC5C6\uC2B5\uB2C8\uB2E4."
          : `\uCE90\uB9AD\uD130\uC758 \uB2A5\uB825\uC740 ${getGeneratorEntry("power")} \uC785\uB2C8\uB2E4.`,
        "",
		outfitText ? `\uCE90\uB9AD\uD130\uB294 ${outfitText}\uC744 \uC785\uACE0 \uC788\uC2B5\uB2C8\uB2E4.` : "",
        fashionPoints ? `\uCE90\uB9AD\uD130\uC758 \uD328\uC158\uD3EC\uC778\uD2B8\uB294 ${fashionPoints}\uC785\uB2C8\uB2E4.` : "",
        "",
        features ? `\uCE90\uB9AD\uD130\uC758 \uD2B9\uC9D5\uC740 ${features} \uC785\uB2C8\uB2E4.` : "",
        "",
        `\uCE90\uB9AD\uD130\uC758 \uD5E4\uC5B4\uC2A4\uD0C0\uC77C\uC740 ${getGeneratorEntry("hairstyle")} \uC785\uB2C8\uB2E4.`,
        "",
        `\uCE90\uB9AD\uD130\uC758 \uBA38\uB9AC\uC0C9\uC740 ${getGeneratorListValue("colors", "\uBA38\uB9AC")} \uC774\uACE0 \uB208\uC0C9\uC740 ${getGeneratorListValue("colors", "\uB208")} \uC785\uB2C8\uB2E4.`,
        "",
        `\uCE90\uB9AD\uD130\uC758 \uD53C\uBD80\uC0C9\uC740 ${getGeneratorListValue("colors", "\uD53C\uBD80")} \uC774\uACE0 \uC0C1\uC9D5 \uC0C9\uC740 ${getGeneratorListValue("colors", "\uC0C1\uC9D5")} \uC785\uB2C8\uB2E4.`,
        "",
        
        "\n-----\uC7A5\uBA74-----\n",
        "",
        "",
        "\uC774\uBBF8\uC9C0 \uC2A4\uD0C0\uC77C\uC740 \uACE0\uD004\uB9AC\uD2F0 \uC560\uB2C8\uBA54\uC774\uC158\uD48D\uC758 \uAC8C\uC784 \uC77C\uB7EC\uC2A4\uD2B8\uC774\uACE0 \uBC18\uC2E4\uC0AC \uB80C\uB354\uB9C1 \uC785\uB2C8\uB2E4.",
        "",
        "\uC124\uBA85\uBB38\uC740 \uB9CC\uB4E4\uC9C0 \uB9D0\uC544\uC8FC\uC138\uC694."
      ].filter(line => line !== "").join("\n");
    }

    function getGeneratorAssistValue(input) {
      return String(input?.value || "").trim();
    }

    function hasGeneratorOptionalValue(value) {
      const text = String(value || "").trim();
      return text !== "" && text !== "없음";
    }

    let generatorAssistNotesState = {
      scene: "",
      composition: "",
      direction: ""
    };

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
      generatorAssistNotesState = {
        scene: "",
        composition: "",
        direction: ""
      };
      renderGeneratorSetPastePreview();
    }

    function buildGeneratorSetPasteModalText() {
      const notes = getGeneratorAssistNotes();
      if (!notes.scene && !notes.composition && !notes.direction) return "";
      return [
        "A안",
        notes.scene ? `- 장면: ${notes.scene}` : "- 장면:",
        notes.composition ? `- 구도: ${notes.composition}` : "- 구도:",
        notes.direction ? `- 연출: ${notes.direction}` : "- 연출:"
      ].join("\n");
    }

    function renderGeneratorSetPastePreview() {
      if (!generatorSetPastePreview) return;
      const notes = getGeneratorAssistNotes();
      const hasAny = Boolean(notes.scene || notes.composition || notes.direction);
      if (!hasAny) {
        generatorSetPastePreview.classList.add("is-empty");
        generatorSetPastePreview.innerHTML = '<p class="generator-set-paste-preview-empty">아직 적용된 연출 세트가 없습니다. 버튼을 눌러 A안/B안/C안 전체를 그대로 붙여넣어 주세요.</p>';
        return;
      }
      generatorSetPastePreview.classList.remove("is-empty");
      const items = [
        ["장면", notes.scene],
        ["구도", notes.composition],
        ["연출", notes.direction]
      ].map(([label, value]) => (`<div class="generator-set-paste-preview-item"><span class="generator-set-paste-preview-label">${label}</span><p class="generator-set-paste-preview-value">${escapeHtml(value || "미입력")}</p></div>`)).join("");
      generatorSetPastePreview.innerHTML = items;
    }

    function openGeneratorSetPasteModal() {
      if (!generatorSetPasteModal || !generatorSetPasteText) return;
      generatorSetPasteText.value = buildGeneratorSetPasteModalText();
      generatorSetPasteModal.classList.remove("hidden");
      generatorSetPasteText.focus();
    }

    function closeGeneratorSetPasteModal() {
      generatorSetPasteModal?.classList.add("hidden");
    }

    function sanitizeGeneratorPasteText(text) {
      return String(text || "").replace(/[\u200B-\u200D\uFEFF\u00A0]/g, " ");
    }

    function normalizeGeneratorPasteLabel(label) {
      return String(label || "")
        .replace(/[\*_`~]/g, "")
        .replace(/[：:]+$/g, "")
        .replace(/\s+/g, " ")
        .trim();
    }

    function stripGeneratorPasteLineDecorators(line) {
      return String(line || "")
        .replace(/^[\s>*-•·▪◦‣⁃‧●○◆◇▶▷▸▹]+/, "")
        .replace(/[\*_`~]/g, "")
        .replace(/\s+/g, " ")
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

    function parseGeneratorSetPasteText(text) {
      const values = {
        scene: "",
        composition: "",
        direction: ""
      };
      const labelMap = new Map([
        ["장면", "scene"],
        ["구도", "composition"],
        ["연출", "direction"]
      ]);
      const buckets = {
        scene: [],
        composition: [],
        direction: []
      };
      let currentKey = "";

      sanitizeGeneratorPasteText(text)
        .split(/\r?\n/)
        .forEach(rawLine => {
          const line = String(rawLine || "").trim();
          if (!line) return;

          if (isGeneratorSetHeading(line)) {
            currentKey = "";
            return;
          }

          const section = parseGeneratorPasteSection(line, labelMap);
          if (section) {
            currentKey = section.key;
            if (section.value) {
              buckets[currentKey].push(section.value);
            }
            return;
          }

          if (!currentKey) return;

          const continuation = stripGeneratorPasteLineDecorators(line);
          if (!continuation || isGeneratorSetHeading(continuation)) return;
          buckets[currentKey].push(continuation);
        });

      Object.keys(values).forEach(key => {
        values[key] = buckets[key]
          .map(value => String(value || "").trim())
          .filter(Boolean)
          .join("\n")
          .trim();
      });

      return values;
    }

    function applyGeneratorAssistValues(values) {
      generatorAssistNotesState = {
        scene: String(values?.scene || "").trim(),
        composition: String(values?.composition || "").trim(),
        direction: String(values?.direction || "").trim()
      };
      renderGeneratorSetPastePreview();
    }

    function applyGeneratorSetPasteFromModal() {
      const parsed = parseGeneratorSetPasteText(generatorSetPasteText?.value || "");
      const hasAnyField = Object.values(parsed).some(value => String(value || "").trim());
      if (!hasAnyField) {
        if (applyGeneratorSetPasteButton) {
          const defaultLabel = "적용";
          applyGeneratorSetPasteButton.textContent = "형식 확인";
          setTimeout(() => {
            applyGeneratorSetPasteButton.textContent = defaultLabel;
          }, 1200);
        }
        return;
      }
      applyGeneratorAssistValues(parsed);
      closeGeneratorSetPasteModal();
    }

    function buildGeneratorQuestionPrompt() {
      if (!hasGeneratorResult()) return "";
      const outfitText = buildOutfitText([
        getGeneratorListValue("outfit", "\uC0C1\uC758"),
        getGeneratorListValue("outfit", "\uD558\uC758"),
        getGeneratorListValue("outfit", "\uC6D0\uD53C\uC2A4/\uC804\uC2E0\uBCF5"),
        getGeneratorListValue("outfit", "\uC678\uD22C"),
        getGeneratorListValue("outfit", "\uBAA8\uC790"),
        getGeneratorListValue("outfit", "\uB808\uADF8\uC6E8\uC5B4"),
        getGeneratorListValue("outfit", "\uC2E0\uBC1C")
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

    function buildGeneratorImagePrompt() {
      if (!hasGeneratorResult()) return "";
      const outfitText = buildOutfitText([
        getGeneratorListValue("outfit", "\uC0C1\uC758"),
        getGeneratorListValue("outfit", "\uD558\uC758"),
        getGeneratorListValue("outfit", "\uC6D0\uD53C\uC2A4/\uC804\uC2E0\uBCF5"),
        getGeneratorListValue("outfit", "\uC678\uD22C"),
        getGeneratorListValue("outfit", "\uBAA8\uC790"),
        getGeneratorListValue("outfit", "\uB808\uADF8\uC6E8\uC5B4"),
        getGeneratorListValue("outfit", "\uC2E0\uBC1C")
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
        `캐릭터의 머리색은 ${getGeneratorListValue("colors", "\uBA38\uB9AC")} 이고 눈색은 ${getGeneratorListValue("colors", "\uB208")} 입니다.`,
        `캐릭터의 피부색은 ${getGeneratorListValue("colors", "\uD53C\uBD80")} 이고 상징 색은 ${getGeneratorListValue("colors", "\uC0C1\uC9D5")} 입니다.`,
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

    function setGeneratorPromptModalContent({ kicker, title, copy, text, copyLabel = "복사", source = "" }) {
      generatorPromptModalNoticeMode = false;
      generatorPromptModalNoticeAfterClose = null;
      if (generatorPromptModalKicker) generatorPromptModalKicker.textContent = kicker;
      if (generatorPromptModalTitle) generatorPromptModalTitle.textContent = title;
      if (generatorPromptModalCopy) generatorPromptModalCopy.textContent = copy;
      if (generatorQuestionPromptText) {
        generatorQuestionPromptText.value = text;
        generatorQuestionPromptText.classList.remove("hidden");
      }
      cancelGeneratorQuestionPromptButton?.classList.remove("hidden");
      generatorPromptModalDefaultLabel = copyLabel;
      generatorPromptModalSource = source;
      if (copyGeneratorQuestionPromptButton) copyGeneratorQuestionPromptButton.textContent = copyLabel;
    }

    function showGeneratorPromptSiteNotice({ kicker = "NOTICE", title, copy, buttonLabel = "확인", afterClose = null }) {
      generatorPromptModalNoticeMode = true;
      generatorPromptModalNoticeAfterClose = typeof afterClose === "function" ? afterClose : null;
      generatorPromptModalSource = "notice";
      if (generatorPromptModalKicker) generatorPromptModalKicker.textContent = kicker;
      if (generatorPromptModalTitle) generatorPromptModalTitle.textContent = title;
      if (generatorPromptModalCopy) generatorPromptModalCopy.textContent = copy;
      if (generatorQuestionPromptText) generatorQuestionPromptText.classList.add("hidden");
      cancelGeneratorQuestionPromptButton?.classList.add("hidden");
      if (copyGeneratorQuestionPromptButton) {
        copyGeneratorQuestionPromptButton.textContent = buttonLabel;
      }
      generatorPromptModal?.classList.remove("hidden");
      copyGeneratorQuestionPromptButton?.focus();
    }

    function showGeneratorPromptCopyNotice() {
      showGeneratorPromptSiteNotice({
        title: "복사되었습니다.",
        copy: "프롬프트가 클립보드에 복사되었습니다."
      });
    }

    function openGeneratorQuestionPromptModal() {
      if (!generatorPromptModal || !generatorQuestionPromptText) return;
      setGeneratorPromptModalContent({
        kicker: "QUESTION PROMPT",
        title: "질문용 프롬프트 확인",
        copy: "아래 내용을 확인한 뒤 복사 버튼을 눌러 ChatGPT에 붙여넣으세요.",
        text: buildGeneratorQuestionPrompt(),
        copyLabel: "복사",
        source: "question"
      });
      generatorPromptModal.classList.remove("hidden");
      copyGeneratorQuestionPromptButton?.focus();
    }

    function openGeneratorImagePromptModal() {
      if (!generatorPromptModal || !generatorQuestionPromptText) return;
      setGeneratorPromptModalContent({
        kicker: "IMAGE PROMPT",
        title: "생성용 프롬프트 확인",
        copy: "아래 내용을 확인한 뒤 복사 버튼을 눌러 이미지 생성에 붙여넣으세요.",
        text: buildGeneratorImagePrompt(),
        copyLabel: "복사",
        source: "image"
      });
      generatorPromptModal.classList.remove("hidden");
      copyGeneratorQuestionPromptButton?.focus();
    }

    function openFollowupSketchSheetPromptModal() {
      if (!generatorPromptModal || !generatorQuestionPromptText) return;
      if (!ensureGeneratorFollowupCharacterName()) return;
      setGeneratorPromptModalContent({
        kicker: "FOLLOW-UP PROMPT",
        title: "낙서시트 프롬프트 확인",
        copy: "아래 내용을 확인한 뒤 복사 버튼을 눌러 이미지 생성에 붙여넣으세요.",
        text: buildFollowupSketchSheetPrompt(),
        copyLabel: "복사",
        source: "followup-sketch-sheet"
      });
      generatorPromptModal.classList.remove("hidden");
      copyGeneratorQuestionPromptButton?.focus();
    }

    function openFollowupTurnaroundPromptModal() {
      if (!generatorPromptModal || !generatorQuestionPromptText) return;
      if (!ensureGeneratorFollowupCharacterName()) return;
      setGeneratorPromptModalContent({
        kicker: "FOLLOW-UP PROMPT",
        title: "삼면도 프롬프트 확인",
        copy: "아래 내용을 확인한 뒤 복사 버튼을 눌러 이미지 생성에 붙여넣으세요.",
        text: buildFollowupTurnaroundPrompt(),
        copyLabel: "복사",
        source: "followup-turnaround"
      });
      generatorPromptModal.classList.remove("hidden");
      copyGeneratorQuestionPromptButton?.focus();
    }

    function openFollowupMagazinePromptModal() {
      if (!generatorPromptModal || !generatorQuestionPromptText) return;
      if (!ensureGeneratorFollowupCharacterName()) return;
      setGeneratorPromptModalContent({
        kicker: "FOLLOW-UP PROMPT",
        title: "잡지 프롬프트 확인",
        copy: "아래 내용을 확인한 뒤 복사 버튼을 눌러 이미지 생성에 붙여넣으세요.",
        text: buildFollowupMagazinePrompt(),
        copyLabel: "복사",
        source: "followup-magazine"
      });
      generatorPromptModal.classList.remove("hidden");
      copyGeneratorQuestionPromptButton?.focus();
    }

    function openFollowupSketchbookPromptModal() {
      if (!generatorPromptModal || !generatorQuestionPromptText) return;
      setGeneratorPromptModalContent({
        kicker: "FOLLOW-UP PROMPT",
        title: "스케치북 프롬프트 확인",
        copy: "아래 내용을 확인한 뒤 복사 버튼을 눌러 이미지 생성에 붙여넣으세요.",
        text: buildFollowupSketchbookPrompt(),
        copyLabel: "복사",
        source: "followup-sketchbook"
      });
      generatorPromptModal.classList.remove("hidden");
      copyGeneratorQuestionPromptButton?.focus();
    }

    function openFollowupBodyInfoPromptModal() {
      if (!generatorPromptModal || !generatorQuestionPromptText) return;
      setGeneratorPromptModalContent({
        kicker: "FOLLOW-UP PROMPT",
        title: "신체정보 프롬프트 확인",
        copy: "아래 내용을 확인한 뒤 복사 버튼을 눌러 분석 요청에 붙여넣으세요.",
        text: buildFollowupBodyInfoPrompt(),
        copyLabel: "복사",
        source: "followup-body-info"
      });
      generatorPromptModal.classList.remove("hidden");
      copyGeneratorQuestionPromptButton?.focus();
    }

    function openFollowupCookingMagazinePromptModal() {
      if (!generatorPromptModal || !generatorQuestionPromptText) return;
      if (!ensureGeneratorFollowupCharacterName()) return;
      setGeneratorPromptModalContent({
        kicker: "FOLLOW-UP PROMPT",
        title: "요리잡지 프롬프트 확인",
        copy: "아래 내용을 확인한 뒤 복사 버튼을 눌러 이미지 생성에 붙여넣으세요.",
        text: buildFollowupCookingMagazinePrompt(),
        copyLabel: "복사",
        source: "followup-cooking-magazine"
      });
      generatorPromptModal.classList.remove("hidden");
      copyGeneratorQuestionPromptButton?.focus();
    }

    function openFollowupComingSoonPromptModal(kind) {
      if (!generatorPromptModal || !generatorQuestionPromptText) return;
      setGeneratorPromptModalContent({
        kicker: "FOLLOW-UP PROMPT",
        title: `${kind} 프롬프트 준비 중`,
        copy: "아직 등록되지 않은 후속 이미지 프롬프트입니다.",
        text: buildFollowupComingSoonPrompt(kind),
        copyLabel: "복사",
        source: "followup-coming-soon"
      });
      generatorPromptModal.classList.remove("hidden");
      copyGeneratorQuestionPromptButton?.focus();
    }

    function closeGeneratorQuestionPromptModal() {
      const afterClose = generatorPromptModalNoticeMode ? generatorPromptModalNoticeAfterClose : null;
      generatorPromptModal?.classList.add("hidden");
      generatorPromptModalSource = "";
      generatorPromptModalNoticeMode = false;
      generatorPromptModalNoticeAfterClose = null;
      if (afterClose) afterClose();
    }

    async function copyGeneratorQuestionPromptFromModal() {
      if (generatorPromptModalNoticeMode) {
        closeGeneratorQuestionPromptModal();
        return;
      }
      const text = generatorQuestionPromptText?.value || "";
      if (!text) return;
      const copied = await writeClipboardText(
        text,
        null,
        generatorPromptModalDefaultLabel,
        "프롬프트를 복사해주세요."
      );
      if (!copied) return;
      if (generatorPromptModalSource === "image") {
        saveCurrentGeneratorImagePromptContextToSketchbookRecent();
      }
      showGeneratorPromptCopyNotice();
    }

    async function writeClipboardText(text, button, defaultLabel, fallbackMessage) {
      try {
        await navigator.clipboard.writeText(text);
        if (button) {
          button.textContent = "복사 완료";
          setTimeout(() => {
            button.textContent = defaultLabel;
          }, 1200);
        }
        return true;
      } catch (error) {
        window.prompt(fallbackMessage, text);
        return false;
      }
    }

    function copyGeneratorPrompt() {
      if (!hasGeneratorResult()) {
        if (copyGeneratorButton) {
          const defaultLabel = "질문용 프롬프트 보기";
          copyGeneratorButton.textContent = "생성 필요";
          setTimeout(() => {
            copyGeneratorButton.textContent = defaultLabel;
          }, 1200);
        }
        return;
      }
      openGeneratorQuestionPromptModal();
    }

    function copyGeneratorImagePrompt() {
      if (!hasGeneratorResult()) {
        if (copyGeneratorImagePromptButton) {
          const defaultLabel = "생성용 프롬프트 보기";
          copyGeneratorImagePromptButton.textContent = "생성 필요";
          setTimeout(() => {
            copyGeneratorImagePromptButton.textContent = defaultLabel;
          }, 1200);
        }
        return;
      }
      if (!hasCompleteGeneratorAssistNotes()) {
        showGeneratorPromptSiteNotice({
          title: "연출 세트가 필요합니다.",
          copy: "연출 세트를 먼저 붙여넣어 주세요. 장면, 구도, 연출이 모두 필요합니다."
        });
        return;
      }
      openGeneratorImagePromptModal();
    }

    async function copyNegativeGeneratorPrompt() {
      await writeClipboardText(
        generatorNegativePrompt,
        copyNegativePromptButton,
        "네거티브 복사",
        "네거티브 프롬프트를 복사해주세요."
      );
    }

    function createGeneratorResult(overrides = {}) {
	  const genre = overrides.genre ?? pickRandomFrom(generatorGenreGroups);
      const rule = generatorGenreRules[genre] ?? {};
	  //const genreGroup = pickRandomFrom(Object.keys(generatorGenreGroups));
      //const genre = pickRandomFrom(generatorGenreGroups[genreGroup] ?? []);
      //const rule = generatorGenreRules[genreGroup] ?? {};
      const featureCount = pickWeightedCount(generatorCountWeights.features);
      const powerCount = pickWeightedCount(generatorCountWeights.power);
      const fashionPointCount = pickWeightedCount(generatorCountWeights.fashionPoints);
      const visualAgeGroup = pickRandomFrom(generatorCommonOptions.visualAgeGroups ?? []);

      return {
        genre,
        race: overrides.race ?? pickFromAllowedGroups(generatorSpeciesGroups, rule.allowedSpeciesGroups, rule.allowedSpeciesItems),
        role: overrides.role ?? pickFromAllowedGroups(generatorJobGroups, rule.allowedJobGroups, rule.allowedJobItems),
        personality: pickRandomFrom(generatorCommonOptions.personality ?? []),
        visualAge: visualAgeGroup,
        features: pickUnique(generatorCommonOptions.features ?? [], featureCount).join(", ") || "없음",
        weapon: pickFromAllowedGroups(generatorWeaponGroups, rule.allowedWeaponGroups, rule.allowedWeaponItems),
        power: pickUnique(generatorCommonOptions.powers ?? [], powerCount).join(", ") || "없음",
        hairstyle: pickRandomFrom(generatorCommonOptions.hairstyles ?? []),
        outfit: createOutfitResult(),
        fashionPoints: pickUnique(generatorCommonOptions.fashionPoints ?? [], fashionPointCount).join(", ") || "없음",
        colors: overrides.colors ?? createColorSet()
      };
    }

    function getGeneratorFieldLabel(key) {
      return generatorFields.find(([fieldKey]) => fieldKey === key)?.[1] ?? key;
    }

    function renderGeneratorValue(valueElement, key) {
      const value = generatorResult[key] ?? "";
      if (Array.isArray(value)) {
        valueElement.classList.add("generator-value-list");
        value.forEach(entry => {
          const line = document.createElement("div");
          line.className = "generator-value-line";
          if (entry && typeof entry === "object") {
            const lineLabel = document.createElement("span");
            lineLabel.className = "generator-value-key";
            lineLabel.textContent = entry.label;
            const lineValue = document.createElement("b");
            if (key === "colors") {
              const swatch = document.createElement("i");
              swatch.className = "generator-color-swatch";
              swatch.style.backgroundColor = entry.value;
              lineValue.append(swatch, document.createTextNode(entry.value));
            } else {
              lineValue.textContent = key === "outfit" ? normalizeOutfitValue(entry.value) : entry.value;
            }
            line.append(lineLabel, lineValue);
          } else {
            line.textContent = entry;
          }
          valueElement.appendChild(line);
        });
        return;
      }
      valueElement.textContent = value;
    }

    function createGeneratorItem(key) {
      const item = document.createElement("article");
      const value = generatorResult[key] ?? "";
      item.className = `generator-item generator-two-column-item generator-item-${key}`;
      item.classList.toggle("generator-item-compound", Array.isArray(value));
      item.setAttribute("role", "listitem");

      const labelElement = document.createElement("div");
      labelElement.className = "generator-label";
      const labelText = document.createElement("span");
      labelText.textContent = getGeneratorFieldLabel(key);
      labelElement.appendChild(labelText);

      if (lockableGeneratorKeys.has(key)) {
        const isDependentLock = key === "race" || key === "role";
        const lockDisabled = isDependentLock && !lockedGeneratorKeys.has("genre");
        const lockButton = document.createElement("button");
        lockButton.type = "button";
        lockButton.className = "generator-lock-button";
        lockButton.classList.toggle("is-locked", lockedGeneratorKeys.has(key));
        lockButton.disabled = lockDisabled;
        lockButton.textContent = lockedGeneratorKeys.has(key) ? "고정됨" : "고정";
        lockButton.title = lockDisabled ? "장르를 먼저 고정해야 합니다" : "현재 값을 다음 생성에도 유지";
        lockButton.setAttribute("aria-pressed", String(lockedGeneratorKeys.has(key)));
        lockButton.addEventListener("click", () => {
          if (lockDisabled) return;
          if (lockedGeneratorKeys.has(key)) {
            lockedGeneratorKeys.delete(key);
            if (key === "genre") {
              lockedGeneratorKeys.delete("race");
              lockedGeneratorKeys.delete("role");
            }
          } else {
            lockedGeneratorKeys.add(key);
          }
          updateGenerateButtonLabel();
          renderGeneratorResult();
        });
        labelElement.appendChild(lockButton);
      }

      const valueElement = document.createElement("div");
      valueElement.className = "generator-value";
      renderGeneratorValue(valueElement, key);
      item.append(labelElement, valueElement);
      return item;
    }

    function createGeneratorResultColumn(section) {
      const column = document.createElement("section");
      column.className = `generator-result-column ${section.className}`;
      column.setAttribute("aria-label", section.title);

      const heading = document.createElement("h3");
      heading.className = "generator-result-column-title";
      heading.textContent = section.title;

      const list = document.createElement("div");
      list.className = "generator-result-column-list";
      list.setAttribute("role", "list");

      section.keys.forEach(key => {
        list.appendChild(createGeneratorItem(key));
      });

      column.append(heading, list);
      return column;
    }

    function cloneGeneratorResultSnapshot(result) {
      try {
        return JSON.parse(JSON.stringify(result ?? {}));
      } catch (error) {
        return {};
      }
    }

    function createGeneratorHistorySummary(result) {
      const parts = [
        result?.race,
        result?.role,
        result?.personality
      ].filter(Boolean);
      return parts.join(" · ") || "랜덤 결과";
    }

    function isSameGeneratorHistoryResult(first, second) {
      try {
        return JSON.stringify(first ?? {}) === JSON.stringify(second ?? {});
      } catch (error) {
        return false;
      }
    }

    function persistGeneratorHistory() {
      try {
        localStorage.setItem(generatorHistoryStorageKey, JSON.stringify(generatorHistory.slice(0, 5)));
      } catch (error) {
        // Ignore storage failures; the current result remains usable.
      }
    }

    function saveCurrentGeneratorResultToHistory() {
      if (!generatorResult || Object.keys(generatorResult).length === 0) return;
      const snapshot = cloneGeneratorResultSnapshot(generatorResult);
      if (Object.keys(snapshot).length === 0) return;
      const entry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        savedAt: new Date().toISOString(),
        summary: createGeneratorHistorySummary(snapshot),
        result: snapshot,
        lockedKeys: [...lockedGeneratorKeys]
      };
      generatorHistory = [
        entry,
        ...generatorHistory.filter(historyEntry => !isSameGeneratorHistoryResult(historyEntry?.result, snapshot))
      ].slice(0, 5);
      persistGeneratorHistory();
    }

    function formatGeneratorHistoryTime(savedAt) {
      if (!savedAt) return "";
      const date = new Date(savedAt);
      if (Number.isNaN(date.getTime())) return "";
      return date.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
    }

    function renderGeneratorHistory() {
      if (!generatorHistoryList) return;
      generatorHistoryList.innerHTML = "";

      if (clearGeneratorHistoryButton) {
        clearGeneratorHistoryButton.disabled = generatorHistory.length === 0;
      }

      if (generatorHistory.length === 0) {
        const empty = document.createElement("p");
        empty.className = "generator-history-empty";
        empty.textContent = "최근 결과 없음";
        generatorHistoryList.appendChild(empty);
        return;
      }

      generatorHistory.forEach((entry, index) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "generator-history-item";
        button.dataset.generatorHistoryId = entry.id;
        button.title = "이 결과 불러오기";

        const indexElement = document.createElement("span");
        indexElement.className = "generator-history-index";
        indexElement.textContent = `#${index + 1}`;

        const summaryElement = document.createElement("span");
        summaryElement.className = "generator-history-summary";
        summaryElement.textContent = entry.summary || createGeneratorHistorySummary(entry.result);

        const timeElement = document.createElement("span");
        timeElement.className = "generator-history-time";
        timeElement.textContent = formatGeneratorHistoryTime(entry.savedAt);

        button.append(indexElement, summaryElement, timeElement);
        button.addEventListener("click", () => restoreGeneratorHistoryEntry(entry.id));
        generatorHistoryList.appendChild(button);
      });
    }

    function restoreGeneratorHistoryEntry(entryId) {
      const entry = generatorHistory.find(historyEntry => historyEntry.id === entryId);
      if (!entry) return;
      generatorResult = cloneGeneratorResultSnapshot(entry.result);
      lockedGeneratorKeys.clear();
      (entry.lockedKeys ?? []).forEach(key => {
        if (lockableGeneratorKeys.has(key)) {
          lockedGeneratorKeys.add(key);
        }
      });
      renderGeneratorResult();
    }

    function clearGeneratorHistory() {
      generatorHistory = [];
      persistGeneratorHistory();
      renderGeneratorHistory();
    }

    function renderGeneratorPreviews() {
      const hasResult = hasGeneratorResult();
      if (generatorPromptPreview) {
        generatorPromptPreview.textContent = hasResult
          ? buildGeneratorPrompt()
          : "전체 랜덤 생성을 누르면 프롬프트가 표시됩니다.";
      }
      if (negativePromptPreview) {
        negativePromptPreview.textContent = generatorNegativePrompt;
      }
      if (copyGeneratorButton) {
        copyGeneratorButton.disabled = !hasResult;
      }
      if (copyGeneratorImagePromptButton) {
        copyGeneratorImagePromptButton.disabled = !hasResult;
      }
    }


    function renderGeneratorLockSummary() {
      if (!generatorLockSummary || !clearGeneratorLocksButton) return;
      const lockedLabels = [...lockedGeneratorKeys].map(getGeneratorFieldLabel);
      if (lockedLabels.length === 0) {
        generatorLockSummary.textContent = "고정된 항목 없음";
        clearGeneratorLocksButton.classList.add("hidden");
        return;
      }
      generatorLockSummary.textContent = `고정 중: ${lockedLabels.join(", ")}`;
      clearGeneratorLocksButton.classList.remove("hidden");
    }

    function renderGeneratorResult() {
      generatorGrid.innerHTML = "";
      generatorGrid.className = "generator-grid generator-two-column-result";

      if (!hasGeneratorResult()) {
        generatorGrid.classList.add("generator-grid-empty");
        const empty = document.createElement("section");
        empty.className = "generator-empty-state";
        empty.setAttribute("aria-live", "polite");

        const title = document.createElement("h2");
        title.className = "generator-empty-title";
        title.textContent = "아직 생성된 결과가 없습니다.";

        const copy = document.createElement("p");
        copy.className = "generator-empty-copy";
        copy.textContent = "왼쪽의 전체 랜덤 생성을 누르면 랜덤 결과와 프롬프트가 표시됩니다. 최근 결과를 선택하면 이전 결과를 불러올 수 있습니다.";

        empty.append(title, copy);
        generatorGrid.appendChild(empty);

        renderGeneratorPreviews();
        renderGeneratorLockSummary();
        renderGeneratorHistory();
        updateGenerateButtonLabel();
        return;
      }

      const heading = document.createElement("div");
      heading.className = "generator-result-heading";
      const title = document.createElement("h2");
      title.className = "generator-result-title";
      title.textContent = "랜덤 결과";
      const note = document.createElement("p");
      note.className = "generator-result-note";
      note.textContent = "기본 정보와 복합 항목을 나누어 표시";
      heading.append(title, note);

      const columns = document.createElement("div");
      columns.className = "generator-result-columns";

      [
        {
          title: "기본 정보",
          className: "generator-result-column-basic",
          keys: ["genre", "race", "role", "personality", "visualAge", "features", "weapon", "power", "hairstyle"]
        },
        {
          title: "복장 · 색상",
          className: "generator-result-column-style",
          keys: ["outfit", "fashionPoints", "colors"]
        }
      ].forEach(section => {
        columns.appendChild(createGeneratorResultColumn(section));
      });

      generatorGrid.append(heading, columns);

      renderGeneratorPreviews();
      renderGeneratorLockSummary();
      renderGeneratorHistory();
      updateGenerateButtonLabel();
    }

    function getLockedGeneratorOverrides() {
      return Object.fromEntries([...lockedGeneratorKeys].map(key => [key, generatorResult[key]]));
    }

    function updateGenerateButtonLabel() {
      generateCharacterButton.textContent = lockedGeneratorKeys.size > 0 ? "고정값 유지하고 생성" : "전체 랜덤 생성";
    }

    function clearGeneratorLocks() {
      lockedGeneratorKeys.clear();
      renderGeneratorResult();
    }

    function generateFreshCharacter() {
      saveCurrentGeneratorResultToHistory();
      lockedGeneratorKeys.clear();
      generatorResult = createGeneratorResult();
      saveCurrentGeneratorResultToHistory();
      renderGeneratorResult();
    }

    function generateUnlockedCharacter() {
      saveCurrentGeneratorResultToHistory();
      generatorResult = createGeneratorResult(getLockedGeneratorOverrides());
      saveCurrentGeneratorResultToHistory();
      renderGeneratorResult();
    }

    function handleGenerateCharacter() {
      clearGeneratorAssistNotes();
      if (lockedGeneratorKeys.size > 0) {
        generateUnlockedCharacter();
        return;
      }
      generateFreshCharacter();
    }

    refreshGeneratorSketchbookRecentControls();
    setGeneratorMainTab(generatorMainActiveTab);
