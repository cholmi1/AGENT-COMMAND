/* 이 페이지의 동작 — 메뉴 → 지시서 조립 → 서버 호출 → 되묻기.
 * 지시서는 두 재료로 만듭니다.
 *   고정 재료: 일하는 방식 · 안전 · 저장/공개/서버/로그인 문구 → 화면 코드에 박혀 있고 AI가 쓰지 않습니다.
 *   변동 재료: 내 상황 · 만들 것 · 화면 목록 · 꼭 되어야 하는 것 · 되묻기 답 → 서버 AI가 씁니다.
 */
const $ = (id) => document.getElementById(id);
function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; }
function clean(s, n) { return String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, n); }
function setStatus(id, msg, err) { const s = $(id); s.textContent = msg || ''; s.classList.toggle('err', !!err); }

/* ── 메뉴 ─────────────────────────────────────────── */
const OS = [
  { v: 'mac', label: '맥', say: '내 컴퓨터는 맥이야.' },
  { v: 'win', label: '윈도', say: '내 컴퓨터는 윈도야.' },
  { v: 'unknown', label: '모르겠어요', say: '' }
];
const STORE = [
  { v: 'auto', label: '에이전트가 골라 줘', desc: '저장이 필요한지부터 판단해서 하나만 추천합니다.', lines: [
    '자료를 저장해야 하는지 네가 먼저 판단해. 필요 없으면 쓰지 마.',
    '필요하면 내 상황에 맞는 서비스를 하나만 추천하고 이유를 한 줄로 말해 줘(예: Firebase, Supabase, 구글 시트). 내가 «좋다»고 하면 그걸로 가.'
  ] },
  { v: 'firebase', label: 'Firebase', desc: '구글이 운영합니다. 저장 · 로그인 · 공개를 한곳에서 합니다. 처음 만드는 작은 서비스에 흔히 씁니다.', lines: [
    '자료 저장은 Firebase(구글이 운영하는 서비스)의 Firestore를 써.'
  ] },
  { v: 'supabase', label: 'Supabase', desc: '엑셀처럼 행과 열로 된 표에 저장합니다. 쌓인 자료를 표로 보고 싶을 때 맞습니다.', lines: [
    '자료 저장은 Supabase(표 모양 데이터베이스 서비스)를 써.'
  ] },
  { v: 'sheet', label: '구글 시트', desc: '이미 쓰는 시트에 한 줄씩 쌓습니다. 신청 접수처럼 단순한 일에 맞습니다.', lines: [
    '자료 저장은 구글 시트를 써. 내 구글 계정의 시트에 한 줄씩 쌓이게 해 줘.',
    '시트로 감당하기 어려운 일(여러 사람이 동시에 고치기, 사람마다 다른 권한)이면 시작하기 전에 말해 줘.'
  ] },
  { v: 'none', label: '저장 안 함', desc: '화면만 만듭니다. 새로고침하면 사라져도 되는 도구일 때.', lines: [
    '자료 저장은 쓰지 않아. 만들다가 저장이 꼭 필요해 보이면 이유를 한 줄로 말하고 나에게 먼저 물어봐.'
  ] }
];
const STORE_COMMON = [
  '가입과 프로젝트 만들기는 내가 해야 해. 어느 주소로 들어가 무엇을 누르는지 한 걸음씩 시키고, 내가 스크린샷을 보내면 확인한 뒤 다음으로 가.',
  '무엇을 저장할지 «서랍 이름 — 들어가는 칸» 모양으로 먼저 보여 주고 시작해.',
  '처음부터 잠근 규칙으로 만들어(안전 C). 다 만든 뒤 «남이 내 자료를 읽거나 고칠 수 없는지» 네가 직접 시험해서 결과를 알려 줘.'
];
const DEPLOY = [
  { v: 'auto', label: '에이전트가 골라 줘', desc: '공개가 필요한지부터 판단해서 하나만 추천합니다.', lines: [
    '인터넷에 공개할 필요가 있는지 내 상황을 보고 네가 판단해.',
    '필요하면 서비스를 하나만 추천하고 이유를 한 줄로 말해 줘(예: Firebase Hosting, Vercel, Netlify, GitHub Pages). 내가 «좋다»고 하면 그걸로 가.'
  ] },
  { v: 'firebase', label: 'Firebase Hosting', desc: '자료 저장도 Firebase로 골랐다면 같이 쓰기 편합니다.', lines: ['인터넷 공개는 Firebase Hosting을 써.'] },
  { v: 'vercel', label: 'Vercel', desc: '깃허브(코드 보관함)에 올리면 자동으로 공개됩니다. 많이 쓰는 곳입니다.', lines: ['인터넷 공개는 Vercel을 써.'] },
  { v: 'netlify', label: 'Netlify', desc: 'Vercel과 비슷합니다. 폴더를 끌어다 놓아 올리는 방법도 있습니다.', lines: ['인터넷 공개는 Netlify를 써.'] },
  { v: 'ghpages', label: 'GitHub Pages', desc: '깃허브가 주는 공개 자리입니다. 저장 없이 화면만 있을 때 맞습니다.', lines: ['인터넷 공개는 GitHub Pages를 써.'] },
  { v: 'none', label: '공개 안 함', desc: '내 컴퓨터에서 여는 것까지만 합니다.', lines: [
    '인터넷에 공개하지 않아. 내 컴퓨터에서 여는 것까지만 해 주고, 여는 방법을 한 줄로 알려 줘.'
  ] }
];
const DEPLOY_COMMON = [
  '공개하기 전에 «지금 공개하면 누구나 이 주소로 볼 수 있습니다»라고 말하고 내 확인을 받아(안전 E).',
  '공개 전 점검을 네가 해서 알려 줘: 올라가는 파일에 비밀 열쇠가 없는지, 가짜 예시 자료가 남아 있지 않은지, 휴대폰 화면에서도 잘 보이는지.',
  '공개가 끝나면 주소와, 나중에 고친 내용을 다시 올리는 방법을 한 줄로 알려 줘.'
];
const SERVER = [
  '서버가 필요한지 네가 판단해. 비밀 열쇠를 써야 하는 일(AI 부르기 · 결제 · 메일 보내기)이 있을 때만 필요해.',
  '필요하면 왜 필요한지 한 줄로 말하고, 저장 · 공개에 쓰는 서비스의 서버 기능을 써. 서버 컴퓨터를 따로 빌려서 내가 관리해야 하는 방식은 피해 줘.'
];
const LOGIN = [
  '로그인이 필요해. 직접 만들지 말고, 저장에 쓰는 서비스의 로그인 기능을 써.',
  '비밀번호를 내가 보관하지 않아도 되는 방식(구글 계정으로 로그인 같은 것)을 하나 추천해 줘.',
  '로그인한 사람이 자기 것만 보고 고칠 수 있는지 네가 직접 시험해서 알려 줘.'
];
const WORK = [
  '네가 주도해. 계획을 다섯 줄 안으로 말하고 바로 시작해. 선택지를 여러 개 내밀지 말고, 하나를 추천하고 이유를 한 줄로 말해 줘.',
  '내가 직접 해야 하는 일(가입, 단추 누르기, 값 넣기)은 한 번에 하나씩만 시켜. 어디를 누르는지 화면 이름과 단추 이름으로 알려 줘.',
  '내 화면을 봐야 하면 «스크린샷 찍어서 보내 주세요»라고 말해. 내가 보낸 스크린샷을 보고 다음 한 걸음을 알려 줘.',
  '에러가 나면 «에러 문구를 그대로 복사해서 붙여넣어 주세요»라고 말해. 내가 붙여넣으면 네가 원인을 찾아서 직접 고쳐. 나한테 코드를 고치라고 하지 마.',
  '어려운 말이 나오면 일상 비유로 먼저 한 줄 풀어 주고, 그다음에 진짜 이름을 알려 줘.',
  '한 단계가 끝나면 내가 눈으로 확인할 방법(무엇을 열면 무엇이 보이는지)을 알려 주고, 내가 «좋다»고 하면 다음 단계로 가.',
  '내가 말하지 않은 기능은 늘리지 마. 더 하면 좋은 것은 끝에 목록으로만 알려 줘.',
  '단계마다 네가 직접 열어 보고 시험한 뒤, 무엇을 시험했고 결과가 어땠는지 세 줄로 보고해.',
  '같은 에러를 두 번 고쳐도 안 되면 멈추고, 지금까지 해 본 것을 정리한 뒤 다른 방법 하나를 제안해.'
];
const KEEP = [
  '작업 폴더에 «진행 기록.md»를 두고 단계가 끝날 때마다 한 일과 남은 일을 적어. 대화가 끊기면 내가 «진행 기록 읽고 이어서 해 줘»라고 말할게.',
  '단계가 끝날 때마다 저장 지점을 남겨(git 커밋). 내가 «아까로 되돌려 줘»라고 하면 되돌릴 수 있게.',
  '이 «일하는 방식»과 «안전»을 에이전트 규칙 파일(이 폴더에서 네가 매번 읽는 지침 파일)에 적어 둬. 대화가 길어져도 지켜지게.'
];
const SAFE = [
  '비밀 열쇠(API 키) · 비밀번호를 채팅에 붙여넣으라고 하지 마. 열쇠가 필요하면 내 컴퓨터의 비밀 파일(.env)에 내가 직접 넣게 안내하고, 그 파일이 깃허브 같은 곳에 올라가지 않게 네가 막아 줘.',
  '비밀로 지켜야 하는 열쇠(관리자 열쇠, 돈이 나가는 AI 열쇠)는 브라우저가 읽는 코드에 넣지 마. 공개되어도 되는 설정값과 무엇이 다른지 한 줄로 설명해 줘.',
  '자료 저장소를 «누구나 읽고 쓸 수 있음»(테스트 모드)으로 두지 마. 처음부터 잠근 규칙으로 만들고, 누가 무엇을 읽고 쓸 수 있는지 한 줄로 설명해 줘.',
  '돈이 들 수 있는 선택(유료 요금제, 카드 등록, 주소 구입)은 하기 전에 «돈이 듭니다»라고 먼저 말하고, 공식 요금 페이지에서 지금 조건을 확인해서 알려 줘. 내가 «해»라고 하기 전에는 하지 마.',
  '인터넷에 공개하기, 파일 지우기처럼 되돌리기 어려운 일은 하기 전에 나에게 확인받아.',
  '다른 사람의 이름 · 연락처 같은 개인정보로 시험하지 마. 가짜 자료로 시험해.',
  '이 작업 폴더 밖에 있는 내 파일은 건드리지 마.'
];
const START = '먼저 (1) 네가 이해한 «만들 것»을 세 줄로 말하고 (2) 계획을 다섯 줄 안으로 말하고 (3) «마음에 드는 사이트나 화면 캡처가 있으면 보내 주세요»라고 한 번만 물어봐. 내가 없다고 하면 네가 정해. (4) 그다음 1단계를 바로 시작해. 모르는 것이 있어도 한 번에 한 가지만 물어봐.';
const DEF = { os: 'unknown', store: 'auto', deploy: 'auto' };

const MORE = [
  { g: 'who', label: '누가 쓰나', opts: [
    ['solo', '나 혼자', '쓰는 사람은 나 혼자야. 다른 사람이 주소를 알아도 내 자료를 못 보게 해.'],
    ['team', '우리 팀 · 모임', '쓰는 사람은 우리 팀 · 모임처럼 아는 사람들이야. 모르는 사람은 못 들어오게 하는 가장 단순한 방법을 추천해 줘.'],
    ['public', '손님 · 누구나', '쓰는 사람은 손님 누구나야. 손님은 가입 없이 쓰고, 관리 화면은 나만 들어가게 해.']] },
  { g: 'size', label: '몇 명쯤 쓰나', opts: [
    ['s', '10명 안쪽', '쓰는 사람은 10명 안쪽이야. 그 규모에 맞는 가장 단순한 방법을 골라.'],
    ['m', '수십 명', '쓰는 사람은 수십 명쯤이야. 그 규모에 맞는 가장 단순한 방법을 골라.'],
    ['l', '수백 명 넘게', '쓰는 사람이 수백 명을 넘을 수 있어. 한꺼번에 몰려도 버티는 방법을 고르고, 돈이 드는지 먼저 알려 줘.']] },
  { g: 'device', label: '주로 어디서 보나', opts: [
    ['phone', '휴대폰', '주로 휴대폰으로 봐. 휴대폰 화면을 먼저 맞추고, 컴퓨터 화면은 그다음에 봐 줘.'],
    ['pc', '컴퓨터', '주로 컴퓨터로 봐. 컴퓨터 화면을 먼저 맞추고, 휴대폰에서도 깨지지 않게만 해 줘.'],
    ['both', '둘 다', '휴대폰과 컴퓨터 둘 다로 봐. 두 화면 모두에서 확인해 줘.']] },
  { g: 'pii', label: '개인정보를 받나', opts: [
    ['yes', '이름 · 연락처를 받아요', '이름 · 연락처 같은 개인정보를 받아. 꼭 필요한 칸만 받고, 받는 이유를 화면에 한 줄 적고, 나 말고는 못 보게 잠가.'],
    ['no', '안 받아요', '개인정보는 받지 않아. 이름 · 연락처 칸을 만들지 마.']] },
  { g: 'level', label: '내 수준', opts: [
    ['first', '에이전트가 처음', '나는 에이전트가 처음이야. 터미널에 무엇을 치는지, 어디를 누르는지도 한 줄씩 알려 줘.'],
    ['some', '몇 번 써 봄', '에이전트를 몇 번 써 봤어. 기본 사용법 설명은 짧게 해도 돼.'],
    ['often', '자주 씀', '에이전트를 자주 써. 설명은 짧게 하고, 내가 결정할 것만 물어봐.']] },
  { g: 'acct', label: '가진 계정', multi: true, opts: [['google', '구글 계정'], ['github', '깃허브 계정'], ['none', '둘 다 없음']] },
  { g: 'money', label: '돈', opts: [
    ['free', '무료 범위 안에서만', '무료 범위 안에서만 만들어. 넘을 것 같으면 만들기 전에 말해.'],
    ['some', '조금은 써도 됨', '필요하면 돈을 조금은 쓸 수 있어. 그래도 돈이 드는 선택은 금액을 확인해서 먼저 말해 줘.']] },
  { g: 'mood', label: '분위기', look: true, opts: [
    ['clean', '깔끔 · 단정', '분위기는 깔끔하고 단정하게 해 줘.'],
    ['warm', '따뜻 · 아기자기', '분위기는 따뜻하고 아기자기하게 해 줘.'],
    ['pro', '진중 · 전문', '분위기는 진중하고 전문적으로 해 줘.']] },
  { g: 'color', label: '대표 색', look: true, opts: [['blue', '파랑'], ['green', '초록'], ['orange', '주황'], ['pink', '분홍'], ['purple', '보라'], ['mono', '검정 · 회색']].map(([v, l]) => [v, l, '대표 색은 ' + l + ' 계열로 해 줘.']) }
];

/* ── 화면 만들기 ─────────────────────────────────── */
const picked = {};
function renderSeg(id, name, list, small) {
  const box = $(id);
  list.forEach((o) => {
    const lab = el('label'), inp = el('input');
    inp.type = 'radio'; inp.name = name; inp.value = o.v; inp.checked = o.v === DEF[name];
    lab.append(inp, document.createTextNode(o.label));
    if (o.desc && !small) lab.append(el('small', '', o.desc));
    box.append(lab);
  });
}
renderSeg('seg-os', 'os', OS, true);
renderSeg('seg-store', 'store', STORE);
renderSeg('seg-deploy', 'deploy', DEPLOY);

(function buildMoreChips() {
  const box = $('moreChips');
  MORE.forEach((m) => {
    const row = el('div', 'mrow');
    row.append(el('span', 'mlab', m.label + (m.multi ? ' (여러 개 고르기)' : '')));
    const chips = el('div', 'chips');
    m.opts.forEach((o) => {
      const b = el('button', 'chip', o[1]); b.type = 'button'; b.setAttribute('aria-pressed', 'false');
      b.addEventListener('click', () => {
        if (m.multi) {
          let a = picked[m.g] || [];
          if (a.includes(o[0])) a = a.filter((x) => x !== o[0]);
          else a = o[0] === 'none' ? ['none'] : a.filter((x) => x !== 'none').concat(o[0]);
          picked[m.g] = a;
        } else picked[m.g] = picked[m.g] === o[0] ? '' : o[0];
        const sel = m.multi ? picked[m.g] : [picked[m.g]];
        [...chips.children].forEach((c, i) => c.setAttribute('aria-pressed', String(sel.includes(m.opts[i][0]))));
        refresh();
      });
      chips.append(b);
    });
    row.append(chips); box.append(row);
  });
})();

['m-fields', 'm-name', 'm-tag', 'm-done', 'm-data'].forEach((id) => $(id).addEventListener('input', () => refresh()));

function moreParts() {
  const cond = [], look = [];
  MORE.forEach((m) => {
    if (m.multi) return;
    const o = m.opts.find((o) => o[0] === picked[m.g]); if (!o) return;
    (m.look ? look : cond).push(o[2]);
  });
  const a = picked.acct || [];
  if (a.includes('none')) cond.push('구글 계정도 깃허브 계정도 없어. 가입이 필요하면 그때 한 걸음씩 시켜.');
  else if (a.includes('google') && a.includes('github')) cond.push('구글 계정과 깃허브 계정은 이미 있어.');
  else if (a.includes('google')) cond.push('구글 계정은 있고 깃허브 계정은 없어. 깃허브 가입이 필요하면 그때 한 걸음씩 시켜.');
  else if (a.includes('github')) cond.push('깃허브 계정은 있고 구글 계정은 없어. 구글 가입이 필요하면 그때 한 걸음씩 시켜.');
  const v = (id) => clean($(id).value, 200);
  const name = v('m-name'), tag = v('m-tag');
  if (name || tag) look.unshift((name ? '서비스 이름: «' + name + '». ' : '') + (tag ? '한 줄 소개: «' + tag + '». ' : '') + '화면 맨 위에 넣어 줘.');
  return { cond, look, fields: v('m-fields'), done: v('m-done'), data: v('m-data') };
}
function moreSay() {
  const m = moreParts();
  return [...m.cond, ...m.look, m.fields && '받을 정보: ' + m.fields, m.done && '끝났다고 볼 장면: ' + m.done, m.data && '이미 있는 자료: ' + m.data].filter(Boolean).join(' / ');
}
function pick(name) { const m = document.querySelector('input[name=' + name + ']:checked'); return m ? m.value : DEF[name]; }
function opt(list, name) { const v = pick(name); return list.find((o) => o.v === v) || list[0]; }

/* 처음 보이는 예시(사람이 미리 써 둔 것 — AI 결과가 아님) */
const EX = {
  p: { sit: '대학생입니다. 스터디 모임 네 명이 매주 읽은 책을 서로 알려 주는데, 지금은 단톡방에 흩어져 있어서 나중에 찾기 어렵습니다.',
    want: '모임원이 읽은 책 제목과 한 줄 감상을 적으면 한 화면에 모아서 보여 주는 페이지. 누가 이번 주에 안 적었는지도 보이면 좋겠습니다.' },
  w: { sit: '회사에서 교육을 담당합니다. 매달 부서별 교육 신청을 메일과 엑셀로 받아서 손으로 합칩니다. 빠뜨리는 부서가 자주 생깁니다.',
    want: '직원이 폼에 신청을 적으면 부서별 인원과 예산이 자동으로 합쳐져 보이는 사내 신청 페이지. 나는 전체 목록을 보고 엑셀로 내려받고 싶습니다.' },
  b: { sit: '동네에서 혼자 공방을 합니다. 원데이 클래스 예약을 인스타 메시지로 받다 보니 자주 놓치고, 남은 자리를 매번 손으로 답합니다.',
    want: '클래스 날짜와 남은 자리를 보여 주고 예약 신청을 받는 가게 페이지. 신청이 들어오면 내가 목록으로 볼 수 있게.' }
};
const EX_T = {
  title: '공방 클래스 예약 페이지',
  situation: '나는 동네에서 혼자 공방을 해. 원데이 클래스 예약을 인스타 메시지로 받다 보니 자주 놓치고, 남은 자리를 매번 손으로 답하고 있어.',
  goal: '손님이 클래스 날짜와 남은 자리를 보고 예약 신청을 남기는 가게 페이지. 들어온 신청은 내가 목록으로 본다.',
  screens: ['클래스 목록 — 날짜, 클래스 이름, 남은 자리를 본다', '예약 신청 — 손님이 클래스를 고르고 신청을 남긴다', '신청 목록(나만) — 들어온 신청을 날짜별로 본다'],
  must: ['신청하면 그 클래스의 남은 자리가 줄어든다', '남은 자리가 0이면 신청 단추가 눌리지 않는다', '신청 목록은 나만 볼 수 있다'],
  first: '클래스 목록과 예약 신청, 나만 보는 신청 목록까지.', later: [], extra: ['손님이 휴대폰으로 볼 테니 휴대폰 화면을 먼저 맞춰 줘.'], ask: []
};
let T = EX_T, isExample = true, answers = {};
const AUTO = '에이전트가 정해 줘';
const dash = (s) => '- ' + s;

/* 지시서 조립 — 화면이 고정 문장을 책임지고 AI는 T만 채운다 */
function buildDoc(t) {
  const st = opt(STORE, 'store'), dp = opt(DEPLOY, 'deploy'), os = opt(OS, 'os'), login = !!$('login').checked;
  const L = [];
  L.push('[에이전트 지시서' + (t.title ? ' — ' + t.title : '') + ']', '');
  L.push('너는 내 컴퓨터에서 일하는 AI 에이전트야. 아래 «만들 것»을 네가 주도해서 끝까지 완성해 줘. 나는 프로그래밍을 몰라. 데이터베이스 · 서버 · 배포 같은 말도 잘 몰라.' + (os.say ? ' ' + os.say : ''), '');
  L.push('■ 내 상황', t.situation || '(적지 않았어. 시작할 때 내 상황을 한 가지만 물어봐 줘.)', '');
  L.push('■ 만들 것', t.goal || '(적지 않았어. 시작할 때 무엇을 만들지 한 가지만 물어봐 줘.)');
  if (t.screens.length) L.push('화면', ...t.screens.map(dash));
  if (t.must.length) L.push('꼭 되어야 하는 것', ...t.must.map(dash));
  if (t.first) L.push('첫 판 범위: ' + t.first);
  if (t.later.length) L.push('첫 판에서는 미루는 것: ' + t.later.join(' · '));
  const M = moreParts();
  if (M.fields) L.push('저장할 것(받을 정보): ' + M.fields);
  if (M.data) L.push('이미 있는 자료: ' + M.data + ' — 필요한 단계에서 그 파일을 달라고 해서 옮겨 넣어. 원본 파일은 고치지 마.');
  if (M.done) L.push('완성 기준: ' + M.done + ' — 다 만든 뒤 네가 직접 이 장면을 시험해서 보여 줘.');
  const ans = (t.ask || []).map((a, i) => answers[i] ? a.q + ' → ' + (answers[i] === AUTO ? '네가 정하고 이유를 한 줄로 말해 줘.' : answers[i]) : '').filter(Boolean);
  if (ans.length) L.push('추가로 정한 것', ...ans.map(dash));
  if (M.cond.length) L.push('', '■ 쓰는 사람과 조건', ...M.cond.map(dash));
  if (M.look.length) L.push('', '■ 화면 모양', ...M.look.map(dash));
  L.push('');
  L.push('■ 일하는 방식 (꼭 지켜 줘)', ...WORK.concat(t.extra).map((w, i) => (i + 1) + '. ' + w), '');
  const steps = ['화면 — 저장 없이 화면부터 만들어서 내 컴퓨터에서 열어 보여 줘. 자료는 가짜 예시로 채워.'];
  if (st.v !== 'none') steps.push('자료 저장 — 아래 «자료 저장»대로 붙여. 가짜 예시를 진짜 저장으로 바꾸고, 새로고침해도 남는지 나와 같이 확인해.');
  if (login) steps.push('로그인 — 아래 «로그인»대로 붙여.');
  if (dp.v !== 'none') steps.push('인터넷에 공개 — 아래 «인터넷에 공개»대로 올려.');
  steps.push('마무리 — 작업 폴더에 «사용 설명.md»를 남겨 줘. 여는 법, 고치고 싶을 때 너에게 뭐라고 말하면 되는지, 내가 가입한 서비스 목록을 적어. 그리고 오늘 나온 개념 세 가지를 일상 비유로 정리해 줘.');
  L.push('■ 순서 (단계마다 멈춰서 내 «좋다»를 받고 넘어가)', ...steps.map((s, i) => (i + 1) + '단계: ' + s), '');
  L.push('■ 자료 저장 (데이터베이스 — 내 서비스가 기억할 것을 넣어 두는 서랍장)', ...st.lines.concat(st.v !== 'none' ? STORE_COMMON : []).map(dash), '');
  L.push('■ 서버 (화면 뒤에서 일하는 직원)', ...SERVER.map(dash), '');
  if (login) L.push('■ 로그인', ...LOGIN.map(dash), '');
  L.push('■ 인터넷에 공개 (배포 — 가게 문 열기)', ...dp.lines.concat(dp.v !== 'none' ? DEPLOY_COMMON : []).map(dash), '');
  L.push('■ 기록과 되돌리기', ...KEEP.map(dash), '');
  L.push('■ 안전 (어기면 안 돼)', ...SAFE.map((s, i) => 'ABCDEFG'[i] + '. ' + s), '');
  L.push('■ 지금 시작', START);
  return L.join('\n');
}

function renderAsks() {
  const list = $('askList'); list.replaceChildren();
  const asks = (!isExample && T.ask) || [];
  $('asks').hidden = !asks.length;
  asks.forEach((a, i) => {
    const row = el('div', 'ask'); row.append(el('div', 'aq', a.q));
    const chips = el('div', 'chips');
    a.options.concat([AUTO]).forEach((o) => {
      const b = el('button', 'chip', o); b.type = 'button'; b.setAttribute('aria-pressed', 'false');
      b.addEventListener('click', () => {
        answers[i] = answers[i] === o ? '' : o;
        [...chips.children].forEach((c) => c.setAttribute('aria-pressed', String(c.textContent === answers[i])));
        refresh();
      });
      chips.append(b);
    });
    row.append(chips); list.append(row);
  });
}
function refresh() {
  $('promptOut').textContent = buildDoc(T);
  $('outBadge').textContent = isExample ? '예시 — «비즈니스 예시» 상황으로 사람이 미리 써 둔 지시서입니다. 위에 내 상황을 적고 단추를 누르면 내 것으로 바뀝니다' : 'AI가 방금 내 상황으로 쓴 지시서입니다 — 붙여넣기 전에 한 번 읽어 보세요';
}
refresh();
document.querySelectorAll('input[type=radio]').forEach((r) => r.addEventListener('change', refresh));
$('login').addEventListener('change', refresh);
document.querySelectorAll('[data-ex]').forEach((b) => b.addEventListener('click', () => {
  const e = EX[b.dataset.ex]; $('sit').value = e.sit; $('want').value = e.want;
  setStatus('status', '예시를 넣었습니다. 고쳐 적어도 됩니다. «내 상황으로 지시서 만들기»를 눌러 주세요.');
}));

function menuSay() { return '자료 저장 = ' + opt(STORE, 'store').label + ' · 인터넷 공개 = ' + opt(DEPLOY, 'deploy').label + ' · 로그인 = ' + ($('login').checked ? '필요' : '없음'); }

/* 서버 응답 정규화 — 길이·개수 제한을 여기서 한 번 더 건다 */
function normT(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const arr = (a, n, len) => (Array.isArray(a) ? a : []).slice(0, n).map((r) => clean(r, len)).filter(Boolean);
  const refuse = clean(raw.refuse, 200);
  if (refuse) return { refuse };
  const goal = clean(raw.goal, 300), situation = clean(raw.situation, 500);
  if (!goal && !situation) return null;
  return { title: clean(raw.title, 30), situation, goal, screens: arr(raw.screens, 5, 120), must: arr(raw.must, 5, 120),
    first: clean(raw.first, 200), later: arr(raw.later, 3, 40), extra: arr(raw.extra_rules, 3, 160),
    ask: (Array.isArray(raw.ask) ? raw.ask : []).slice(0, 3).map((a) => ({ q: clean(a && a.q, 80), options: arr(a && a.options, 4, 30) })).filter((a) => a.q && a.options.length >= 2) };
}
const COPY = {
  rate_limited: '요청이 많습니다. 잠시 뒤에 다시 눌러 주세요.',
  failed: '지금은 쓰지 못했습니다. 잠시 뒤에 다시 눌러 주세요.',
  refused: '이 내용으로는 지시서를 쓰지 못했습니다. 만들고 싶은 것을 다르게 적어 주세요.',
  invalid_json: '결과를 읽지 못했습니다. 한 번 더 눌러 주세요.',
  empty_completion: '결과가 비어 있습니다. 한 번 더 눌러 주세요.',
  image_rejected: '이 캡처는 읽지 못했습니다. JPG나 PNG로 다시 올려 주세요.'
};

let ready = true, imgTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'], imgMax = 4 * 1024 * 1024, ctl = null, helpCtl = null;

/* 게이지 — 서버가 주는 숫자만 그린다 */
(async () => {
  const m = await WorkroomApi.meter(); if (!m) return;
  WorkroomApi.paintMeter(m, { total: $('mTotal'), left: $('mLeft'), calls: $('mCalls'), state: $('mState') });
  $('mPer').textContent = m.perUserDay || 5;
  if (!m.enabled || m.stopped) { $('goBtn').disabled = true; $('helpBtn').disabled = true; setStatus('status', $('mState').textContent); }
})();

$('stopBtn').addEventListener('click', () => { if (ctl) ctl.abort(); });

$('goBtn').addEventListener('click', async () => {
  if (!ready) { setStatus('status', 'AI 연결을 확인하는 중입니다. 잠시 뒤에 다시 눌러 주세요.'); return; }
  const sit = $('sit').value.trim().slice(0, 1500), want = $('want').value.trim().slice(0, 1500);
  if (want.length < 8) { setStatus('status', '«만들고 싶은 것»을 한두 문장 적어 주세요. 모르겠으면 위의 예시 단추를 눌러 보세요.', true); $('want').focus(); return; }
  if (sit.length < 8) { setStatus('status', '«내 상황»을 한두 문장 적어 주세요. 하는 일과 지금 불편한 점만 적어도 됩니다.', true); $('sit').focus(); return; }
  ctl = new AbortController();
  $('goBtn').disabled = true; $('stopBtn').hidden = false;
  setStatus('status', 'AI가 내 상황을 읽고 지시서를 쓰고 있습니다… (보통 10~40초)');
  const endWait = WorkroomWait.start($('status'), { title: 'AI가 지시서를 쓰고 있습니다', typical: 25, max: 40,
    steps: ['내 상황 읽는 중', '«만들 것»과 화면 정리하는 중', '저장 · 공개 · 서버 고르는 중', '«일하는 방식»과 «안전» 붙이는 중', '처음 시작할 말 쓰는 중'] });
  try {
    const body = { sit, want, menu: menuSay(), more: moreSay() };
    if (WorkroomConsent.on('prompt')) { body.consent = true; body.consentVer = WorkroomConsent.ver; body.pick = { os: pick('os'), store: pick('store'), deploy: pick('deploy'), login: $('login').checked }; }
    const r = await WorkroomApi.post('/api/prompt', body, ctl.signal);
    const t = normT(r.json);
    if (!t) setStatus('status', COPY.invalid_json, true);
    else if (t.refuse) setStatus('status', '이 내용으로는 지시서를 쓰지 않습니다: ' + t.refuse + WorkroomConsent.kept(r.keptId), true);
    else {
      T = t; isExample = false; answers = {}; renderAsks(); refresh();
      setStatus('status', '내 상황으로 썼습니다. 아래 지시서를 읽어 보고 복사하세요. 메뉴를 바꾸면 지시서도 바로 바뀝니다.' + (t.ask.length ? ' AI가 되묻는 것이 ' + t.ask.length + '개 있습니다.' : '') + WorkroomConsent.kept(r.keptId));
      $('h-out').scrollIntoView({ behavior: 'smooth', block: 'start' });
      WorkroomNudge.show($('copyBtn').closest('.actions'), { q: '이걸로 뭘 만들어 볼 거예요? 한 줄 남겨 주세요', chips: ['«' + t.title + '» 만들어 볼게요', '오늘 바로 해 볼게요', '생각보다 쉬웠어요'] });
    }
  } catch (e) {
    const code = e && e.code;
    if (code === 'cancelled') setStatus('status', '멈췄습니다.');
    else setStatus('status', (e && e.message) || COPY[code] || COPY.failed, true);
  } finally {
    endWait(); $('goBtn').disabled = false; $('stopBtn').hidden = true; ctl = null;
  }
});

$('copyBtn').addEventListener('click', async (e) => {
  const btn = e.currentTarget, old = '지시서 복사하기';
  try { await navigator.clipboard.writeText($('promptOut').textContent); btn.textContent = '복사했습니다 — 에이전트 첫 대화에 붙여넣기'; }
  catch (err) {
    const r = document.createRange(); r.selectNodeContents($('promptOut')); const s = getSelection(); s.removeAllRanges(); s.addRange(r);
    btn.textContent = '자동 복사가 막혔습니다 — 선택된 글을 직접 복사해 주세요';
  }
  setTimeout(() => { btn.textContent = old; }, 2400);
});

/* ── 막히면 돌아오기 ───────────────────────────── */
let shotBlob = null;
$('shot').addEventListener('change', (e) => {
  const f = e.target.files && e.target.files[0]; if (!f) return;
  if (!imgTypes.includes(f.type)) { setStatus('helpStatus', '이 형식의 그림은 읽지 못합니다. JPG나 PNG로 올려 주세요.', true); return; }
  if (f.size > imgMax) { setStatus('helpStatus', '캡처 파일이 너무 큽니다. 더 작게 저장해 올려 주세요.', true); return; }
  shotBlob = f; $('shotName').textContent = f.name;
  const fr = new FileReader(); fr.onload = () => { $('shotImg').src = fr.result; $('shotImg').hidden = false; }; fr.readAsDataURL(f);
  setStatus('helpStatus', '');
});
$('helpStopBtn').addEventListener('click', () => { if (helpCtl) helpCtl.abort(); });
$('helpBtn').addEventListener('click', async () => {
  if (!ready) { setStatus('helpStatus', 'AI 연결을 확인하는 중입니다. 잠시 뒤에 다시 눌러 주세요.'); return; }
  const txt = $('stuck').value.trim().slice(0, 4000);
  if (!txt && !shotBlob) { setStatus('helpStatus', '무슨 일이 있었는지 적거나 캡처를 올려 주세요.', true); return; }
  helpCtl = new AbortController();
  $('helpBtn').disabled = true; $('helpStopBtn').hidden = false; $('helpOut').hidden = true;
  setStatus('helpStatus', 'AI가 읽고 있습니다… (보통 10~40초)');
  const endWait = WorkroomWait.start($('helpStatus'), { title: 'AI가 막힌 곳을 읽고 있습니다', typical: 25, max: 40,
    steps: ['에러·캡처 읽는 중', '어디서 막혔는지 찾는 중', '다음 한 걸음 고르는 중', '쉬운 말로 쓰는 중'] });
  try {
    const body = { txt, making: isExample ? clean($('want').value, 300) : T.goal, menu: menuSay() };
    if (shotBlob) body.image = { mediaType: shotBlob.type, data: await WorkroomApi.fileToBase64(shotBlob) };
    if (WorkroomConsent.on('help')) { body.consent = true; body.consentVer = WorkroomConsent.ver; body.pick = { os: pick('os') }; if (shotBlob) body.keepImage = await WorkroomConsent.shrink(shotBlob); }
    const res = await WorkroomApi.post('/api/help', body, helpCtl.signal);
    $('helpOut').textContent = (res && res.text || '').trim(); $('helpOut').hidden = !$('helpOut').textContent;
    setStatus('helpStatus', ($('helpOut').hidden ? COPY.empty_completion : '한 걸음만 해 보고, 또 막히면 다시 오세요.') + WorkroomConsent.kept(res && res.keptId));
  } catch (e) {
    const code = e && e.code;
    if (code === 'cancelled') setStatus('helpStatus', '멈췄습니다.');
    else setStatus('helpStatus', (e && e.message) || COPY[code] || '지금은 답하지 못했습니다. 잠시 뒤에 다시 눌러 주세요.', true);
  } finally {
    endWait(); $('helpBtn').disabled = false; $('helpStopBtn').hidden = true; helpCtl = null;
  }
});
