// adventure-data-noct.js — Noct text adventure pilot data.
window.NOCT_ADVENTURE_SCENARIOS = [
  {
    "id": "noct-funeral-trial-pilot",
    "world": "노크트",
    "title": "흑관궁의 장례 재판",
    "summary": "죽음, 장례, 상속, 혈통, 기록 조작이 얽힌 노크트 30턴 파일럿입니다. 선택에 따라 다음 사건 흐름이 갈라집니다.",
    "maxTurns": 30,
    "initialLocation": "흑관궁 외문",
    "initialStats": {
      "health": 100,
      "sanity": 100,
      "suspicion": 0,
      "clue": 0,
      "taint": 0,
      "blackCoffinTrust": 0,
      "courtReputation": 0
    },
    "events": [
      {
        "id": "noct_001",
        "title": "검은 초대장",
        "location": "흑관궁 외문",
        "text": "흑관궁의 외문 앞에서 문지기가 검은 초대장을 확인한다. 참관인 자격은 적혀 있지만, 서명란은 비어 있다.",
        "choices": [
          {
            "label": "초대장을 조용히 내민다.",
            "result": "문지기는 초대장을 오래 들여다본 뒤, 당신의 이름을 문장 끝에 적었다.",
            "effects": {
              "sanity": -1,
              "blackCoffinTrust": 1
            },
            "addItems": [
              "검은 초대장",
              "외문 통행 허가"
            ],
            "addFlags": [
              "entered_by_invitation"
            ],
            "nextEventId": "noct_002"
          },
          {
            "label": "초대장을 누가 보냈는지 묻는다.",
            "result": "문지기는 대답하지 않았다. 다만 초대장을 돌려주기 전, 봉인의 빈 서명란을 손가락으로 짚었다.",
            "effects": {
              "suspicion": 1,
              "clue": 1
            },
            "addItems": [
              "검은 초대장"
            ],
            "addRecords": [
              "비어 있는 서명란"
            ],
            "addFlags": [
              "asked_inviter"
            ],
            "nextEventId": "noct_003"
          },
          {
            "label": "문지기의 반응을 살핀다.",
            "result": "문지기는 죽은 이의 이름보다 초대장의 봉인을 더 두려워하는 것처럼 보였다.",
            "effects": {
              "clue": 1
            },
            "addRecords": [
              "문지기의 불안"
            ],
            "addFlags": [
              "watched_gatekeeper"
            ],
            "nextEventId": "noct_003"
          },
          {
            "label": "기사 신분을 밝히고 정식 입장을 요구한다.",
            "characterIds": [
              "Lena"
            ],
            "result": "레나는 물러서지 않았다. 문지기는 검을 한 번 보고, 정식 참관인 표식을 내주었다.",
            "effects": {
              "courtReputation": 1,
              "suspicion": 1
            },
            "addItems": [
              "검은 초대장",
              "외문 통행 허가"
            ],
            "addFlags": [
              "lena_declared_knight"
            ],
            "nextEventId": "noct_002"
          }
        ]
      },
      {
        "id": "noct_002",
        "title": "외문 검문",
        "location": "흑관궁 외문",
        "text": "검은 갑옷의 문지기들이 소지품을 확인한다. 한 명이 검집을 오래 바라보며 말한다. “장례 재판에 무장은 어울리지 않습니다.”",
        "choices": [
          {
            "label": "검을 맡긴다.",
            "result": "검은 검은 천에 싸여 보관되었다. 몸은 가벼워졌지만 마음 한구석이 비었다.",
            "effects": {
              "sanity": -3,
              "blackCoffinTrust": 1
            },
            "addItems": [
              "무장 제한 기록"
            ],
            "addFlags": [
              "sword_deposited"
            ],
            "nextEventId": "noct_003"
          },
          {
            "label": "검을 지닌 채 들어가야 하는 이유를 설명한다.",
            "result": "문지기는 한참 뒤 봉인된 표식을 검집에 매달아 주었다.",
            "effects": {
              "suspicion": 1
            },
            "addItems": [
              "봉인된 검집 표식"
            ],
            "addFlags": [
              "sword_sealed"
            ],
            "nextEventId": "noct_003"
          },
          {
            "label": "허가장을 보여주고 절차를 따르라고 요구한다.",
            "requiredItems": [
              "외문 통행 허가"
            ],
            "result": "허가장은 검문 절차를 멈추게 만들었다. 문지기의 태도는 공손해졌지만 눈빛은 그렇지 않았다.",
            "effects": {
              "blackCoffinTrust": 1,
              "suspicion": 1
            },
            "addItems": [
              "봉인된 검집 표식"
            ],
            "addFlags": [
              "used_gate_pass"
            ],
            "nextEventId": "noct_007"
          },
          {
            "label": "검을 뽑지 않겠다고 맹세하되, 약자를 지키기 위한 검이라고 말한다.",
            "characterIds": [
              "Lena"
            ],
            "result": "레나의 말에 주변의 시선이 잠시 흔들렸다. 문지기는 검집에 봉인을 감고 물러났다.",
            "effects": {
              "courtReputation": 1,
              "suspicion": 1
            },
            "addItems": [
              "봉인된 검집 표식"
            ],
            "addFlags": [
              "lena_sword_oath"
            ],
            "nextEventId": "noct_003"
          }
        ]
      },
      {
        "id": "noct_003",
        "title": "장례 재판 대기실",
        "location": "흑관궁 대기실",
        "text": "대기실에는 귀족과 시녀, 관리들이 모여 있다. 벽에는 검은 천으로 가려진 초상화가 걸려 있지만 누구도 그 이름을 말하지 않는다.",
        "choices": [
          {
            "label": "초상화를 확인한다.",
            "result": "검은 천 아래의 문장은 초대장의 봉인과 다르다. 누군가 참관인의 기억을 시험하는 듯했다.",
            "effects": {
              "clue": 1
            },
            "addRecords": [
              "가려진 초상화의 문장"
            ],
            "addFlags": [
              "saw_covered_portrait"
            ],
            "nextEventId": "noct_004"
          },
          {
            "label": "주변 사람들의 대화를 듣는다.",
            "result": "사람들은 죽음보다 상속을 먼저 걱정하고 있었다.",
            "effects": {
              "sanity": -1,
              "clue": 1
            },
            "addRecords": [
              "상속을 걱정하는 목소리"
            ],
            "addFlags": [
              "heard_inheritance_whispers"
            ],
            "nextEventId": "noct_005"
          },
          {
            "label": "대기실 명부를 살핀다.",
            "result": "참관인 명부 한 줄이 칼로 긁혀 있었다. 그 자리에는 아직 마른 잉크 냄새가 남았다.",
            "effects": {
              "clue": 1,
              "suspicion": 1
            },
            "addRecords": [
              "대기실 명부"
            ],
            "addFlags": [
              "checked_waiting_register"
            ],
            "nextEventId": "noct_007"
          },
          {
            "label": "초대장의 문장과 대기실 명부의 문장을 비교한다.",
            "requiredItems": [
              "검은 초대장"
            ],
            "result": "문장은 닮았지만 획 하나가 다르다. 초대장은 흑관궁에서 온 것처럼 꾸며진 물건일 수 있다.",
            "effects": {
              "clue": 2
            },
            "addRecords": [
              "맞지 않는 문장"
            ],
            "addFlags": [
              "compared_invitation_seal"
            ],
            "nextEventId": "noct_007"
          }
        ]
      },
      {
        "id": "noct_004",
        "title": "첫 번째 종소리",
        "location": "흑관궁 대기실",
        "text": "흑관궁 깊은 곳에서 종이 한 번 울린다. 그 순간 시녀 하나가 은쟁반을 떨어뜨리고, 은잔이 바닥을 굴렀다.",
        "choices": [
          {
            "label": "은잔을 주워준다.",
            "result": "은잔의 가장자리에는 닦다 만 검은 얼룩이 남아 있었다.",
            "effects": {
              "clue": 1
            },
            "addRecords": [
              "은잔의 검은 얼룩"
            ],
            "addFlags": [
              "found_black_stain"
            ],
            "nextEventId": "noct_005"
          },
          {
            "label": "시녀에게 괜찮은지 묻는다.",
            "result": "시녀는 대답 대신 고개를 저었다. 그녀의 손끝이 아직 떨리고 있었다.",
            "effects": {
              "courtReputation": 1
            },
            "addFlags": [
              "comforted_maid"
            ],
            "nextEventId": "noct_005"
          },
          {
            "label": "종소리의 의미를 묻는다.",
            "result": "누군가 낮게 말했다. “한 번은 도착, 두 번은 회의, 세 번은 판정입니다.”",
            "effects": {
              "clue": 1
            },
            "addRecords": [
              "종소리의 의미"
            ],
            "addFlags": [
              "learned_bell_code"
            ],
            "nextEventId": "noct_010"
          },
          {
            "label": "시녀를 가리듯 한 걸음 앞으로 나선다.",
            "characterIds": [
              "Lena"
            ],
            "result": "레나는 시녀 앞을 막아섰다. 흑관 관리의 시선이 차갑게 머물렀지만, 시녀는 숨을 고를 시간을 얻었다.",
            "effects": {
              "courtReputation": 1,
              "suspicion": 1
            },
            "addFlags": [
              "lena_shielded_maid"
            ],
            "nextEventId": "noct_005"
          }
        ]
      },
      {
        "id": "noct_005",
        "title": "시녀의 짧은 경고",
        "location": "동쪽 회랑",
        "text": "시녀는 낮은 목소리로 말한다. “오늘 장례는 끝나지 않을 거예요. 누군가 이미 관 안의 이름을 바꿨어요.”",
        "choices": [
          {
            "label": "시녀에게 더 묻는다.",
            "result": "시녀는 더 말하지 못했다. 하지만 손가락으로 장례 의전실 방향을 가리켰다.",
            "effects": {
              "clue": 1,
              "suspicion": 1
            },
            "addRecords": [
              "시녀의 경고",
              "관 안의 이름"
            ],
            "addFlags": [
              "received_maid_warning"
            ],
            "nextEventId": "noct_006"
          },
          {
            "label": "관리자가 오기 전에 자리를 옮긴다.",
            "result": "당신은 시녀와 함께 회랑 모퉁이로 물러났다. 멀리서 검은 장갑이 지나갔다.",
            "effects": {
              "sanity": -1
            },
            "addFlags": [
              "moved_maid_away"
            ],
            "nextEventId": "noct_017"
          },
          {
            "label": "관리에게 시녀를 심문하지 말라고 말한다.",
            "result": "관리는 미소도 없이 고개를 기울였다. “그 말도 기록하겠습니다.”",
            "effects": {
              "suspicion": 2,
              "courtReputation": 1
            },
            "addFlags": [
              "challenged_official_for_maid"
            ],
            "nextEventId": "noct_010"
          },
          {
            "label": "시녀를 보호하며 그녀의 말을 증언으로 받아달라고 요구한다.",
            "characterIds": [
              "Lena"
            ],
            "result": "레나는 시녀 뒤로 물러서지 않았다. 시녀의 말은 공식 증언이 되지 않았지만, 완전히 묻히지도 않았다.",
            "effects": {
              "suspicion": 2,
              "courtReputation": 2
            },
            "addRecords": [
              "시녀의 보호된 증언"
            ],
            "addFlags": [
              "lena_protected_witness"
            ],
            "nextEventId": "noct_017"
          }
        ]
      },
      {
        "id": "noct_006",
        "title": "장례 의전실",
        "location": "장례 의전실",
        "text": "완성되지 않은 검은 장례복이 걸려 있다. 이상하게도 옷은 죽은 사람보다 살아 있는 사람에게 맞을 듯하다.",
        "choices": [
          {
            "label": "장례복의 치수를 확인한다.",
            "result": "목둘레와 소매 길이가 살아 있는 사람의 움직임을 기준으로 잡혀 있다.",
            "effects": {
              "clue": 1
            },
            "addRecords": [
              "수정된 장례복 치수"
            ],
            "addFlags": [
              "measured_funeral_cloak"
            ],
            "nextEventId": "noct_011"
          },
          {
            "label": "주문서를 찾아본다.",
            "result": "주문서의 이름란은 비어 있지만, 배달 시각만은 분명하게 남아 있다.",
            "effects": {
              "clue": 1
            },
            "addRecords": [
              "이름 없는 주문서"
            ],
            "addFlags": [
              "found_cloak_order"
            ],
            "nextEventId": "noct_007"
          },
          {
            "label": "“관 안의 이름”과 장례복 주문명을 비교한다.",
            "requiredRecords": [
              "시녀의 경고"
            ],
            "result": "경고와 주문서는 같은 빈칸을 가리키고 있었다. 이름이 비어 있는 곳마다 같은 손이 지나간 듯했다.",
            "effects": {
              "clue": 2,
              "sanity": -1
            },
            "addRecords": [
              "빈 이름의 반복"
            ],
            "addFlags": [
              "connected_name_and_cloak"
            ],
            "nextEventId": "noct_008"
          },
          {
            "label": "장례복이 검을 찬 사람의 움직임을 방해하는지 살핀다.",
            "characterIds": [
              "Lena"
            ],
            "result": "레나는 장례복의 품을 보고 금세 알아챘다. 이 옷은 누군가를 꾸미기 위한 것이 아니라 움직임을 제한하기 위한 옷이다.",
            "effects": {
              "clue": 1
            },
            "addRecords": [
              "움직임을 막는 장례복"
            ],
            "addFlags": [
              "lena_read_cloak_movement"
            ],
            "nextEventId": "noct_011"
          }
        ]
      },
      {
        "id": "noct_007",
        "title": "검은 장서고 입구",
        "location": "검은 장서고",
        "text": "검은 장서고 앞의 백서 관리원은 방문자의 이름과 목적을 기록한다. 허가 없는 열람은 장례 모독으로 간주된다고 했다.",
        "choices": [
          {
            "label": "정식 열람을 요청한다.",
            "result": "관리원은 허가장을 내주지 않았지만, 당신의 이름을 별도 장부에 적었다.",
            "effects": {
              "blackCoffinTrust": 1,
              "suspicion": 1
            },
            "addRecords": [
              "백서 관리원의 이름"
            ],
            "addFlags": [
              "requested_library_access"
            ],
            "nextEventId": "noct_008"
          },
          {
            "label": "장례 절차를 묻는다.",
            "result": "관리원은 절차를 설명했지만, 한 단계를 의도적으로 건너뛰었다.",
            "effects": {
              "clue": 1
            },
            "addRecords": [
              "빠진 장례 절차"
            ],
            "addFlags": [
              "noticed_missing_procedure"
            ],
            "nextEventId": "noct_010"
          },
          {
            "label": "명부의 참관인 권한을 근거로 열람을 요구한다.",
            "requiredRecords": [
              "대기실 명부"
            ],
            "result": "명부는 길을 열었다. 관리원은 임시 열람권에 검은 도장을 찍었다.",
            "effects": {
              "blackCoffinTrust": 1
            },
            "addItems": [
              "장서고 임시 열람권"
            ],
            "addFlags": [
              "gained_library_pass"
            ],
            "nextEventId": "noct_008"
          },
          {
            "label": "봉인된 검집 표식을 신분 증명처럼 제시한다.",
            "requiredItems": [
              "봉인된 검집 표식"
            ],
            "result": "검집 표식은 예상보다 강한 효력을 냈다. 흑관궁은 무장을 허락한 자의 이름을 무시하지 못했다.",
            "effects": {
              "blackCoffinTrust": 1
            },
            "addItems": [
              "장서고 임시 열람권"
            ],
            "addFlags": [
              "used_sword_seal_for_access"
            ],
            "nextEventId": "noct_008"
          }
        ]
      },
      {
        "id": "noct_008",
        "title": "봉인된 장례 명부",
        "location": "검은 장서고",
        "text": "안쪽 서가에서 검은 밀랍으로 봉인된 장례 명부를 발견한다. 표지에는 죽은 이의 이름 위로 다른 이름을 덮어쓴 흔적이 있다.",
        "choices": [
          {
            "label": "봉인을 풀지 않고 관리원에게 가져간다.",
            "result": "관리원은 명부를 보자마자 표정을 굳혔다. 그는 그것이 없어졌어야 할 물건처럼 반응했다.",
            "effects": {
              "clue": 1,
              "blackCoffinTrust": 1
            },
            "addRecords": [
              "봉인된 장례 명부"
            ],
            "addFlags": [
              "submitted_ledger"
            ],
            "nextEventId": "noct_010"
          },
          {
            "label": "봉인을 몰래 풀어본다.",
            "result": "명부는 열렸다. 그러나 검은 밀랍 조각 하나가 바닥으로 떨어졌다.",
            "effects": {
              "clue": 2,
              "suspicion": 2
            },
            "addRecords": [
              "덮어쓴 이름의 흔적"
            ],
            "addFlags": [
              "broke_ledger_seal"
            ],
            "nextEventId": "noct_009"
          },
          {
            "label": "정식 절차로 명부 열람을 요청한다.",
            "requiredItems": [
              "장서고 임시 열람권"
            ],
            "result": "열람권은 봉인을 정당하게 열게 했다. 명부의 첫 이름과 마지막 이름이 서로 달랐다.",
            "effects": {
              "clue": 2,
              "blackCoffinTrust": 1
            },
            "addRecords": [
              "덮어쓴 이름의 흔적"
            ],
            "addFlags": [
              "legally_opened_ledger"
            ],
            "nextEventId": "noct_011"
          },
          {
            "label": "부당하게 이름이 지워졌다는 점을 공개적으로 문제 삼는다.",
            "characterIds": [
              "Lena"
            ],
            "result": "레나의 목소리는 장서고 안에 울렸다. 관리원은 침묵했지만, 주변의 필경사들이 모두 손을 멈췄다.",
            "effects": {
              "suspicion": 2,
              "courtReputation": 1
            },
            "addRecords": [
              "공개적으로 문제 삼은 명부"
            ],
            "addFlags": [
              "lena_called_out_erased_name"
            ],
            "nextEventId": "noct_010"
          }
        ]
      },
      {
        "id": "noct_009",
        "title": "동쪽 회랑의 발소리",
        "location": "동쪽 회랑",
        "text": "발소리가 멈췄다가 다시 이어진다. 뒤돌아보면 복도에는 아무도 없다.",
        "choices": [
          {
            "label": "멈춰서 기다린다.",
            "result": "발소리도 함께 멈췄다. 침묵이 오히려 누군가의 존재를 증명했다.",
            "effects": {
              "sanity": -2,
              "clue": 1
            },
            "addRecords": [
              "보이지 않는 미행자"
            ],
            "addFlags": [
              "waited_for_follower"
            ],
            "nextEventId": "noct_010"
          },
          {
            "label": "근처 방으로 들어간다.",
            "result": "방 안의 창문은 잠겨 있었다. 누군가 일부러 숨을 곳을 정해둔 것 같았다.",
            "effects": {
              "sanity": -1
            },
            "addFlags": [
              "hid_from_follower"
            ],
            "nextEventId": "noct_016"
          },
          {
            "label": "발소리 방향을 따라간다.",
            "result": "회랑 끝에는 닫힌 문과 새로 긁힌 바닥 자국만 남아 있었다.",
            "effects": {
              "health": -2,
              "clue": 1
            },
            "addRecords": [
              "동쪽 회랑의 숨은 문"
            ],
            "addFlags": [
              "followed_steps"
            ],
            "nextEventId": "noct_016"
          },
          {
            "label": "여우 수인의 청각으로 발소리의 위치를 가늠한다.",
            "characterIds": [
              "Lena"
            ],
            "result": "레나는 호흡을 낮췄다. 발소리는 뒤가 아니라 벽 안에서 따라오고 있었다.",
            "effects": {
              "clue": 2
            },
            "addRecords": [
              "벽 안쪽의 발소리"
            ],
            "addFlags": [
              "lena_heard_wall_steps"
            ],
            "nextEventId": "noct_016"
          }
        ]
      },
      {
        "id": "noct_010",
        "title": "흑관 앞의 첫 심문",
        "location": "흑관궁 대기실",
        "text": "흑관 의전국 관리가 묻는다. “당신은 왜 이 장례의 이름에 관심을 갖습니까?”",
        "choices": [
          {
            "label": "초대받았기 때문이라고 답한다.",
            "result": "관리는 초대장을 다시 확인했다. 그의 표정에는 만족도 불만도 없었다.",
            "effects": {
              "blackCoffinTrust": 1
            },
            "addRecords": [
              "첫 심문 기록"
            ],
            "addFlags": [
              "answered_invitation"
            ],
            "nextEventId": "noct_011"
          },
          {
            "label": "장례 절차가 이상하다고 말한다.",
            "result": "주변의 대화가 멈췄다. 누군가 당신의 말을 그대로 받아 적기 시작했다.",
            "effects": {
              "suspicion": 2,
              "clue": 1
            },
            "addRecords": [
              "절차 이상 발언"
            ],
            "addFlags": [
              "questioned_funeral_procedure"
            ],
            "nextEventId": "noct_012"
          },
          {
            "label": "명부의 이름이 조작되었다고 주장한다.",
            "requiredRecords": [
              "봉인된 장례 명부"
            ],
            "result": "관리의 눈동자가 처음으로 움직였다. 그는 그 명부가 어디서 났는지 묻지 않았다.",
            "effects": {
              "suspicion": 2,
              "clue": 1
            },
            "addRecords": [
              "명부 조작 주장"
            ],
            "addFlags": [
              "accused_ledger_tampering"
            ],
            "nextEventId": "noct_020"
          },
          {
            "label": "정의롭지 못한 장례라면 기사로서 외면할 수 없다고 말한다.",
            "characterIds": [
              "Lena"
            ],
            "result": "레나의 말은 위험했다. 그러나 방 안의 몇몇 사람은 고개를 들었다.",
            "effects": {
              "suspicion": 2,
              "courtReputation": 2
            },
            "addRecords": [
              "기사의 이의 제기"
            ],
            "addFlags": [
              "lena_public_objection"
            ],
            "nextEventId": "noct_011"
          }
        ]
      },
      {
        "id": "noct_011",
        "title": "유품 상자",
        "location": "봉인된 안뜰",
        "text": "유품 상자 안에는 반지, 은장식 단검, 낡은 기도문, 그리고 비어 있는 칸 하나가 있다. 목록의 다섯 번째 항목은 긁혀 지워져 있다.",
        "choices": [
          {
            "label": "유품 목록을 확인한다.",
            "result": "목록의 글씨는 바깥 명부와 같은 손에서 나온 것처럼 보였다.",
            "effects": {
              "clue": 1
            },
            "addRecords": [
              "유품 목록"
            ],
            "addFlags": [
              "read_relic_list"
            ],
            "nextEventId": "noct_012"
          },
          {
            "label": "비어 있는 칸의 크기를 본다.",
            "result": "그 칸은 반지나 편지보다 크고, 작은 관 장식보다 작았다.",
            "effects": {
              "clue": 1
            },
            "addRecords": [
              "비어 있는 칸"
            ],
            "addFlags": [
              "checked_empty_slot"
            ],
            "nextEventId": "noct_018"
          },
          {
            "label": "은장식 단검을 챙긴다.",
            "result": "단검은 실전용이라기보다 의식용에 가까웠다. 하지만 은은 진짜였다.",
            "effects": {
              "suspicion": 1
            },
            "addItems": [
              "은장식 단검"
            ],
            "addFlags": [
              "took_silver_dagger"
            ],
            "nextEventId": "noct_012"
          },
          {
            "label": "은장식 단검이 실전용인지 의식용인지 살핀다.",
            "characterIds": [
              "Lena"
            ],
            "result": "레나는 칼의 무게중심만으로 알아챘다. 이 단검은 싸움보다 증명을 위해 만들어졌다.",
            "effects": {
              "clue": 1
            },
            "addItems": [
              "은장식 단검"
            ],
            "addRecords": [
              "증명용 은단검"
            ],
            "addFlags": [
              "lena_identified_ritual_blade"
            ],
            "nextEventId": "noct_018"
          }
        ]
      },
      {
        "id": "noct_012",
        "title": "두 번째 종소리",
        "location": "흑관궁 대기실",
        "text": "종이 두 번 울린다. 혈통 귀족회의 문장을 단 사자가 한 귀족을 데리고 회랑으로 사라졌다.",
        "choices": [
          {
            "label": "귀족을 따라간다.",
            "result": "회랑 끝에서 피와 상속에 관한 낮은 말소리가 들렸다.",
            "effects": {
              "clue": 1,
              "suspicion": 1
            },
            "addRecords": [
              "혈통 귀족회의 움직임"
            ],
            "addFlags": [
              "followed_noble"
            ],
            "nextEventId": "noct_013"
          },
          {
            "label": "혈통 귀족회의 사자에게 말을 건다.",
            "result": "사자는 공손했지만 자신의 이름은 말하지 않았다.",
            "effects": {
              "clue": 1
            },
            "addRecords": [
              "이름 없는 혈통 사자"
            ],
            "addFlags": [
              "spoke_to_blood_envoy"
            ],
            "nextEventId": "noct_013"
          },
          {
            "label": "단검의 문장이 혈통 귀족회의 것인지 확인한다.",
            "requiredItems": [
              "은장식 단검"
            ],
            "result": "단검의 문장은 혈통 귀족회의 공식 문장과 아주 조금 다르다.",
            "effects": {
              "clue": 2
            },
            "addRecords": [
              "닮았지만 다른 혈통 문장"
            ],
            "addFlags": [
              "compared_blood_mark"
            ],
            "nextEventId": "noct_018"
          },
          {
            "label": "회랑 입구를 지키며 누가 드나드는지 본다.",
            "characterIds": [
              "Lena"
            ],
            "result": "레나는 문을 막지 않았지만, 누구도 그녀의 시선을 피해 지나가지는 못했다.",
            "effects": {
              "courtReputation": 1
            },
            "addRecords": [
              "회의 출입자 명단"
            ],
            "addFlags": [
              "lena_watched_corridor"
            ],
            "nextEventId": "noct_021"
          }
        ]
      },
      {
        "id": "noct_013",
        "title": "혈통 귀족회의 초대장",
        "location": "서쪽 회랑",
        "text": "문틈에 검은 봉투가 꽂혀 있다. “진실은 관 앞에서보다, 피 앞에서 먼저 열린다.”",
        "choices": [
          {
            "label": "초대에 응한다.",
            "result": "봉투 안쪽에서는 오래된 장미 향과 낯선 잉크 냄새가 함께 났다.",
            "effects": {
              "suspicion": 1,
              "clue": 1
            },
            "addItems": [
              "혈통 귀족회의 초대장"
            ],
            "addFlags": [
              "accepted_blood_invitation"
            ],
            "nextEventId": "noct_025"
          },
          {
            "label": "초대장을 흑관 의전국에 제출한다.",
            "result": "의전국 관리는 초대장을 받아들고 오래 침묵했다. 그는 그것을 증거라 부르지 않았다.",
            "effects": {
              "blackCoffinTrust": 1,
              "suspicion": 1
            },
            "addRecords": [
              "제출된 혈통 초대장"
            ],
            "addFlags": [
              "submitted_blood_invitation"
            ],
            "nextEventId": "noct_024"
          },
          {
            "label": "초대장 봉인과 사자의 문장을 대조한다.",
            "requiredRecords": [
              "혈통 귀족회의 움직임"
            ],
            "result": "둘은 같지 않다. 누군가 혈통 귀족회의 이름을 빌리고 있다.",
            "effects": {
              "clue": 2
            },
            "addRecords": [
              "가짜 봉인의 의심"
            ],
            "addFlags": [
              "suspected_fake_blood_seal"
            ],
            "nextEventId": "noct_021"
          },
          {
            "label": "함정일 가능성을 경계하며 검집을 손에서 떼지 않는다.",
            "characterIds": [
              "Lena"
            ],
            "result": "레나는 초대장을 접었지만 방심하지 않았다. 회랑의 그림자가 한 발 물러났다.",
            "effects": {
              "sanity": 1
            },
            "addItems": [
              "혈통 귀족회의 초대장"
            ],
            "addFlags": [
              "lena_guarded_blood_invite"
            ],
            "nextEventId": "noct_021"
          }
        ]
      },
      {
        "id": "noct_014",
        "title": "망령의 안뜰",
        "location": "봉인된 안뜰",
        "text": "검은 나무 아래에서 목소리가 들린다. “내 장례는 끝났는가?” 죽은 이의 목소리처럼 들리지만 반복이 지나치게 정확하다.",
        "choices": [
          {
            "label": "누구냐고 묻는다.",
            "result": "목소리는 답하지 않고 같은 문장만 반복했다.",
            "effects": {
              "sanity": -3,
              "taint": 1
            },
            "addRecords": [
              "망령의 반복 문장"
            ],
            "addFlags": [
              "spoke_to_ghost"
            ],
            "nextEventId": "noct_026"
          },
          {
            "label": "죽은 이의 이름을 말한다.",
            "result": "목소리는 잠시 멈췄다가 더 낮게 웃었다. 그 이름은 맞지 않는 듯했다.",
            "effects": {
              "sanity": -2,
              "taint": 1,
              "clue": 1
            },
            "addRecords": [
              "잘못된 이름에 반응한 목소리"
            ],
            "addFlags": [
              "said_wrong_name_to_ghost"
            ],
            "nextEventId": "noct_026"
          },
          {
            "label": "서로 다른 이름을 차례로 말해본다.",
            "requiredRecords": [
              "관 안의 이름"
            ],
            "result": "두 번째 이름에서 나무 그림자가 흔들렸다. 목소리가 처음으로 다른 말을 했다.",
            "effects": {
              "sanity": -3,
              "clue": 2,
              "taint": 1
            },
            "addRecords": [
              "진짜 이름의 첫 단서"
            ],
            "addFlags": [
              "tested_names_with_ghost"
            ],
            "nextEventId": "noct_026"
          },
          {
            "label": "검을 뽑지 않은 채 목소리 쪽으로 다가간다.",
            "characterIds": [
              "Lena"
            ],
            "result": "레나는 검을 뽑지 않았다. 두려움보다 명예를 앞세운 걸음에 목소리가 잠시 흐려졌다.",
            "effects": {
              "sanity": -1,
              "clue": 1,
              "taint": 1
            },
            "addRecords": [
              "검을 뽑지 않은 접근"
            ],
            "addFlags": [
              "lena_faced_ghost_unarmed"
            ],
            "nextEventId": "noct_026"
          }
        ]
      },
      {
        "id": "noct_015",
        "title": "밤의 중간 판정",
        "location": "흑관궁 숙소 구역",
        "text": "밤이 되자 흑관궁의 문들이 하나씩 닫힌다. 오늘 밤 누군가는 장례 기록을 옮길 것이다.",
        "choices": [
          {
            "label": "방으로 돌아간다.",
            "result": "방은 안전했지만, 복도에서 수레가 지나가는 소리만은 또렷하게 들렸다.",
            "effects": {
              "sanity": 2
            },
            "addFlags": [
              "rested_midnight"
            ],
            "nextEventId": "noct_020"
          },
          {
            "label": "장서고 근처에서 기다린다.",
            "result": "한밤중 장서고 문이 아주 조금 열렸다.",
            "effects": {
              "sanity": -2,
              "clue": 1
            },
            "addRecords": [
              "밤의 장서고 움직임"
            ],
            "addFlags": [
              "watched_library_at_night"
            ],
            "nextEventId": "noct_016"
          },
          {
            "label": "혈통 초대장에 적힌 장소로 간다.",
            "requiredItems": [
              "혈통 귀족회의 초대장"
            ],
            "result": "어두운 방에서 누군가 당신을 기다리고 있었다. 그는 자신을 귀족회의 사자라고 부르지 않았다.",
            "effects": {
              "suspicion": 2,
              "clue": 1
            },
            "addRecords": [
              "밤의 혈통 접촉"
            ],
            "addFlags": [
              "went_to_blood_meeting"
            ],
            "nextEventId": "noct_025"
          },
          {
            "label": "미행자를 유인하기 위해 일부러 홀로 움직인다.",
            "requiredRecords": [
              "보이지 않는 미행자"
            ],
            "result": "미행자는 모습을 드러내지 않았다. 대신 문틈 아래로 찢어진 종이 한 장이 밀려 들어왔다.",
            "effects": {
              "sanity": -1,
              "clue": 1
            },
            "addRecords": [
              "미행자가 남긴 종이"
            ],
            "addFlags": [
              "lured_follower"
            ],
            "nextEventId": "noct_009"
          }
        ]
      },
      {
        "id": "noct_016",
        "title": "장서고의 밤",
        "location": "검은 장서고",
        "text": "장서고 안쪽에서 종이를 넘기는 소리가 난다. 촛불은 켜져 있지 않다.",
        "choices": [
          {
            "label": "안으로 들어간다.",
            "result": "어둠 속에서 누군가 창문으로 빠져나갔다. 바닥에는 찢어진 기록 조각만 남았다.",
            "effects": {
              "health": -3,
              "sanity": -1,
              "clue": 1
            },
            "addRecords": [
              "찢어진 장례 기록"
            ],
            "addFlags": [
              "entered_dark_library"
            ],
            "nextEventId": "noct_023"
          },
          {
            "label": "문틈으로 지켜본다.",
            "result": "손 하나가 명부 한 장을 뽑아 접었다. 손등에는 검은 밀랍이 묻어 있었다.",
            "effects": {
              "clue": 2
            },
            "addRecords": [
              "검은 밀랍 묻은 손"
            ],
            "addFlags": [
              "watched_library_intruder"
            ],
            "nextEventId": "noct_017"
          },
          {
            "label": "정식 열람자처럼 문을 열고 들어간다.",
            "requiredItems": [
              "장서고 임시 열람권"
            ],
            "result": "허가받은 사람처럼 들어가자 침입자는 당황했다. 그는 기록을 버리고 도망쳤다.",
            "effects": {
              "clue": 2,
              "blackCoffinTrust": 1
            },
            "addRecords": [
              "버려진 장례 기록"
            ],
            "addFlags": [
              "used_pass_at_night"
            ],
            "nextEventId": "noct_023"
          },
          {
            "label": "갑작스러운 공격에 대비해 몸을 낮춘다.",
            "characterIds": [
              "Lena"
            ],
            "result": "레나는 문턱을 넘기 전 몸을 낮췄다. 바로 그 위를 검은 물체가 스쳐 지나갔다.",
            "effects": {
              "health": -1,
              "clue": 1
            },
            "addRecords": [
              "장서고의 기습 흔적"
            ],
            "addFlags": [
              "lena_avoided_library_attack"
            ],
            "nextEventId": "noct_023"
          }
        ]
      },
      {
        "id": "noct_017",
        "title": "시녀의 행방",
        "location": "시녀 숙소",
        "text": "경고를 건넨 시녀가 사라졌다. 그녀의 방에는 은쟁반과 검은 약재 냄새가 밴 손수건만 남아 있다.",
        "choices": [
          {
            "label": "손수건을 챙긴다.",
            "result": "손수건에서는 은잔의 얼룩과 같은 냄새가 났다.",
            "effects": {
              "clue": 1
            },
            "addItems": [
              "검은 약재 손수건"
            ],
            "addRecords": [
              "사라진 시녀의 방"
            ],
            "addFlags": [
              "took_medicinal_handkerchief"
            ],
            "nextEventId": "noct_020"
          },
          {
            "label": "방을 수색한다.",
            "result": "침대 아래에서 급히 찢긴 작은 쪽지를 찾았다. 내용은 단 한 단어뿐이었다. “관.”",
            "effects": {
              "clue": 1,
              "sanity": -1
            },
            "addRecords": [
              "관이라고 적힌 쪽지"
            ],
            "addFlags": [
              "searched_maid_room"
            ],
            "nextEventId": "noct_023"
          },
          {
            "label": "은잔의 얼룩과 손수건 냄새를 비교한다.",
            "requiredRecords": [
              "은잔의 검은 얼룩"
            ],
            "result": "둘은 같은 약재다. 장례 의식에 쓰이는 향료가 아니라, 사람의 맥을 늦추는 약재에 가깝다.",
            "effects": {
              "clue": 2,
              "sanity": -1
            },
            "addItems": [
              "검은 약재 손수건"
            ],
            "addRecords": [
              "맥을 늦추는 약재"
            ],
            "addFlags": [
              "matched_black_medicine"
            ],
            "nextEventId": "noct_020"
          },
          {
            "label": "시녀를 위협한 자가 있다면 그냥 넘기지 않겠다고 밝힌다.",
            "characterIds": [
              "Lena"
            ],
            "result": "레나의 말 뒤로 문들이 조금씩 닫혔다. 그러나 누군가는 닫히기 전, 작은 쪽지를 떨어뜨렸다.",
            "effects": {
              "suspicion": 2,
              "courtReputation": 1
            },
            "addRecords": [
              "시녀를 위협한 자의 쪽지"
            ],
            "addFlags": [
              "lena_declared_protection"
            ],
            "nextEventId": "noct_021"
          }
        ]
      },
      {
        "id": "noct_018",
        "title": "관의 은색 봉인",
        "location": "장례 의전실",
        "text": "관을 둘러싼 은색 봉인에 가느다란 균열이 있다. 균열은 안에서 밖으로 난 것이 아니다.",
        "choices": [
          {
            "label": "균열을 가까이에서 확인한다.",
            "result": "균열 주변에는 은가루가 남아 있다. 누군가 바깥에서 선을 그은 듯했다.",
            "effects": {
              "clue": 1,
              "taint": 1
            },
            "addItems": [
              "은색 봉인의 가루"
            ],
            "addRecords": [
              "인위적인 봉인 균열"
            ],
            "addFlags": [
              "checked_silver_seal"
            ],
            "nextEventId": "noct_022"
          },
          {
            "label": "즉시 의전국에 알린다.",
            "result": "의전국은 봉인을 확인하고도 놀라지 않았다. 그들은 이미 알고 있었던 것처럼 움직였다.",
            "effects": {
              "blackCoffinTrust": 1,
              "clue": 1
            },
            "addRecords": [
              "의전국의 침묵"
            ],
            "addFlags": [
              "reported_seal_crack"
            ],
            "nextEventId": "noct_024"
          },
          {
            "label": "단검의 은과 봉인의 은이 같은 계열인지 비교한다.",
            "requiredItems": [
              "은장식 단검"
            ],
            "result": "단검과 봉인은 같은 은이 아니다. 하나는 증명을 위한 은, 다른 하나는 가두기 위한 은이다.",
            "effects": {
              "clue": 2
            },
            "addRecords": [
              "서로 다른 은"
            ],
            "addFlags": [
              "compared_silver_types"
            ],
            "nextEventId": "noct_022"
          },
          {
            "label": "검집 끝으로 봉인선을 건드려 손대지 않고 확인한다.",
            "characterIds": [
              "Lena"
            ],
            "result": "레나는 손대지 않았다. 검집 끝에 묻은 은가루는 바깥에서 안쪽으로 밀려 있었다.",
            "effects": {
              "clue": 2
            },
            "addItems": [
              "은색 봉인의 가루"
            ],
            "addRecords": [
              "바깥에서 그은 봉인선"
            ],
            "addFlags": [
              "lena_checked_seal_with_scabbard"
            ],
            "nextEventId": "noct_022"
          }
        ]
      },
      {
        "id": "noct_019",
        "title": "변경에서 온 기사",
        "location": "흑관궁 외회랑",
        "text": "먼지 묻은 갑옷의 기사가 도착한다. 그는 죽은 이를 변경에서 보았다고 주장한다. 그러나 공식 기록상 죽은 이는 변경에 간 적이 없다.",
        "choices": [
          {
            "label": "변경 기사의 증언을 듣는다.",
            "result": "그는 죽은 이가 살아 있던 날을 기억했다. 날짜는 장례 준비가 시작된 뒤였다.",
            "effects": {
              "clue": 2,
              "sanity": -1
            },
            "addRecords": [
              "변경 기사의 증언"
            ],
            "addFlags": [
              "heard_border_knight"
            ],
            "nextEventId": "noct_020"
          },
          {
            "label": "그를 의전국에 넘긴다.",
            "result": "의전국은 그를 데려갔다. 복도 끝에서 들린 소리는 심문인지 보호인지 알 수 없었다.",
            "effects": {
              "blackCoffinTrust": 1,
              "suspicion": -1
            },
            "addFlags": [
              "handed_border_knight"
            ],
            "nextEventId": "noct_024"
          },
          {
            "label": "그의 갑옷 문장을 확인한다.",
            "result": "문장은 실제 변경 기사령의 것이다. 다만 오래전에 폐기된 부대의 문장이다.",
            "effects": {
              "clue": 1
            },
            "addRecords": [
              "폐기된 부대 문장"
            ],
            "addFlags": [
              "checked_border_emblem"
            ],
            "nextEventId": "noct_021"
          },
          {
            "label": "기사 대 기사로서, 그가 거짓 증언을 하는지 정면으로 묻는다.",
            "characterIds": [
              "Lena"
            ],
            "result": "변경 기사는 레나의 눈을 피하지 않았다. 그는 거짓말쟁이보다 생존자에 가까웠다.",
            "effects": {
              "clue": 2,
              "courtReputation": 1
            },
            "addRecords": [
              "기사의 정면 증언"
            ],
            "addFlags": [
              "lena_knight_to_knight"
            ],
            "nextEventId": "noct_020"
          }
        ]
      },
      {
        "id": "noct_020",
        "title": "세 번째 종소리",
        "location": "흑관궁 대기실",
        "text": "종이 세 번 울린다. 이번에는 아무도 눈을 내리깔지 않는다. 장례 재판은 이제 의식이 아니라 판정이 되었다.",
        "choices": [
          {
            "label": "흑관 의전국의 발표를 기다린다.",
            "result": "의전국은 확보된 기록 목록을 읽었다. 그 목록에는 당신이 본 기록 중 일부가 빠져 있었다.",
            "effects": {
              "clue": 1
            },
            "addRecords": [
              "빠진 기록 목록"
            ],
            "addFlags": [
              "waited_third_bell"
            ],
            "nextEventId": "noct_028"
          },
          {
            "label": "지금까지 모은 기록을 정리한다.",
            "result": "기록들은 서로 맞물리기 시작했다. 하나의 죽음이 여러 날짜로 나뉘어 있었다.",
            "effects": {
              "clue": 1,
              "sanity": -1
            },
            "addRecords": [
              "기록의 첫 연결점"
            ],
            "addFlags": [
              "organized_records"
            ],
            "nextEventId": "noct_027"
          },
          {
            "label": "기록들을 한데 모아 공통점을 찾는다.",
            "minRecords": 3,
            "result": "이름, 봉인, 유품, 약재는 같은 방향을 가리켰다. 장례가 죽음보다 먼저 준비되었다.",
            "effects": {
              "clue": 3,
              "sanity": -2
            },
            "addRecords": [
              "장례가 먼저였다는 의혹"
            ],
            "addFlags": [
              "found_pattern_records"
            ],
            "nextEventId": "noct_027"
          },
          {
            "label": "약재가 장례와 관련 있는지 확인한다.",
            "requiredItems": [
              "검은 약재 손수건"
            ],
            "result": "그 약재는 죽은 이를 위한 것이 아니다. 산 사람을 죽은 것처럼 보이게 만드는 데 쓰일 수 있다.",
            "effects": {
              "clue": 2,
              "sanity": -3
            },
            "addRecords": [
              "산 사람을 늦추는 약재"
            ],
            "addFlags": [
              "identified_living_death_medicine"
            ],
            "nextEventId": "noct_017"
          }
        ]
      },
      {
        "id": "noct_021",
        "title": "가짜 사자의 정체",
        "location": "서쪽 회랑",
        "text": "혈통 귀족회의 문장을 단 사자가 누군가와 다투고 있다. 그의 말투는 귀족회의 사자라기엔 지나치게 조심스럽다.",
        "choices": [
          {
            "label": "대화를 엿듣는다.",
            "result": "그는 명령을 전하는 자가 아니라 명령을 외우는 자였다.",
            "effects": {
              "clue": 1
            },
            "addRecords": [
              "외운 듯한 사자의 말"
            ],
            "addFlags": [
              "overheard_fake_envoy"
            ],
            "nextEventId": "noct_025"
          },
          {
            "label": "직접 다가간다.",
            "result": "사자는 물러서려 했지만 문장 달린 봉투를 떨어뜨렸다.",
            "effects": {
              "suspicion": 1,
              "clue": 1
            },
            "addItems": [
              "찢긴 혈통 봉투"
            ],
            "addFlags": [
              "confronted_fake_envoy"
            ],
            "nextEventId": "noct_025"
          },
          {
            "label": "초대장 봉인과 사자의 문장을 대조한다.",
            "requiredRecords": [
              "가짜 봉인의 의심"
            ],
            "result": "둘은 모두 가짜지만 같은 장인이 만든 가짜는 아니다. 서로 다른 두 세력이 같은 이름을 쓰고 있다.",
            "effects": {
              "clue": 2
            },
            "addRecords": [
              "두 개의 가짜 혈통 문장"
            ],
            "addFlags": [
              "confirmed_fake_envoy"
            ],
            "nextEventId": "noct_025"
          },
          {
            "label": "도망치려는 사자의 길을 막는다.",
            "characterIds": [
              "Lena"
            ],
            "result": "레나가 길을 막자 사자는 멈췄다. 그는 귀족회의 사자가 아니라 흑관궁 내부의 하급 필경사였다.",
            "effects": {
              "suspicion": 2,
              "clue": 2
            },
            "addRecords": [
              "사라진 필경사의 신분"
            ],
            "addFlags": [
              "lena_stopped_fake_envoy"
            ],
            "nextEventId": "noct_025"
          }
        ]
      },
      {
        "id": "noct_022",
        "title": "시신 없는 장례",
        "location": "장례 의전실",
        "text": "관은 닫혀 있지만, 관 아래의 그림자가 이상하게 비어 있다. 안에 시신이 있는지 확신할 수 없다.",
        "choices": [
          {
            "label": "관을 열자고 요구한다.",
            "result": "방 안의 공기가 얼어붙었다. 누군가 그 요구를 기다렸다는 듯 문서를 펼쳤다.",
            "effects": {
              "suspicion": 3,
              "clue": 1
            },
            "addRecords": [
              "시신 없는 장례 의혹"
            ],
            "addFlags": [
              "demanded_coffin_open"
            ],
            "nextEventId": "noct_024"
          },
          {
            "label": "봉인 상태만 확인한다.",
            "result": "봉인은 닫혀 있지만, 닫힌 흔적과 열린 흔적이 같은 자리에 겹쳐 있었다.",
            "effects": {
              "clue": 1
            },
            "addRecords": [
              "열렸다 닫힌 봉인"
            ],
            "addFlags": [
              "checked_closed_coffin"
            ],
            "nextEventId": "noct_023"
          },
          {
            "label": "봉인이 조작되었다고 지적한다.",
            "requiredRecords": [
              "인위적인 봉인 균열"
            ],
            "result": "의전국 관리들의 침묵이 길어졌다. 그들은 부정하지 않았다.",
            "effects": {
              "suspicion": 2,
              "clue": 2
            },
            "addRecords": [
              "봉인 조작 지적"
            ],
            "addFlags": [
              "accused_seal_tampering"
            ],
            "nextEventId": "noct_024"
          },
          {
            "label": "시신 없는 장례라면 기사로서 판정을 인정할 수 없다고 말한다.",
            "characterIds": [
              "Lena"
            ],
            "result": "레나는 한 발 앞으로 나섰다. 검은 뽑히지 않았지만, 방 안 모두가 검을 의식했다.",
            "effects": {
              "suspicion": 3,
              "courtReputation": 2
            },
            "addRecords": [
              "시신 없는 장례에 대한 이의"
            ],
            "addFlags": [
              "lena_refused_empty_funeral"
            ],
            "nextEventId": "noct_028"
          }
        ]
      },
      {
        "id": "noct_023",
        "title": "사라진 관리의 방",
        "location": "하급 관리 숙소",
        "text": "하급 관리 하나가 사라졌다. 방에는 쓰다 만 진술서가 남아 있다. “그날 밤 관 안에 있던 것은—”",
        "choices": [
          {
            "label": "진술서를 챙긴다.",
            "result": "문장은 끊겨 있지만 잉크는 아직 완전히 마르지 않았다.",
            "effects": {
              "clue": 1,
              "suspicion": 1
            },
            "addRecords": [
              "끊긴 진술서"
            ],
            "addFlags": [
              "took_unfinished_statement"
            ],
            "nextEventId": "noct_027"
          },
          {
            "label": "방을 더 수색한다.",
            "result": "문틀에는 손톱으로 긁은 흔적이 남아 있다.",
            "effects": {
              "clue": 1,
              "sanity": -1
            },
            "addRecords": [
              "강제로 끌려간 흔적"
            ],
            "addFlags": [
              "searched_missing_clerk_room"
            ],
            "nextEventId": "noct_027"
          },
          {
            "label": "책상 위 가루와 봉인의 가루를 비교한다.",
            "requiredItems": [
              "은색 봉인의 가루"
            ],
            "result": "가루는 같다. 관리가 사라지기 전, 그는 관의 봉인을 만졌거나 만지게 되었다.",
            "effects": {
              "clue": 2
            },
            "addRecords": [
              "관리와 봉인의 연결"
            ],
            "addFlags": [
              "matched_silver_powder"
            ],
            "nextEventId": "noct_027"
          },
          {
            "label": "강제로 끌려간 흔적이 있는지 바닥과 문틀을 살핀다.",
            "characterIds": [
              "Lena"
            ],
            "result": "레나는 바닥의 방향을 보았다. 그는 도망친 것이 아니라 복도 쪽으로 끌려갔다.",
            "effects": {
              "clue": 2
            },
            "addRecords": [
              "복도로 끌려간 흔적"
            ],
            "addFlags": [
              "lena_tracked_drag_marks"
            ],
            "nextEventId": "noct_027"
          }
        ]
      },
      {
        "id": "noct_024",
        "title": "흑관 의전국의 제안",
        "location": "흑관궁 작은 접견실",
        "text": "의전국 관리가 빈 봉투를 내민다. “당신이 본 것 중 일부는 장례를 어지럽힐 수 있습니다.”",
        "choices": [
          {
            "label": "봉투를 받는다.",
            "result": "빈 봉투는 가볍지만, 받아드는 순간 손이 무거워졌다.",
            "effects": {
              "blackCoffinTrust": 2,
              "suspicion": -1,
              "sanity": -2
            },
            "addItems": [
              "빈 흑관 봉투"
            ],
            "addFlags": [
              "accepted_black_envelope"
            ],
            "nextEventId": "noct_030"
          },
          {
            "label": "거절한다.",
            "result": "관리의 표정은 변하지 않았다. 다만 당신의 이름 옆에 작은 표시가 더해졌다.",
            "effects": {
              "suspicion": 2,
              "courtReputation": 1
            },
            "addFlags": [
              "refused_black_envelope"
            ],
            "nextEventId": "noct_027"
          },
          {
            "label": "사라진 관리에 대해 묻는다.",
            "requiredRecords": [
              "끊긴 진술서"
            ],
            "result": "그 이름을 꺼내자 관리의 손이 처음으로 멈췄다.",
            "effects": {
              "clue": 2,
              "suspicion": 2
            },
            "addRecords": [
              "의전국의 흔들림"
            ],
            "addFlags": [
              "asked_about_missing_clerk"
            ],
            "nextEventId": "noct_023"
          },
          {
            "label": "기록을 숨기는 장례는 기사로서 인정하지 않겠다고 말한다.",
            "characterIds": [
              "Lena"
            ],
            "result": "레나의 말은 협상을 끝냈다. 그 순간부터 그녀는 참관인이 아니라 방해자로 기록되었다.",
            "effects": {
              "suspicion": 3,
              "courtReputation": 2
            },
            "addRecords": [
              "거절된 은폐 제안"
            ],
            "addFlags": [
              "lena_rejected_coverup"
            ],
            "nextEventId": "noct_028"
          }
        ]
      },
      {
        "id": "noct_025",
        "title": "혈통 귀족회의 밤 초대",
        "location": "혈통 귀족회의 방",
        "text": "어두운 방에서 누군가 말한다. “죽은 자의 이름보다 중요한 것은, 그 피가 누구에게 이어지는가입니다.”",
        "choices": [
          {
            "label": "상속 문제를 묻는다.",
            "result": "그들은 죽음보다 다음 이름을 먼저 말했다.",
            "effects": {
              "clue": 1,
              "suspicion": 1
            },
            "addRecords": [
              "상속 후보의 이름"
            ],
            "addFlags": [
              "asked_inheritance"
            ],
            "nextEventId": "noct_027"
          },
          {
            "label": "초대장을 보낸 자가 누구인지 요구한다.",
            "requiredItems": [
              "혈통 귀족회의 초대장"
            ],
            "result": "방 안의 목소리는 잠시 멈췄다. 초대장은 그들이 보낸 것이 아니었다.",
            "effects": {
              "clue": 2
            },
            "addRecords": [
              "초대장을 부정한 귀족회"
            ],
            "addFlags": [
              "blood_denied_invitation"
            ],
            "nextEventId": "noct_021"
          },
          {
            "label": "시신이 없는데 혈통을 논하는 이유를 묻는다.",
            "requiredRecords": [
              "시신 없는 장례 의혹"
            ],
            "result": "누군가 웃었다. “시신은 피를 증명하지 못합니다. 기록이 증명하지요.”",
            "effects": {
              "clue": 2,
              "sanity": -1
            },
            "addRecords": [
              "피보다 기록이라는 주장"
            ],
            "addFlags": [
              "challenged_blood_without_body"
            ],
            "nextEventId": "noct_022"
          },
          {
            "label": "검에 기대지 않고도 부당한 상속은 막겠다고 말한다.",
            "characterIds": [
              "Lena"
            ],
            "result": "레나는 검을 언급하지 않았지만, 말끝의 무게는 검보다 무거웠다.",
            "effects": {
              "courtReputation": 2,
              "suspicion": 1
            },
            "addRecords": [
              "상속에 대한 기사 서약"
            ],
            "addFlags": [
              "lena_vowed_against_injustice"
            ],
            "nextEventId": "noct_028"
          }
        ]
      },
      {
        "id": "noct_026",
        "title": "망령의 두 번째 질문",
        "location": "봉인된 안뜰",
        "text": "같은 목소리가 다시 묻는다. “내 이름은 아직 남아 있는가?” 이번에는 훨씬 가까이 있다.",
        "choices": [
          {
            "label": "공식 이름을 말한다.",
            "result": "목소리는 낮게 갈라졌다. 그 이름은 관 안의 이름이었지만, 목소리의 이름은 아니었다.",
            "effects": {
              "sanity": -3,
              "taint": 2
            },
            "addFlags": [
              "said_official_name_second"
            ],
            "nextEventId": "noct_029"
          },
          {
            "label": "덮어쓴 이름을 말한다.",
            "result": "나무 그림자가 한 방향으로 기울었다. 목소리는 처음으로 울음처럼 들렸다.",
            "effects": {
              "sanity": -2,
              "clue": 2,
              "taint": 1
            },
            "addRecords": [
              "진짜 이름의 단서"
            ],
            "addFlags": [
              "said_overwritten_name_second"
            ],
            "nextEventId": "noct_029"
          },
          {
            "label": "두 이름 모두 말해본다.",
            "requiredRecords": [
              "덮어쓴 이름의 흔적"
            ],
            "result": "두 이름 사이에서 안뜰의 공기가 찢겼다. 둘 중 하나는 죽은 자의 이름이 아니었다.",
            "effects": {
              "sanity": -3,
              "clue": 2,
              "taint": 2
            },
            "addRecords": [
              "둘 중 하나는 산 자의 이름"
            ],
            "addFlags": [
              "tested_two_names_second"
            ],
            "nextEventId": "noct_029"
          },
          {
            "label": "명예를 걸고 진짜 이름을 찾겠다고 말한다.",
            "characterIds": [
              "Lena"
            ],
            "result": "레나의 약속에 목소리가 잠시 멈췄다. 망령은 답 대신 아주 작은 웃음을 남겼다.",
            "effects": {
              "sanity": -1,
              "clue": 1,
              "taint": 1
            },
            "addRecords": [
              "망령 앞의 약속"
            ],
            "addFlags": [
              "lena_promised_true_name"
            ],
            "nextEventId": "noct_029"
          }
        ]
      },
      {
        "id": "noct_027",
        "title": "최종 기록 정리",
        "location": "임시 기록실",
        "text": "임시 기록실이 열렸다. 당신이 모은 기록들을 정리할 마지막 기회다. 모든 기록을 제출하는 것이 좋은 선택인지는 알 수 없다.",
        "choices": [
          {
            "label": "모든 기록을 정리한다.",
            "result": "기록들은 한 줄로 이어지기 시작했다. 죽음과 장례의 순서가 맞지 않는다.",
            "effects": {
              "clue": 2,
              "sanity": -1
            },
            "addRecords": [
              "정리된 장례 기록"
            ],
            "addFlags": [
              "organized_final_records"
            ],
            "nextEventId": "noct_028"
          },
          {
            "label": "위험한 기록은 숨긴다.",
            "result": "몇 장의 기록은 소매 안쪽에 남았다. 생존에는 유리하지만 진실은 얇아졌다.",
            "effects": {
              "suspicion": -1,
              "blackCoffinTrust": 1,
              "clue": -1
            },
            "addItems": [
              "숨겨진 기록 묶음"
            ],
            "addFlags": [
              "hid_dangerous_records"
            ],
            "nextEventId": "noct_030"
          },
          {
            "label": "기록 사이의 모순을 하나로 정리한다.",
            "minRecords": 5,
            "result": "이름, 약재, 봉인, 유품이 같은 결론으로 이어졌다. 누군가 산 사람의 장례를 준비했다.",
            "effects": {
              "clue": 3,
              "sanity": -2
            },
            "addRecords": [
              "산 사람의 장례 의혹"
            ],
            "addFlags": [
              "found_living_funeral_pattern"
            ],
            "nextEventId": "noct_028"
          },
          {
            "label": "진실을 가리는 기록은 제출하지 않겠다고 선언한다.",
            "characterIds": [
              "Lena"
            ],
            "result": "레나는 기록을 골라내지 않았다. 그 정직함은 방 안의 모두에게 편하지 않았다.",
            "effects": {
              "suspicion": 2,
              "courtReputation": 2
            },
            "addRecords": [
              "정직한 기록 제출"
            ],
            "addFlags": [
              "lena_refused_selective_record"
            ],
            "nextEventId": "noct_028"
          }
        ]
      },
      {
        "id": "noct_028",
        "title": "장례 재판 개정",
        "location": "흑관궁 재판실",
        "text": "흑관의 문이 열린다. 당신은 참관인이 아니라 증언자로 불린다.",
        "choices": [
          {
            "label": "사실만 증언한다.",
            "result": "사실은 안전하지 않았다. 하지만 거짓보다 오래 남았다.",
            "effects": {
              "blackCoffinTrust": 1,
              "suspicion": 1
            },
            "addRecords": [
              "공식 증언"
            ],
            "addFlags": [
              "gave_plain_testimony"
            ],
            "nextEventId": "noct_029"
          },
          {
            "label": "죽음의 조작을 주장한다.",
            "result": "방 안에서 숨을 삼키는 소리가 들렸다. 누군가는 이미 이 말을 기다리고 있었다.",
            "effects": {
              "suspicion": 3,
              "clue": 2
            },
            "addRecords": [
              "죽음 조작 주장"
            ],
            "addFlags": [
              "claimed_death_tampered"
            ],
            "nextEventId": "noct_029"
          },
          {
            "label": "기록을 순서대로 제출한다.",
            "requiredRecords": [
              "정리된 장례 기록"
            ],
            "result": "기록들은 차례로 놓였다. 어느 순간 판정관의 손이 멈췄다.",
            "effects": {
              "clue": 3,
              "blackCoffinTrust": 1
            },
            "addRecords": [
              "제출된 장례 기록"
            ],
            "addFlags": [
              "submitted_ordered_records"
            ],
            "nextEventId": "noct_029"
          },
          {
            "label": "약자를 희생시키는 판정이라면 받아들일 수 없다고 말한다.",
            "characterIds": [
              "Lena"
            ],
            "result": "레나는 증언대에서 물러서지 않았다. 검은 없었지만, 그녀의 말은 방패처럼 시녀의 이름 앞에 섰다.",
            "effects": {
              "suspicion": 3,
              "courtReputation": 3
            },
            "addRecords": [
              "시녀를 위한 증언"
            ],
            "addFlags": [
              "lena_testified_for_weak"
            ],
            "nextEventId": "noct_029"
          }
        ]
      },
      {
        "id": "noct_029",
        "title": "첫 판정 직전",
        "location": "흑관궁 재판실",
        "text": "판정문 첫 줄에 누군가의 이름이 적히고 있다. 그것이 죽은 자의 이름인지, 상속자의 이름인지, 당신의 이름인지는 아직 보이지 않는다.",
        "choices": [
          {
            "label": "마지막 기록을 제출한다.",
            "result": "마지막 기록이 놓이자 판정문 첫 줄의 이름이 잠시 멈췄다.",
            "effects": {
              "clue": 1,
              "suspicion": 1
            },
            "addFlags": [
              "submitted_last_record"
            ],
            "nextEventId": "noct_030"
          },
          {
            "label": "누락된 이름을 지적한다.",
            "result": "판정관은 당신을 보지 않았다. 대신 서기의 펜 끝이 떨렸다.",
            "effects": {
              "suspicion": 2,
              "clue": 1
            },
            "addRecords": [
              "누락된 이름 지적"
            ],
            "addFlags": [
              "pointed_missing_name"
            ],
            "nextEventId": "noct_030"
          },
          {
            "label": "판정문 첫 줄의 이름이 틀렸다고 말한다.",
            "requiredRecords": [
              "진짜 이름의 단서"
            ],
            "result": "그 이름을 말하는 순간, 안뜰에서 들었던 목소리가 기억 속에서 다시 울렸다.",
            "effects": {
              "clue": 3,
              "sanity": -2
            },
            "addFlags": [
              "used_true_name_clue"
            ],
            "nextEventId": "noct_030"
          },
          {
            "label": "검에 손대지 않은 채 물러서지 않고 판정을 기다린다.",
            "characterIds": [
              "Lena"
            ],
            "result": "레나는 검에 손대지 않았다. 그러나 그 누구도 그녀가 판정을 두려워한다고 생각하지 않았다.",
            "effects": {
              "courtReputation": 2,
              "suspicion": 1
            },
            "addFlags": [
              "lena_waited_for_verdict"
            ],
            "nextEventId": "noct_030"
          }
        ]
      },
      {
        "id": "noct_030",
        "title": "흑관궁의 첫 판정",
        "location": "흑관궁 재판실",
        "text": "검은 관 앞에서 첫 판정이 내려진다. “이 장례는 끝났다.” 그리고 곧이어 다른 문장이 따라붙는다. “혹은, 아직 시작되지 않았다.”",
        "choices": [
          {
            "label": "확보한 기록을 모두 공개한다.",
            "result": "기록들은 하나씩 공개되었다. 진실은 완성되지 않았지만, 더는 조용히 묻히지 않았다.",
            "effects": {
              "clue": 2,
              "suspicion": 2
            },
            "addFlags": [
              "ending_public_records"
            ]
          },
          {
            "label": "진실 일부를 숨기고 살아남는 길을 택한다.",
            "result": "일부 기록은 남지 않았다. 대신 당신의 이름은 판정문 가장자리에서 지워졌다.",
            "effects": {
              "suspicion": -2,
              "blackCoffinTrust": 2
            },
            "addFlags": [
              "ending_survival_cover"
            ]
          },
          {
            "label": "혈통 귀족회의 개입을 드러낸다.",
            "requiredRecords": [
              "상속 후보의 이름"
            ],
            "result": "장례는 죽음의 문제가 아니라 피의 문제가 되었다. 방 안의 균형이 크게 흔들렸다.",
            "effects": {
              "clue": 2,
              "suspicion": 2
            },
            "addFlags": [
              "ending_blood_intervention"
            ]
          },
          {
            "label": "부당한 판정이라면 기사로서 이의를 제기한다.",
            "characterIds": [
              "Lena"
            ],
            "result": "레나는 끝내 검을 뽑지 않았다. 그러나 판정문 아래에는 짧은 문장이 덧붙었다. “기사 레나, 이의 제기함.”",
            "effects": {
              "courtReputation": 3,
              "suspicion": 2
            },
            "addFlags": [
              "ending_lena_objection"
            ]
          }
        ]
      }
    ],
    "endings": [
      {
        "id": "lena_knight_objection",
        "title": "물러서지 않는 기사",
        "condition": {
          "characterIds": [
            "Lena"
          ],
          "flags": [
            "ending_lena_objection"
          ]
        },
        "text": "첫 판정은 끝났지만, 레나의 이의 제기는 지워지지 않았다. 흑관궁은 그녀를 위험한 참관인으로 기록했고, 누군가는 그녀를 필요한 증언자로 기억했다."
      },
      {
        "id": "name_inconsistency",
        "title": "이름의 모순",
        "condition": {
          "minClue": 12,
          "anyFlags": [
            "used_true_name_clue",
            "found_living_funeral_pattern"
          ]
        },
        "text": "관에 적힌 이름, 명부에 남은 이름, 망령이 찾던 이름이 서로 달랐다. 장례는 끝나지 않았다. 이제 노크트의 기록이 흔들리기 시작한다."
      },
      {
        "id": "blood_intervention",
        "title": "피의 개입",
        "condition": {
          "flags": [
            "ending_blood_intervention"
          ]
        },
        "text": "흑관의 판정 앞에 혈통 귀족회의 이름이 놓였다. 죽음은 더 이상 장례의 문제가 아니었다. 상속과 피의 문제가 되었다."
      },
      {
        "id": "quiet_survival",
        "title": "조용한 생존",
        "condition": {
          "flags": [
            "ending_survival_cover"
          ]
        },
        "text": "장례는 조용히 정리되었다. 진실의 일부는 기록되지 않았다. 당신은 살아남았고, 흑관궁은 그 사실을 잊지 않았다."
      },
      {
        "id": "tainted_witness",
        "title": "검은 점",
        "condition": {
          "minTaint": 8
        },
        "text": "흑관 의전국은 당신의 증언보다, 당신이 무엇을 들었는지를 더 오래 물었다. 그날 이후 당신의 이름 옆에는 작은 검은 점이 찍혔다."
      },
      {
        "id": "pilot_survived",
        "title": "첫 판정 생존",
        "condition": {},
        "text": "당신은 첫 판정을 살아서 넘겼다. 장례는 끝나지 않았고, 흑관궁의 문은 아직 완전히 열리지 않았다."
      }
    ]
  }
];
