import { HttpError } from './errors.mjs';
import { validateAI } from './ai.mjs';
export const BODY_LIMIT = 128 * 1024;
export async function readBody(req) {
  const length = req.headers['content-length'];
  if (length && (!/^\d+$/.test(length) || Number(length) > BODY_LIMIT)) throw new HttpError(413,'body_too_large');
  const type = String(req.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
  if (type !== 'application/json') throw new HttpError(415,'json_required');
  // Vercel may supply an already parsed body; never read a consumed stream.
  if (req.body !== undefined) {
    let encoded;
    try { encoded = Buffer.isBuffer(req.body) ? req.body : Buffer.from(typeof req.body === 'string' ? req.body : JSON.stringify(req.body)); }
    catch { throw new HttpError(400,'invalid_json'); }
    if (encoded.length > BODY_LIMIT) throw new HttpError(413,'body_too_large');
    try { return JSON.parse(encoded.toString('utf8')); } catch { throw new HttpError(400,'invalid_json'); }
  }
  let size = 0; const chunks = [];
  for await (const c of req) { const chunk = Buffer.from(c); size += chunk.length; if (size > BODY_LIMIT) throw new HttpError(413,'body_too_large'); chunks.push(chunk); }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw new HttpError(400,'invalid_json'); }
}
export function validateInput(type, raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new HttpError(400,'invalid_body');
  if (Object.keys(raw).some(k => /image|screenshot|capture/i.test(k))) throw new HttpError(400,'unsupported_image');
  const fields = type === 'prompt' ? { sit:1200, want:1200, menu:200, more:600 } : { txt:3000, making:300, menu:200 };
  if (Object.keys(raw).some(k => k !== 'consent' && k !== 'ai' && !Object.hasOwn(fields,k))) throw new HttpError(400,'unknown_field');
  if ('consent' in raw && typeof raw.consent !== 'boolean') throw new HttpError(400,'invalid_consent');
  const body = {};
  for (const [key,max] of Object.entries(fields)) {
    const value = raw[key] ?? '';
    if (typeof value !== 'string' || value.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)) throw new HttpError(400,'invalid_'+key);
    body[key] = value.trim();
  }
  if (type === 'prompt' ? !body.want && !body.sit : !body.txt) throw new HttpError(400,'empty_input');
  body.consent = raw.consent === true;
  if ('ai' in raw) body.ai = validateAI(raw.ai);
  return body;
}
