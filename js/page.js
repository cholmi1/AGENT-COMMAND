/* AGENT-COMMAND: shared document rules and user-controlled choices. */
const $ = (id) => document.getElementById(id);
function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; }
function clean(s, n) { return String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, n); }
function setStatus(id, msg, err) { const s = $(id); s.textContent = msg || ''; s.classList.toggle('err', !!err); }
const OS = [ { v: 'mac', label: 'macOS', say: '사용 환경은 macOS입니다.' }, { v: 'win', label: 'Windows', say: '사용 환경은 Windows입니다.' }, { v: 'unknown', label: '아직 모름', say: '' } ];
const STORE = [
 { v:'auto', label:'추천받기', desc:'저장 필요 여부를 먼저 검토합니다.', lines:['데이터를 계속 보관할 필요가 있는지 검토하세요. 필요하다면 적합한 저장소 하나와 선정 이유를 제안하고 제 확인을 받으세요.'] },
 { v:'firebase',label:'Firebase',desc:'문서형 저장소와 인증 기능을 활용합니다.',lines:['데이터는 Firebase Firestore에 저장하세요.'] },
 { v:'supabase',label:'Supabase',desc:'표 형태의 데이터를 다루는 서비스입니다.',lines:['데이터는 Supabase 데이터베이스에 저장하세요.'] },
 { v:'sheet',label:'Google Sheets',desc:'간단한 목록을 시트로 관리합니다.',lines:['단순 목록은 Google Sheets에 저장하세요. 동시 수정이나 권한 분리가 어려우면 구현 전에 한계를 설명하세요.'] },
 { v:'none',label:'저장하지 않기',desc:'새로고침 후에도 남길 데이터가 없습니다.',lines:['영구 저장 기능은 만들지 마세요. 필요성이 생기면 범위를 바꾸기 전에 제 동의를 받으세요.'] }
];
const STORE_COMMON=['저장할 데이터와 필드, 접근 권한을 먼저 간단히 정리하세요.','계정 가입이나 프로젝트 생성이 필요하면 공식 서비스 주소와 실제 화면의 항목을 안내하세요. 비밀 값을 대화로 요구하지 마세요.','기본 접근은 차단하고 필요한 사용자만 허용하세요. 다른 사용자의 자료를 조회하거나 수정할 수 없는지 검증하세요.'];
const DEPLOY=[
 {v:'auto',label:'추천받기',desc:'공개 필요성과 운영 부담을 함께 검토합니다.',lines:['외부에서 접속해야 하는지 확인하세요. 필요한 경우 배포 방식 하나를 추천하고 이유와 비용 조건을 설명하세요.']},
 {v:'firebase',label:'Firebase Hosting',desc:'정적 화면을 Firebase에 배포합니다.',lines:['웹 화면 배포는 Firebase Hosting을 사용하세요.']},
 {v:'vercel',label:'Vercel',desc:'웹 화면과 지원되는 서버 기능을 배포합니다.',lines:['배포 대상은 Vercel입니다.']},
 {v:'netlify',label:'Netlify',desc:'정적 화면과 지원되는 함수 기능을 배포합니다.',lines:['배포 대상은 Netlify입니다.']},
 {v:'ghpages',label:'GitHub Pages',desc:'서버 실행이 없는 정적 사이트에 적합합니다.',lines:['정적 화면은 GitHub Pages로 배포하세요. 별도 서버가 필요하면 먼저 알려 주세요.']},
 {v:'none',label:'공개하지 않기',desc:'내 컴퓨터에서 실행하는 데까지 만듭니다.',lines:['외부 공개 없이 로컬 환경에서만 실행하세요. 실행과 종료 방법을 안내하세요.']}
];
const DEPLOY_COMMON=['공개 범위와 주소를 설명하고 명시적인 승인을 받은 뒤 배포하세요.','배포 전 비밀 정보 노출, 예시 데이터 잔존, 권한 설정, 모바일 표시를 점검하세요.','배포 결과를 실제 주소에서 확인하고 수정 사항을 다시 반영하는 절차를 남기세요.'];
const SERVER=['비밀 키 보호, 외부 API 호출, 권한 검증처럼 화면만으로 처리할 수 없는 기능이 있는지 검토하세요.','서버가 필요하면 선정한 플랫폼의 관리형 기능을 우선하고 운영 부담을 설명하세요. 비밀 키는 서버 환경 변수로 관리하세요.'];
const LOGIN=['검증된 인증 서비스를 이용하고 비밀번호 저장 기능을 직접 구현하지 마세요.','서비스에 맞는 로그인 방식 하나를 제안하세요. 사용자별 데이터 접근은 서버나 데이터베이스 규칙에서도 검사하세요.','로그인하지 않은 접근과 다른 계정의 데이터 접근을 각각 시험하세요.'];
const WORK=['요구사항을 짧게 요약하고 작업 범위를 정한 뒤 구현 계획을 제안하세요. 불확실한 조건은 추측 대신 확인하세요.','여러 선택지가 있으면 권장안 하나와 이유를 알려 주세요. 비용이나 공개 범위가 달라지는 결정은 제가 하도록 남겨 두세요.','제가 해야 하는 조작은 한 번에 한 단계씩 안내하세요. 화면과 버튼의 실제 이름을 사용하세요.','필요한 화면 정보는 텍스트로 요청하고, 이미지 확인 기능이 있는 경우에만 캡처를 요청하세요.','오류가 발생하면 비밀 정보가 제외된 오류 문구와 재현 순서를 받아 원인을 조사하세요. 가능하면 직접 수정하고 다시 시험하세요.','처음 등장하는 개발 용어는 쉬운 뜻을 먼저 설명하세요. 명령이 필요한 경우 실행 위치와 목적을 함께 알려 주세요.','각 단계가 끝나면 확인 방법과 실제 검증 결과를 구분해서 보고하세요. 확인하지 않은 동작은 완료라고 말하지 마세요.','승인된 범위 밖의 기능은 임의로 추가하지 마세요. 추가 제안은 별도로 정리하세요.','같은 시도가 반복해서 실패하면 원인과 시도 내역을 정리하고 다른 접근을 제안하세요.'];
const KEEP=['진행 상황은 제가 요청한 경우 작업 폴더 안의 기록 문서에 요약하세요. 완료 사항, 미해결 사항, 다음 순서를 구분하세요.','변경 전 복구 방법을 확인하세요. Git 커밋, 원격 업로드, 파일 덮어쓰기는 제 승인 범위를 따르세요.','이 지시서는 이번 작업에만 적용하세요. 영구 규칙 파일이나 다른 프로젝트 설정은 별도 요청 없이 수정하지 마세요.'];
const SAFE=['API 비밀 키, 토큰, 비밀번호를 채팅이나 결과물에 출력하지 마세요. 필요한 값은 안전한 저장소나 로컬 환경 변수에 입력하도록 안내하세요.','브라우저에서 공개되는 설정과 서버에서만 사용하는 비밀 키를 구분하세요. 관리자 권한이나 유료 API 키를 프런트 코드에 넣지 마세요.','데이터베이스를 모두에게 열어 두지 마세요. 최소 권한 규칙을 적용하고 본인 데이터만 접근할 수 있는지 검증하세요.','결제, 카드 등록, 유료 플랜 전환, 도메인 구매는 현재 공식 조건과 예상 비용을 먼저 안내하고 명시적 승인 후 진행하세요.','배포, 데이터 삭제, 기존 파일 교체 등 영향이 큰 조작은 대상과 결과를 설명하고 확인받으세요.','테스트에는 가상 데이터를 사용하세요. 실제 개인정보나 회사 내부 자료를 임의로 전송하지 마세요.','허용된 작업 폴더와 범위를 지키세요. 외부 파일을 수정하거나 권한을 넓히기 전에는 확인받으세요.'];
const START='먼저 이해한 목표와 첫 구현 범위를 간단히 요약하세요. 필요한 질문이 있다면 가장 중요한 한 가지만 물어보세요. 정보가 충분하면 첫 단계의 계획과 확인 방법을 제시하세요. 실행하지 않은 작업을 완료했다고 보고하지 마세요.';
const DEF={os:'unknown',store:'auto',deploy:'auto'};
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
  return [...m.cond, ...m.look, m.fields && '받을 정보: ' + m.fields, m.done && '끝났다고 볼 장면: ' + m.done, m.data && '이미 있는 자료: ' + m.data].filter(Boolean).join(' / ').slice(0,600);
}
function pick(name) { const m = document.querySelector('input[name=' + name + ']:checked'); return m ? m.value : DEF[name]; }
function opt(list, name) { const v = pick(name); return list.find((o) => o.v === v) || list[0]; }

/* 처음 보이는 예시(사람이 미리 써 둔 것 · AI 결과가 아님) */
const EX = {
 p:{sit:'가족 여행 준비를 맡고 있습니다. 후보 장소와 비용이 여러 메신저 대화에 흩어져 있어 한눈에 보기 어렵습니다.',want:'여행지 후보와 예상 비용을 입력하고 함께 비교할 수 있는 간단한 여행 준비 페이지를 만들고 싶습니다.'},
 w:{sit:'소규모 팀의 장비 대여를 관리합니다. 대여일과 반납일을 엑셀에 따로 적어 누락 여부를 확인하기 어렵습니다.',want:'장비별 대여 상태를 보고 신청과 반납을 기록하는 페이지가 필요합니다. 관리자는 미반납 목록을 확인하고 싶습니다.'},
 b:{sit:'작은 빵집을 운영합니다. 전화로 받은 예약 주문을 수첩에 적는데, 수령 시간별로 다시 정리하는 일이 번거롭습니다.',want:'고객이 상품과 수령 시간을 골라 예약하고, 저는 시간대별 주문 목록을 확인하는 페이지를 만들고 싶습니다.'}
};
const EX_T = {title:'여행 준비 페이지 예시',situation:EX.p.sit,goal:EX.p.want,screens:['여행지 목록: 장소와 예상 비용 표시','후보 등록: 장소와 간단한 메모 입력'],must:['등록한 후보를 목록에서 확인할 수 있다','예상 비용을 비교할 수 있다'],first:'후보 등록과 목록 확인',later:[],extra:[],ask:[]};
let T = EX_T, isExample = true, answers = {};
const AUTO = '권장안으로 정하기';
const dash = (s) => '- ' + s;

/* 지시서 조립 · 화면이 고정 문장을 책임지고 AI는 T만 채운다 */
function buildDoc(t) {
 const st=opt(STORE,'store'), dp=opt(DEPLOY,'deploy'), os=opt(OS,'os'), m=moreParts(), lines=[];
 const section=(title,items)=>{lines.push('',title,...items.filter(Boolean).map(dash));};
 lines.push('작업 지시서'+(t.title?' | '+t.title:''),'','당신은 이 프로젝트의 개발 에이전트입니다. 아래 조건을 바탕으로 필요한 작업을 진행해 주세요. 개발 경험이 적은 사용자가 이해할 수 있게 설명하세요.',os.say);
 section('1. 현재 상황',[t.situation||'아직 작성하지 않았습니다.']);
 section('2. 만들 서비스',[t.goal||'아직 작성하지 않았습니다.','첫 구현 범위: '+(t.first||'목표에 필요한 최소 기능'),...t.screens,...t.must,t.later.length?'나중에 검토: '+t.later.join(', '):'',m.fields?'받을 정보: '+m.fields:'',m.data?'기존 자료 종류: '+m.data+'. 원본은 허가 없이 수정하지 마세요.':'',m.done?'완료 확인 기준: '+m.done:'']);
 const answered=(t.ask||[]).map((a,i)=>answers[i]?a.q+': '+(answers[i]===AUTO?'권장안을 제안해 주세요.':answers[i]):'');
 section('3. 사용자 조건과 화면 방향',[...m.cond,...m.look,...answered]);
 section('4. 작업 방식',[...WORK,...t.extra]);
 section('5. 구현 순서',['먼저 가상 데이터로 핵심 화면을 만들고 로컬에서 확인하세요.',st.v!=='none'?'화면 확인 후 저장 기능을 연결하고 새로고침 뒤 데이터가 유지되는지 검증하세요.':'영구 저장 기능은 제외하세요.',$('login').checked?'인증을 연결하고 사용자 간 접근 차단을 시험하세요.':'인증 필요성을 검토하되 범위 변경은 먼저 확인하세요.',dp.v!=='none'?'공개 승인을 받은 뒤 배포하고 실제 주소에서 확인하세요.':'로컬 실행 절차를 정리하세요.','사용 방법, 검증 결과, 남은 문제를 최종 정리하세요.']);
 section('6. 데이터 저장',[...st.lines,...(st.v==='none'?[]:STORE_COMMON)]);
 section('7. 서버 역할',SERVER);
 if($('login').checked) section('8. 인증과 접근 권한',LOGIN);
 section('9. 배포와 공개',[...dp.lines,...(dp.v==='none'?[]:DEPLOY_COMMON)]);
 section('10. 기록과 복구',KEEP);
 section('11. 안전 기준',SAFE);
 section('12. 시작 요청',[START]); return lines.filter(x=>x!==undefined).join('\n');
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
let outputMode='local', historyOutput=null;
function refresh() {
 if(historyOutput!==null){$('promptOut').textContent=historyOutput;return;}
 $('promptOut').textContent=buildDoc(T);
 $('outBadge').textContent=isExample?'입력 예시로 구성한 샘플입니다. 아직 내 상황으로 생성하지 않았습니다.':outputMode==='ai'?'외부 AI가 정리한 내용에 공통 규칙을 결합한 초안입니다.':'입력과 기본 규칙을 조합한 초안입니다. 외부 AI는 사용하지 않았습니다.';
}
refresh();
document.querySelectorAll('input[type=radio]').forEach((r) => r.addEventListener('change', refresh));
$('login').addEventListener('change', refresh);
document.querySelectorAll('[data-ex]').forEach((b) => b.addEventListener('click', () => {
  const e = EX[b.dataset.ex]; $('sit').value = e.sit; $('want').value = e.want;
  setStatus('status', '예시를 넣었습니다. 내용을 수정한 후 지시서 만들기를 눌러 주세요.');
}));

function menuSay() { return ('자료 저장 = ' + opt(STORE, 'store').label + ' · 인터넷 공개 = ' + opt(DEPLOY, 'deploy').label + ' · 로그인 = ' + ($('login').checked ? '필요' : '없음')).slice(0,200); }

/* 서버 응답 정규화 · 길이·개수 제한을 여기서 한 번 더 건다 */
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

let serviceMode='local', enabled=false, ctl=null, helpCtl=null, usage=null;
function available(){const max=Number(usage?.perUserDay)||5;$('goBtn').disabled=!enabled||!!ctl||(usage&&Number(usage.promptUsed)>=max);$('helpBtn').disabled=!enabled||!!helpCtl||(usage&&Number(usage.helpUsed)>=max*2);}
async function updateMeter(){try{usage=await WorkroomApi.meter();serviceMode=usage.mode==='ai'?'ai':'local';enabled=usage.enabled===true&&!usage.stopped;WorkroomApi.paintMeter(usage,{total:$('mTotal'),left:$('mLeft'),calls:$('mCalls'),state:$('mState')});$('mHelpTotal').textContent=String((Number(usage.perUserDay)||5)*2);$('modeLabel').textContent=serviceMode==='ai'?'외부 AI 모드':'기본 규칙 모드';$('modeNote').textContent=serviceMode==='ai'?'입력 텍스트를 설정된 외부 AI 제공업체로 보내 초안을 정리합니다.':'외부 AI 없이 입력과 템플릿으로 초안을 정리합니다. 도움말은 일반 점검 안내입니다.';const max=Number(usage.perUserDay)||5;if(Number(usage.promptUsed)>=max)setStatus('status','오늘 지시서 이용 한도에 도달했습니다. 기존 결과는 복사할 수 있습니다.');if(Number(usage.helpUsed)>=max*2)setStatus('helpStatus','오늘 도움말 이용 한도에 도달했습니다.');}catch(error){enabled=false;$('modeLabel').textContent='연결을 확인해 주세요';$('modeNote').textContent=error.message;}available();}
async function loadHistory(){
 $('historyRefresh').disabled=true;setStatus('historyStatus','기록을 불러오고 있습니다.');
 try{const result=await WorkroomApi.get('/api/history'),items=Array.isArray(result.items)?result.items.slice(0,20):[];$('historyList').replaceChildren();if(!items.length)$('historyList').append(el('p','empty','저장한 기록이 없습니다. 생성 전에 선택 저장을 켜면 여기에 표시됩니다.'));
 items.forEach(item=>{const row=el('article','history-item'),info=el('div'),buttons=el('div','actions'),load=el('button','ghost','불러오기'),remove=el('button','ghost','삭제');load.type=remove.type='button';info.append(el('h3','',item.title||(item.type==='help'?'도움말 기록':'지시서 기록')));const date=new Date(item.createdAt);info.append(el('p','',(item.type==='help'?'도움말':'지시서')+' · '+(Number.isNaN(date.getTime())?'날짜 정보 없음':date.toLocaleString('ko-KR'))));
 load.addEventListener('click',()=>{if(item.type==='help'){$('helpOut').textContent=String(item.output||'');$('helpOut').hidden=false;setStatus('helpStatus','저장한 도움말을 불러왔습니다.');$('h-stuck').scrollIntoView({block:'start'});}else{let parsed;try{parsed=normT(JSON.parse(item.output));}catch(_){}historyOutput=null;if(parsed&&!parsed.refuse){T=parsed;isExample=false;answers={};renderAsks();refresh();}else{historyOutput=String(item.output||'');$('promptOut').textContent=historyOutput;$('asks').hidden=true;}$('outBadge').textContent='저장한 핵심 내용에 현재 선택한 기술·화면 조건을 결합한 지시서입니다. 원래 생성 당시 조건과 다를 수 있습니다.';setStatus('status','내 기록에서 불러왔습니다.');$('h-out').scrollIntoView({block:'start'});}});
 remove.addEventListener('click',async()=>{if(!window.confirm('이 기록을 삭제할까요? 복구할 수 없습니다.'))return;remove.disabled=load.disabled=true;try{await WorkroomApi.remove('/api/history?id='+encodeURIComponent(item.id));await loadHistory();setStatus('historyStatus','기록을 삭제했습니다.');}catch(error){setStatus('historyStatus',error.message,true);remove.disabled=load.disabled=false;}});buttons.append(load,remove);row.append(info,buttons);$('historyList').append(row);});setStatus('historyStatus',items.length?items.length+'개의 기록을 표시합니다.':'');}catch(error){setStatus('historyStatus',error.message||'기록을 불러오지 못했습니다.',true);}finally{$('historyRefresh').disabled=false;}
}
$('historyRefresh').addEventListener('click',loadHistory);
(async()=>{try{await WorkroomApi.ready;await updateMeter();await loadHistory();}catch(error){$('modeLabel').textContent='연결 준비 중';$('modeNote').textContent=error.message;setStatus('status','연결 후 생성할 수 있습니다. 샘플은 확인하고 복사할 수 있습니다.',true);setStatus('historyStatus','연결한 뒤 저장 기록을 확인할 수 있습니다.',true);}})();
$('stopBtn').addEventListener('click',()=>ctl?.abort());
$('goBtn').addEventListener('click',async()=>{
 const sit=$('sit').value.trim().slice(0,1200),want=$('want').value.trim().slice(0,1200);if(sit.length<8){setStatus('status','현재 상황을 8자 이상 적어 주세요.',true);$('sit').focus();return;}if(want.length<8){setStatus('status','만들 서비스를 8자 이상 적어 주세요.',true);$('want').focus();return;}
 ctl=new AbortController();available();$('stopBtn').hidden=false;setStatus('status',serviceMode==='ai'?'외부 AI에 초안 정리를 요청했습니다.':'기본 규칙으로 지시서를 정리하고 있습니다.');const end=WorkroomWait.start($('status'),{title:'지시서를 준비하고 있습니다.'});
 try{const body={sit,want,menu:menuSay(),more:moreSay(),consent:WorkroomConsent.on('prompt')};const result=await WorkroomApi.post('/api/prompt',body,ctl.signal),next=normT(result.json);if(!next)throw new Error('지시서 응답을 읽지 못했습니다. 다시 시도해 주세요.');if(next.refuse)throw new Error(next.refuse);T=next;isExample=false;answers={};historyOutput=null;outputMode=result.mode==='ai'?'ai':'local';renderAsks();refresh();setStatus('status','초안을 만들었습니다. 검토 후 복사하세요.'+WorkroomConsent.kept(result.keptId));if(result.keptId)await loadHistory();}catch(error){setStatus('status',error.message||'요청을 완료하지 못했습니다.',error.code!=='cancelled');}finally{end();ctl=null;$('stopBtn').hidden=true;await updateMeter();}
});
$('copyBtn').addEventListener('click',async()=>{try{await navigator.clipboard.writeText($('promptOut').textContent);$('copyBtn').textContent='복사 완료';}catch(_){const range=document.createRange();range.selectNodeContents($('promptOut'));const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);setStatus('status','자동 복사가 차단되었습니다. 선택된 글을 직접 복사해 주세요.');}setTimeout(()=>{$('copyBtn').textContent='지시서 복사';},2400);});
$('helpStopBtn').addEventListener('click',()=>helpCtl?.abort());
$('helpBtn').addEventListener('click',async()=>{const txt=$('stuck').value.trim().slice(0,3000);if(!txt){setStatus('helpStatus','문제 상황이나 에러 문구를 적어 주세요.',true);$('stuck').focus();return;}helpCtl=new AbortController();available();$('helpStopBtn').hidden=false;$('helpOut').hidden=true;setStatus('helpStatus','텍스트 도움말을 준비하고 있습니다.');const end=WorkroomWait.start($('helpStatus'),{title:'문제 상황을 정리하고 있습니다.'});try{const body={txt,making:isExample?clean($('want').value,300):T.goal,menu:menuSay(),consent:WorkroomConsent.on('help')};const result=await WorkroomApi.post('/api/help',body,helpCtl.signal),text=String(result.text||'').trim();if(!text)throw new Error('도움말 결과가 비어 있습니다.');$('helpOut').textContent=text;$('helpOut').hidden=false;setStatus('helpStatus',(result.mode==='ai'?'외부 AI가 작성한 안내입니다. 실제 환경과 비교해 주세요.':'규칙 기반 일반 점검 안내입니다. 실제 오류 원인을 확인한 결과는 아닙니다.')+WorkroomConsent.kept(result.keptId));if(result.keptId)await loadHistory();}catch(error){setStatus('helpStatus',error.message||'도움말을 가져오지 못했습니다.',error.code!=='cancelled');}finally{end();helpCtl=null;$('helpStopBtn').hidden=true;await updateMeter();}});
