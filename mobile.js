(() => {
  "use strict";

  const modeStorageKey = "orvia-mobile-mode-v1";
  const adminSessionStorageKey = "orvia-mobile-admin-unlocked-v1";
  const adminPassword = "dlfdltka45";
  const adminUnlockedAtStart = sessionStorage.getItem(adminSessionStorageKey) === "1";
  const state = {
    screen: "characters",
    mode: adminUnlockedAtStart && localStorage.getItem(modeStorageKey) === "admin" ? "admin" : "safe",
    adminUnlocked: adminUnlockedAtStart,
    adminAccessTapCount: 0,
    adminAccessLastTapAt: 0,
    query: "",
    storyQuery: "",
    selectedCharacterId: "",
    detailTab: "profile",
    activeStoryFile: "",
    activeImageViewer: null,
    generatorTab: "random",
    generated: null,
    generatorAssistNotes: {
      scene: "",
      composition: "",
      direction: ""
    },
    lockedGeneratorKeys: new Set(),
    generatorHistory: [],
    sketchbookRecentEntries: [],
    promptAfterCopy: null,
    promptSource: ""
  };

  const generatorHistoryStorageKey = "character-ui-generator-history-v1";
  const generatorSketchbookRecentStorageKey = "orvia-generator-sketchbook-recent-v1";
  const generatorRecentLimit = 5;
  const generatorSketchbookRecentLimit = 5;
  const lockableGeneratorKeys = new Set(["genre", "race", "role", "colors"]);
  const mobileHistoryMarker = "orvia-mobile-history-v1";
  const mobileHistoryScreens = new Set(["home", "characters", "detail", "library", "generator"]);
  const mobileHistoryDetailTabs = new Set(["profile", "library", "status", "images"]);
  let restoringMobileRoute = false;
  let lastMobileRouteSignature = "";

  function getMobileVisualViewportSize() {
    const viewport = window.visualViewport;
    const fallbackWidth = window.innerWidth || document.documentElement.clientWidth || 0;
    const fallbackHeight = window.innerHeight || document.documentElement.clientHeight || 0;
    return {
      width: Math.max(280, Math.floor(viewport?.width || fallbackWidth || 0)),
      height: Math.max(320, Math.floor(viewport?.height || fallbackHeight || 0)),
      offsetTop: Math.max(0, Math.floor(viewport?.offsetTop || 0))
    };
  }

  function syncMobileVisualViewport() {
    const viewport = getMobileVisualViewportSize();
    document.documentElement.style.setProperty("--mobile-visual-height", `${viewport.height}px`);
    document.documentElement.style.setProperty("--mobile-visual-offset-top", `${viewport.offsetTop}px`);
    if (elements.imageViewerModal && !elements.imageViewerModal.classList.contains("hidden")) {
      window.requestAnimationFrame(() => fitImageViewerStage());
    }
  }

  function bindMobileVisualViewport() {
    syncMobileVisualViewport();
    window.addEventListener("resize", syncMobileVisualViewport, { passive: true });
    window.addEventListener("orientationchange", syncMobileVisualViewport, { passive: true });
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", syncMobileVisualViewport, { passive: true });
      window.visualViewport.addEventListener("scroll", syncMobileVisualViewport, { passive: true });
    }
  }

  function focusModalControl(element) {
    if (!element) return;
    const focusAndScroll = () => {
      syncMobileVisualViewport();
      try {
        element.focus({ preventScroll: true });
      } catch (error) {
        element.focus();
      }
      element.scrollIntoView({ block: "center", inline: "nearest" });
    };
    setTimeout(focusAndScroll, 40);
    setTimeout(focusAndScroll, 360);
  }

  function blurModalControl(modal) {
    const active = document.activeElement;
    if (active && modal?.contains(active) && typeof active.blur === "function") active.blur();
  }


  const baseImageDefinitions = [
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
  entry.keys.forEach(key => { map[String(key).trim().toLowerCase().replace(/\s+/g, '')] = entry.prompt; });
  return map;
}, {});

  const elements = {};
  const imageViewerZoom = {
    scale: 1,
    x: 0,
    y: 0,
    pointers: new Map(),
    startScale: 1,
    startX: 0,
    startY: 0,
    startPointerX: 0,
    startPointerY: 0,
    startDistance: 0,
    startCenterX: 0,
    startCenterY: 0,
    moved: false,
    lastTapAt: 0,
    lastTapX: 0,
    lastTapY: 0
  };


  function $(id) {
    return document.getElementById(id);
  }

  function text(value, fallback = "") {
    return String(value ?? fallback).trim();
  }

  function escapeHtml(value = "") {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function normalizeId(value = "") {
    return text(value).replace(/\s+/g, "");
  }

  function stripStoryFolderNumberPrefix(value = "") {
    return normalizeId(value).replace(/^\d{3}-/, "");
  }

  function getCharacterId(character) {
    return normalizeId(character?.folder || character?.id || character?.en || character?.name || "unknown");
  }

  function getCharacterStoryId(character) {
    return normalizeId(character?.storyId)
      || stripStoryFolderNumberPrefix(character?.folder)
      || normalizeId(character?.id)
      || normalizeId(character?.en)
      || normalizeId(character?.name)
      || "unknown";
  }

  function getCharacterFolder(character) {
    return normalizeId(character?.folder || character?.id || character?.en || character?.name || "unknown");
  }

  function getCharacters() {
    return Array.isArray(window.CHARACTERS) ? window.CHARACTERS : [];
  }

  function getStories() {
    return Array.isArray(window.STORY_DATA) ? window.STORY_DATA : [];
  }

  const unregisteredValue = "미등록";

  function normalizeDisplayValue(value, fallback = unregisteredValue) {
    const normalized = text(value);
    return normalized || fallback;
  }

  function isUnregisteredValue(value) {
    return normalizeDisplayValue(value) === unregisteredValue;
  }

  function getBasicInfo(character) {
    return character?.profile?.basicInfo || {};
  }

  function basic(character, key, fallback = unregisteredValue) {
    const legacyKey = key === "measurements" ? "sizes" : key;
    const value = character?.profile?.basicInfo?.[key]
      ?? character?.info?.[legacyKey]
      ?? (key === "genre" ? character?.genre : undefined);
    return normalizeDisplayValue(value, fallback);
  }

  function getCharacterShortIntro(character) {
    return normalizeDisplayValue(character?.profile?.shortIntro ?? character?.intro, "준비 중입니다.");
  }

  function getCharacterQuote(character) {
    return normalizeDisplayValue(character?.profile?.quote ?? character?.speech, "준비 중입니다.");
  }

  function isAdminMode() {
    return state.mode === "admin";
  }

  function visibleCharacters() {
    const q = state.query.trim().toLowerCase();
    return getCharacters()
      .filter(character => isAdminMode() || !character.hidden)
      .filter(character => {
        if (!q) return true;
        const info = getBasicInfo(character);
        const search = [
          character.name,
          character.en,
          info.gender,
          info.world,
          info.genre,
          info.race,
          info.job,
          info.personality
        ].filter(Boolean).join(" ").toLowerCase();
        return search.includes(q);
      });
  }

  function getWorldName(worldId) {
    const groups = window.STORY_TAXONOMY?.genreGroups;
    const found = Array.isArray(groups) ? groups.find(group => group.code === worldId) : null;
    return found?.name || worldId || "세계관";
  }

  function storiesForCharacter(character) {
    const id = getCharacterStoryId(character);
    return getStories().filter(story => normalizeId(story.characterId) === id);
  }

  function storyCharacter(story) {
    const characterId = normalizeId(story?.characterId);
    if (!characterId) return null;
    return getCharacters().find(character => {
      const storyId = getCharacterStoryId(character);
      return storyId === characterId || stripStoryFolderNumberPrefix(character?.folder) === characterId || getCharacterId(character) === characterId;
    }) || null;
  }

  function getStoryRelatedCharacters(story) {
    if (Array.isArray(story?.relatedCharacters) && story.relatedCharacters.length > 0) {
      return [...new Set(story.relatedCharacters.filter(Boolean))];
    }
    const character = storyCharacter(story);
    return character?.name ? [character.name] : [];
  }

  function storySearchText(story) {
    const character = storyCharacter(story);
    const info = getBasicInfo(character);
    return [
      story?.title,
      story?.summary,
      story?.typeName,
      story?.type,
      story?.seriesName,
      story?.seasonName,
      story?.worldId,
      getWorldName(story?.worldId),
      getStoryRelatedCharacters(story).join(" "),
      character?.name,
      character?.en,
      info.world,
      info.genre,
      info.race,
      info.job
    ].filter(Boolean).join(" ").toLowerCase();
  }

  function storyMatchesQuery(story, query) {
    if (!query) return true;
    return storySearchText(story).includes(query);
  }

  function getStoryOrder(story) {
    const source = `${story?.id || ""} ${story?.file || ""}`;
    const matches = source.match(/(?:_|-)(\d{1,3})(?:\.md)?\b/g) || [];
    const last = matches.length > 0 ? matches[matches.length - 1].match(/\d{1,3}/)?.[0] : "";
    return last ? Number(last) : 1;
  }

  function compareStoryTitle(first, second) {
    return String(first || "").localeCompare(String(second || ""), "ko");
  }

  function compareStories(first, second) {
    const firstOrder = getStoryEpisodeOrder(first);
    const secondOrder = getStoryEpisodeOrder(second);
    if (firstOrder !== secondOrder) return firstOrder - secondOrder;
    return compareStoryTitle(first?.title, second?.title);
  }

  function getTaxonomyWorlds() {
    return Array.isArray(window.STORY_TAXONOMY?.genreGroups) ? window.STORY_TAXONOMY.genreGroups : [];
  }

  function getWorldOrder(worldId) {
    const target = String(worldId || "");
    const index = getTaxonomyWorlds().findIndex(group => group.code === target);
    return index < 0 ? Number.MAX_SAFE_INTEGER : index;
  }

  function getCharacterOrderInWorld(worldId, characterId) {
    const world = getTaxonomyWorlds().find(group => group.code === worldId);
    const characters = Array.isArray(world?.characters) ? world.characters : [];
    const index = characters.findIndex(item => normalizeId(item) === normalizeId(characterId));
    return index < 0 ? Number.MAX_SAFE_INTEGER : index;
  }

  function getStoryEpisodeOrder(story) {
    const explicitEpisode = Number(story?.episode);
    return Number.isFinite(explicitEpisode) && explicitEpisode > 0 ? explicitEpisode : getStoryOrder(story);
  }

  function countStoryGroupStories(groupNode) {
    return (Array.isArray(groupNode?.stories) ? groupNode.stories.length : 0)
      + (Array.isArray(groupNode?.children) ? groupNode.children.reduce((sum, childNode) => sum + countStoryGroupStories(childNode), 0) : 0);
  }

  function sortStoryGroups(groups = []) {
    const groupList = groups instanceof Map
      ? Array.from(groups.values())
      : Array.isArray(groups)
        ? groups
        : [];

    return groupList
      .map(groupNode => {
        const children = groupNode?.children instanceof Map
          ? Array.from(groupNode.children.values())
          : Array.isArray(groupNode?.children)
            ? groupNode.children
            : [];
        return {
          ...groupNode,
          stories: Array.isArray(groupNode.stories) ? groupNode.stories.sort(compareStories) : [],
          children: sortStoryGroups(children)
        };
      })
      .sort((first, second) => {
        if (first.order !== second.order) return first.order - second.order;
        return compareStoryTitle(first.title, second.title);
      });
  }

  function getOrCreateStoryGroup(groupMap, key, createData) {
    if (!groupMap.has(key)) {
      groupMap.set(key, {
        ...createData,
        stories: [],
        children: new Map()
      });
    }
    return groupMap.get(key);
  }

  function buildStoryTree(stories) {
    const worldMap = new Map();

    stories.forEach(story => {
      const worldId = text(story?.worldId, "uncategorized");
      const characterId = normalizeId(story?.characterId);
      const character = storyCharacter(story);
      const characterName = text(character?.name, characterId || "미등록 캐릭터");
      const seriesId = normalizeId(story?.seriesId);
      const seriesName = text(story?.seriesName);
      const isWorldSeriesStory = Boolean(seriesId || seriesName || !characterId);

      if (!worldMap.has(worldId)) {
        worldMap.set(worldId, {
          id: worldId,
          title: getWorldName(worldId),
          order: getWorldOrder(worldId),
          groups: new Map(),
          count: 0
        });
      }

      const world = worldMap.get(worldId);
      world.count += 1;

      if (isWorldSeriesStory) {
        const series = getOrCreateStoryGroup(world.groups, `series:${seriesId || "world-stories"}`, {
          id: seriesId || "world-stories",
          title: seriesName || "세계 소설",
          order: Number(story?.seriesOrder ?? -1000)
        });
        const seasonId = normalizeId(story?.seasonId || "season-1");
        const season = getOrCreateStoryGroup(series.children, `season:${seasonId}`, {
          id: seasonId,
          title: text(story?.seasonName, "시즌 1"),
          order: Number(story?.seasonOrder ?? 1)
        });
        season.stories.push(story);
        return;
      }

      if (!world.groups.has(`character:${characterId}`)) {
        world.groups.set(`character:${characterId}`, {
          id: characterId,
          title: characterName,
          order: getCharacterOrderInWorld(worldId, characterId),
          stories: [],
          children: new Map()
        });
      }
      world.groups.get(`character:${characterId}`).stories.push(story);
    });

    return Array.from(worldMap.values())
      .sort((first, second) => {
        if (first.order !== second.order) return first.order - second.order;
        return compareStoryTitle(first.title, second.title);
      })
      .map(world => ({
        ...world,
        groups: sortStoryGroups(world.groups)
      }));
  }

  function imagePath(character, fileName) {
    return `assets/characters/${getCharacterFolder(character)}/${fileName}`;
  }

  function markMissingImage(img) {
    const wrap = img.closest(".character-thumb, .detail-image-wrap, .image-tile-thumb");
    if (wrap) wrap.classList.add("is-missing");
    img.removeAttribute("src");
  }

  function createImage(src, alt) {
    const img = document.createElement("img");
    img.src = src;
    img.alt = alt || "";
    img.loading = "lazy";
    img.addEventListener("error", () => markMissingImage(img), { once: true });
    return img;
  }

  function setTitle(title) {
    if (elements.screenTitle) elements.screenTitle.textContent = title;
  }

  function canUseMobileHistory() {
    return Boolean(
      window.history &&
      typeof window.history.pushState === "function" &&
      typeof window.history.replaceState === "function"
    );
  }

  function isMobileHistoryRoute(route) {
    return Boolean(route && route.__orviaMobileHistory === mobileHistoryMarker);
  }

  function isStoryReaderOpen() {
    return Boolean(elements.storyReader && !elements.storyReader.classList.contains("hidden"));
  }

  function isImageViewerOpen() {
    return Boolean(elements.imageViewerModal && !elements.imageViewerModal.classList.contains("hidden"));
  }

  function findStoryByFile(file) {
    const target = text(file);
    return target ? getStories().find(story => text(story.file) === target) || null : null;
  }

  function findCharacterById(characterId) {
    const target = text(characterId);
    return target ? getCharacters().find(character => getCharacterId(character) === target) || null : null;
  }

  function findImageDefinitionByFile(character, fileName, title = "") {
    const target = text(fileName);
    if (!target) return null;
    return getImageDefinitionsForCharacter(character).find(def => def.fileName === target) || {
      key: target,
      title: text(title, "이미지 보기"),
      category: "IMAGE",
      fileName: target,
      visibility: "safe"
    };
  }

  function normalizeMobileRoute(route) {
    const screen = mobileHistoryScreens.has(route?.screen) ? route.screen : "characters";
    const detailTab = mobileHistoryDetailTabs.has(route?.detailTab) ? route.detailTab : "profile";
    const imageViewer = route?.imageViewer && text(route.imageViewer.fileName) ? {
      characterId: text(route.imageViewer.characterId || route.selectedCharacterId),
      fileName: text(route.imageViewer.fileName),
      title: text(route.imageViewer.title, "이미지 보기")
    } : null;

    return {
      screen,
      selectedCharacterId: text(route?.selectedCharacterId),
      detailTab,
      storyFile: text(route?.storyFile),
      imageViewer
    };
  }

  function buildMobileRoute() {
    const route = {
      __orviaMobileHistory: mobileHistoryMarker,
      screen: mobileHistoryScreens.has(state.screen) ? state.screen : "characters"
    };

    if (state.selectedCharacterId) route.selectedCharacterId = state.selectedCharacterId;
    if (state.detailTab) route.detailTab = state.detailTab;

    if (state.screen === "library" && isStoryReaderOpen() && state.activeStoryFile) {
      route.storyFile = state.activeStoryFile;
    }

    if (isImageViewerOpen() && state.activeImageViewer) {
      route.imageViewer = {
        characterId: state.activeImageViewer.characterId || state.selectedCharacterId || "",
        fileName: state.activeImageViewer.fileName || "",
        title: state.activeImageViewer.title || "이미지 보기"
      };
    }

    return route;
  }

  function mobileRouteSignature(route) {
    return JSON.stringify(route || {});
  }

  function recordMobileRoute({ replace = false } = {}) {
    if (restoringMobileRoute || !canUseMobileHistory()) return;

    const route = buildMobileRoute();
    const signature = mobileRouteSignature(route);
    if (!replace && signature === lastMobileRouteSignature) return;

    try {
      if (replace) {
        window.history.replaceState(route, "");
      } else {
        window.history.pushState(route, "");
      }
      lastMobileRouteSignature = signature;
    } catch (error) {
      lastMobileRouteSignature = "";
    }
  }

  function currentMobileHistoryRoute() {
    return canUseMobileHistory() && isMobileHistoryRoute(window.history.state) ? window.history.state : null;
  }

  function shouldCloseStoryThroughHistory() {
    return Boolean(currentMobileHistoryRoute()?.storyFile);
  }

  function shouldCloseImageViewerThroughHistory() {
    return Boolean(currentMobileHistoryRoute()?.imageViewer?.fileName);
  }

  function switchScreen(screen, { record = true } = {}) {
    state.screen = mobileHistoryScreens.has(screen) ? screen : "characters";
    document.querySelectorAll(".mobile-screen").forEach(node => {
      node.classList.toggle("is-active", node.dataset.screen === state.screen);
    });
    document.querySelectorAll("[data-mobile-nav]").forEach(button => {
      button.classList.toggle("is-active", button.dataset.mobileNav === state.screen || (state.screen === "detail" && button.dataset.mobileNav === "characters"));
    });
    const titles = {
      home: "홈",
      characters: "캐릭터",
      detail: "캐릭터 상세",
      library: "서재",
      generator: "랜덤 생성기"
    };
    setTitle(titles[state.screen] || "모바일");
    if (state.screen === "characters") renderCharacterList();
    if (state.screen === "library") renderStoryList();
    if (state.screen === "generator") renderGenerator();
    if (state.screen === "home") renderHome();
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (record) recordMobileRoute();
  }

  function applyMobileRoute(route) {
    if (!isMobileHistoryRoute(route)) return;
    const nextRoute = normalizeMobileRoute(route);
    restoringMobileRoute = true;

    try {
      if (nextRoute.selectedCharacterId) state.selectedCharacterId = nextRoute.selectedCharacterId;
      state.detailTab = nextRoute.detailTab;

      if (!nextRoute.imageViewer) closeImageViewer({ record: false });
      if (!(nextRoute.screen === "library" && nextRoute.storyFile)) closeStory({ record: false });

      switchScreen(nextRoute.screen, { record: false });
      if (nextRoute.screen === "detail") renderDetail();

      if (nextRoute.screen === "library" && nextRoute.storyFile) {
        const story = findStoryByFile(nextRoute.storyFile);
        if (story) {
          openStory(story, { record: false });
        } else {
          closeStory({ record: false });
        }
      }

      if (nextRoute.imageViewer) {
        const character = findCharacterById(nextRoute.imageViewer.characterId || state.selectedCharacterId);
        const def = character ? findImageDefinitionByFile(character, nextRoute.imageViewer.fileName, nextRoute.imageViewer.title) : null;
        if (character && def) {
          openImageViewer(character, def, { record: false });
        } else {
          closeImageViewer({ record: false });
        }
      }
    } finally {
      restoringMobileRoute = false;
      lastMobileRouteSignature = mobileRouteSignature(buildMobileRoute());
    }
  }

  function bindMobileHistory() {
    if (!canUseMobileHistory()) return;
    window.addEventListener("popstate", event => {
      if (isMobileHistoryRoute(event.state)) applyMobileRoute(event.state);
    });
  }

  function refreshModeDependentViews() {
    renderMode();
    renderHome();
    renderCharacterList();
    renderStoryList();
    if (state.screen === "detail") renderDetail();
  }

  function unlockAdminMode() {
    state.adminUnlocked = true;
    state.mode = "admin";
    sessionStorage.setItem(adminSessionStorageKey, "1");
    localStorage.setItem(modeStorageKey, "admin");
    closeAdminLoginModal();
    refreshModeDependentViews();
  }

  function lockAdminMode() {
    state.adminUnlocked = false;
    state.mode = "safe";
    sessionStorage.removeItem(adminSessionStorageKey);
    localStorage.setItem(modeStorageKey, "safe");
    refreshModeDependentViews();
  }

  function toggleMode() {
    if (!state.adminUnlocked) {
      openAdminLoginModal();
      return;
    }
    if (isAdminMode()) {
      lockAdminMode();
      return;
    }
    state.mode = "admin";
    localStorage.setItem(modeStorageKey, "admin");
    refreshModeDependentViews();
  }

  function renderMode() {
    const label = isAdminMode() ? "관리자모드" : "일반모드";
    if (elements.modeToggle) {
      elements.modeToggle.textContent = label;
      elements.modeToggle.hidden = !state.adminUnlocked;
      elements.modeToggle.classList.toggle("is-locked", !state.adminUnlocked);
      elements.modeToggle.setAttribute("aria-hidden", state.adminUnlocked ? "false" : "true");
      elements.modeToggle.setAttribute("aria-pressed", isAdminMode() ? "true" : "false");
    }
    if (elements.homeMode) elements.homeMode.textContent = label;
  }

  function handleAdminAccessTap() {
    const now = Date.now();
    if (now - state.adminAccessLastTapAt > 4000) state.adminAccessTapCount = 0;
    state.adminAccessLastTapAt = now;
    state.adminAccessTapCount += 1;
    if (state.adminAccessTapCount >= 5) {
      state.adminAccessTapCount = 0;
      openAdminLoginModal();
    }
  }
  function openAdminLoginModal() {
    if (!elements.adminLoginModal) return;
    syncMobileVisualViewport();
    if (elements.adminPasswordInput) elements.adminPasswordInput.value = "";
    if (elements.adminLoginMessage) {
      elements.adminLoginMessage.textContent = "비밀번호를 입력하면 이번 브라우저 세션에서 관리자모드로 전환됩니다.";
      elements.adminLoginMessage.classList.remove("warning");
    }
    elements.adminLoginModal.classList.remove("hidden");
    focusModalControl(elements.adminPasswordInput);
  }

  function closeAdminLoginModal() {
    blurModalControl(elements.adminLoginModal);
    elements.adminLoginModal?.classList.add("hidden");
    if (elements.adminPasswordInput) elements.adminPasswordInput.value = "";
  }

  function submitAdminLogin() {
    const value = elements.adminPasswordInput?.value || "";
    if (value === adminPassword) {
      unlockAdminMode();
      return;
    }
    if (elements.adminLoginMessage) {
      elements.adminLoginMessage.textContent = "비밀번호가 맞지 않습니다.";
      elements.adminLoginMessage.classList.add("warning");
    }
    if (elements.adminPasswordInput) {
      elements.adminPasswordInput.value = "";
      focusModalControl(elements.adminPasswordInput);
    }
  }

  function renderHome() {
    if (elements.homeCharacterCount) elements.homeCharacterCount.textContent = String(visibleCharacters().length);
    if (elements.homeStoryCount) elements.homeStoryCount.textContent = String(getStories().length);
    renderMode();
  }

  function renderCharacterList() {
    if (!elements.characterList) return;
    const characters = visibleCharacters();
    elements.characterList.innerHTML = "";
    if (elements.characterCountLine) {
      elements.characterCountLine.textContent = `${characters.length}명 표시 / 전체 ${getCharacters().length}명`;
    }
    if (characters.length === 0) {
      elements.characterList.innerHTML = `<div class="empty-state">조건에 맞는 캐릭터가 없습니다.</div>`;
      return;
    }
    const fragment = document.createDocumentFragment();
    characters.forEach(character => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "character-card";
      button.dataset.characterId = getCharacterId(character);

      const thumb = document.createElement("div");
      thumb.className = "character-thumb";
      thumb.appendChild(createImage(imagePath(character, "thumb.webp"), `${character.name || ""} 썸네일`));

      const main = document.createElement("div");
      main.className = "character-main";
      main.innerHTML = `<h3>${escapeHtml(character.name || "이름 없음")}</h3>`;

      button.append(thumb, main);
      button.addEventListener("click", () => openCharacterDetail(getCharacterId(character)));
      fragment.appendChild(button);
    });
    elements.characterList.appendChild(fragment);
  }

  function openCharacterDetail(characterId) {
    state.selectedCharacterId = characterId;
    state.detailTab = "profile";
    switchScreen("detail");
    renderDetail();
  }

  function selectedCharacter() {
    return getCharacters().find(character => getCharacterId(character) === state.selectedCharacterId) || visibleCharacters()[0] || null;
  }

  function renderDetail() {
    const character = selectedCharacter();
    if (!character) {
      if (elements.detailPanel) elements.detailPanel.innerHTML = `<div class="empty-state">선택된 캐릭터가 없습니다.</div>`;
      return;
    }

    if (elements.detailImage) {
      const wrap = elements.detailImage.closest(".detail-image-wrap");
      if (wrap) wrap.classList.remove("is-missing");
      elements.detailImage.src = imagePath(character, "main.webp");
      elements.detailImage.alt = `${character.name || ""} 기본 일러스트`;
      elements.detailImage.onerror = () => markMissingImage(elements.detailImage);
    }
    if (elements.detailName) elements.detailName.textContent = character.name || "이름 없음";
    if (elements.detailEn) elements.detailEn.textContent = character.en || "";
    if (elements.detailIntro) elements.detailIntro.textContent = character.profile?.shortIntro || "";
    if (elements.detailKicker) elements.detailKicker.textContent = `${basic(character, "genre", "ARCHIVE")} · ${basic(character, "race", "UNKNOWN")}`;

    if (!isAdminMode() && state.detailTab === "status") {
      state.detailTab = "profile";
    }
    elements.detailTabs?.classList.toggle("is-admin-mode", isAdminMode());
    document.querySelectorAll("[data-mobile-detail-tab]").forEach(button => {
      const isStatusTab = button.dataset.mobileDetailTab === "status";
      button.hidden = isStatusTab && !isAdminMode();
      button.setAttribute("aria-hidden", button.hidden ? "true" : "false");
      button.classList.toggle("is-active", button.dataset.mobileDetailTab === state.detailTab);
    });

    if (state.detailTab === "profile") renderProfileTab(character);
    if (state.detailTab === "library") renderCharacterLibraryTab(character);
    if (state.detailTab === "status") renderStatusTab(character);
    if (state.detailTab === "images") renderImagesTab(character);
  }

  function hashString(value = "") {
    let hash = 2166136261;
    const source = String(value);
    for (let index = 0; index < source.length; index += 1) {
      hash ^= source.charCodeAt(index);
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
      riskCount: `${count(0, 30)} 회`,
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

  function statRows(rows) {
    return rows.map(([label, value]) => `
      <div class="status-row"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>
    `).join("");
  }

  function barRows(rows) {
    return rows.map(([label, value]) => `
      <div class="mobile-bar-row">
        <span>${escapeHtml(label)}</span>
        <div class="mobile-bar-track"><i style="width: ${Math.max(0, Math.min(100, Number(value) || 0))}%"></i></div>
        <strong>${escapeHtml(value)}%</strong>
      </div>
    `).join("");
  }

  function infoRows(rows) {
    return `<div class="info-list">${rows.map(([label, value]) => `
      <div class="info-row ${isUnregisteredValue(value) ? "is-unregistered" : ""}"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>
    `).join("")}</div>`;
  }

  function renderProfileTab(character) {
    const rows = [
      ["성별", basic(character, "gender")],
      ["소속세계", basic(character, "world")],
      ["장르", basic(character, "genre")],
      ["종족", basic(character, "race")],
      ["직업", basic(character, "job")],
      ["나이", basic(character, "age")],
      ["성격", basic(character, "personality")],
      ["능력", basic(character, "ability")],
      ["무기", basic(character, "weapon")],
      ["신장", basic(character, "height")],
      ["체중", basic(character, "weight")]
    ];

    if (isAdminMode()) {
      rows.push(["쓰리사이즈", basic(character, "measurements")]);
    }

    elements.detailPanel.innerHTML = `
      <section class="mobile-detail-section">
        <h3>대표 대사</h3>
        <div class="summary-box">
          <blockquote>${escapeHtml(getCharacterQuote(character))}</blockquote>
        </div>
      </section>
      <section class="mobile-detail-section">
        <h3>기본 정보</h3>
        ${infoRows(rows)}
      </section>
    `;
  }

  function renderCharacterLibraryTab(character) {
    const related = storiesForCharacter(character);
    if (related.length === 0) {
      elements.detailPanel.innerHTML = `<div class="empty-state">이 캐릭터와 연결된 서재 문서가 없습니다.</div>`;
      return;
    }
    elements.detailPanel.innerHTML = `<div class="related-list"></div>`;
    const list = elements.detailPanel.querySelector(".related-list");
    related.forEach(story => list.appendChild(createStoryCard(story, () => {
      switchScreen("library", { record: false });
      openStory(story);
    })));
  }

  function renderStatusTab(character) {
    if (!isAdminMode()) {
      elements.detailPanel.innerHTML = `<div class="empty-state">스테이터스는 관리자모드에서 확인할 수 있습니다.</div>`;
      return;
    }

    const stats = createAutoStats(character);
    const pleasurePercent = Math.min(100, Math.round(stats.currentPleasure / 999 * 100));
    elements.detailPanel.innerHTML = `
      <div class="mobile-status-stack">
        <section class="mobile-status-card mobile-status-head">
          <h3>H STATUS</h3>
          <div class="status-level">
            <strong>${escapeHtml(stats.hLevel)}</strong><span>/100</span>
          </div>
          <div class="status-row-grid">
            ${statRows([
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
            <div class="mobile-bar-track"><i style="width: ${pleasurePercent}%"></i></div>
            <strong>${escapeHtml(stats.currentPleasure)} / 999</strong>
          </div>
        </section>

        <section class="mobile-status-card">
          <h3>행위 기록</h3>
          <div class="status-row-grid">
            ${statRows([
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
          <div class="summary-metrics">
            ${statRows([
              ["절정 도달 총 횟수", stats.climaxTotal],
              ["연속 절정 최고 기록", stats.climaxChain],
              ["절정까지 최단 시간", stats.climaxTime],
              ["임신 가능성", stats.riskPeak]
            ])}
          </div>
        </section>
        <section class="mobile-status-card">
          <h3>플레이 기록</h3>
          <div class="status-row-grid">
            ${statRows([
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

        <section class="mobile-status-card">
          <h3>신체 상태</h3>
          ${barRows([
            ["가슴", stats.body.chest],
            ["유두", stats.body.nipple],
            ["질", stats.body.vagina],
            ["항문", stats.body.anus],
            ["자궁", stats.body.womb]
          ])}
        </section>

        <section class="mobile-status-card">
          <h3>H PARAMETER</h3>
          ${barRows([
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
      </div>
    `;
  }

  function getImageDefinitionsForCharacter(character) {
    const optional = (Array.isArray(character.albumKeys) ? character.albumKeys : [])
      .map(key => albumKeyDefinitions[key])
      .filter(Boolean)
      .filter(def => isAdminMode() || def.visibility !== "restricted");
    return [...baseImageDefinitions, ...optional];
  }

  function renderImagesTab(character) {
    const defs = getImageDefinitionsForCharacter(character);
    elements.detailPanel.innerHTML = `<div class="image-grid" role="list"></div>`;
    const grid = elements.detailPanel.querySelector(".image-grid");
    defs.forEach(def => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "image-list-button";
      button.setAttribute("role", "listitem");
      button.innerHTML = `<strong>${escapeHtml(def.title)}</strong>`;
      button.addEventListener("click", () => openImageViewer(character, def));
      grid.appendChild(button);
    });
  }

  function clampNumber(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function imageViewerPanBounds(scale = imageViewerZoom.scale) {
    const stage = elements.imageViewerStage;
    const image = elements.imageViewerImage;
    if (!stage || !image) return { x: 0, y: 0 };
    const imageWidth = image.offsetWidth || stage.clientWidth;
    const imageHeight = image.offsetHeight || stage.clientHeight;
    return {
      x: Math.max(0, (imageWidth * scale - stage.clientWidth) / 2),
      y: Math.max(0, (imageHeight * scale - stage.clientHeight) / 2)
    };
  }

  function setImageViewerHelp(message) {
    if (elements.imageViewerHelp) {
      elements.imageViewerHelp.textContent = message;
    }
  }

  function clearImageViewerStageFit() {
    const card = elements.imageViewerModal?.querySelector(".image-viewer-card");
    if (card) {
      card.style.removeProperty("--image-viewer-card-width");
      card.style.width = "";
    }
    if (elements.imageViewerStage) {
      elements.imageViewerStage.style.removeProperty("--image-viewer-stage-width");
      elements.imageViewerStage.style.removeProperty("--image-viewer-stage-height");
      elements.imageViewerStage.style.width = "";
      elements.imageViewerStage.style.height = "";
    }
  }

  function fitImageViewerStage() {
    const modal = elements.imageViewerModal;
    const stage = elements.imageViewerStage;
    const image = elements.imageViewerImage;
    if (!modal || !stage || !image || modal.classList.contains("hidden")) return;

    const viewport = getMobileVisualViewportSize();
    const card = modal.querySelector(".image-viewer-card");
    const head = modal.querySelector(".image-viewer-head");
    const help = elements.imageViewerHelp;

    const horizontalPadding = 28;
    const cardInnerPadding = 24;
    const gapTotal = 20;
    const overlayVerticalPadding = 28;
    const headHeight = head?.offsetHeight || 54;
    const helpHeight = help?.offsetHeight || 22;
    const reservedHeight = overlayVerticalPadding + cardInnerPadding + gapTotal + headHeight + helpHeight;

    const availableStageWidth = Math.max(220, Math.min(960, viewport.width - horizontalPadding - cardInnerPadding));
    const availableStageHeight = Math.max(180, Math.min(760, viewport.height - reservedHeight));
    const naturalWidth = image.naturalWidth || 0;
    const naturalHeight = image.naturalHeight || 0;
    const aspect = naturalWidth > 0 && naturalHeight > 0 ? naturalWidth / naturalHeight : 1;

    let stageWidth = availableStageWidth;
    let stageHeight = stageWidth / aspect;

    if (stageHeight > availableStageHeight) {
      stageHeight = availableStageHeight;
      stageWidth = stageHeight * aspect;
    }

    if (stageWidth > availableStageWidth) {
      stageWidth = availableStageWidth;
      stageHeight = stageWidth / aspect;
    }

    const maxCardWidth = Math.max(260, viewport.width - horizontalPadding);
    const minCardWidth = Math.min(360, maxCardWidth);
    const cardWidth = Math.min(maxCardWidth, Math.max(minCardWidth, stageWidth + cardInnerPadding));

    if (card) {
      card.style.setProperty("--image-viewer-card-width", `${Math.round(cardWidth)}px`);
    }
    stage.style.setProperty("--image-viewer-stage-width", `${Math.round(stageWidth)}px`);
    stage.style.setProperty("--image-viewer-stage-height", `${Math.round(stageHeight)}px`);
    window.requestAnimationFrame(() => applyImageViewerTransform());
  }

  function applyImageViewerTransform() {
    if (!elements.imageViewerStage || !elements.imageViewerImage) return;
    const bounds = imageViewerPanBounds(imageViewerZoom.scale);
    imageViewerZoom.x = clampNumber(imageViewerZoom.x, -bounds.x, bounds.x);
    imageViewerZoom.y = clampNumber(imageViewerZoom.y, -bounds.y, bounds.y);
    elements.imageViewerStage.classList.toggle("is-zoomed", imageViewerZoom.scale > 1.01);
    elements.imageViewerImage.style.transform = `translate3d(${imageViewerZoom.x}px, ${imageViewerZoom.y}px, 0) scale(${imageViewerZoom.scale})`;
  }

  function resetImageViewerZoom() {
    imageViewerZoom.scale = 1;
    imageViewerZoom.x = 0;
    imageViewerZoom.y = 0;
    imageViewerZoom.pointers.clear();
    imageViewerZoom.startDistance = 0;
    applyImageViewerTransform();
    setImageViewerHelp("두 손가락으로 확대하거나, 두 번 탭하면 확대됩니다.");
  }

  function beginImageViewerPinch() {
    const points = Array.from(imageViewerZoom.pointers.values());
    if (points.length < 2) return;
    const [first, second] = points;
    imageViewerZoom.startDistance = Math.hypot(second.x - first.x, second.y - first.y) || 1;
    imageViewerZoom.startCenterX = (first.x + second.x) / 2;
    imageViewerZoom.startCenterY = (first.y + second.y) / 2;
    imageViewerZoom.startScale = imageViewerZoom.scale;
    imageViewerZoom.startX = imageViewerZoom.x;
    imageViewerZoom.startY = imageViewerZoom.y;
  }

  function zoomImageViewerAt(clientX, clientY, targetScale) {
    if (!elements.imageViewerStage) return;
    const stageRect = elements.imageViewerStage.getBoundingClientRect();
    const pointX = clientX - stageRect.left - stageRect.width / 2;
    const pointY = clientY - stageRect.top - stageRect.height / 2;
    const nextScale = clampNumber(targetScale, 1, 4);
    if (nextScale <= 1.01) {
      resetImageViewerZoom();
      return;
    }
    imageViewerZoom.x = pointX - ((pointX - imageViewerZoom.x) / imageViewerZoom.scale) * nextScale;
    imageViewerZoom.y = pointY - ((pointY - imageViewerZoom.y) / imageViewerZoom.scale) * nextScale;
    imageViewerZoom.scale = nextScale;
    applyImageViewerTransform();
    setImageViewerHelp("확대 상태입니다. 한 손가락으로 이동하고, 두 손가락으로 확대/축소하세요.");
  }

  function handleImageViewerTap(clientX, clientY) {
    const now = Date.now();
    const gap = now - imageViewerZoom.lastTapAt;
    const distance = Math.hypot(clientX - imageViewerZoom.lastTapX, clientY - imageViewerZoom.lastTapY);
    if (gap < 330 && distance < 36) {
      if (imageViewerZoom.scale > 1.01) {
        resetImageViewerZoom();
      } else {
        zoomImageViewerAt(clientX, clientY, 2.4);
      }
      imageViewerZoom.lastTapAt = 0;
      return;
    }
    imageViewerZoom.lastTapAt = now;
    imageViewerZoom.lastTapX = clientX;
    imageViewerZoom.lastTapY = clientY;
  }

  function handleImageViewerPointerDown(event) {
    if (!elements.imageViewerStage || !elements.imageViewerImage?.src) return;
    elements.imageViewerStage.setPointerCapture?.(event.pointerId);
    imageViewerZoom.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    imageViewerZoom.moved = false;
    if (imageViewerZoom.pointers.size === 1) {
      imageViewerZoom.startPointerX = event.clientX;
      imageViewerZoom.startPointerY = event.clientY;
      imageViewerZoom.startX = imageViewerZoom.x;
      imageViewerZoom.startY = imageViewerZoom.y;
    } else if (imageViewerZoom.pointers.size === 2) {
      beginImageViewerPinch();
    }
    event.preventDefault();
  }

  function handleImageViewerPointerMove(event) {
    if (!imageViewerZoom.pointers.has(event.pointerId)) return;
    const previous = imageViewerZoom.pointers.get(event.pointerId);
    if (Math.hypot(event.clientX - previous.x, event.clientY - previous.y) > 2) {
      imageViewerZoom.moved = true;
    }
    imageViewerZoom.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (imageViewerZoom.pointers.size >= 2) {
      const points = Array.from(imageViewerZoom.pointers.values());
      const [first, second] = points;
      const distance = Math.hypot(second.x - first.x, second.y - first.y) || 1;
      const centerX = (first.x + second.x) / 2;
      const centerY = (first.y + second.y) / 2;
      imageViewerZoom.scale = clampNumber(imageViewerZoom.startScale * distance / imageViewerZoom.startDistance, 1, 4);
      imageViewerZoom.x = imageViewerZoom.startX + (centerX - imageViewerZoom.startCenterX);
      imageViewerZoom.y = imageViewerZoom.startY + (centerY - imageViewerZoom.startCenterY);
      applyImageViewerTransform();
      setImageViewerHelp("확대 상태입니다. 한 손가락으로 이동하고, 두 손가락으로 확대/축소하세요.");
    } else if (imageViewerZoom.scale > 1.01) {
      imageViewerZoom.x = imageViewerZoom.startX + (event.clientX - imageViewerZoom.startPointerX);
      imageViewerZoom.y = imageViewerZoom.startY + (event.clientY - imageViewerZoom.startPointerY);
      applyImageViewerTransform();
    }
    event.preventDefault();
  }

  function handleImageViewerPointerEnd(event) {
    if (!imageViewerZoom.pointers.has(event.pointerId)) return;
    const wasSinglePointer = imageViewerZoom.pointers.size === 1;
    const tapDistance = Math.hypot(event.clientX - imageViewerZoom.startPointerX, event.clientY - imageViewerZoom.startPointerY);
    imageViewerZoom.pointers.delete(event.pointerId);

    if (wasSinglePointer && !imageViewerZoom.moved && tapDistance < 10) {
      handleImageViewerTap(event.clientX, event.clientY);
    }

    if (imageViewerZoom.scale <= 1.01) {
      resetImageViewerZoom();
    } else if (imageViewerZoom.pointers.size === 1) {
      const [remaining] = Array.from(imageViewerZoom.pointers.values());
      imageViewerZoom.startPointerX = remaining.x;
      imageViewerZoom.startPointerY = remaining.y;
      imageViewerZoom.startX = imageViewerZoom.x;
      imageViewerZoom.startY = imageViewerZoom.y;
    } else {
      applyImageViewerTransform();
    }
  }

  function openImageViewer(character, def, { record = true } = {}) {
    if (!elements.imageViewerModal || !elements.imageViewerImage) return;
    state.activeImageViewer = {
      characterId: getCharacterId(character),
      fileName: def.fileName,
      title: def.title || "이미지 보기"
    };
    if (elements.imageViewerKicker) {
      elements.imageViewerKicker.textContent = "";
      elements.imageViewerKicker.hidden = true;
    }
    if (elements.imageViewerTitle) {
      elements.imageViewerTitle.textContent = def.title || "이미지 보기";
    }
    if (elements.imageViewerStage) {
      elements.imageViewerStage.classList.remove("is-missing");
    }
    clearImageViewerStageFit();
    elements.imageViewerImage.alt = `${character.name || ""} ${def.title || "이미지"}`;
    elements.imageViewerImage.style.transform = "";
    elements.imageViewerImage.onerror = () => {
      elements.imageViewerStage?.classList.add("is-missing");
    };
    elements.imageViewerImage.onload = () => {
      fitImageViewerStage();
      resetImageViewerZoom();
    };
    elements.imageViewerModal.classList.remove("hidden");
    syncMobileVisualViewport();
    elements.imageViewerImage.src = imagePath(character, def.fileName);
    window.requestAnimationFrame(() => {
      fitImageViewerStage();
      resetImageViewerZoom();
    });
    if (record) recordMobileRoute();
  }

  function closeImageViewer({ record = true } = {}) {
    if (record && shouldCloseImageViewerThroughHistory()) {
      window.history.back();
      return;
    }
    elements.imageViewerModal?.classList.add("hidden");
    if (elements.imageViewerStage) {
      elements.imageViewerStage.classList.remove("is-zoomed", "is-missing");
    }
    resetImageViewerZoom();
    clearImageViewerStageFit();
    state.activeImageViewer = null;
    if (elements.imageViewerImage) {
      elements.imageViewerImage.removeAttribute("src");
      elements.imageViewerImage.alt = "";
      elements.imageViewerImage.onload = null;
      elements.imageViewerImage.onerror = null;
    }
    if (record) recordMobileRoute({ replace: true });
  }

  function createStoryCard(story, onClick) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "story-card";
    button.innerHTML = `
      <span class="story-chip">${escapeHtml(getWorldName(story.worldId))} · ${escapeHtml(story.typeName || story.type || "문서")}</span>
      <h3>${escapeHtml(story.title || "제목 없음")}</h3>
      <p>${escapeHtml(story.summary || story.file || "")}</p>
    `;
    button.addEventListener("click", onClick || (() => openStory(story)));
    return button;
  }

  function createStoryTreeStoryButton(story) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "story-tree-story";
    button.innerHTML = `
      <span>${escapeHtml(story?.title || "제목 없음")}</span>
      <small>${escapeHtml(story?.typeName || story?.type || "단편")}</small>
    `;
    button.addEventListener("click", () => openStory(story));
    return button;
  }

  function createStoryTreeGroupNode(groupNode, shouldOpen) {
    const details = document.createElement("details");
    details.className = "story-tree-node story-tree-character";
    details.open = shouldOpen;

    const storyCount = countStoryGroupStories(groupNode);
    const summary = document.createElement("summary");
    summary.innerHTML = `
      <span>${escapeHtml(groupNode.title || "미분류")}</span>
      <small>${storyCount}편</small>
    `;

    const children = document.createElement("div");
    children.className = "story-tree-characters";

    if (Array.isArray(groupNode.children) && groupNode.children.length > 0) {
      groupNode.children.forEach(childNode => {
        children.appendChild(createStoryTreeGroupNode(childNode, shouldOpen));
      });
    }

    if (Array.isArray(groupNode.stories) && groupNode.stories.length > 0) {
      const list = document.createElement("div");
      list.className = "story-tree-stories";
      groupNode.stories.forEach(story => list.appendChild(createStoryTreeStoryButton(story)));
      children.appendChild(list);
    }

    details.append(summary, children);
    return details;
  }

  function createStoryTreeWorldNode(worldNode, shouldOpen) {
    const details = document.createElement("details");
    details.className = "story-tree-node story-tree-world";
    details.open = shouldOpen;

    const summary = document.createElement("summary");
    summary.innerHTML = `
      <span>${escapeHtml(worldNode.title || "미분류 세계관")}</span>
      <small>${worldNode.count}편</small>
    `;

    const children = document.createElement("div");
    children.className = "story-tree-characters";
    worldNode.groups.forEach(groupNode => {
      children.appendChild(createStoryTreeGroupNode(groupNode, shouldOpen));
    });

    details.append(summary, children);
    return details;
  }

  function renderStoryList() {
    if (!elements.storyList) return;
    const q = state.storyQuery.trim().toLowerCase();
    const stories = getStories().filter(story => storyMatchesQuery(story, q));
    elements.storyList.innerHTML = "";
    elements.storyList.classList.add("story-tree-list");
    if (stories.length === 0) {
      elements.storyList.innerHTML = `<div class="empty-state">조건에 맞는 소설이 없습니다.</div>`;
      return;
    }

    const tree = buildStoryTree(stories);
    const fragment = document.createDocumentFragment();
    tree.forEach(worldNode => {
      const shouldOpen = Boolean(q);
      fragment.appendChild(createStoryTreeWorldNode(worldNode, shouldOpen));
    });
    elements.storyList.appendChild(fragment);
  }

  function markdownToHtml(markdown = "") {
    const lines = String(markdown).replace(/\r\n/g, "\n").split("\n");
    const html = [];
    let paragraph = [];

    function flushParagraph() {
      if (paragraph.length === 0) return;
      html.push(`<p>${paragraph.map(escapeHtml).join("<br>")}</p>`);
      paragraph = [];
    }

    lines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed) {
        flushParagraph();
        return;
      }
      const heading = trimmed.match(/^(#{1,3})\s+(.+)$/);
      if (heading) {
        flushParagraph();
        const level = heading[1].length;
        html.push(`<h${level}>${escapeHtml(heading[2])}</h${level}>`);
        return;
      }
      paragraph.push(trimmed);
    });
    flushParagraph();
    return html.join("\n");
  }

  function renderMobileStoryRelatedCharacters(story) {
    const container = elements.storyRelatedCharacters;
    if (!container) return;
    const relatedCharacters = getStoryRelatedCharacters(story);
    if (relatedCharacters.length === 0) {
      container.innerHTML = `<span class="story-related-chip is-empty">미등록</span>`;
      return;
    }
    container.innerHTML = relatedCharacters.map(characterName => {
      const safeName = escapeHtml(characterName);
      return `<button class="story-related-chip" type="button" data-mobile-related-character="${safeName}" aria-label="${safeName} 캐릭터 상세 열기">${safeName}</button>`;
    }).join("");
  }

  function openRelatedCharacterByName(characterName) {
    const targetName = text(characterName);
    if (!targetName) return;
    const character = getCharacters().find(characterData => characterData.name === targetName || characterData.en === targetName);
    if (!character) return;
    closeStory({ record: false });
    openCharacterDetail(getCharacterId(character));
  }

  async function openStory(story, { record = true } = {}) {
    if (!story) return;
    state.activeStoryFile = story.file || "";
    elements.libraryScreen?.classList.add("is-reading");
    if (elements.storyReader) elements.storyReader.classList.remove("hidden");
    if (elements.storyTitle) elements.storyTitle.textContent = story.title || "제목 없음";
    if (elements.storySummary) elements.storySummary.textContent = story.summary || "";
    if (elements.storyKicker) elements.storyKicker.textContent = `${getWorldName(story.worldId)} · ${story.typeName || story.type || "STORY"}`;
    if (elements.storyBody) elements.storyBody.innerHTML = `<p class="muted">본문을 불러오는 중입니다.</p>`;
    renderMobileStoryRelatedCharacters(story);
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (record) recordMobileRoute();
    try {
      const response = await fetch(story.file);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const markdown = await response.text();
      if (elements.storyBody) elements.storyBody.innerHTML = markdownToHtml(markdown);
    } catch (error) {
      if (elements.storyBody) {
        elements.storyBody.innerHTML = `<p class="warning">본문 파일을 불러오지 못했습니다.</p><p>${escapeHtml(story.file || "")}</p>`;
      }
    }
  }

  function closeStory({ record = true } = {}) {
    if (record && shouldCloseStoryThroughHistory()) {
      window.history.back();
      return;
    }
    elements.libraryScreen?.classList.remove("is-reading");
    elements.storyReader?.classList.add("hidden");
    state.activeStoryFile = "";
    if (elements.storyBody) elements.storyBody.innerHTML = "";
    if (elements.storyRelatedCharacters) elements.storyRelatedCharacters.innerHTML = "";
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (record) recordMobileRoute({ replace: true });
  }

  function pick(options) {
    const list = Array.isArray(options) ? options.filter(Boolean) : [];
    return list.length ? list[Math.floor(Math.random() * list.length)] : "";
  }

  function pickMany(options, maxCount) {
    const count = Math.floor(Math.random() * (maxCount + 1));
    const pool = [...new Set(Array.isArray(options) ? options.filter(Boolean) : [])];
    const result = [];
    while (result.length < count && pool.length > 0) {
      const index = Math.floor(Math.random() * pool.length);
      result.push(pool.splice(index, 1)[0]);
    }
    return result;
  }

  function flattenGroups(groupMap, groupNames = [], itemNames = []) {
    const values = [];
    (Array.isArray(itemNames) ? itemNames : []).forEach(item => values.push(item));
    (Array.isArray(groupNames) ? groupNames : []).forEach(groupName => {
      const groupValues = groupMap?.[groupName];
      if (Array.isArray(groupValues)) values.push(...groupValues);
    });
    return [...new Set(values.filter(Boolean))];
  }

  function allGroupValues(groupMap) {
    return [...new Set(Object.values(groupMap || {}).flat().filter(Boolean))];
  }

  function cleanItem(value) {
    return text(value).replace(/,+$/g, "");
  }

  function randomHexColor() {
    const value = Math.floor(Math.random() * 0xffffff);
    return `#${value.toString(16).padStart(6, "0").toUpperCase()}`;
  }

  function createMobileColorSet(common = {}) {
    return {
      skin: pick(common.skinColorPool) || "#F0C7B0",
      hair: randomHexColor(),
      eyes: randomHexColor(),
      accent: randomHexColor()
    };
  }


  function pickUnique(options, count) {
    const candidates = [...(Array.isArray(options) ? options.filter(Boolean) : [])];
    const picks = [];
    while (picks.length < count && candidates.length > 0) {
      const index = Math.floor(Math.random() * candidates.length);
      picks.push(candidates.splice(index, 1)[0]);
    }
    return picks;
  }

  function pickWeightedCount(weights = [[0, 1]]) {
    const list = Array.isArray(weights) && weights.length ? weights : [[0, 1]];
    const total = list.reduce((sum, [, weight]) => sum + Number(weight || 0), 0);
    if (total <= 0) return list.at(-1)?.[0] ?? 0;
    let roll = Math.random() * total;
    for (const [count, weight] of list) {
      roll -= Number(weight || 0);
      if (roll <= 0) return count;
    }
    return list.at(-1)?.[0] ?? 0;
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
    return { label, value: normalizeOutfitValue(pick(options)) };
  }

  function pickFromAllowedGroups(groupMap, allowedGroups = [], allowedItems = []) {
    const groupItems = (Array.isArray(allowedGroups) ? allowedGroups : [])
      .flatMap(groupName => groupMap?.[groupName] ?? []);
    const candidates = [
      ...new Set([
        ...groupItems,
        ...(Array.isArray(allowedItems) ? allowedItems : [])
      ].filter(Boolean))
    ];
    return pick(candidates);
  }

  function createOutfitResult() {
    const common = window.GENERATOR_COMMON_OPTIONS || {};
    const type = pick(common.outfitTypes || []);
    const slots = common.outfitSlots || {};
    const parts = [];
    if (type === "상/하의형") {
      parts.push(createOutfitPart("상의", slots.top || []));
      parts.push(createOutfitPart("하의", slots.bottom || []));
    } else {
      parts.push(createOutfitPart("원피스/전신복", slots.onepiece_fullbody || []));
    }
    parts.push(createOutfitPart("레그웨어", slots.legwear || []));
    parts.push(createOutfitPart("신발", slots.shoes || []));
    if (Math.random() < 0.5) parts.push(createOutfitPart("외투", slots.outerwear || []));
    if (Math.random() < 0.5) parts.push(createOutfitPart("모자", slots.headwear || []));
    return parts.filter(part => part.value);
  }

  function createPcColorSet() {
    const common = window.GENERATOR_COMMON_OPTIONS || {};
    return [
      { label: "머리", value: randomHexColor() },
      { label: "눈", value: randomHexColor() },
      { label: "피부", value: pick(common.skinColorPool || ["#F0C7B0"]) },
      { label: "상징", value: randomHexColor() }
    ];
  }

  function createGeneratorResult(overrides = {}) {
    const common = window.GENERATOR_COMMON_OPTIONS || {};
    const countWeights = window.GENERATOR_COUNT_WEIGHTS || {};
    const genre = overrides.genre ?? pick(window.GENERATOR_GENRE_GROUPS || []) ?? "판타지";
    const rule = window.GENERATOR_GENRE_RULES?.[genre] || {};
    const featureCount = pickWeightedCount(countWeights.features);
    const powerCount = pickWeightedCount(countWeights.power);
    const fashionPointCount = pickWeightedCount(countWeights.fashionPoints);
    return {
      genre,
      race: overrides.race ?? pickFromAllowedGroups(window.GENERATOR_SPECIES_GROUPS || {}, rule.allowedSpeciesGroups, rule.allowedSpeciesItems),
      role: overrides.role ?? pickFromAllowedGroups(window.GENERATOR_JOB_GROUPS || {}, rule.allowedJobGroups, rule.allowedJobItems),
      personality: pick(common.personality || []),
      visualAge: pick(common.visualAgeGroups || []),
      features: pickUnique(common.features || [], featureCount).join(", ") || "없음",
      weapon: pickFromAllowedGroups(window.GENERATOR_WEAPON_GROUPS || {}, rule.allowedWeaponGroups, rule.allowedWeaponItems),
      power: pickUnique(common.powers || [], powerCount).join(", ") || "없음",
      hairstyle: pick(common.hairstyles || []),
      outfit: createOutfitResult(),
      fashionPoints: pickUnique(common.fashionPoints || [], fashionPointCount).join(", ") || "없음",
      colors: overrides.colors ?? createPcColorSet()
    };
  }

  function hasGeneratorResult() {
    return Boolean(state.generated && Object.keys(state.generated).length > 0);
  }

  function getGeneratorEntry(key) {
    return state.generated?.[key] ?? "";
  }

  function hasGeneratorOptionalValue(value) {
    const current = String(value || "").trim();
    return current !== "" && current !== "없음";
  }

  function getGeneratorListValue(key, label) {
    const entries = getGeneratorEntry(key);
    if (!Array.isArray(entries)) return "";
    const value = entries.find(entry => entry?.label === label)?.value ?? "";
    return key === "outfit" ? normalizeOutfitValue(value) : value;
  }

  function getGeneratorFieldLabel(key) {
    return (window.GENERATOR_FIELDS || []).find(([fieldKey]) => fieldKey === key)?.[1] ?? key;
  }

  function formatGeneratedValue(value, key) {
    if (Array.isArray(value)) {
      const rows = value.map(entry => {
        if (entry && typeof entry === "object") {
          const valueText = key === "outfit" ? normalizeOutfitValue(entry.value) : entry.value;
          const valueHtml = key === "colors"
            ? `<span class="generated-color-value"><i class="generated-color-swatch" style="background-color:${escapeHtml(valueText)}"></i>${escapeHtml(valueText)}</span>`
            : escapeHtml(valueText);
          return `<div class="generated-value-line"><span class="generated-value-key">${escapeHtml(entry.label)}</span><b>${valueHtml}</b></div>`;
        }
        return `<div class="generated-value-line"><span></span><b>${escapeHtml(entry)}</b></div>`;
      }).join("");
      return `<div class="generated-value-list">${rows}</div>`;
    }
    return escapeHtml(value);
  }

  function cloneGeneratorResultSnapshot(result) {
    try {
      return JSON.parse(JSON.stringify(result || {}));
    } catch (error) {
      return {};
    }
  }

  function createGeneratorHistorySummary(result) {
    return [result?.race, result?.role, result?.personality].filter(Boolean).join(" · ") || "랜덤 결과";
  }

  function isSameGeneratorHistoryResult(first, second) {
    try {
      return JSON.stringify(first || {}) === JSON.stringify(second || {});
    } catch (error) {
      return false;
    }
  }

  function loadGeneratorHistory() {
    try {
      const parsed = JSON.parse(localStorage.getItem(generatorHistoryStorageKey) || "[]");
      state.generatorHistory = Array.isArray(parsed) ? parsed.slice(0, generatorRecentLimit) : [];
    } catch (error) {
      state.generatorHistory = [];
    }
  }

  function persistGeneratorHistory() {
    try {
      localStorage.setItem(generatorHistoryStorageKey, JSON.stringify(state.generatorHistory.slice(0, generatorRecentLimit)));
    } catch (error) {
      // Keep current in-memory history usable when storage is unavailable.
    }
  }

  function saveCurrentGeneratorResultToHistory() {
    if (!hasGeneratorResult()) return;
    const snapshot = cloneGeneratorResultSnapshot(state.generated);
    if (Object.keys(snapshot).length === 0) return;
    const entry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      savedAt: new Date().toISOString(),
      summary: createGeneratorHistorySummary(snapshot),
      result: snapshot,
      lockedKeys: [...state.lockedGeneratorKeys]
    };
    state.generatorHistory = [
      entry,
      ...state.generatorHistory.filter(historyEntry => !isSameGeneratorHistoryResult(historyEntry?.result, snapshot))
    ].slice(0, generatorRecentLimit);
    persistGeneratorHistory();
    renderGeneratorHistory();
  }

  function formatGeneratorHistoryTime(savedAt) {
    if (!savedAt) return "";
    const date = new Date(savedAt);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
  }

  function renderGenerator() {
    document.querySelectorAll("[data-mobile-generator-tab]").forEach(button => {
      button.classList.toggle("is-active", button.dataset.mobileGeneratorTab === state.generatorTab);
    });
    elements.generatorRandomPanel?.classList.toggle("is-active", state.generatorTab === "random");
    elements.generatorFollowupPanel?.classList.toggle("is-active", state.generatorTab === "followup");
    if (elements.generateButton) {
      elements.generateButton.textContent = state.lockedGeneratorKeys.size > 0 ? "고정값 유지하고 생성" : "전체 랜덤 생성";
    }
    if (elements.questionPromptButton) elements.questionPromptButton.disabled = !hasGeneratorResult();
    if (elements.imagePromptButton) elements.imagePromptButton.disabled = !hasGeneratorResult();
    if (state.generatorTab === "followup") {
      refreshGeneratorSketchbookRecentControls();
      autoApplyLatestGeneratorSketchbookRecentEntry();
    }

    // Keep these small status panels in sync even if the result card re-renders.
    renderGeneratorLockSummary();
    renderGeneratorHistory();
    renderGeneratedCard();
    renderGeneratorAssistPreview();
    renderGeneratorLockSummary();
    renderGeneratorHistory();
  }

  function renderGeneratorHistory() {
    if (!elements.generatorHistoryList) return;
    const entries = Array.isArray(state.generatorHistory) ? state.generatorHistory.slice(0, generatorRecentLimit) : [];
    if (elements.clearGeneratorHistoryButton) {
      elements.clearGeneratorHistoryButton.disabled = entries.length === 0;
      elements.clearGeneratorHistoryButton.classList.toggle("is-disabled", entries.length === 0);
    }
    elements.generatorHistoryList.innerHTML = "";

    if (entries.length === 0) {
      elements.generatorHistoryList.innerHTML = '<p class="generator-history-empty">최근 결과 없음</p>';
      return;
    }

    entries.forEach((entry, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "generator-history-item";
      button.dataset.generatorHistoryId = entry.id || "";
      button.title = "이 결과 불러오기";

      const number = document.createElement("span");
      number.className = "generator-history-index";
      number.textContent = `#${index + 1}`;

      const summary = document.createElement("span");
      summary.className = "generator-history-summary";
      summary.textContent = entry.summary || createGeneratorHistorySummary(entry.result);

      const time = document.createElement("span");
      time.className = "generator-history-time";
      time.textContent = formatGeneratorHistoryTime(entry.savedAt);

      button.append(number, summary, time);
      button.addEventListener("click", () => restoreGeneratorHistoryEntry(entry.id));
      elements.generatorHistoryList.appendChild(button);
    });
  }

  function restoreGeneratorHistoryEntry(entryId) {
    const entry = state.generatorHistory.find(historyEntry => historyEntry.id === entryId);
    if (!entry) return;
    state.generated = cloneGeneratorResultSnapshot(entry.result);
    state.lockedGeneratorKeys.clear();
    (entry.lockedKeys || []).forEach(key => {
      if (lockableGeneratorKeys.has(key)) state.lockedGeneratorKeys.add(key);
    });
    clearGeneratorAssistNotes();
    renderGenerator();
  }

  function clearGeneratorHistory() {
    state.generatorHistory = [];
    persistGeneratorHistory();
    renderGeneratorHistory();
  }

  function getLockedGeneratorOverrides() {
    return Object.fromEntries([...state.lockedGeneratorKeys].map(key => [key, state.generated?.[key]]));
  }

  function formatGeneratorLockSummaryValue(key) {
    const value = getGeneratorEntry(key);
    if (Array.isArray(value)) {
      return value
        .map(entry => {
          if (entry && typeof entry === "object") {
            const entryValue = key === "outfit" ? normalizeOutfitValue(entry.value) : entry.value;
            return `${entry.label}: ${entryValue}`;
          }
          return String(entry || "");
        })
        .filter(Boolean)
        .join(" / ");
    }
    return String(value || "");
  }

  function renderGeneratorLockSummary() {
    if (!elements.generatorLockSummary) return;
    const lockedKeys = [...state.lockedGeneratorKeys];
    if (lockedKeys.length === 0) {
      elements.generatorLockSummary.innerHTML = '<p class="generator-lock-summary-empty">고정된 항목 없음</p>';
      elements.clearGeneratorLocksButton?.classList.add("hidden");
      return;
    }
    elements.generatorLockSummary.innerHTML = `
      <div class="generator-lock-summary-title">고정된 항목</div>
      <div class="generator-lock-summary-list">
        ${lockedKeys.map(key => `
          <div class="generator-lock-summary-item">
            <span>${escapeHtml(getGeneratorFieldLabel(key))}</span>
            <strong>${escapeHtml(formatGeneratorLockSummaryValue(key) || "현재 값 없음")}</strong>
          </div>
        `).join("")}
      </div>
    `;
    elements.clearGeneratorLocksButton?.classList.remove("hidden");
  }

  function toggleGeneratorLock(key) {
    if (!lockableGeneratorKeys.has(key)) return;
    const isDependentLock = key === "race" || key === "role";
    if (isDependentLock && !state.lockedGeneratorKeys.has("genre")) return;
    if (state.lockedGeneratorKeys.has(key)) {
      state.lockedGeneratorKeys.delete(key);
      if (key === "genre") {
        state.lockedGeneratorKeys.delete("race");
        state.lockedGeneratorKeys.delete("role");
      }
    } else {
      state.lockedGeneratorKeys.add(key);
    }
    renderGeneratorLockSummary();
    renderGenerator();
  }

  function clearGeneratorLocks() {
    state.lockedGeneratorKeys.clear();
    renderGeneratorLockSummary();
    renderGenerator();
  }
  function generateRandomResult() {
    clearGeneratorAssistNotes();
    saveCurrentGeneratorResultToHistory();
    const lockedOverrides = state.lockedGeneratorKeys.size > 0 ? getLockedGeneratorOverrides() : {};
    if (state.lockedGeneratorKeys.size === 0) {
      state.lockedGeneratorKeys.clear();
    }
    state.generated = createGeneratorResult(lockedOverrides);
    saveCurrentGeneratorResultToHistory();
    renderGenerator();
  }

  function getGeneratorSketchbookValues() {
    return {
      race: text(elements.sketchbookRace?.value),
      role: text(elements.sketchbookRole?.value),
      personality: text(elements.sketchbookPersonality?.value),
      genre: text(elements.sketchbookGenre?.value)
    };
  }

  function setGeneratorSketchbookValues(values = {}) {
    if (elements.sketchbookRace) elements.sketchbookRace.value = values.race ?? "";
    if (elements.sketchbookRole) elements.sketchbookRole.value = values.role ?? "";
    if (elements.sketchbookPersonality) elements.sketchbookPersonality.value = values.personality ?? "";
    if (elements.sketchbookGenre) elements.sketchbookGenre.value = values.genre ?? "";
  }

  function areGeneratorSketchbookFieldsEmpty() {
    const values = getGeneratorSketchbookValues();
    return !values.race && !values.role && !values.personality && !values.genre;
  }

  function setSketchbookFromGenerated(result) {
    if (!result) return;
    setGeneratorSketchbookValues({
      race: result.race || "",
      role: result.role || "",
      personality: result.personality || "",
      genre: result.genre || ""
    });
  }

  function createGeneratorSketchbookRecentSummary(values = {}) {
    return [values.race, values.role, values.personality, values.genre].filter(Boolean).join(" · ") || "스케치북 정보";
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
      state.sketchbookRecentEntries = Array.isArray(parsed)
        ? parsed.map(normalizeGeneratorSketchbookRecentEntry).filter(Boolean).slice(0, generatorSketchbookRecentLimit)
        : [];
    } catch (error) {
      state.sketchbookRecentEntries = [];
    }
  }

  function persistGeneratorSketchbookRecentEntries() {
    try {
      localStorage.setItem(generatorSketchbookRecentStorageKey, JSON.stringify(state.sketchbookRecentEntries.slice(0, generatorSketchbookRecentLimit)));
    } catch (error) {
      // Prompt copying should continue when storage is unavailable.
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
    if (!elements.sketchbookRecentSelect) return;
    elements.sketchbookRecentSelect.innerHTML = "";
    if (state.sketchbookRecentEntries.length === 0) {
      const option = document.createElement("option");
      option.value = "";
      option.textContent = "최근 복사본 없음";
      elements.sketchbookRecentSelect.appendChild(option);
      elements.sketchbookRecentSelect.disabled = true;
      if (elements.loadSketchbookRecentButton) elements.loadSketchbookRecentButton.disabled = true;
      return;
    }
    state.sketchbookRecentEntries.forEach((entry, index) => {
      const option = document.createElement("option");
      option.value = entry.id;
      option.textContent = `#${index + 1} ${entry.summary}`;
      elements.sketchbookRecentSelect.appendChild(option);
    });
    elements.sketchbookRecentSelect.disabled = false;
    elements.sketchbookRecentSelect.value = state.sketchbookRecentEntries[0]?.id || "";
    if (elements.loadSketchbookRecentButton) elements.loadSketchbookRecentButton.disabled = false;
  }

  function applyGeneratorSketchbookRecentEntry(entry) {
    if (!entry) return;
    setGeneratorSketchbookValues(entry);
    if (elements.sketchbookRecentSelect) elements.sketchbookRecentSelect.value = entry.id;
  }

  function loadSelectedGeneratorSketchbookRecentEntry() {
    const entry = state.sketchbookRecentEntries.find(item => item.id === elements.sketchbookRecentSelect?.value)
      ?? state.sketchbookRecentEntries[0];
    applyGeneratorSketchbookRecentEntry(entry);
  }

  function autoApplyLatestGeneratorSketchbookRecentEntry() {
    if (!areGeneratorSketchbookFieldsEmpty()) return;
    applyGeneratorSketchbookRecentEntry(state.sketchbookRecentEntries[0]);
  }

  function refreshGeneratorSketchbookRecentControls() {
    loadGeneratorSketchbookRecentEntries();
    renderGeneratorSketchbookRecentChoices();
  }

  function saveCurrentGeneratorImagePromptContextToSketchbookRecent() {
    const entry = captureCurrentGeneratorSketchbookContext();
    if (!entry) return;
    state.sketchbookRecentEntries = [
      entry,
      ...state.sketchbookRecentEntries.filter(item => !isSameGeneratorSketchbookRecentEntry(item, entry))
    ].slice(0, generatorSketchbookRecentLimit);
    persistGeneratorSketchbookRecentEntries();
    renderGeneratorSketchbookRecentChoices();
    if (state.generatorTab === "followup") {
      autoApplyLatestGeneratorSketchbookRecentEntry();
    }
  }

  function getGeneratorAssistNotes() {
    return {
      scene: String(state.generatorAssistNotes?.scene || "").trim(),
      composition: String(state.generatorAssistNotes?.composition || "").trim(),
      direction: String(state.generatorAssistNotes?.direction || "").trim()
    };
  }

  function hasCompleteGeneratorAssistNotes() {
    const notes = getGeneratorAssistNotes();
    return Boolean(notes.scene && notes.composition && notes.direction);
  }

  function clearGeneratorAssistNotes() {
    state.generatorAssistNotes = {
      scene: "",
      composition: "",
      direction: ""
    };
    renderGeneratorAssistPreview();
  }

  function showGeneratorNotice(title, copy) {
    openPromptModal({
      kicker: "NOTICE",
      title,
      copy,
      text: "",
      notice: true
    });
  }

  function sanitizeGeneratorAssistPasteText(text) {
    return String(text || "").replace(/[\u200B-\u200D\uFEFF\u00A0]/g, " ");
  }

  function normalizeGeneratorAssistLabel(label) {
    return sanitizeGeneratorAssistPasteText(label)
      .replace(/[\*_`~]/g, "")
      .replace(/[：:]+$/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function stripGeneratorAssistLineDecorators(line) {
    return sanitizeGeneratorAssistPasteText(line)
      .replace(/^[\s>*\-•·▪◦‣⁃‧●○◆◇▶▷▸▹]+/, "")
      .replace(/[\*_`~]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function isGeneratorAssistSetHeading(line) {
    const cleaned = stripGeneratorAssistLineDecorators(line);
    return /^(?:\[\s*)?(?:세트\s*[A-C]|[A-C]안)(?:\s*\])?$/i.test(cleaned);
  }

  function parseGeneratorAssistLineSection(line, labelMap) {
    const cleaned = stripGeneratorAssistLineDecorators(line);
    const match = cleaned.match(/^([^:：]+)\s*[:：]\s*(.*)$/);
    if (!match) return null;
    const key = labelMap.get(normalizeGeneratorAssistLabel(match[1]));
    return key ? { key, value: String(match[2] || "").trim() } : null;
  }

  function parseGeneratorAssistNotesFromText(input) {
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

    sanitizeGeneratorAssistPasteText(input)
      .split(/\r?\n/)
      .forEach(rawLine => {
        const line = String(rawLine || "").trim();
        if (!line) return;

        if (isGeneratorAssistSetHeading(line)) {
          currentKey = "";
          return;
        }

        const section = parseGeneratorAssistLineSection(line, labelMap);
        if (section) {
          currentKey = section.key;
          if (section.value) buckets[currentKey].push(stripGeneratorAssistLineDecorators(section.value));
          return;
        }

        if (!currentKey) return;

        const continuation = stripGeneratorAssistLineDecorators(line);
        if (!continuation || isGeneratorAssistSetHeading(continuation)) return;
        buckets[currentKey].push(continuation);
      });

    return {
      scene: buckets.scene.map(value => String(value || "").trim()).filter(Boolean).join("\n").trim(),
      composition: buckets.composition.map(value => String(value || "").trim()).filter(Boolean).join("\n").trim(),
      direction: buckets.direction.map(value => String(value || "").trim()).filter(Boolean).join("\n").trim()
    };
  }

  function buildGeneratorSetModalText() {
    const notes = getGeneratorAssistNotes();
    if (!notes.scene && !notes.composition && !notes.direction) return "";
    return [
      `장면: ${notes.scene}`,
      `구도: ${notes.composition}`,
      `연출: ${notes.direction}`
    ].filter(Boolean).join("\n\n");
  }

  function renderGeneratorAssistPreview() {
    if (!elements.generatorSetPreview) return;
    const notes = getGeneratorAssistNotes();
    const hasAny = Boolean(notes.scene || notes.composition || notes.direction);
    if (!hasAny) {
      elements.generatorSetPreview.classList.add("is-empty");
      elements.generatorSetPreview.innerHTML = '<p class="generator-set-preview-empty">아직 적용된 연출 세트가 없습니다. 질문용 프롬프트로 받은 A안/B안/C안을 그대로 붙여넣어 주세요.</p>';
      return;
    }
    elements.generatorSetPreview.classList.remove("is-empty");
    const items = [
      ["장면", notes.scene],
      ["구도", notes.composition],
      ["연출", notes.direction]
    ];
    elements.generatorSetPreview.innerHTML = items.map(([label, value]) => `
      <div class="generator-set-preview-item">
        <span class="generator-set-preview-label">${escapeHtml(label)}</span>
        <p class="generator-set-preview-value">${escapeHtml(value || "-")}</p>
      </div>
    `).join("");
  }
  function openGeneratorSetModal() {
    syncMobileVisualViewport();
    if (elements.generatorSetText) {
      elements.generatorSetText.value = buildGeneratorSetModalText();
    }
    elements.generatorSetModal?.classList.remove("hidden");
    focusModalControl(elements.generatorSetText);
  }

  function closeGeneratorSetModal() {
    blurModalControl(elements.generatorSetModal);
    elements.generatorSetModal?.classList.add("hidden");
  }

  function applyGeneratorSetModal() {
    const raw = String(elements.generatorSetText?.value || "").trim();
    if (!raw) {
      showGeneratorNotice("연출 세트가 비어 있습니다.", "질문용 프롬프트로 받은 A안/B안/C안 전체를 붙여넣어 주세요.");
      return;
    }
    const parsed = parseGeneratorAssistNotesFromText(raw);
    if (!(parsed.scene && parsed.composition && parsed.direction)) {
      showGeneratorNotice("연출 세트를 파싱하지 못했습니다.", "붙여넣은 내용에 장면, 구도, 연출이 모두 포함되어 있는지 확인해 주세요.");
      return;
    }
    state.generatorAssistNotes = parsed;
    renderGeneratorAssistPreview();
    closeGeneratorSetModal();
  }


  function renderGenerator() {
    document.querySelectorAll("[data-mobile-generator-tab]").forEach(button => {
      button.classList.toggle("is-active", button.dataset.mobileGeneratorTab === state.generatorTab);
    });
    elements.generatorRandomPanel?.classList.toggle("is-active", state.generatorTab === "random");
    elements.generatorFollowupPanel?.classList.toggle("is-active", state.generatorTab === "followup");
    renderGeneratedCard();
    renderGeneratorAssistPreview();
  }

  function renderGeneratedCard() {
    if (!elements.generatedCard) return;
    if (!hasGeneratorResult()) {
      elements.generatedCard.innerHTML = `<p class="muted">아직 생성된 결과가 없습니다.</p>`;
      return;
    }
    const keys = ["genre", "race", "role", "personality", "visualAge", "features", "weapon", "power", "hairstyle", "outfit", "fashionPoints", "colors"];
    const rows = keys.map(key => {
      const value = getGeneratorEntry(key);
      const lockable = lockableGeneratorKeys.has(key);
      const isDependentLock = key === "race" || key === "role";
      const disabled = isDependentLock && !state.lockedGeneratorKeys.has("genre");
      const lockButton = lockable ? `
        <button class="generator-lock-button ${state.lockedGeneratorKeys.has(key) ? "is-locked" : ""}" type="button" data-generator-lock-key="${escapeHtml(key)}" ${disabled ? "disabled" : ""} aria-pressed="${state.lockedGeneratorKeys.has(key) ? "true" : "false"}">
          ${state.lockedGeneratorKeys.has(key) ? "고정됨" : "고정"}
        </button>
      ` : "";
      return `
        <div class="generated-row">
          <div class="generated-row-header">
            <span>${escapeHtml(getGeneratorFieldLabel(key))}</span>
            ${lockButton}
          </div>
          <strong>${formatGeneratedValue(value, key)}</strong>
        </div>
      `;
    }).join("");
    elements.generatedCard.innerHTML = `
      <h2>랜덤 결과</h2>
      <div class="generated-list">${rows}</div>
    `;
    elements.generatedCard.querySelectorAll("[data-generator-lock-key]").forEach(button => {
      button.addEventListener("click", () => toggleGeneratorLock(button.dataset.generatorLockKey));
    });
  }

  function buildQuestionPrompt() {
    if (!hasGeneratorResult()) return "먼저 전체 랜덤 생성을 실행해주세요.";
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

  function buildImagePrompt() {
    if (!hasGeneratorResult()) return "먼저 전체 랜덤 생성을 실행해주세요.";
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

  function getFollowupName() {
    return text(elements.followupName?.value);
  }

  function requireFollowupName() {
    if (getFollowupName()) return true;
    openPromptModal({
      kicker: "NOTICE",
      title: "캐릭터 이름이 필요합니다.",
      copy: "이 후속 프롬프트는 캐릭터 이름을 먼저 입력해야 합니다.",
      text: "",
      notice: true,
      afterClose: () => elements.followupName?.focus()
    });
    return false;
  }

  function fillName(template) {
    const name = getFollowupName();
    return String(template || "")
      .replaceAll("{이름}", name)
      .replaceAll("[원하는 캐릭터명 또는 캐릭터 설정]", name);
  }

  function buildSketchbookPrompt() {
    const values = getGeneratorSketchbookValues();
    const speciesPrompt = generatorSketchbookSpeciesPromptMap[values.race.toLowerCase().replace(/\s+/g, "")] || "";
    return generatorSketchbookPromptTemplate
      .replaceAll("{종족}", values.race)
      .replaceAll("{직업}", values.role)
      .replaceAll("{성격}", values.personality)
      .replaceAll("{장르}", values.genre)
      .replaceAll("{종족별 문구}", speciesPrompt)
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  function buildFollowupPrompt(kind) {
    if (kind === "doodle") {
      if (!requireFollowupName()) return null;
      return `${generatorSketchSheetPromptTemplate}\n\n캐릭터 이름: ${getFollowupName()}`;
    }
    if (kind === "turnaround") {
      if (!requireFollowupName()) return null;
      return fillName(generatorTurnaroundPromptTemplate);
    }
    if (kind === "magazine") {
      if (!requireFollowupName()) return null;
      return fillName(generatorMagazinePromptTemplate);
    }
    if (kind === "sketchbook") return buildSketchbookPrompt();
    if (kind === "bodyinfo") return generatorBodyInfoPromptTemplate;
    if (kind === "cookmag") {
      if (!requireFollowupName()) return null;
      return fillName(generatorCookingMagazinePromptTemplate);
    }
    return "아직 등록되지 않은 후속 프롬프트입니다.";
  }
  function openPromptModal({ kicker = "PROMPT", title = "프롬프트", copy = "아래 내용을 확인한 뒤 복사하세요.", text: value = "", notice = false, afterClose = null, source = "" }) {
    syncMobileVisualViewport();
    state.promptAfterCopy = afterClose;
    state.promptSource = source;
    if (elements.promptKicker) elements.promptKicker.textContent = kicker;
    if (elements.promptTitle) elements.promptTitle.textContent = title;
    if (elements.promptCopy) elements.promptCopy.textContent = copy;
    if (elements.promptText) {
      elements.promptText.value = value;
      elements.promptText.classList.toggle("hidden", notice);
    }
    if (elements.promptCopyButton) elements.promptCopyButton.textContent = notice ? "확인" : "복사";
    elements.promptModal?.classList.remove("hidden");
  }

  function closePromptModal() {
    blurModalControl(elements.promptModal);
    elements.promptModal?.classList.add("hidden");
    const afterClose = state.promptAfterCopy;
    state.promptAfterCopy = null;
    state.promptSource = "";
    if (typeof afterClose === "function") afterClose();
  }

  async function copyPromptText() {
    if (elements.promptText?.classList.contains("hidden")) {
      closePromptModal();
      return;
    }
    const value = elements.promptText?.value || "";
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      if (state.promptSource === "image") {
        saveCurrentGeneratorImagePromptContextToSketchbookRecent();
      }
      if (elements.promptTitle) elements.promptTitle.textContent = "복사되었습니다.";
      if (elements.promptCopy) elements.promptCopy.textContent = "프롬프트가 클립보드에 복사되었습니다.";
      if (elements.promptText) elements.promptText.classList.add("hidden");
      if (elements.promptCopyButton) elements.promptCopyButton.textContent = "확인";
    } catch (error) {
      window.prompt("프롬프트를 직접 복사해주세요.", value);
    }
  }

  function bindElements() {
    Object.assign(elements, {
      screenTitle: $("mobileScreenTitle"),
      adminAccess: $("mobileAdminAccess"),
      modeToggle: $("mobileModeToggle"),
      adminLoginModal: $("mobileAdminLoginModal"),
      adminLoginMessage: $("mobileAdminLoginMessage"),
      adminPasswordInput: $("mobileAdminPasswordInput"),
      adminLoginClose: $("mobileAdminLoginClose"),
      adminLoginSubmit: $("mobileAdminLoginSubmit"),
      homeCharacterCount: $("mobileHomeCharacterCount"),
      homeStoryCount: $("mobileHomeStoryCount"),
      homeMode: $("mobileHomeMode"),
      characterSearch: $("mobileCharacterSearch"),
      characterClear: $("mobileCharacterClear"),
      characterCountLine: $("mobileCharacterCountLine"),
      characterList: $("mobileCharacterList"),
      detailBack: $("mobileDetailBack"),
      detailImage: $("mobileDetailImage"),
      detailKicker: $("mobileDetailKicker"),
      detailName: $("mobileDetailName"),
      detailEn: $("mobileDetailEn"),
      detailIntro: $("mobileDetailIntro"),
      detailTabs: document.querySelector(".detail-tabs"),
      detailPanel: $("mobileDetailPanel"),
      libraryScreen: $("mobileLibraryScreen"),
      storySearch: $("mobileStorySearch"),
      storyClear: $("mobileStoryClear"),
      storyList: $("mobileStoryList"),
      storyReader: $("mobileStoryReader"),
      storyClose: $("mobileStoryClose"),
      storyKicker: $("mobileStoryKicker"),
      storyTitle: $("mobileStoryTitle"),
      storySummary: $("mobileStorySummary"),
      storyBody: $("mobileStoryBody"),
      storyRelatedCharacters: $("mobileStoryRelatedCharacters"),
      generateButton: $("mobileGenerateButton"),
      generatorLockSummary: $("mobileGeneratorLockSummary"),
      clearGeneratorLocksButton: $("mobileClearGeneratorLocksButton"),
      generatedCard: $("mobileGeneratedCard"),
      generatorHistoryList: $("mobileGeneratorHistoryList"),
      clearGeneratorHistoryButton: $("mobileClearGeneratorHistoryButton"),
      questionPromptButton: $("mobileQuestionPromptButton"),
      generatorSetPasteButton: $("mobileGeneratorSetPasteButton"),
      generatorSetPreview: $("mobileGeneratorSetPreview"),
      imagePromptButton: $("mobileImagePromptButton"),
      generatorRandomPanel: $("mobileGeneratorRandomPanel"),
      generatorFollowupPanel: $("mobileGeneratorFollowupPanel"),
      followupName: $("mobileFollowupName"),
      sketchbookRecentSelect: $("mobileSketchbookRecentSelect"),
      loadSketchbookRecentButton: $("mobileLoadSketchbookRecentButton"),
      sketchbookRace: $("mobileSketchbookRace"),
      sketchbookRole: $("mobileSketchbookRole"),
      sketchbookPersonality: $("mobileSketchbookPersonality"),
      sketchbookGenre: $("mobileSketchbookGenre"),
      promptModal: $("mobilePromptModal"),
      promptKicker: $("mobilePromptKicker"),
      promptTitle: $("mobilePromptTitle"),
      promptCopy: $("mobilePromptCopy"),
      promptText: $("mobilePromptText"),
      promptClose: $("mobilePromptClose"),
      promptCopyButton: $("mobilePromptCopyButton"),
      generatorSetModal: $("mobileGeneratorSetModal"),
      generatorSetText: $("mobileGeneratorSetText"),
      generatorSetClose: $("mobileGeneratorSetClose"),
      generatorSetApply: $("mobileGeneratorSetApply"),
      imageViewerModal: $("mobileImageViewerModal"),
      imageViewerKicker: $("mobileImageViewerKicker"),
      imageViewerTitle: $("mobileImageViewerTitle"),
      imageViewerClose: $("mobileImageViewerClose"),
      imageViewerStage: $("mobileImageViewerStage"),
      imageViewerImage: $("mobileImageViewerImage"),
      imageViewerHelp: $("mobileImageViewerHelp")
    });
  }

  function bindEvents() {
    elements.adminAccess?.addEventListener("click", handleAdminAccessTap);
    elements.modeToggle?.addEventListener("click", toggleMode);
    elements.adminLoginClose?.addEventListener("click", closeAdminLoginModal);
    elements.adminLoginSubmit?.addEventListener("click", submitAdminLogin);
    elements.adminPasswordInput?.addEventListener("keydown", event => {
      if (event.key === "Enter") submitAdminLogin();
    });
    elements.adminLoginModal?.addEventListener("click", event => {
      if (event.target === elements.adminLoginModal) closeAdminLoginModal();
    });

    document.querySelectorAll("[data-mobile-nav]").forEach(button => {
      button.addEventListener("click", () => switchScreen(button.dataset.mobileNav));
    });

    elements.characterSearch?.addEventListener("input", event => {
      state.query = event.target.value;
      renderCharacterList();
    });
    elements.characterClear?.addEventListener("click", () => {
      state.query = "";
      if (elements.characterSearch) elements.characterSearch.value = "";
      renderCharacterList();
    });

    elements.detailBack?.addEventListener("click", () => switchScreen("characters"));
    document.querySelectorAll("[data-mobile-detail-tab]").forEach(button => {
      button.addEventListener("click", () => {
        if (button.dataset.mobileDetailTab === "status" && !isAdminMode()) return;
        state.detailTab = button.dataset.mobileDetailTab;
        renderDetail();
        recordMobileRoute({ replace: true });
      });
    });

    elements.storySearch?.addEventListener("input", event => {
      state.storyQuery = event.target.value;
      renderStoryList();
    });
    elements.storyClear?.addEventListener("click", () => {
      state.storyQuery = "";
      if (elements.storySearch) elements.storySearch.value = "";
      renderStoryList();
    });
    elements.storyClose?.addEventListener("click", closeStory);
    elements.storyRelatedCharacters?.addEventListener("click", event => {
      const characterButton = event.target.closest("[data-mobile-related-character]");
      if (!characterButton) return;
      openRelatedCharacterByName(characterButton.dataset.mobileRelatedCharacter);
    });

    document.querySelectorAll("[data-mobile-generator-tab]").forEach(button => {
      button.addEventListener("click", () => {
        state.generatorTab = button.dataset.mobileGeneratorTab;
        renderGenerator();
      });
    });
    elements.generateButton?.addEventListener("click", generateRandomResult);
    elements.clearGeneratorLocksButton?.addEventListener("click", clearGeneratorLocks);
    elements.clearGeneratorHistoryButton?.addEventListener("click", clearGeneratorHistory);
    elements.loadSketchbookRecentButton?.addEventListener("click", loadSelectedGeneratorSketchbookRecentEntry);
    elements.questionPromptButton?.addEventListener("click", () => openPromptModal({
      kicker: "QUESTION PROMPT",
      title: "질문용 프롬프트",
      copy: "아래 내용을 확인한 뒤 ChatGPT에 붙여넣으세요.",
      text: buildQuestionPrompt()
    }));
    elements.generatorSetPasteButton?.addEventListener("click", openGeneratorSetModal);
    elements.imagePromptButton?.addEventListener("click", () => {
      if (!hasCompleteGeneratorAssistNotes()) {
        showGeneratorNotice("연출 세트가 필요합니다.", "연출 세트를 먼저 붙여넣어 주세요. 장면, 구도, 연출이 모두 필요합니다.");
        return;
      }
      openPromptModal({
        kicker: "IMAGE PROMPT",
        title: "생성용 프롬프트",
        copy: "아래 내용을 확인한 뒤 이미지 생성에 붙여넣으세요.",
        text: buildImagePrompt(),
        source: "image"
      });
    });

    document.querySelectorAll("[data-followup-kind]").forEach(button => {
      button.addEventListener("click", () => {
        const prompt = buildFollowupPrompt(button.dataset.followupKind);
        if (prompt === null) return;
        openPromptModal({
          kicker: "FOLLOW-UP PROMPT",
          title: `${button.textContent.trim()} 프롬프트`,
          copy: "아래 내용을 확인한 뒤 복사하세요.",
          text: prompt
        });
      });
    });

    elements.promptClose?.addEventListener("click", closePromptModal);
    elements.promptCopyButton?.addEventListener("click", copyPromptText);
    elements.promptModal?.addEventListener("click", event => {
      if (event.target === elements.promptModal) closePromptModal();
    });
    elements.generatorSetClose?.addEventListener("click", closeGeneratorSetModal);
    elements.generatorSetApply?.addEventListener("click", applyGeneratorSetModal);
    elements.generatorSetModal?.addEventListener("click", event => {
      if (event.target === elements.generatorSetModal) closeGeneratorSetModal();
    });

    elements.imageViewerClose?.addEventListener("click", closeImageViewer);
    elements.imageViewerStage?.addEventListener("pointerdown", handleImageViewerPointerDown);
    elements.imageViewerStage?.addEventListener("pointermove", handleImageViewerPointerMove);
    elements.imageViewerStage?.addEventListener("pointerup", handleImageViewerPointerEnd);
    elements.imageViewerStage?.addEventListener("pointercancel", handleImageViewerPointerEnd);
    elements.imageViewerModal?.addEventListener("click", event => {
      if (event.target === elements.imageViewerModal) closeImageViewer();
    });
  }

  function init() {
    document.body?.setAttribute("data-mobile-random-build", "final-admin-gate-image-modal-fold-fit-backnav-originfix-20260623");
    bindMobileVisualViewport();
    bindElements();
    bindEvents();
    bindMobileHistory();
    loadGeneratorHistory();
    loadGeneratorSketchbookRecentEntries();
    renderMode();
    renderHome();
    renderCharacterList();
    renderStoryList();
    renderGenerator();
    switchScreen("characters", { record: false });
    recordMobileRoute({ replace: true });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
