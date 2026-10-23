import { readFile, realpath } from 'node:fs/promises';
import { resolve, sep, extname } from 'node:path';
import { SECURITY_HEADERS } from './api.mjs';
export const STATIC_ROOTS = ['index.html','404.html','tools','privacy','styles','js'];
const MIME = { '.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.ico':'image/x-icon','.woff2':'font/woff2' };
export function publicPath(raw) {
  let p; try { p = decodeURIComponent(raw.split('?')[0]); } catch { return null; }
  if (!p.startsWith('/') || p.includes('\\') || p.includes('\0') || p.split('/').some(s => s.startsWith('.') || s === '..')) return null;
  if (p === '/') p = '/index.html';
  if (p.endsWith('/')) p += 'index.html';
  if (!STATIC_ROOTS.includes(p.split('/')[1]) || !MIME[extname(p).toLowerCase()]) return null;
  return p.slice(1);
}
export async function serveStatic(req,res,root) {
  if (!['GET','HEAD'].includes(req.method)) { res.writeHead(405,SECURITY_HEADERS); res.end(); return; }
  const p = publicPath(req.url);
  try {
    if (!p) throw 0;
    const realRoot = await realpath(root), file = await realpath(resolve(root,p));
    if (!file.startsWith(realRoot+sep)) throw 0;
    const data = await readFile(file);
    res.writeHead(200,{...SECURITY_HEADERS,'Content-Type':MIME[extname(file).toLowerCase()],'Cache-Control':'no-cache'});
    res.end(req.method === 'HEAD' ? undefined : data);
  } catch { res.writeHead(404,{...SECURITY_HEADERS,'Content-Type':'text/plain; charset=utf-8'}); res.end('Not found'); }
}
