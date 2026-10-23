# AGENT-COMMAND

독립 한국어 지시서·문제 해결 도구. Vercel Node 서버리스 API와 Firebase Authentication/Firestore를 사용합니다. Firebase Functions는 사용하지 않습니다. 유료 AI 키가 없으면 결정적 규칙 기반으로 작동합니다.

## 공개 배포

- 앱: https://agent-command-delta.vercel.app
- 지시서 작성: https://agent-command-delta.vercel.app/tools/agent-prompt/
- Firebase 프로젝트: agent-command-2ab5a, Firestore 서울(asia-northeast3), Spark.
- Vercel 프로젝트: agent-command, Hobby, GitHub main 자동 배포.
- 화면 기본 선택은 DeepSeek / deepseek-flash입니다. 사용할 본인 API 키를 화면에서 입력해야 AI가 호출됩니다. 키 없이 쓰려면 기본 규칙을 선택하세요. 운영자 공용 유료 AI 키는 연결하지 않았습니다.
- 2026-10-24 실제 공개 주소에서 익명 인증, 생성, 선택 저장, 도움말, 복사, 기록 삭제, 비인증 API 차단, 비공개 소스 경로 차단을 확인했습니다.

의존성은 Vercel 모듈 호환을 위해 firebase-admin 13.10.0을 사용하고, 전이 의존성 uuid는 보안 수정판 11.1.1로 고정했습니다. 적용 시 npm audit 경고 0건, 단위 테스트 13개 통과. SDK 갱신 시 실제 서버리스 환경에서도 재검증하세요.

저장 기록은 서버가 만든 핵심 결과를 저장합니다. 불러올 때 현재 선택한 기술·화면 조건 및 최신 공통 규칙과 결합하므로, 처음 복사한 완성 문서의 정확한 원본 보관 기능은 아닙니다.

## 내 API 키로 AI 사용하기

1. 작성 화면의 AI 설정에서 제공업체를 선택합니다. 기본은 DeepSeek, 모델은 deepseek-flash입니다. OpenAI·Anthropic도 선택할 수 있습니다.
2. 본인 API 키를 비밀번호 형태 입력칸에 직접 입력합니다. DeepSeek 키 발급 화면: https://platform.deepseek.com/api_keys
3. 선택한 업체로 입력을 전송하고 API 요금이 본인 계정에 청구될 수 있다는 동의를 체크합니다. 저장 동의와는 별개입니다.
4. 상황과 목표를 적고 지시서 만들기 또는 도움말 버튼을 누릅니다. 입력·선택만으로는 자동 호출하지 않으며, 실제 성공 응답 후에만 최근 요청 성공으로 표시합니다.
5. 키 지우기, 제공업체 변경, 새로고침·페이지 이동·탭 닫기 시 키와 요금 동의를 초기화합니다. 키는 앱의 브라우저 저장소·쿠키·URL·Firestore 기록·소스에 보관하지 않습니다. 브라우저의 Firebase 익명 로그인 정보는 별도입니다.

키는 HTTPS 요청 본문으로 이 앱의 Vercel 서버를 거쳐 선택한 업체의 고정 공식 API로 전송됩니다. 생성 프롬프트에는 키를 넣지 않으며, 저장 동의를 체크해도 ai 객체는 기록에서 제외합니다. 입력·결과에 같은 키가 우연히 반복되면 가립니다. 인프라 기본 로그·각 AI 업체의 데이터 정책은 별도입니다. 공용·신뢰하지 않는 기기에서는 입력하지 마세요.

인증 실패, 잔액·이용 한도 부족, 요청 과다, 모델 오류, 시간 초과는 안전한 오류로 알립니다. 본인 키를 명시한 요청 실패를 기본 규칙 성공으로 위장하지 않습니다. 실패한 호출도 서비스 일일 횟수에 포함되며, 시간 초과·중단 시 업체에서 이미 처리한 사용료가 발생할 수 있습니다. 일일 상한은 기존 지시서5·도움말10·전체100을 유지합니다.

모델 기본값(2026-10-24 공식 문서 확인): DeepSeek deepseek-flash, OpenAI gpt-5.6-terra, Anthropic claude-haiku-5-5. 직접 입력한 모델은 해당 공식 Chat Completions 또는 Messages API를 지원하고 계정 권한이 있어야 합니다. DeepSeek는 비추론 모드로 호출합니다. 가격·사용 가능 여부는 업체에서 다시 확인하세요.
공식 근거: https://api-docs.deepseek.com/ , https://api-docs.deepseek.com/guides/json_mode , https://developers.openai.com/api/docs/models/gpt-5.6-terra , https://platform.claude.com/docs/en/models/overview

BYOK 회귀 검사: 추가149개와 기존13개, 합계162개. 외부 AI 응답·인증 오류·동시 요청·키 비저장 검사는 모의 응답을 사용했습니다. 실제 유효 API 키를 사용한 유료 생성은 아직 검증하지 않았습니다.

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
- OPENAI_API_KEY / ANTHROPIC_API_KEY / DEEPSEEK_API_KEY 선택: 운영자 공용 서버 키입니다. 현재 모두 미설정입니다. 구형 요청에서 ai를 생략한 경우에만 OpenAI→Anthropic→DeepSeek 순으로 사용하며, 새 화면의 명시적인 선택이 우선합니다.
- OPENAI_MODEL / ANTHROPIC_MODEL / DEEPSEEK_MODEL 선택: 기본 gpt-5.6-terra / claude-haiku-5-5 / deepseek-flash. UI 개인 키와는 별개입니다. 서버 키도 사용 전 비용·모델을 확인합니다.
- PORT / HOST: 로컬 기본8080 / 127.0.0.1.

AI를 켜면 입력 텍스트가 선택한 제공사로 전송됩니다. 저장 동의는 앱 Firestore 저장 동의이며 제공사 정책을 대신하지 않습니다. AI 요청 timeout35초, 출력 토큰2048 상한. ai를 생략한 구형 서버 키 요청만 실패 시 local로 대체합니다. 명시적인 개인 키 요청은 실패를 오류로 반환합니다. 호출 상한은 금액 예산이 아니므로 제공사 예산 제한도 별도 필요합니다.

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

POST prompt/help에는 선택 필드 ai:{provider:local|openai|anthropic|deepseek,apiKey?:string,model?:string}을 추가할 수 있습니다. local은 provider만 허용하고 외부 제공사는 공백 없는 ASCII 키10~512자와 모델 ID 최대120자를 검증합니다. ai는 생성·저장 본문에서 분리합니다. 성공 응답에 provider와 model(기본 규칙은 null)이 추가됩니다. 인증·입력 검증 후에만 업체를 호출하며 임의 API 주소·리다이렉트는 허용하지 않습니다.

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
