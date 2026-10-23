# 분석 기록 — modu-api.web.app/tools/agent-prompt/

도구: **REA** (rea-agents 6.7.0, MCP) + **ego lite**(Chromium 154) 브라우저.
원칙: 정적 분석 먼저, 실행은 브라우저 페이지 로딩까지만. 원본의 서버 함수(AI 호출)는 부르지 않았습니다.

## 1. 연결 상태 (2026-10-23 확인)

| 항목 | 결과 |
|---|---|
| REA MCP 서버 | 정상 (rea-agents 6.7.0, stdio) |
| 쓸 수 있는 엔진 | rea-artifact-graph v1, rea-dotnet-static v1, rea-analysis-view, rea-cdp-browser v2 |
| 못 쓰는 엔진 | Ghidra(미설정) — 이번 웹 대상에는 불필요 |
| 브라우저 관측 경로 | ego lite 를 `--remote-debugging-port=9333` 로 띄워 CDP 로 연결 |

## 2. 정적 분석 (Evidence)

- `analyze_javascript_application` — 근거 `ev_8663c4ec…`
  파일 6개 · AST 노드 6,010 · 구문 오류 0 · 읽은 바이트 57,517.
- `inspect_analysis_view(javascript-facts)` — 근거 `ev_239840dc…`
  정적으로 확인된 네트워크 접점:

| 접점 | 위치(파일:줄) | 호출 방식 |
|---|---|---|
| `/api/prompt` | `tools/agent-prompt` 인라인 스크립트:315 | `ModuApi.post` |
| `/api/help` | 같은 파일:367 | `ModuApi.post` |
| `/api/board` | `board-nudge.js`:28 | `ModuApi.post` |
| `/api/meter` | `app.js`:52 | `fetch` (캐시 없음) |
| `fetch(path)` | `app.js`:41 | 경로가 변수라 값 미확정 |

파일 해시(sha256 앞 16자): `inline 1a2adaca…`, `app.js 56a53340…`, `consent.js 3e0cf0d4…`,
`wait.js d55c2912…`, `board-nudge.js 06456b04…`, `firebase-config.js e5eb8f6a…`, `page.html 4becf174…`.

## 3. 런타임 관측 (ego lite + REA)

- `list_browser_targets` — `ev_f32c8c75…`
  Chrome/154.0.8037.44, 페이지 타깃 1개, 원본 도메인만 통과.
- `inspect_web_page` — `ev_e30d27ef…`
  - DOM 633 노드, 접근성 트리 575 노드
  - 스크립트 6개: `consent.js`, `wait.js`, 페이지 인라인(32,478바이트), `firebase-config.js`, `app.js`, `board-nudge.js`
  - `localStorage`·`sessionStorage`·`IndexedDB`·캐시 **모두 비어 있음** (동의 전 상태)
  - 워커 없음, 콘솔 오류 없음
  - 관측 창 안에서 네트워크 요청 0건 → 페이지를 열기만 해서는 서버를 부르지 않는다
- `analyze_web_bundle` — `ev_8bf356b3…`
  청크 0(플레인 스크립트), 라우트 0, 소스맵 없음, WebMCP 선언 없음, 접점 4개 재확인
- `capture_web_screenshot` — `ev_e2a640d7…` (1252×1003)

## 4. 구조 요약

```
브라우저(정적)                          서버(Firebase Functions 추정 — 정적으로는 미확인)
─────────────────────────────          ─────────────────────────────────────────────
index.html  ─ 화면 4단 + 인라인 JS       POST /api/prompt   {sit, want, menu, more,
styles/theme-terminal.css  (색·서체)                        consent, pick} → 지시서 JSON
js/app.js        공용 호출·익명 로그인    POST /api/help     {txt, making, image} → 도움말
firebase-config.js 공개 식별자           POST /api/board    {tab, text} → 익명 게시
consent.js       동의 칸·캡처 축소        GET  /api/meter    크레딧·호출 수
wait.js          진행 상자
board-nudge.js   한 줄 남기기
```

- 프레임워크 없음(React/Vue/Next 아님). Firebase SDK 는 app/auth/app-check 만(compat 10.14.1) — Firestore SDK 없음 → 브라우저가 DB 를 직접 읽지 않는다는 주석과 일치.
- 인증: 익명 로그인 → `Authorization: Bearer <idToken>`, 실제 도메인에서는 `X-Firebase-AppCheck` 헤더 추가. localhost 에서는 에뮬레이터(127.0.0.1:9099)로 붙는 분기가 있음.
- 지시서 조립: **화면 코드가 고정 문장(일하는 방식 9줄·안전 A~G·메뉴 문장)을 붙이고, AI 는 변동 재료만** 채운다. 서버 응답은 `normT()` 로 길이·개수를 화이트리스트 정규화한 뒤에만 화면에 쓴다.

## 5. 모르는 것 (정적으로 결정 불가)

- `/api/*` 구현(토큰 검증·App Check 강제 여부·요청 한도·프롬프트 템플릿)
- Firestore 규칙, `firebase.json` 의 리라이트, 실제 크레딧 계산
- 위 4개 접점 뒤의 AI 모델·요금

## 6. 복제본에서의 대응

| 원본 요소 | 복제본 구현 |
|---|---|
| Firebase 익명 로그인 | `js/api.js` — localStorage 익명 번호 + Bearer |
| `/api/prompt` (AI) | `server/generate.mjs` — 키 있으면 OpenAI/Anthropic, 없으면 규칙 기반 동일 스키마 |
| `/api/help` | 같은 파일의 `generateHelp` — 에러 문구 패턴별 «다음 한 걸음» |
| `/api/board` | `server/server.mjs` — 전화번호·이메일·주민번호·링크·열쇠 가림 + 하루 3개 |
| `/api/meter` | 같은 파일 — 월 크레딧·호출 수·하루 한도 |
| `theme-terminal.css` | `styles/theme.css` — 같은 토큰(#14161a / #f0a54a / IBM Plex Mono 등)로 다시 작성 |

원본 캡처: `docs/reference-full.png`, `docs/reference-viewport.png`
