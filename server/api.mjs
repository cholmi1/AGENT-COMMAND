import { getFirebase, createStore } from './firebase.mjs';
import { generatePrompt, generateHelp, generationMode } from './generate.mjs';
import { readBody, validateInput } from './validation.mjs';
import { HttpError } from './errors.mjs';
import { redactCredential } from './ai.mjs';
export const SECURITY_HEADERS = {
  'X-Content-Type-Options':'nosniff', 'X-Frame-Options':'DENY',
  'Referrer-Policy':'no-referrer', 'Permissions-Policy':'camera=(), microphone=(), geolocation=()',
  'Cross-Origin-Resource-Policy':'same-origin',
  'Strict-Transport-Security':'max-age=31536000; includeSubDomains',
  'Content-Security-Policy':"default-src 'self'; script-src 'self' https://www.gstatic.com; style-src 'self' 'unsafe-inline'; connect-src 'self' https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://*.googleapis.com; img-src 'self' data: blob:; font-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
};
export function sendJson(res, status, value) {
  res.writeHead(status, { ...SECURITY_HEADERS, 'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'no-store' });
  res.end(JSON.stringify(value));
}
export function sameOrigin(req) {
  if (req.headers['sec-fetch-site'] === 'cross-site') throw new HttpError(403,'cross_origin');
  const origin = req.headers.origin;
  if (!origin) return;
  // Vercel terminates TLS at its proxy. Do not trust arbitrary forwarded-host.
  const proto = process.env.VERCEL ? 'https' : req.socket?.encrypted ? 'https' : 'http';
  try { if (new URL(origin).origin !== proto + '://' + req.headers.host) throw 0; }
  catch { throw new HttpError(403,'cross_origin'); }
}
export async function authenticate(req, auth) {
  const match = /^Bearer ([^\s]+)$/i.exec(req.headers.authorization || '');
  if (!match || match[1].length > 8192) throw new HttpError(401,'unauthorized');
  try {
    const decoded = await auth.verifyIdToken(match[1], true);
    if (typeof decoded.uid !== 'string' || !decoded.uid || decoded.uid.length > 128) throw 0;
    return decoded.uid;
  } catch { throw new HttpError(401,'unauthorized'); }
}
const methods = { '/api/config':['GET'], '/api/meter':['GET'], '/api/prompt':['POST'], '/api/help':['POST'], '/api/history':['GET','DELETE'], '/api/board':['GET','POST'] };
export function createApi(deps = {}) {
  return async function api(req, res) {
    try {
      sameOrigin(req);
      const url = new URL(req.url, 'http://localhost');
      const allowed = methods[url.pathname];
      if (!allowed) throw new HttpError(404,'not_found');
      if (!allowed.includes(req.method)) { res.setHeader('Allow',allowed.join(', ')); throw new HttpError(405,'method_not_allowed'); }
      if (url.pathname === '/api/board') throw new HttpError(410,'board_disabled');
      const firebase = (deps.getFirebase || getFirebase)();
      const mode = (deps.mode || generationMode)();
      if (url.pathname === '/api/config') return sendJson(res,200,{firebase:firebase.web,mode});
      const uid = await authenticate(req, firebase.auth);
      const store = deps.store || createStore(firebase.db);
      if (url.pathname === '/api/meter') return sendJson(res,200,{perUserDay:5,...await store.meter(uid),mode,enabled:true,stopped:false});
      if (url.pathname === '/api/history') {
        if (req.method === 'GET') return sendJson(res,200,{items:await store.history(uid)});
        const id = url.searchParams.get('id');
        if (!id || !/^[A-Za-z0-9_-]{1,128}$/.test(id)) throw new HttpError(400,'invalid_id');
        await store.remove(uid,id);
        return sendJson(res,200,{ok:true});
      }
      const type = url.pathname === '/api/prompt' ? 'prompt' : 'help';
      const validated = validateInput(type, await readBody(req));
      // Credentials are request-local, never part of the generation prompt or saved input.
      const {ai,...plainBody} = validated;
      const body = redactCredential(plainBody,ai?.apiKey);
      // Reserve BEFORE any provider call, never refund on provider failure.
      await store.reserve(uid,type);
      const rawOut = await (type === 'prompt' ? (deps.generatePrompt || generatePrompt) : (deps.generateHelp || generateHelp))(body,ai);
      const out = redactCredential(rawOut,ai?.apiKey);
      let keptId = null;
      if (body.consent) {
        const {consent,...plainInput} = body;
        const input = redactCredential(plainInput,ai?.apiKey);
        const output = type === 'prompt' ? JSON.stringify(out.json) : out.text;
        keptId = await store.save(uid,{type,input,output,title:(type === 'prompt' ? out.json.title || '지시서' : body.making || '막힌 곳 도움말').slice(0,100)});
      }
      return sendJson(res,200,redactCredential(type === 'prompt' ? {json:out.json,keptId,mode:out.mode,provider:out.provider||'local',model:out.model||null} : {text:out.text,keptId,mode:out.mode,provider:out.provider||'local',model:out.model||null},ai?.apiKey));
    } catch (error) {
      // Never log or return provider payloads, user text, tokens, keys, or SDK messages.
      const safe = error instanceof HttpError;
      return sendJson(res,safe ? error.status : 503,{error:safe ? error.code : 'service_unavailable'});
    }
  };
}
export default createApi();
