# AGENT-COMMAND

독립 한국어 지시서·문제 해결 도구. Vercel Node 서버리스 API와 Firebase Authentication/Firestore를 사용합니다. Firebase Functions는 사용하지 않습니다. 유료 AI 키가 없으면 결정적 규칙 기반으로 작동합니다.

## 공개 배포

- 앱: https://agent-command-delta.vercel.app
- 지시서 작성: https://agent-command-delta.vercel.app/tools/agent-prompt/
- Firebase 프로젝트: agent-command-2ab5a, Firestore 서울(asia-northeast3), Spark.
- Vercel 프로젝트: agent-command, Hobby, GitHub main 자동 배포.
- 기본 규칙 모드로 배포했습니다. 유료 AI 키는 연결하지 않았습니다.
- 2026-10-24 실제 공개 주소에서 익명 인증, 생성, 선택 저장, 도움말, 복사, 기록 삭제, 비인증 API 차단, 비공개 소스 경로 차단을 확인했습니다.

의존성은 Vercel 모듈 호환을 위해 firebase-admin 13.10.0을 사용하고, 전이 의존성 uuid는 보안 수정판 11.1.1로 고정했습니다. 적용 시 npm audit 경고 0건, 단위 테스트 13개 통과. SDK 갱신 시 실제 서버리스 환경에서도 재검증하세요.

저장 기록은 서버가 만든 핵심 결과를 저장합니다. 불러올 때 현재 선택한 기술·화면 조건 및 최신 공통 규칙과 결합하므로, 처음 복사한 완성 문서의 정확한 원본 보관 기능은 아닙니다.

## 실행

Node.js 22 이상. npm ci → npm test → npm run build → npm run dev.
환경변수를 별도 주입했다면 npm start. 기본 주소 http://127.0.0.1:8080.
npm run dev는 .env를 읽습니다. 실제 비밀은 Git에 넣지 않습니다.
로컬도 Firebase 인증·Firestore 필수이며 미설정 API는 503으로 닫힙니다. 메모리 한도로 대체하지 않습니다. 프런트 변경 후 다시 build해야 합니다.

## 환경변수 (정확한 형식은 .env.example)

- FIREBASE_WEB_CONFIG_JSON 필수: JSON 문자열 {apiKey,authDomain,projectId,appId}. 공개 웹 앱 설정이며 서비스 계정 키와 다릅니다.
- FIREBASE_SERVICE_ACCOUNT_JSON 필수 비밀: JSON 객체 문자열. 실제 서비스 계정 project_id, client_email, private_key 포함. 파일 경로나 Base64가 아닙니다. private_key 개행은 JSON 내 이스케이프 개행을 사용합니다. 브라우저에 노출하지 않습니다.
- FIREBASE_PROJECT_ID 선택: 생략 시 서비스 계정 project_id. 웹 설정과 서비스 계정 프로젝트 ID 모두 일치해야 합니다.
- GLOBAL_DAILY_CAP 선택: 기본100, 1~100000 정수. KST 날짜별 전체 prompt/help 합계 상한. 규칙 기반에도 적용합니다.
- OPENAI_API_KEY / ANTHROPIC_API_KEY 선택: 현재 둘 다 설정하지 않습니다. 없으면 local. 둘 다 있으면 OpenAI 우선.
- OPENAI_MODEL / ANTHROPIC_MODEL 선택: 기본 gpt-4o-mini / claude-3-5-haiku-20241022. 최신이라는 의미나 지원 보장이 아니며 AI 사용 전 모델·요금을 확인합니다.
- PORT / HOST: 로컬 기본8080 / 127.0.0.1.

AI를 켜면 입력 텍스트가 선택한 제공사로 전송됩니다. 저장 동의는 앱 Firestore 저장 동의이며 제공사 정책을 대신하지 않습니다. AI 요청 timeout20초, 출력 토큰1600 상한. 실패 시 오류 원문 없이 local로 대체합니다. 호출 상한은 금액 예산이 아니므로 제공사 예산 제한도 별도 필요합니다.

## Firebase + Vercel 배포

1. Firebase Spark 프로젝트에 웹 앱, Authentication 익명 로그인(또는 유효한 Firebase 로그인), Firestore 기본 데이터베이스를 설정합니다.
2. firestore.rules의 모든 클라이언트 read/write 거부 규칙을 콘솔 또는 인증된 CLI로 배포합니다. firebase deploy --only firestore --project PROJECT_ID. Admin SDK는 규칙을 우회하므로 서버 IAM 권한도 최소화합니다. 기본 단일 필드 인덱스만 필요합니다.
3. 서비스 계정 JSON을 Vercel 서버 환경변수에만 넣고 웹 설정 JSON도 지정합니다. 실제 비밀을 소스·로그·스크린샷·브라우저에 넣지 않습니다.
4. Vercel Hobby 프로젝트를 연결합니다. Framework Other, Build npm run build, Output public, Node22 이상. vercel.json을 사용하며 api/[...path].js는 정적 출력과 별도로 Function으로 유지됩니다. API를 index.html로 바꾸는 SPA rewrite를 추가하지 않습니다.
5. Firebase Auth 허용 도메인에 배포 도메인을 추가하고 Production/Preview/Development 환경변수 범위를 확인합니다. env 변경 후 재배포가 필요합니다.
6. config, 익명 로그인, 인증된 meter/생성, 동의 저장·본인 기록·삭제를 실제 배포에서 점검합니다.

Spark/Hobby 무료 한도 내 운영 목표이며 Firebase Functions billing 연결은 불필요합니다. 무제한·영구 무료 보장이 아닙니다. Hobby는 개인 비상업 용도 조건이 있으므로 유료·회사 상업 운영 전 요금제·약관 확인이 필요합니다. 이 저장소는 클라우드 권한·과금 설정을 자동 변경하지 않습니다.

공식 참고: https://vercel.com/docs/project-configuration/vercel-json , https://vercel.com/docs/functions/runtimes/node-js , https://firebase.google.com/docs/admin/setup

## API 계약

응답 JSON, Cache-Control no-store. 교차 Origin/Sec-Fetch-Site 거부 및 공개 CORS 허용 없음. 오류는 {error:안전한코드}. 제공사·SDK 오류 원문과 비밀정보는 반환·기록하지 않습니다.

공개:
- GET /api/config -> {firebase:{apiKey,authDomain,projectId,appId},mode:local|ai}.
- GET/POST /api/board -> 410 board_disabled. 공개 게시판 없음.

보호 경로는 매번 Authorization: Bearer FIREBASE_ID_TOKEN 필수. Admin verifyIdToken(token,true)로 검증·철회 확인한 UID만 사용합니다. 브라우저 임의 번호·본문 UID는 불가합니다.
- GET /api/meter -> {perUserDay:5,promptUsed,helpUsed,mode:local|ai,enabled:true,stopped:false}. 가상 달러 미터 없음. mode는 서버 구성 모드.
- POST /api/prompt: {sit?:string<=1200,want?:string<=1200,menu?:string<=200,more?:string<=600,consent?:boolean}. sit 또는 want 필수. 응답 {json,keptId:string|null,mode:local|ai}.
- POST /api/help: {txt:string<=3000,making?:string<=300,menu?:string<=200,consent?:boolean}. txt 필수. 응답 {text,keptId:string|null,mode:local|ai}.
- GET /api/history -> {items:[{id,type:prompt|help,createdAt:ISO문자열,output:string,title:string}]}. 본인 최신20개.
- DELETE /api/history?id=ID -> {ok:true}. 본인 소유만, 타인·없는 기록404.

POST application/json 최대128KiB(131072바이트), stream 및 Vercel 사전 파싱 본문 지원. 길이는 JS 문자열 길이. 알 수 없는 필드·잘못된 타입·동의 값 거부. image/screenshot/capture 필드 지원하지 않아 거부하며 이미지 전달·저장 없음. 생성 응답 mode는 AI 오류 시 local일 수 있습니다.

## 한도·개인정보·스키마

KST00:00 기준 prompt5회/UID/일, help10회/UID/일. Firestore 단일 트랜잭션에서 사용자 및 전체 한도를 함께 읽고 갱신한 뒤 생성합니다. 재시작·인스턴스 증가로 초기화되지 않습니다. 실패·거절·fallback도 예약 횟수 반환 없음. 인증·입력 실패는 집계하지 않습니다.

- usageDays/{YYYY-MM-DD}/users/{sha256(uid)}: {prompt?:number,help?:number}. 원문 없음.
- globalDays/{YYYY-MM-DD}: {calls:number}. 원문 없음.
- users/{sha256(uid)}/history/{autoId}: {ownerUid:string,type:prompt|help,input:검증입력객체,output:string,title:string,createdAt:Firestore서버타임스탬프}.

consent가 정확히 true일 때만 본인 입력·결과 저장. 동의 없으면 원문·결과를 Firestore/앱 로그에 저장하지 않고 한도 카운터만 저장합니다. 자동 가림 약속 없으므로 비밀번호·계좌·고객정보를 입력하지 마세요. 인프라 기본 접근 로그·AI 제공사 정책은 별도입니다.

자동 만료·보관 기한 약속 없음. 기록은 사용자가 삭제할 때까지 보관하며 TTL 미설정. 익명 계정은 브라우저 데이터 삭제 등으로 UID를 잃으면 직접 재접근·삭제하지 못할 수 있습니다. 계정 재생성을 인증만으로 완전히 막지 못하므로 전체 일일 상한으로 보완합니다. App Check/CAPTCHA/운영자 삭제 도구는 미구현입니다.

## 구조·검증

server/api.mjs: 공유 API/보안 헤더. firebase.mjs: Admin/영속 트랜잭션/개인 기록. generate.mjs: 순수 localPrompt 함수 및 선택적 AI. validation.mjs: 본문·필드 검증. build.mjs: 정적 allowlist를 public에 스테이징. static.mjs/server.mjs: public만 제공, 경로 탈출·심볼릭 링크 방어. api/[...path].js: Vercel 진입점.

공개 빌드에는 index.html,404.html,tools,privacy,styles,js 아래 허용 확장자만 포함됩니다. 숨김 파일·소스 서버·문서·.git·.env는 제외합니다. 기존 docs 분석 자료는 배포하지 않습니다.

npm test는 node:test 단위 테스트로 인증 실패·UID 위조·본문 제한·정적 라우팅·동의·규칙 모드·Firestore 한도 트랜잭션·OpenAI 도움말 형식·비밀 오류 차단을 모의 검증합니다. 실제 클라우드나 유료 AI 호출 테스트는 포함하지 않습니다.
