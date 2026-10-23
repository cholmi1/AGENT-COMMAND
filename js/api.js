/* 서버와 이야기하는 공통 조각.
 *  - 이 복제본은 Firebase 없이도 돌아가게 «브라우저 번호표»를 localStorage 에 하나 만들어 붙입니다.
 *    (원본은 Firebase 익명 로그인 토큰을 Authorization: Bearer 로 보냅니다.)
 *  - 브라우저는 /api/... 만 부릅니다. AI 열쇠는 서버에만 있습니다.
 */
(function () {
  function uid() {
    var k = 'workroom.uid';
    try {
      var v = localStorage.getItem(k);
      if (!v) { v = 'w' + Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem(k, v); }
      return v;
    } catch (e) { return 'anon'; }
  }
  function headers() {
    return { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + uid() };
  }
  async function post(path, body, signal) {
    var r;
    try {
      r = await fetch(path, { method: 'POST', headers: headers(), body: JSON.stringify(body || {}), signal: signal });
    } catch (e) {
      if (e && e.name === 'AbortError') throw { code: 'cancelled', message: '멈췄습니다.' };
      throw { code: 'network', message: '인터넷 연결을 확인하고 다시 눌러 주세요.' };
    }
    var j = {};
    try { j = await r.json(); } catch (e) { j = {}; }
    if (!r.ok) throw { code: (j && j.error) || ('http_' + r.status), message: (j && j.message) || '지금은 답하지 못했습니다. 잠시 뒤에 다시 눌러 주세요.', status: r.status };
    return j;
  }
  async function meter() {
    try {
      var r = await fetch('/api/meter', { cache: 'no-store', headers: { 'Authorization': 'Bearer ' + uid() } });
      if (!r.ok) return null;
      return await r.json();
    } catch (e) { return null; }
  }
  function fileToBase64(file) {
    return new Promise(function (resolve, reject) {
      var fr = new FileReader();
      fr.onload = function () { resolve(String(fr.result).replace(/^data:[^,]+,/, '')); };
      fr.onerror = function () { reject(new Error('read')); };
      fr.readAsDataURL(file);
    });
  }
  var monthName = function (ym) { return /^\d{4}-\d{2}$/.test(String(ym || '')) ? Number(String(ym).slice(5)) + '월' : ''; };
  function paintMeter(m, els) {
    if (!m) return;
    var total = Number(m.shownCents) || 0, spent = Math.min(total, Number(m.spentCents) || 0);
    var left = Math.max(0, total - spent), pct = total ? Math.round(left / total * 100) : 0;
    var usd = function (c) { return '$' + (c / 100).toFixed(c % 100 ? 2 : 0); };
    if (els.total) els.total.textContent = usd(total);
    if (els.left) els.left.textContent = usd(left);
    if (els.pct) els.pct.textContent = pct + '%';
    if (els.bar) { els.bar.style.width = pct + '%'; els.bar.setAttribute('aria-valuenow', String(pct)); }
    if (els.calls) els.calls.textContent = (Number(m.calls) || 0).toLocaleString('ko-KR');
    if (els.month) { var n = monthName(m.month); els.month.textContent = n ? '(' + n + ')' : ''; }
    if (els.state) {
      els.state.textContent = !m.enabled ? '지금은 잠시 닫아 두었습니다.' : m.stopped ? '이번 달 크레딧이 다 되어 쉽니다. 다음 달 1일에 다시 열립니다.' : '';
      els.state.hidden = !els.state.textContent;
    }
  }
  window.WorkroomApi = { post: post, meter: meter, paintMeter: paintMeter, fileToBase64: fileToBase64, uid: uid, ready: function () { return Promise.resolve(true); } };
})();
