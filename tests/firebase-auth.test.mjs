import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, createSign } from 'node:crypto';
import { verifyFirebaseToken, authenticateRequest, AuthError } from '../netlify/lib/auth.mjs';
import { newSession, saveSession } from '../netlify/lib/store.mjs';
import chat from '../netlify/functions/chat/index.mjs';
import session from '../netlify/functions/session/index.mjs';

const project = 'example-project-123';
const keys = generateKeyPairSync('rsa', { modulusLength: 2048 });
const certs = { testkid: keys.publicKey.export({ type: 'spki', format: 'pem' }) };
const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
function makeToken(uid, changes = {}, header = {}) {
  const now = Math.floor(Date.now() / 1000);
  const h = b64({ alg: 'RS256', kid: 'testkid', ...header });
  const p = b64({ iss: `https://securetoken.google.com/${project}`, aud: project, sub: uid, iat: now - 2, auth_time: now - 2, exp: now + 3600, ...changes });
  const sign = createSign('RSA-SHA256'); sign.update(`${h}.${p}`); sign.end();
  return `${h}.${p}.${sign.sign(keys.privateKey).toString('base64url')}`;
}
const verify = (token) => verifyFirebaseToken(token, project, { getCertificates: async () => certs });

test('Firebase verifier accepts only valid signed tokens for the configured project', async () => {
  const token = makeToken('alice');
  assert.equal(await verify(token), 'alice');
  for (const invalid of [makeToken('alice', { aud: 'other-project' }), makeToken('alice', { iss: 'https://example.com' }), makeToken('alice', { sub: '' }), makeToken('alice', { exp: 1 }), makeToken('alice', { iat: Math.floor(Date.now()/1000) + 60 }), makeToken('alice', { auth_time: Math.floor(Date.now()/1000) + 60 }), makeToken('alice', {}, { alg: 'none' }), makeToken('alice', {}, { kid: 'unknown' }), token.slice(0, -4) + 'AAAA']) {
    await assert.rejects(() => verify(invalid), AuthError);
  }
});

test('invalid auth configuration fails closed and missing token is rejected', async () => {
  const oldProvider = process.env.AUTH_PROVIDER, oldProject = process.env.FIREBASE_PROJECT_ID;
  try {
    delete process.env.AUTH_PROVIDER;
    await assert.rejects(() => authenticateRequest(new Request('https://example.test/')), (e) => e.status === 503);
    process.env.AUTH_PROVIDER = 'off';
    assert.equal((await authenticateRequest(new Request('https://example.test/'))).enabled, false);
    process.env.AUTH_PROVIDER = 'wrong';
    await assert.rejects(() => authenticateRequest(new Request('https://example.test/')), (e) => e.status === 503);
    process.env.AUTH_PROVIDER = 'firebase'; process.env.FIREBASE_PROJECT_ID = '';
    await assert.rejects(() => authenticateRequest(new Request('https://example.test/')), (e) => e.status === 503);
    process.env.FIREBASE_PROJECT_ID = project;
    await assert.rejects(() => authenticateRequest(new Request('https://example.test/')), (e) => e.status === 401);
  } finally {
    if (oldProvider === undefined) delete process.env.AUTH_PROVIDER; else process.env.AUTH_PROVIDER = oldProvider;
    if (oldProject === undefined) delete process.env.FIREBASE_PROJECT_ID; else process.env.FIREBASE_PROJECT_ID = oldProject;
  }
});

test('authenticated conversations are isolated, including crisis and legacy session lookups', async () => {
  const saved = { provider: process.env.AUTH_PROVIDER, project: process.env.FIREBASE_PROJECT_ID, logs: process.env.QUIET_LOGS, limit: process.env.RATE_LIMIT_PER_MIN, fetch: globalThis.fetch };
  process.env.AUTH_PROVIDER = 'firebase'; process.env.FIREBASE_PROJECT_ID = project; process.env.QUIET_LOGS = '1';
  globalThis.fetch = async (url) => {
    assert.match(String(url), /^https:\/\/www\.googleapis\.com\/robot\/v1\/metadata\/x509\//);
    return new Response(JSON.stringify(certs), { headers: { 'content-type': 'application/json', 'cache-control': 'max-age=3600' } });
  };
  const request = (uid, message, id = null) => new Request('https://example.test/api/chat', { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${makeToken(uid)}` }, body: JSON.stringify({ message, session_id: id }) });
  const get = (uid, id) => new Request(`https://example.test/api/session?id=${id}`, { headers: { authorization: `Bearer ${makeToken(uid)}` } });
  try {
    const legacy = newSession(crypto.randomUUID()); await saveSession(legacy);
    assert.equal((await session(get('alice', legacy.id))).status, 404);
    assert.equal((await chat(request('alice', 'Hello', legacy.id), { ip: crypto.randomUUID() })).status, 404);
    const staleId = crypto.randomUUID();
    const staleCrisis = await chat(request('alice', 'I want to end my life.', staleId), { ip: crypto.randomUUID() });
    const staleBody = await staleCrisis.json();
    assert.equal(staleCrisis.status, 200); assert.equal(staleBody.behavior, 'CARE');
    assert.notEqual(staleBody.session_id, staleId);
    const first = await chat(request('alice', 'I want to end my life.'), { ip: crypto.randomUUID() });
    assert.equal(first.status, 200); const body = await first.json(); assert.equal(body.behavior, 'CARE');
    assert.equal((await session(get('alice', body.session_id))).status, 200);
    assert.equal((await session(get('bob', body.session_id))).status, 404);
    const otherCrisis = await chat(request('bob', 'I want to end my life.', body.session_id), { ip: crypto.randomUUID() });
    const otherCrisisBody = await otherCrisis.json();
    assert.equal(otherCrisis.status, 200); assert.equal(otherCrisisBody.behavior, 'CARE');
    assert.notEqual(otherCrisisBody.session_id, body.session_id);
    const crisisFollowup = await chat(request('bob', 'I am alone.', otherCrisisBody.session_id), { ip: crypto.randomUUID() });
    assert.equal(crisisFollowup.status, 200); assert.equal((await crisisFollowup.json()).behavior, 'CARE');
    assert.equal((await chat(request('bob', 'I am alone.', body.session_id), { ip: crypto.randomUUID() })).status, 404);
    process.env.RATE_LIMIT_PER_MIN = '1'; const ip = crypto.randomUUID();
    await chat(request('bob', 'hello'), { ip });
    // Once throttled, requests must be rejected before the normal ownership
    // precheck (which otherwise returns 404 and performs an unbounded read).
    for (let i = 0; i < 8; i++) {
      assert.equal((await chat(request('bob', 'hello', crypto.randomUUID()), { ip })).status, 429);
    }
    assert.equal((await chat(request('bob', 'I am alone.', body.session_id), { ip })).status, 429);
    const limitedCrisis = await chat(request('bob', 'I want to end my life.', body.session_id), { ip });
    const limitedCrisisBody = await limitedCrisis.json();
    assert.equal(limitedCrisis.status, 200); assert.equal(limitedCrisisBody.behavior, 'CARE');
    assert.notEqual(limitedCrisisBody.session_id, body.session_id);
    const limitedFollowup = await chat(request('bob', 'I am alone.', limitedCrisisBody.session_id), { ip });
    assert.equal(limitedFollowup.status, 200); assert.equal((await limitedFollowup.json()).behavior, 'CARE');
    const ownIp = crypto.randomUUID();
    await chat(request('alice', 'hello'), { ip: ownIp });
    const ownFollowup = await chat(request('alice', 'I am alone.', body.session_id), { ip: ownIp });
    const ownFollowupBody = await ownFollowup.json();
    assert.equal(ownFollowup.status, 200); assert.equal(ownFollowupBody.behavior, 'CARE');
    assert.equal(ownFollowupBody.session_id, body.session_id);
    assert.equal((await chat(new Request('https://example.test/api/chat', { method: 'POST', body: '{}' }), { ip: crypto.randomUUID() })).status, 401);
  } finally {
    globalThis.fetch = saved.fetch;
    for (const [key, val] of [['AUTH_PROVIDER', saved.provider], ['FIREBASE_PROJECT_ID', saved.project], ['QUIET_LOGS', saved.logs], ['RATE_LIMIT_PER_MIN', saved.limit]]) {
      if (val === undefined) delete process.env[key]; else process.env[key] = val;
    }
  }
});
