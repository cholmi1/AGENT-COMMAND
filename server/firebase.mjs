import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { createHash } from 'node:crypto';
import { HttpError } from './errors.mjs';
export function parseFirebaseConfig(env = process.env) {
  try {
    const web = JSON.parse(env.FIREBASE_WEB_CONFIG_JSON || 'null');
    const account = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_JSON || 'null');
    if (!web || !account || typeof web !== 'object' || typeof account !== 'object') throw 0;
    for (const key of ['apiKey', 'authDomain', 'projectId', 'appId']) if (typeof web[key] !== 'string' || !web[key].trim()) throw 0;
    for (const key of ['project_id', 'client_email', 'private_key']) if (typeof account[key] !== 'string' || !account[key].trim()) throw 0;
    const projectId = env.FIREBASE_PROJECT_ID || account.project_id;
    if (web.projectId !== projectId || account.project_id !== projectId) throw 0;
    return { web: Object.fromEntries(['apiKey','authDomain','projectId','appId'].map(k => [k,web[k]])), account, projectId };
  } catch { throw new HttpError(503, 'firebase_unavailable'); }
}
export function getFirebase() {
  const config = parseFirebaseConfig();
  try {
    const name = 'agent-command';
    const app = getApps().find(a => a.name === name) || initializeApp({ credential: cert(config.account), projectId: config.projectId }, name);
    return { auth: getAuth(app), db: getFirestore(app), web: config.web };
  } catch { throw new HttpError(503, 'firebase_unavailable'); }
}
export function kstDay(now = new Date()) { return new Date(now.getTime() + 9 * 3600000).toISOString().slice(0,10); }
export function globalLimit(env = process.env) {
  const n = Number(env.GLOBAL_DAILY_CAP ?? 100);
  if (!Number.isSafeInteger(n) || n < 1 || n > 100000) throw new HttpError(503, 'invalid_server_config');
  return n;
}
export function userKey(uid) { return createHash('sha256').update(uid).digest('hex'); }
export function createStore(db, env = process.env) {
  const history = uid => db.collection('users').doc(userKey(uid)).collection('history');
  const usage = (uid, day) => db.collection('usageDays').doc(day).collection('users').doc(userKey(uid));
  return {
    async meter(uid, now) {
      const doc = await usage(uid, kstDay(now)).get();
      return { promptUsed: doc.data()?.prompt || 0, helpUsed: doc.data()?.help || 0 };
    },
    async reserve(uid, type, now) {
      const day = kstDay(now), userRef = usage(uid, day), globalRef = db.collection('globalDays').doc(day);
      const cap = globalLimit(env);
      await db.runTransaction(async tx => {
        const u = await tx.get(userRef), g = await tx.get(globalRef);
        const data = u.data() || {}, count = data[type] || 0, total = g.data()?.calls || 0;
        if (count >= (type === 'prompt' ? 5 : 10)) throw new HttpError(429,'daily_limit');
        if (total >= cap) throw new HttpError(429,'global_daily_limit');
        tx.set(userRef, { [type]: count + 1 }, { merge: true });
        tx.set(globalRef, { calls: total + 1 }, { merge: true });
      });
    },
    async save(uid, item) {
      const ref = history(uid).doc();
      await ref.set({ ...item, ownerUid: uid, createdAt: FieldValue.serverTimestamp() });
      return ref.id;
    },
    async history(uid) {
      const result = await history(uid).orderBy('createdAt','desc').limit(20).get();
      return result.docs.map(d => { const v=d.data(); return { id:d.id, type:v.type, createdAt:v.createdAt.toDate().toISOString(), output:v.output, title:v.title }; });
    },
    async remove(uid, id) {
      const ref = history(uid).doc(id);
      await db.runTransaction(async tx => {
        const doc = await tx.get(ref);
        if (!doc.exists || doc.data().ownerUid !== uid) throw new HttpError(404,'not_found');
        tx.delete(ref);
      });
    }
  };
}
