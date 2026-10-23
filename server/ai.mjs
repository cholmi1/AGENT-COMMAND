import { HttpError } from './errors.mjs';

export const AI_DEFAULTS = Object.freeze({openai:'gpt-5.6-terra',anthropic:'claude-haiku-5-5',deepseek:'deepseek-flash'});
const ENDPOINTS = Object.freeze({openai:'https://api.openai.com/v1/chat/completions',anthropic:'https://api.anthropic.com/v1/messages',deepseek:'https://api.deepseek.com/chat/completions'});
const MODEL = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,119}$/;
export function validateAI(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw) || Object.keys(raw).some(k=>!['provider','apiKey','model'].includes(k))) throw new HttpError(400,'invalid_ai');
  if (raw.provider === 'local') {
    if ('apiKey' in raw || 'model' in raw) throw new HttpError(400,'invalid_ai');
    return {provider:'local'};
  }
  if (!Object.hasOwn(AI_DEFAULTS,raw.provider)) throw new HttpError(400,'invalid_ai');
  if (typeof raw.apiKey !== 'string' || raw.apiKey.length < 10 || raw.apiKey.length > 512 || !/^[\x21-\x7e]+$/.test(raw.apiKey)) throw new HttpError(400,'invalid_ai');
  const model = raw.model === undefined ? AI_DEFAULTS[raw.provider] : raw.model;
  if (typeof model !== 'string' || !MODEL.test(model) || model.includes(raw.apiKey)) throw new HttpError(400,'invalid_ai');
  return {provider:raw.provider,apiKey:raw.apiKey,model};
}
export function resolveAI(selection, env=process.env) {
  if (selection !== undefined) return {...validateAI(selection),explicit:true};
  for (const [provider,prefix] of [['openai','OPENAI'],['anthropic','ANTHROPIC'],['deepseek','DEEPSEEK']]) {
    if (env[prefix+'_API_KEY']) {
      try { return {...validateAI({provider,apiKey:env[prefix+'_API_KEY'],model:env[prefix+'_MODEL']||AI_DEFAULTS[provider]}),explicit:false}; }
      catch { throw new HttpError(503,'invalid_server_config'); }
    }
  }
  return {provider:'local',explicit:false};
}
// Defence in depth if a provider unexpectedly returns the submitted credential.
export function redactCredential(value, secret) {
  if (!secret) return value;
  const scrub = v => typeof v === 'string' ? v.split(secret).join('[비밀 키 가림]') : Array.isArray(v) ? v.map(scrub) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k,x])=>[scrub(k),scrub(x)])) : v;
  return scrub(value);
}
function providerFailure(status) {
  if (status === 401 || status === 403) return new HttpError(400,'ai_auth_failed');
  if (status === 402) return new HttpError(402,'ai_quota');
  if (status === 429) return new HttpError(429,'ai_rate_limit');
  if (status === 400 || status === 404) return new HttpError(400,'ai_model_invalid');
  return new HttpError(502,'ai_unavailable');
}
export async function callAI(messages, json, ai) {
  if (!Object.hasOwn(ENDPOINTS,ai.provider)) throw new HttpError(400,'invalid_ai');
  let payload, headers={'Content-Type':'application/json'};
  if (ai.provider === 'anthropic') {
    headers['x-api-key']=ai.apiKey;
    headers['anthropic-version']='2023-06-01';
    payload={model:ai.model,max_tokens:2048,system:messages.find(m=>m.role==='system')?.content||'',messages:messages.filter(m=>m.role!=='system')};
    if (ai.model === 'claude-haiku-5-5') payload.thinking={type:'disabled'};
  } else {
    headers.Authorization='Bearer '+ai.apiKey;
    payload={model:ai.model,messages,...(json?{response_format:{type:'json_object'}}:{})};
    if (ai.provider === 'deepseek') { payload.max_tokens=2048;payload.thinking={type:'disabled'}; }
    else {
      payload.max_completion_tokens=2048;
      if (/^gpt-5\.[1-9]/.test(ai.model)) payload.reasoning_effort='none';
      else if (/^gpt-5(?:-(mini|nano))?(?:-\d{4}-\d{2}-\d{2})?$/.test(ai.model)) payload.reasoning_effort='minimal';
    }
  }
  try {
    // Endpoints are fixed server-side. No arbitrary user URL, redirect, tools or retry.
    const response=await fetch(ENDPOINTS[ai.provider],{method:'POST',headers,body:JSON.stringify(payload),signal:AbortSignal.timeout(35000),redirect:'error'});
    if (!response.ok) throw providerFailure(response.status);
    let data;try{data=await response.json();}catch{throw new HttpError(502,'ai_invalid_response');}
    if (ai.provider === 'anthropic' ? data.stop_reason === 'max_tokens' : data.choices?.[0]?.finish_reason === 'length') throw new HttpError(502,'ai_invalid_response');
    const text=ai.provider === 'anthropic' ? (Array.isArray(data.content)?data.content.filter(c=>c.type==='text').map(c=>c.text||'').join(''): '') : data.choices?.[0]?.message?.content;
    if (typeof text !== 'string' || !text.trim() || text.length>30000) throw new HttpError(502,'ai_invalid_response');
    return redactCredential(text,ai.apiKey).trim();
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(error?.name==='TimeoutError'||error?.name==='AbortError'?504:502,error?.name==='TimeoutError'||error?.name==='AbortError'?'ai_timeout':'ai_unavailable');
  }
}
