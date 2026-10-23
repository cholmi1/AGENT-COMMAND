# 에이전트에게 맡기는 지시서 — 복제본

`https://modu-api.web.app/tools/agent-prompt/` 를 **실행 없이 정적 분석 + ego lite 런타임 관측**(REA)으로 뜯어보고,
화면·동작·문서 조립 방식을 그대로 재구성한 복제본입니다. 공부와 시험용이며, 원본과 아무 관계가 없습니다.

- 원본: Firebase Hosting 정적 사이트 + `/api/*` 서버 함수 4개
- 이 복제본: 프레임워크 없는 바닐라 JS + 의존성 없는 Node 서버 1개 → **키 없이도 바로 돌아갑니다**

## 실행

```bash
node server/server.mjs       # http://127.0.0.1:8080
```

- 처음 열면 브라우저마다 익명 번호를 하나 만들어 `localStorage` 에 둡니다(원본은 Firebase 익명 로그인).
- AI 키가 없으면 서버가 **규칙 기반**으로 지시서를 만듭니다. 키를 넣으면 AI가 씁니다:

```bash
OPENAI_API_KEY=sk-... node server/server.mjs      # 또는 ANTHROPIC_API_KEY=...
PORT=3000 MONTHLY_CREDIT_CENTS=5000 PER_USER_DAY=5 node server/server.mjs
```

## 구조

```
index.html                 홈(도구 목록)
tools/agent-prompt/        지시서 도구 — 화면 뼈대(원본과 같은 4단 구성)
styles/theme.css           「작업실 터미널」 테마 (색 토큰·치수는 원본에서 관측한 값)
js/api.js                  서버 호출 · 익명 번호 · 게이지 그리기
js/consent.js              선택 동의 칸 · 캡처 축소(긴 변 1280px JPEG)
js/wait.js                 기다리는 동안 진행 상자(단계 로그 + 명언)
js/nudge.js                결과 뒤 «한 줄 남기기»
js/page.js                 메뉴 상수 · 지시서 조립 · 되묻기 · 복사
server/server.mjs          정적 파일 + /api/prompt · /api/help · /api/board · /api/meter
server/generate.mjs        지시서·도움말 생성(규칙 기반 / OpenAI / Anthropic)
docs/analysis.md           분석 기록 (근거 ID·관측값 포함)
```

## 동작 방식 (원본과 같은 설계)

지시서는 두 재료로 만듭니다.

- **고정 재료** — 「일하는 방식」 9줄, 「안전」 A~G, 저장·공개·서버·로그인 문장, 「지금 시작」.
  화면 코드에 박혀 있고 **AI가 쓰지 않습니다**. 무엇을 적어도 빠지지 않습니다.
- **변동 재료** — 내 상황, 만들 것, 화면 목록, 꼭 되어야 하는 것, 되묻기 답. 서버 AI가 씁니다.

서버 응답은 화면에서 한 번 더 정규화합니다(제목 30자, 화면 5개×120자 등). AI가 이상한 길이로 답해도 화면이 잘라 냅니다.

## 원본과 다른 점 (의도한 차이)

| 항목 | 원본 | 복제본 |
|---|---|---|
| 로그인 | Firebase 익명 인증 + App Check(reCAPTCHA Enterprise) | 브라우저 익명 번호(localStorage) — 서버가 Bearer로 받음 |
| 서버 | Firebase Functions + Firestore | 의존성 없는 Node http 서버 + 메모리 저장(재시작하면 비움) |
| AI | 서버가 Anthropic 호출 | 키가 있으면 OpenAI/Anthropic, 없으면 규칙 기반 |
| 긴 설명·규칙 문장 | 운영자가 쓴 원문 | **같은 뜻·같은 개수로 다시 쓴 문장** (원문 복제 아님) |
| 결제·크레딧 | 실제 사용량 집계 | `MONTHLY_CREDIT_CENTS` 상수와 호출 수로 흉내 |

화면(레이아웃·색·치수·상호작용)은 실측값 기준으로 최대한 같게 맞췄습니다.
`docs/analysis.md` 에 관측 근거와 원본 화면 캡처가 있습니다.

## 배포

- **정적만**: GitHub Pages/Vercel에 `index.html`·`tools`·`styles`·`js` 를 올리면 화면은 그대로 뜹니다(AI 호출은 실패).
- **전체**: Node 서버가 필요합니다(Render/Fly/Cloud Run 등). `PORT` 환경변수를 따릅니다.

## 라이선스 / 주의

- 코드: MIT (이 저장소).
- 원본 사이트의 디자인·문구 저작권은 원저작자에게 있습니다. 학습·개인 시험용으로만 쓰고,
  공개 배포할 때는 문구를 자기 것으로 바꾸거나 원저작자 허락을 받으세요.
