/* 선택 동의 칸 — 단추 바로 위에 <div data-consent="prompt|help"></div> 를 두고 이 파일을 부릅니다.
 *   WorkroomConsent.on('prompt')  → 체크했나(기본 꺼짐)
 *   WorkroomConsent.shrink(blob)  → 남길 캡처(긴 변 1280px JPEG) 또는 null
 *   WorkroomConsent.kept(id)      → «남긴 글 번호» 안내 문장
 * 법 조항을 화면에 그대로 붙이지 않고, «무엇을·왜·얼마나·거부 방법»을 쉬운 말로 적었습니다.
 * 실제 서비스에 쓸 때는 법률 검토를 받으세요. */
(function () {
  var VER = '2026-10-24-clone-1';
  var OWNER = (document.body && document.body.dataset.consentOwner) || '이 도구';
  var WHAT = {
    prompt: '「내 상황」·「만들고 싶은 것」에 적은 글, 「더 자세히」에서 고르거나 적은 것(서비스 이름 등), 2번에서 고른 것, 내 컴퓨터 종류, AI가 쓴 지시서, 날짜',
    help: '「무슨 일이 있었나요」에 적은 글, 올린 캡처, 만들던 것, 고른 메뉴, 내 컴퓨터 종류, AI가 준 답, 날짜'
  };
  var LAW = [
    ['무엇을 남기나요', '위 «남기는 것»에 적힌 항목만 남깁니다. 전화번호·이메일·주민번호·카드번호·계좌번호·비밀 열쇠처럼 보이는 글은 자동으로 가리지만, 모든 경우를 다 가리지는 못합니다. 사람 이름과 비밀번호는 가리지 못합니다.'],
    ['왜 남기나요', '도구를 고치고, 자주 막히는 지점을 찾고, 강의·영상 예시로 쓰기 위해서입니다. 연락하거나 광고를 보내는 데는 쓰지 않습니다.'],
    ['얼마나 두나요', '1년입니다. 1년이 지나면 되살릴 수 없게 지웁니다.'],
    ['동의하지 않아도 되나요', '네. 체크하지 않아도 지시서와 답은 똑같이 나옵니다. 동의는 언제든 거둘 수 있고, 그때는 화면에 나온 «글 번호»를 알려 주시면 지웁니다.'],
    ['밖으로 보내는 것', '답을 만들기 위해 적은 글과 캡처를 AI 회사로 보냅니다. 남긴 글은 이 서버에 둡니다.']
  ];
  function build(box) {
    var kind = WHAT[box.getAttribute('data-consent')] ? box.getAttribute('data-consent') : 'prompt';
    var id = 'consent-' + kind;
    box.className = 'cbox';
    box.innerHTML =
      '<div class="crow"><input type="checkbox" id="' + id + '"><label for="' + id + '">(체크) 저는 만 14세 이상이며, 제가 적은 글' + (kind === 'prompt' ? '과 AI가 준 답을' : '·올린 캡처와 AI가 준 답을') + ' ' + OWNER + '가 <u>1년 동안</u> 남겨 도구를 고치고 예시로 쓰는 데 동의합니다</label>'
      + '<button type="button" class="law" aria-expanded="false" aria-controls="' + id + '-law" title="자세한 안내">!</button></div>'
      + '<p class="csum">남기는 것 · 쓰는 곳 · <b>보관 1년</b> · 체크하지 않아도 똑같이 쓸 수 있습니다</p>'
      + '<details class="cmore"><summary>자세히 보기</summary>'
      + '<ul>'
      + '<li><b>남기는 것:</b> ' + WHAT[kind] + '</li>'
      + '<li><b>쓰는 곳:</b> 도구 개선, 막히는 지점 정리, 강의·영상 예시, 문제가 생겼을 때 사실 확인. 예시로 쓸 때는 알아볼 만한 내용을 바꾸거나 뺍니다.</li>'
      + '<li class="ckeep"><b>보관: 1년.</b> 지나면 자동으로 지웁니다</li>'
      + '<li><b>안 해도 됩니다:</b> 체크하지 않아도 똑같이 쓸 수 있습니다. 동의는 언제든 거둘 수 있습니다</li>'
      + '</ul>'
      + '<p class="cwarn">이름, 다른 사람의 연락처, 주민·여권·면허 번호, 건강·종교·정치 같은 민감한 이야기는 적지 마세요' + (kind === 'help' ? '. 캡처에 보이는 이름·이메일·열쇠도 가리고 올려 주세요' : '') + '</p>'
      + '<div class="lawbox" id="' + id + '-law" hidden>' + LAW.map(function (r) { return '<span><b>' + r[0] + '</b>' + r[1] + '</span>'; }).join('') +
      '<span>법률 자문을 받은 문서가 아닙니다. 동의 문구판 ' + VER + '</span></div>'
      + '</details>'
      + '<p style="margin:0;font-size:13px"><a href="/privacy/">개인정보 처리방침</a></p>';
    var btn = box.querySelector('.law'), panel = box.querySelector('.lawbox');
    btn.addEventListener('click', function () {
      var open = panel.hidden; panel.hidden = !open; btn.setAttribute('aria-expanded', String(open));
      if (open) box.querySelector('.cmore').open = true;
    });
  }
  function ready(fn) { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn); else fn(); }
  ready(function () { document.querySelectorAll('[data-consent]').forEach(build); });

  async function shrink(blob) {
    if (!blob) return null;
    try {
      var url = URL.createObjectURL(blob);
      var img = await new Promise(function (res, rej) { var i = new Image(); i.onload = function () { res(i); }; i.onerror = rej; i.src = url; });
      var k = Math.min(1, 1280 / Math.max(img.naturalWidth, img.naturalHeight));
      var c = document.createElement('canvas'); c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
      var g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      var q = [0.72, 0.55, 0.4];
      for (var i = 0; i < q.length; i++) {
        var d = c.toDataURL('image/jpeg', q[i]).replace(/^data:[^,]+,/, '');
        if (d.length < 880000) return { mediaType: 'image/jpeg', data: d };
      }
    } catch (e) { /* 못 줄이면 캡처는 남기지 않는다 */ }
    return null;
  }
  window.WorkroomConsent = {
    ver: VER,
    on: function (kind) { var b = document.getElementById('consent-' + kind); return !!(b && b.checked); },
    shrink: shrink,
    kept: function (id) { return id ? ' 남긴 글 번호: ' + id + ' — 지우고 싶으면 이 번호를 알려 주세요.' : ''; }
  };
})();
