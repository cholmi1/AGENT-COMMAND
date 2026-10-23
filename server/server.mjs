import http from 'node:http';
import { fileURLToPath } from 'node:url';
import api, { sendJson } from './api.mjs';
import { serveStatic } from './static.mjs';
const root = fileURLToPath(new URL('../public/',import.meta.url));
const port = Number(process.env.PORT || 8080);
const server = http.createServer(async(req,res) => {
  try {
    if ((req.url || '').split('?')[0].startsWith('/api/')) return await api(req,res);
    return await serveStatic(req,res,root);
  } catch { sendJson(res,503,{error:'service_unavailable'}); }
});
server.requestTimeout=30000;
server.headersTimeout=10000;
server.listen(port,process.env.HOST || '127.0.0.1',() => console.log('AGENT-COMMAND: http://localhost:'+port));
