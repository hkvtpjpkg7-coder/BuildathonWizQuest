import test from 'node:test';
import assert from 'node:assert/strict';
import { createSign, generateKeyPairSync } from 'node:crypto';
import chat from '../netlify/functions/chat/index.mjs';
import session from '../netlify/functions/session/index.mjs';
import { newSession, saveSession, loadSession, EVALUATION_OWNER } from '../netlify/lib/store.mjs';
import { createEvaluationLimiter, evaluationSettings } from '../netlify/lib/evaluation.mjs';

test('evaluation limiter enforces independent global and per-IP bounds', () => {
  const admit = createEvaluationLimiter();
  const config = { maxRequests: 3, perIpPerMinute: 2 };
  assert.equal(admit('a', config, 1000), true);
  assert.equal(admit('a', config, 1001), true);
  assert.equal(admit('a', config, 1002), false);
  assert.equal(admit('b', config, 1003), true);
  assert.equal(admit('b', config, 61004), false); // global cap remains after window
});

test('anonymous organizer chat is time-limited, isolated and compatible', async () => {
  const keys = ['AUTH_PROVIDER', 'FIREBASE_PROJECT_ID', 'ORGANIZER_EVAL_ENABLED',
    'ORGANIZER_EVAL_EXPIRES_AT', 'ORGANIZER_EVAL_MAX_REQUESTS', 'ORGANIZER_EVAL_PER_IP_PER_MIN',
    'LLM_PROVIDER', 'QUIET_LOGS'];
  const saved = new Map(keys.map((key) => [key, process.env[key]]));
  const savedFetch = globalThis.fetch;
  const project = 'example-project-123';
  const rsa = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const certs = { testkid: rsa.publicKey.export({ type: 'spki', format: 'pem' }) };
  const b64 = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const token = (uid) => {
    const now = Math.floor(Date.now() / 1000);
    const header = b64({ alg: 'RS256', kid: 'testkid' });
    const payload = b64({ iss: `https://securetoken.google.com/${project}`, aud: project, sub: uid,
      iat: now - 2, auth_time: now - 2, exp: now + 3600 });
    const sign = createSign('RSA-SHA256'); sign.update(`${header}.${payload}`); sign.end();
    return `${header}.${payload}.${sign.sign(rsa.privateKey).toString('base64url')}`;
  };
  const request = (message, id, authorization) => new Request('https://example.test/api/chat', {
    method: 'POST', headers: { 'content-type': 'application/json', ...(authorization !== undefined ? { authorization } : {}) },
    body: JSON.stringify({ message, session_id: id ?? null }),
  });
  const get = (id, authorization) => new Request(`https://example.test/api/session?id=${id}`, {
    headers: authorization !== undefined ? { authorization } : {},
  });
  const ip = () => ({ ip: crypto.randomUUID() });
  try {
    process.env.AUTH_PROVIDER = 'firebase'; process.env.FIREBASE_PROJECT_ID = project;
    process.env.LLM_PROVIDER = 'mock'; process.env.QUIET_LOGS = '1';
    delete process.env.ORGANIZER_EVAL_ENABLED;
    assert.equal((await chat(request('hello'), ip())).status, 401);
    process.env.ORGANIZER_EVAL_ENABLED = 'true';
    delete process.env.ORGANIZER_EVAL_EXPIRES_AT;
    assert.equal((await chat(request('hello'), ip())).status, 503);
    process.env.ORGANIZER_EVAL_EXPIRES_AT = '2020-01-01T00:00:00Z';
    assert.equal((await chat(request('hello'), ip())).status, 401);
    process.env.ORGANIZER_EVAL_EXPIRES_AT = new Date(Date.now() + 3600000).toISOString();
    process.env.ORGANIZER_EVAL_MAX_REQUESTS = '100'; process.env.ORGANIZER_EVAL_PER_IP_PER_MIN = '10';
    assert.equal(evaluationSettings().enabled, true);
    process.env.FIREBASE_PROJECT_ID = '';
    assert.equal((await chat(request('hello'), ip())).status, 503);
    process.env.FIREBASE_PROJECT_ID = project;
    assert.equal((await chat(request('hello', null, ''), ip())).status, 401);
    assert.equal((await chat(request('hello', null, 'Bearer malformed'), ip())).status, 401);

    globalThis.fetch = async (url) => {
      assert.match(String(url), /^https:\/\/www\.googleapis\.com\/robot\/v1\/metadata\/x509\//);
      return new Response(JSON.stringify(certs), { headers: { 'content-type': 'application/json', 'cache-control': 'max-age=3600' } });
    };
    const userId = crypto.randomUUID(), legacyId = crypto.randomUUID();
    const user = newSession(userId, 'alice'); user.messages.push({ role: 'user', content: 'private account text' });
    const legacy = newSession(legacyId); legacy.messages.push({ role: 'user', content: 'legacy private text' });
    await saveSession(user); await saveSession(legacy);
    assert.equal((await chat(request('hello', userId), ip())).status, 404);
    assert.equal((await chat(request('hello', legacyId), ip())).status, 404);
    assert.equal((await session(get(userId))).status, 401);

    const first = await chat(request('How can I calm my mind?'), ip());
    assert.equal(first.status, 200);
    const firstData = await first.json();
    assert.ok(['ANSWER', 'DECLINE', 'CARE'].includes(firstData.behavior));
    assert.equal(typeof firstData.reply, 'string');
    assert.ok(firstData.session_id);
    const stored = await loadSession(firstData.session_id, EVALUATION_OWNER);
    assert.equal(stored.messages.length, 2);
    assert.equal((await chat(request('Can you explain this?', firstData.session_id), ip())).status, 200);
    assert.equal((await loadSession(firstData.session_id, EVALUATION_OWNER)).messages.length, 4);
    assert.equal((await chat(request('hello', firstData.session_id, `Bearer ${token('alice')}`), ip())).status, 404);
    assert.equal((await session(get(firstData.session_id, `Bearer ${token('alice')}`))).status, 404);
    assert.equal((await session(get(userId, `Bearer ${token('alice')}`))).status, 200);
    assert.equal((await loadSession(userId, 'alice')).messages[0].content, 'private account text');
    assert.equal((await loadSession(legacyId)).messages[0].content, 'legacy private text');

    // Exhaust the evaluator budget, but immediate crisis responses and
    // follow-ups still avoid storage/model calls. User rate limits are separate.
    process.env.ORGANIZER_EVAL_MAX_REQUESTS = '1';
    assert.equal((await chat(request('hello'), ip())).status, 429);
    const crisis = await (await chat(request('I want to end my life'), ip())).json();
    assert.equal(crisis.behavior, 'CARE');
    assert.equal((await (await chat(request('I am alone', crisis.session_id), ip())).json()).behavior, 'CARE');
    assert.notEqual((await chat(request('hello', null, `Bearer ${token('alice')}`), ip())).status, 429);
  } finally {
    globalThis.fetch = savedFetch;
    for (const key of keys) {
      const value = saved.get(key);
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});
