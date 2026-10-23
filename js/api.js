/* Browser authentication. Only refresh credentials persist; ID tokens stay in memory. */
(function () {
  'use strict';
  const KEY = 'agent-command.auth.v1';
  let config, identity = null, idToken = '', expiresAt = 0, tokenFlight = null;
  function failure(code, message, status) { return Object.assign(new Error(message), { code, status }); }
  async function jsonResponse(response) {
    let data = {}; try { data = await response.json(); } catch (_) {}
    if (!response.ok) throw failure(typeof data.error === 'string' ? data.error : 'http_' + response.status, data.message || '요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.', response.status);
    return data;
  }
  function save(data) {
    identity = { uid: data.localId || data.user_id, refreshToken: data.refreshToken || data.refresh_token };
    idToken = data.idToken || data.id_token;
    expiresAt = Date.now() + Number(data.expiresIn || data.expires_in || 3600) * 1000;
    try { localStorage.setItem(KEY, JSON.stringify(identity)); } catch (_) { /* Session still works without persistence. */ }
  }
  async function signup() {
    const response = await fetch('https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=' + encodeURIComponent(config.firebase.apiKey), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ returnSecureToken: true }) });
    save(await jsonResponse(response));
  }
  async function refreshToken() {
    const response = await fetch('https://securetoken.googleapis.com/v1/token?key=' + encodeURIComponent(config.firebase.apiKey), { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: identity.refreshToken }).toString() });
    if (!response.ok) throw failure('auth_expired', '익명 로그인 정보를 갱신하지 못했습니다. 잠시 후 페이지를 새로고침해 주세요.', response.status);
    save(await response.json());
  }
  async function token() {
    if (idToken && Date.now() < expiresAt - 60000) return idToken;
    if (!tokenFlight) tokenFlight = (identity ? refreshToken() : signup()).finally(() => { tokenFlight = null; });
    await tokenFlight; return idToken;
  }
  const ready = (async () => {
    try {
      config = await jsonResponse(await fetch('/api/config', { cache: 'no-store' }));
      if (!config.firebase || !config.firebase.apiKey || !config.firebase.projectId) throw failure('config', '서비스 연결 설정을 준비 중입니다. 잠시 후 다시 방문해 주세요.');
      try { const stored = JSON.parse(localStorage.getItem(KEY)); if (stored && typeof stored.uid === 'string' && typeof stored.refreshToken === 'string') identity = stored; } catch (_) {}
      await token(); return config;
    } catch (error) { throw error.code ? error : failure('network', '서비스에 연결하지 못했습니다. 인터넷 연결을 확인해 주세요.'); }
  })();
  ready.catch(() => {});
  async function request(url, method, body, signal) {
    try {
      await ready;
      const headers = { Authorization: 'Bearer ' + await token() };
      if (body !== undefined) headers['Content-Type'] = 'application/json';
      let response = await fetch(url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), signal, cache: 'no-store' });
      if (response.status === 401) { expiresAt = 0; headers.Authorization = 'Bearer ' + await token(); response = await fetch(url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), signal, cache: 'no-store' }); }
      return await jsonResponse(response);
    } catch (error) {
      if (error.name === 'AbortError') throw failure('cancelled', '요청을 중단했습니다. 이미 서버에 도착한 요청은 처리될 수 있습니다.');
      throw error.code ? error : failure('network', '인터넷 연결을 확인한 뒤 다시 시도해 주세요.');
    }
  }
  function paintMeter(m, els) {
    if (!m) return;
    const limit = Number(m.perUserDay) || 5, prompts = Number(m.promptUsed) || 0, helps = Number(m.helpUsed) || 0;
    if (els.total) els.total.textContent = String(limit);
    if (els.left) els.left.textContent = String(prompts);
    if (els.calls) els.calls.textContent = String(helps);
    if (els.state) { els.state.textContent = !m.enabled ? '현재 요청을 받지 않습니다.' : m.stopped ? '서비스가 일시 중지되었습니다.' : ''; els.state.hidden = !els.state.textContent; }
    if (els.pct) els.pct.textContent = prompts + ' / ' + limit;
    if (els.bar) { els.bar.style.width = Math.min(100, prompts / limit * 100) + '%'; els.bar.setAttribute('aria-valuenow', String(prompts)); els.bar.setAttribute('aria-valuemax', String(limit)); }
  }
  function fileToBase64(file) { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).replace(/^data:[^,]+,/, '')); reader.onerror = reject; reader.readAsDataURL(file); }); }
  window.WorkroomApi = { ready, post: (url, body, signal) => request(url, 'POST', body || {}, signal), get: (url) => request(url, 'GET'), remove: (url) => request(url, 'DELETE'), meter: () => request('/api/meter', 'GET'), paintMeter, fileToBase64, uid: () => identity ? identity.uid : null };
})();
