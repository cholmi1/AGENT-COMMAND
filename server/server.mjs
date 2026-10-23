/* 정적 파일 + 4개 API 를 함께 내보내는 작은 서버 (외부 패키지 없음).
 *   node server/server.mjs  →  http://localhost:8080
 * 원본 구성과 같은 경로를 씁니다: POST /api/prompt · POST /api/help · POST /api/board · GET /api/meter
 */
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generatePrompt, generateHelp } from './generate.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT || 8080);
const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8'
};

/* ── 아주 작은 상태 저장소 (프로세스 메모리) ───────────────── */
const state = {
  month: new Date().toISOString().slice(0, 7),
  shownCents: Number(process.env.MONTHLY_CREDIT_CENTS || 5000), // $50
  spentCents: 0,
  calls: 0,
  perUserDay: Number(process.env.PER_USER_DAY || 5),
  enabled: true,
  stopped: false,
  users: new Map(), // uid -> {day, prompt, help, board}
  board: [],
  nextId: 1
};
function today() { return new Date().toISOString().slice(0, 10); }
function userBucket(uid) {
  const b = state.users.get(uid);
  if (!b || b.day !== today()) {
    const fresh = { day: today(), prompt: 0, help: 0, board: 0 };
    state.users.set(uid, fresh);
    return fresh;
  }
  return b;
}
function refreshMonth() {
  const m = new Date().toISOString().slice(0, 7);
  if (m !== state.month) { state.month = m; state.spentCents = 0; state.stopped = false; }
}
function mask(text) {
  let out = String(text);
  let masked = false;
  const rules = [
    [/[0-9]{2,3}[-.]?[0-9]{3,4}[-.]?[0-9]{4}/g, '***-****-****'],
    [/[\w.+-]+@[\w-]+\.[\w.]+/g, '***@***'],
    [/\b\d{6}-?[1-4]\d{6}\b/g, '******-*******'],
    [/(https?:\/\/|www\.)\S+/g, '(링크 가림)'],
    [/\b(sk|sk-|pk_|ghp_|AIza)[A-Za-z0-9_\-]{12,}\b/g, '(열쇠 가림)']
  ];
  for (const [re, to] of rules) {
    if (re.test(out)) { masked = true; out = out.replace(re, to); }
    re.lastIndex = 0;
  }
  return { text: out, masked };
}

function json(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(body);
}
async function readBody(req) {
  const chunks = [];
  let size = 0;
  for await (const c of req) {
    size += c.length;
    if (size > 8 * 1024 * 1024) throw new Error('too_large');
    chunks.push(c);
  }
  if (!chunks.length) return {};
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { return {}; }
}
function uidOf(req) {
  const h = String(req.headers.authorization || '');
  const m = /^Bearer\s+(\S+)$/.exec(h);
  return m ? m[1].slice(0, 80) : 'anon';
}

/* ── API ───────────────────────────────────────────── */
async function api(req, res, pathname) {
  const uid = uidOf(req);
  refreshMonth();

  if (pathname === '/api/meter' && req.method === 'GET') {
    return json(res, 200, {
      month: state.month, shownCents: state.shownCents, spentCents: state.spentCents,
      calls: state.calls, perUserDay: state.perUserDay,
      enabled: state.enabled, stopped: state.stopped, closed: false
    });
  }

  if (pathname === '/api/prompt' && req.method === 'POST') {
    const b = await readBody(req);
    if (!state.enabled) return json(res, 503, { error: 'disabled', message: '지금은 잠시 닫아 두었습니다.' });
    const u = userBucket(uid);
    if (u.prompt >= state.perUserDay) return json(res, 429, { error: 'rate_limited', message: '오늘 쓸 수 있는 횟수를 다 썼습니다.' });
    u.prompt += 1;
    state.calls += 1;
    const out = await generatePrompt(b);
    state.spentCents += Math.min(120, 8 + Math.round(String(b.want || '').length / 20));
    if (state.spentCents >= state.shownCents) state.stopped = true;
    let keptId = null;
    if (b.consent) { keptId = 'P' + String(state.nextId++).padStart(5, '0'); }
    return json(res, 200, { json: out.json, keptId, mode: out.mode });
  }

  if (pathname === '/api/help' && req.method === 'POST') {
    const b = await readBody(req);
    const u = userBucket(uid);
    if (u.help >= state.perUserDay * 2) return json(res, 429, { error: 'rate_limited', message: '오늘 쓸 수 있는 횟수를 다 썼습니다.' });
    u.help += 1;
    state.calls += 1;
    const out = await generateHelp(b);
    state.spentCents += 5;
    let keptId = null;
    if (b.consent) keptId = 'H' + String(state.nextId++).padStart(5, '0');
    return json(res, 200, { text: out.text, keptId, mode: out.mode });
  }

  if (pathname === '/api/board' && req.method === 'POST') {
    const b = await readBody(req);
    const text = String(b.text || '').trim();
    if (text.length < 2) return json(res, 400, { error: 'empty', message: '한마디를 고르거나 적어 주세요.' });
    if (text.length > 200) return json(res, 400, { error: 'too_long', message: '200자 안으로 적어 주세요.' });
    const u = userBucket(uid);
    if (u.board >= 3) return json(res, 429, { error: 'rate_limited', message: '하루 3개까지 올릴 수 있습니다.' });
    u.board += 1;
    const m = mask(text);
    const item = { id: String(state.nextId++).padStart(5, '0'), tab: b.tab === 'ask' ? 'ask' : 'cheer', text: m.text, at: new Date().toISOString() };
    state.board.unshift(item);
    return json(res, 200, { ok: true, id: item.id, masked: m.masked });
  }

  if (pathname === '/api/board' && req.method === 'GET') {
    return json(res, 200, { items: state.board.slice(0, 50) });
  }

  return json(res, 404, { error: 'not_found' });
}

/* ── 정적 파일 ─────────────────────────────────────── */
async function serveStatic(req, res, pathname) {
  let p = pathname;
  if (p === '/' || p === '') p = '/index.html';
  if (p.endsWith('/')) p += 'index.html';
  const file = join(ROOT, normalize(p).replace(/^([/\\])+/, ''));
  if (!file.startsWith(ROOT)) { res.writeHead(403).end('forbidden'); return; }
  try {
    const data = await readFile(file);
    res.writeHead(200, { 'Content-Type': MIME[extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(data);
  } catch {
    try {
      const nf = await readFile(join(ROOT, '404.html'));
      res.writeHead(404, { 'Content-Type': MIME['.html'] });
      res.end(nf);
    } catch { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('404'); }
  }
}

const server = http.createServer(async (req, res) => {
  try {
    const { pathname } = new URL(req.url, 'http://localhost');
    if (pathname.startsWith('/api/')) return await api(req, res, pathname);
    return await serveStatic(req, res, pathname);
  } catch (e) {
    json(res, 500, { error: 'server_error', message: '잠시 뒤에 다시 시도해 주세요.' });
  }
});
server.listen(PORT, process.env.HOST || '127.0.0.1', () => {
  console.log('workroom clone: http://localhost:' + PORT);
  console.log('AI 모드: ' + (process.env.OPENAI_API_KEY ? 'openai' : process.env.ANTHROPIC_API_KEY ? 'anthropic' : 'local(규칙 기반)'));
});
