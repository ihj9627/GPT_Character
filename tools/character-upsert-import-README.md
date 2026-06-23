# 캐릭터 엑셀 upsert import 도구

이 도구는 현재 캐릭터 아카이브 기준의 기본정보 엑셀 `.xlsx` 파일을 읽어서 `characters.js`만 자동 추가/수정합니다.

이미지 폴더, 이미지 파일, `library-data.js`, 화면 UI는 건드리지 않습니다.  
현재 프로젝트의 `folder + albumKey` 이미지 연결 구조는 그대로 사용합니다.

## 파일

- `tools/character_upsert_from_xlsx.py`
- `templates/character_import_1_basic_template.xlsx`

기존 2차 상세정보 템플릿은 현재 기준에서 제거했습니다. 나중에 개별 스토리 입력 방식이 확정되면 새 템플릿으로 다시 만드는 방향입니다.

## 실행 방법

프로젝트 루트에서 실행합니다.

```bash
python tools/character_upsert_from_xlsx.py templates/character_import_1_basic_template.xlsx
```

먼저 결과만 보고 싶으면:

```bash
python tools/character_upsert_from_xlsx.py templates/character_import_1_basic_template.xlsx --dry-run
```

원본을 바로 덮어쓰지 않고 새 파일로 쓰려면:

```bash
python tools/character_upsert_from_xlsx.py templates/character_import_1_basic_template.xlsx --out characters.updated.js
```

## 기준값

`folder`가 캐릭터 고유 기준값입니다.

- 같은 `folder`가 이미 있으면 기존 캐릭터를 수정합니다.
- 같은 `folder`가 없으면 신규 캐릭터를 추가합니다.
- 이름이 아니라 `folder` 기준이므로, 나중에 캐릭터 이름을 바꿔도 같은 캐릭터를 계속 수정할 수 있습니다.

## 빈 칸 / CLEAR 규칙

- 엑셀 칸이 비어 있으면 기존 값을 유지합니다.
- 값이 있으면 해당 값으로 덮어씁니다.
- `CLEAR`라고 입력하면 문자열 필드는 빈 값으로, `albumKeys`는 빈 배열로 처리합니다.
- `hidden`에 `CLEAR`를 입력하면 숨김 플래그를 제거합니다.

## albumKeys

`albumKeys`는 쉼표로 구분해서 입력합니다.

```text
magazine, sketch, box
```

이 값은 `characters.js`에 배열로 저장됩니다.

```js
"albumKeys": ["magazine", "sketch", "box"]
```

주의: `albumKeys` 값은 `app-core.js`의 `albumKeyDefinitions`에 이미 정의되어 있어야 실제 이미지 탭에 표시됩니다. 이 도구는 `app-core.js`를 수정하지 않습니다.

## 기본정보 템플릿

`templates/character_import_1_basic_template.xlsx`

컬럼:

```text
folder
name
en
themeColor
albumKeys
gender
genre
race
job
age
personality
ability
weapon
height
weight
measurements
shortIntro
quote
```

`gender`부터 `measurements`까지는 `profile.basicInfo` 안에 자동으로 들어갑니다. `shortIntro`는 한 줄 소개, `quote`는 대표 대사에 반영됩니다.

## 한 줄 소개 / 대표 대사

`characters.js`에는 모든 캐릭터에 아래 필드가 유지됩니다.

```text
profile.shortIntro
profile.quote
```

기본정보 템플릿의 `shortIntro`, `quote` 컬럼으로 이 값을 입력하거나 수정할 수 있습니다. 빈 칸은 기존 값을 유지하고, 기존 값을 지우려면 `CLEAR`를 입력합니다.

## 제거된 예전 상세/설정 컬럼

현재 도구는 아래 예전 상세/설정 컬럼을 더 이상 지원하지 않습니다.

예전 2차 상세 템플릿에서 쓰던 배치/설정/메모 계열 컬럼은 더 이상 지원하지 않습니다.

이런 컬럼이 엑셀에 남아 있으면 건너뛰고 경고만 출력합니다. 삭제된 상세 구조가 `characters.js`에 다시 생성되지 않도록 하기 위한 안전장치입니다.

## 권장 작업 흐름

1. 캐릭터 이미지 폴더를 직접 추가합니다.
2. 기본정보 템플릿에 캐릭터 기본정보를 입력합니다.
3. import 도구를 `--dry-run`으로 먼저 실행해 경고를 확인합니다.
4. 문제가 없으면 실제 import를 실행해서 `characters.js`에 추가/수정합니다.
5. 브라우저에서 캐릭터 목록과 상세 프로필 기본정보를 확인합니다.
