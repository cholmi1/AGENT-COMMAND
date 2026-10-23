import { callAI, resolveAI, redactCredential } from './ai.mjs';
import { HttpError } from './errors.mjs';
/* 지시서 생성: AI 키가 있으면 AI가 «변동 재료»만 쓰고, 없으면 규칙 기반으로 같은 모양을 만든다.
 * 돌려주는 모양은 원본 서버 함수와 같습니다:
 *   { title, situation, goal, screens[], must[], first, later[], extra_rules[], ask[{q,options[]}] } 또는 { refuse }
 * 화면(브라우저)이 「일하는 방식·안전·메뉴 문장」을 붙이므로, 여기서는 그 부분을 쓰지 않습니다. */

const STOP = /(페이지|사이트|앱|서비스|만들|싶|좋겠|있으면|보이면|합니다|입니다|습니다|그리고|해서|하는|것을|것이|수 있|주세요)/g;

function clean(s, n) { return String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, n); }
function firstSentences(s, max) {
  return clean(s, 400).split(/(?<=[.!?。])\s+/).slice(0, max).join(' ');
}
function keywords(s) {
  return clean(s, 400).replace(STOP, ' ').split(/[^0-9A-Za-z가-힣]+/).filter((w) => w.length > 1).slice(0, 6);
}

/* ── 규칙 기반 생성 (키 없이도 동작) ───────────────────────── */
export function localPrompt(body) {
  const sit = clean(body.sit, 500), want = clean(body.want, 500);
  if (!sit && !want) return { refuse: '만들고 싶은 것이 비어 있습니다.' };
  if (/(죽이|해킹|불법|도박|성인)/.test(sit + want)) return { refuse: '도와드릴 수 없는 내용입니다. 만들고 싶은 것을 다르게 적어 주세요.' };

  const kw = keywords(want);
  const isReserve = /(예약|신청|접수|참가)/.test(want);
  const isBoard = /(글|기록|일기|후기|감상|게시)/.test(want);
  const isList = /(목록|표|현황|통계|합계|정리)/.test(want);
  const wantsLogin = /로그인|회원|나만|관리자/.test(want + (body.more || ''));
  const wantsPhone = /휴대폰|핸드폰|모바일|폰으로/.test(body.more || '');

  // 제목: 만들 것의 종류를 골라 짧게
  const kindWord = isReserve ? '예약' : isBoard ? '기록' : isList ? '목록' : '안내';
  const formWord = /페이지/.test(want) ? '페이지' : /사이트/.test(want) ? '사이트' : /앱/.test(want) ? '앱' : '도구';
  const title = (kindWord + ' ' + formWord).slice(0, 30);

  const screens = [];
  if (isReserve) screens.push('신청 화면: 무엇을 신청할지 고르고 이름·연락처를 적어 남긴다');
  if (isBoard) screens.push('작성 화면: 내용을 적어 저장한다');
  if (!screens.length) screens.push('첫 화면: 무엇을 하는 곳인지 한눈에 보이고 바로 시작할 수 있다');
  if (isList || isReserve || isBoard) screens.push('목록 화면: 들어온 것들을 최근 것부터 한눈에 본다');
  if (wantsLogin) screens.push('관리 화면(나만): 들어온 것을 보고 지우거나 상태를 바꾼다');

  const must = [];
  if (isReserve) must.push('신청이 들어오면 목록 맨 위에 바로 보인다');
  if (isBoard) must.push('적은 글이 새로고침해도 남는다');
  must.push('휴대폰 화면에서도 글씨가 잘 보이고 단추를 누르기 쉽다');
  if (wantsLogin) must.push('관리 화면은 나만 들어갈 수 있다');

  const ask = [];
  if (!wantsLogin) ask.push({ q: '들어온 목록을 누구까지 볼 수 있게 할까요?', options: ['나만', '아는 사람만', '누구나'] });
  if (!/색|분위기/.test(body.more || '')) ask.push({ q: '화면 분위기는 어느 쪽이 좋아요?', options: ['깔끔하게', '따뜻하게', '진중하게'] });
  if (isReserve && !/자리|인원|정원/.test(want)) ask.push({ q: '정원(자리 수)을 정해 둘까요?', options: ['정해 둘게요', '정하지 않아요'] });

  return {
    title,
    situation: firstSentences(sit, 3) || clean(want, 200),
    goal: firstSentences(want, 2),
    screens,
    must,
    first: screens.length > 1 ? '위 화면 가운데 첫 화면과 ' + screens[1].split(':')[0] + '까지.' : '첫 화면 하나.',
    later: isList && wantsLogin ? ['엑셀 내려받기'] : [],
    extra_rules: wantsPhone ? ['휴대폰 화면을 먼저 맞춰 줘.'] : [],
    ask: ask.slice(0, 3)
  };
}

/* ── AI 생성 (키가 있을 때) ─────────────────────────────────── */
const SCHEMA_HINT = `다음 JSON 만 출력하세요(설명·코드블록 금지):
{"title":"30자 안 제목","situation":"내 상황 요약(500자 안)","goal":"만들 것 한두 문장(300자 안)","screens":["화면 5개 이하"],"must":["꼭 되어야 하는 것 5개 이하"],"first":"첫 판 범위","later":["미루는 것"],"extra_rules":["추가 규칙 3개 이하"],"ask":[{"q":"되묻는 질문","options":["선택지","선택지"]}],"refuse":"거절할 때만 이유"}
사용자는 프로그래밍을 모릅니다. 쉬운 한국어로 쓰고, 저장·배포·서버 같은 말은 일상 비유를 한 번 붙이세요.`

export async function generatePrompt(body, selection) {
  const ai = resolveAI(selection);
  body = redactCredential(body,ai.apiKey);
  if (ai.provider === 'local') return {mode:'local',provider:'local',model:null,json:localPrompt(body)};
  const user = [
    '내 상황: ' + clean(body.sit, 1200),
    '만들고 싶은 것: ' + clean(body.want, 1200),
    '고른 메뉴: ' + clean(body.menu, 200),
    '더 자세히: ' + clean(body.more, 600)
  ].join('\n');
  const messages = [
    { role: 'system', content: '너는 한국어로 지시서를 쓰는 조수다. ' + SCHEMA_HINT },
    { role: 'user', content: user }
  ];
  try {
    const raw = await callAI(messages,true,ai);
    const json = JSON.parse(raw.replace(/^```(json)?/i, '').replace(/```$/, '').trim());
    if (!json || typeof json !== 'object' || Array.isArray(json)) throw new HttpError(502,'ai_invalid_response');
    return {mode:'ai',provider:ai.provider,model:ai.model,json:redactCredential(json,ai.apiKey)};
  } catch (e) {
    if (ai.explicit) throw e instanceof HttpError ? e : new HttpError(502,'ai_invalid_response');
    return {mode:'local',provider:'local',model:null,json:localPrompt(body)};
  }
}

/* ── 막힌 곳 도움말 ─────────────────────────────────────── */
const HELP_TIPS = [
  { re: /permission[- ]denied|missing or insufficient permissions/i, say: '권한 문제입니다. 저장소의 규칙이 막고 있어요.' },
  { re: /auth\/|invalid token|로그인이 풀|unauth/i, say: '로그인 표(토큰)가 만료된 경우입니다.' },
  { re: /quota|429|resource[- ]exhausted/i, say: '요청 한도를 넘었습니다.' },
  { re: /payment|결제|billing|카드/i, say: '과금 계정이 연결되지 않았습니다.' },
  { re: /cannot find module|not found: |command not found/i, say: '프로그램이나 파일이 없는 자리에서 실행하고 있어요.' },
  { re: /port .*(in use|already)/i, say: '이미 다른 프로그램이 그 포트를 쓰고 있습니다.' }
];

export async function generateHelp(body, selection) {
  const ai = resolveAI(selection);
  body = redactCredential(body,ai.apiKey);
  const txt = clean(body.txt, 3000);
  const hit = HELP_TIPS.find((t) => t.re.test(txt));
  if (ai.provider !== 'local') {
    try {
      const messages = [
        { role: 'system', content: '너는 프로그래밍을 모르는 사람에게 «다음 한 걸음» 하나만 알려 주는 조수다. 3~5줄, 쉬운 한국어, 명령은 한 줄씩. 추측이면 추측이라고 밝혀라.' },
        { role: 'user', content: '만들던 것: ' + clean(body.making, 300) + '\n고른 메뉴: ' + clean(body.menu, 200) + '\n막힌 내용: ' + txt }
      ];
      const raw = await callAI(messages,false,ai);
      return {text:raw.trim(),mode:'ai',provider:ai.provider,model:ai.model};
    } catch (e) { if (ai.explicit) throw e instanceof HttpError ? e : new HttpError(502,'ai_invalid_response'); }
  }
  if (!txt) return { text: '캡처만으로는 단정하기 어렵습니다. 화면에 뜬 글(에러 문구)을 그대로 붙여넣어 주세요.', mode:'local',provider:'local',model:null };
  const lines = ['지금 하실 일은 하나입니다.', ''];
  if (hit) lines.push('① ' + hit.say, '② 에러 문구에서 «파일 이름:줄 번호»를 찾아 그 부분을 에이전트에게 그대로 보여 주세요.');
  else lines.push('① 에러 문구 첫 줄을 복사해 에이전트 첫 대화에 붙여넣으세요.', '② 그다음 «지금까지 한 일»을 세 줄로 적어 주세요.');
  lines.push('', '※ 이 답은 규칙 기반입니다. AI 키를 넣으면 더 자세히 답합니다(README 참고).');
  return {text:lines.join('\n'),mode:'local',provider:'local',model:null};
}

export function generationMode(env = process.env) { return env.OPENAI_API_KEY || env.ANTHROPIC_API_KEY || env.DEEPSEEK_API_KEY ? 'ai' : 'local'; }
