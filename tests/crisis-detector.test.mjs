import test from 'node:test';
import assert from 'node:assert/strict';
import { showsDistress, MAX_TURNS_PER_SESSION } from '../netlify/lib/checks.mjs';
import { newSession, saveSession, loadSession } from '../netlify/lib/store.mjs';
import handler from '../netlify/functions/chat/index.mjs';

process.env.QUIET_LOGS = '1';

async function ask(message, { session_id = null, ip = crypto.randomUUID() } = {}) {
  const req = new Request('http://localhost/api/chat', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ message, session_id }),
  });
  const response = await handler(req, { ip });
  return { status: response.status, body: await response.json() };
}

const phrases = [
  'i want to end it, no more patience to deal with this',
  'I’ve been thinking about ending it all.',
  'I have been thinking about ending it.',
  'I think everyone would be better off without me.',
  'What is the point of going on?',
  'I have no reason to keep living.',
  'I wish I could just disappear forever.',
  'I want to end it with my partner by my side tonight.',
  'I want to end my life.',
  'I am going to kill myself.',
  'I am thinking of suicide.',
  'I wish I were dead.',
  "I don't want to live anymore.",
  "I don't wanna live.",
  'I cannot stay alive.',
  "I can't do this anymore.",
  "I don't see the point in going on.",
  'I cannot keep myself safe.',
  "I don't want to wake up.",
];

test('detects explicit and indirect crisis language without flagging routine uses', () => {
  for (const phrase of phrases) assert.equal(showsDistress(phrase), true, phrase);
  for (const phrase of ['How can I end my workday calmly?', 'I want to end it with my boyfriend.', 'I want to end it with my phone company.', 'I want to end it with my gym membership.', 'I want to end it with my noisy gym membership.', 'I want to die my hair blue.', 'I need help finding patience in my relationship.']) {
    assert.equal(showsDistress(phrase), false, phrase);
  }
});

test('crisis response bypasses unavailable model and does not include teaching excerpts', async () => {
  const oldProvider = process.env.LLM_PROVIDER;
  process.env.LLM_PROVIDER = 'ollama';
  const oldFetch = globalThis.fetch;
  let called = false;
  globalThis.fetch = async () => { called = true; throw new Error('model offline'); };
  try {
    for (const phrase of phrases) {
      const { status, body } = await ask(phrase);
      assert.equal(status, 200, phrase);
      assert.equal(body.behavior, 'CARE', phrase);
      assert.equal(body.flags.distress, true, phrase);
      assert.equal(body.provider, 'safety');
      assert.equal(body.model, 'none');
      assert.equal(body.context, null, phrase);
      assert.match(body.reply, /988/);
      assert.match(body.reply, /emergency|trusted|someone you trust/i);
      assert.doesNotMatch(body.reply, /\[P\d+-\d+\]|sutra|yoga|philosoph/i);
    }
    assert.equal(called, false);
  } finally {
    globalThis.fetch = oldFetch;
    if (oldProvider === undefined) delete process.env.LLM_PROVIDER;
    else process.env.LLM_PROVIDER = oldProvider;
  }
});

test('short reply about a plan after a crisis also receives support', async () => {
  const first = await ask('I want to end it.');
  const second = await ask('Yes, I have a plan.', { session_id: first.body.session_id });
  assert.equal(second.body.flags.distress, true);
  assert.equal(second.body.behavior, 'CARE');
  assert.equal(second.body.context, null);
  const third = await ask('I am alone now.', { session_id: first.body.session_id });
  assert.equal(third.body.flags.distress, true);
  assert.equal(third.body.behavior, 'CARE');
  const safe = await ask('I am safe now.', { session_id: first.body.session_id });
  assert.equal(safe.body.flags.distress, false);
  const unrelated = await ask('How can I calm my mind?', { session_id: first.body.session_id });
  assert.equal(unrelated.body.flags.distress, false);
});

test('all replies remain on the support path until an explicit safety statement', async () => {
  const first = await ask('I want to end it.');
  const second = await ask('No, but the pills are right beside me.', { session_id: first.body.session_id });
  assert.equal(second.body.behavior, 'CARE');
  assert.equal(second.body.flags.distress, true);
  const third = await ask('What is the capital of France?', { session_id: first.body.session_id });
  assert.equal(third.body.behavior, 'CARE');
  const caveat = await ask('I am safe now, but the pills are right beside me.', { session_id: first.body.session_id });
  assert.equal(caveat.body.behavior, 'CARE');
  for (let i = 0; i < 7; i++) {
    const response = await ask(`Another thought ${i}.`, { session_id: first.body.session_id });
    assert.equal(response.body.behavior, 'CARE');
    assert.equal(response.body.flags.distress, true);
  }
  assert.equal((await loadSession(first.body.session_id)).crisis_active, true);
  const safe = await ask('I am safe now.', { session_id: first.body.session_id });
  assert.equal(safe.body.flags.distress, false);
  assert.equal((await loadSession(first.body.session_id)).crisis_active, false);
  const unrelated = await ask('What is the capital of France?', { session_id: first.body.session_id });
  assert.equal(unrelated.body.flags.distress, false);
  assert.notEqual(unrelated.body.behavior, 'CARE');
});

test('explicit crisis still gets support for an overlong message or invalid session', async () => {
  const long = await ask('I want to end it. ' + 'x'.repeat(2100));
  assert.equal(long.status, 200);
  assert.equal(long.body.behavior, 'CARE');
  assert.equal(long.body.storage, 'not_saved');
  const invalid = await ask('I want to end it.', { session_id: 'invalid session id' });
  assert.equal(invalid.status, 200);
  assert.equal(invalid.body.behavior, 'CARE');
  assert.notEqual(invalid.body.session_id, 'invalid session id');
  assert.equal((await ask('Hello', { session_id: 'invalid session id' })).status, 400);
  assert.equal((await ask('x'.repeat(2100))).status, 400);
  assert.equal((await ask('x'.repeat(17000))).status, 413);
});

test('medical referral has deterministic safety metadata', async () => {
  const response = await ask('Should I stop taking my antidepressants?');
  assert.equal(response.body.provider, 'safety');
  assert.equal(response.body.model, 'none');
});

test('rate limits do not suppress direct crisis support or store unbounded messages', async () => {
  const old = process.env.RATE_LIMIT_PER_MIN;
  const oldProvider = process.env.LLM_PROVIDER;
  process.env.LLM_PROVIDER = 'mock';
  process.env.RATE_LIMIT_PER_MIN = '1';
  const ip = crypto.randomUUID();
  try {
    assert.equal((await ask('How do I find calm?', { ip })).status, 200);
    assert.equal((await ask('How do I find calm?', { ip })).status, 429);
    const response = await ask('I want to end it.', { ip });
    assert.equal(response.status, 200);
    assert.equal(response.body.behavior, 'CARE');
    assert.equal(response.body.storage, 'not_saved');
    assert.match(response.body.reply, /988/);
    assert.equal(await loadSession(response.body.session_id), null);
  } finally {
    if (old === undefined) delete process.env.RATE_LIMIT_PER_MIN;
    else process.env.RATE_LIMIT_PER_MIN = old;
    if (oldProvider === undefined) delete process.env.LLM_PROVIDER;
    else process.env.LLM_PROVIDER = oldProvider;
  }
});

test('a new unsaved crisis keeps a temporary session marker across follow-ups', async () => {
  const oldLimit = process.env.RATE_LIMIT_PER_MIN;
  const oldProvider = process.env.LLM_PROVIDER;
  process.env.RATE_LIMIT_PER_MIN = '1';
  process.env.LLM_PROVIDER = 'mock';
  const ip = crypto.randomUUID();
  try {
    await ask('How can I calm my mind?', { ip });
    const crisis = await ask('I want to end it.', { ip });
    assert.equal(crisis.body.storage, 'not_saved');
    assert.equal(await loadSession(crisis.body.session_id), null);
    const followup = await ask('No, pills are beside me.', { ip, session_id: crisis.body.session_id });
    assert.equal(followup.body.behavior, 'CARE');
    assert.equal(followup.body.storage, 'not_saved');
    assert.equal(await loadSession(crisis.body.session_id), null);
    // A request after the rate limit clears can recover the marker and save
    // the continuing crisis state even if no previous session was stored.
    const afterLimit = await ask('I am alone.', { session_id: crisis.body.session_id });
    assert.equal(afterLimit.body.behavior, 'CARE');
    assert.equal((await loadSession(crisis.body.session_id)).crisis_active, true);
  } finally {
    if (oldLimit === undefined) delete process.env.RATE_LIMIT_PER_MIN;
    else process.env.RATE_LIMIT_PER_MIN = oldLimit;
    if (oldProvider === undefined) delete process.env.LLM_PROVIDER;
    else process.env.LLM_PROVIDER = oldProvider;
  }
});

test('rate-limited short follow-up to a recent crisis receives unsaved support', async () => {
  const old = process.env.RATE_LIMIT_PER_MIN;
  process.env.RATE_LIMIT_PER_MIN = '1';
  const ip = crypto.randomUUID();
  try {
    const first = await ask('I want to end it.', { ip });
    const followup = await ask('No, but the pills are right beside me.', { ip, session_id: first.body.session_id });
    assert.equal(followup.status, 200);
    assert.equal(followup.body.behavior, 'CARE');
    assert.equal(followup.body.storage, 'not_saved');
  } finally {
    if (old === undefined) delete process.env.RATE_LIMIT_PER_MIN;
    else process.env.RATE_LIMIT_PER_MIN = old;
  }
});

test('unsaved rate-limited crisis retains a bounded in-process signal for an existing session', async () => {
  const oldLimit = process.env.RATE_LIMIT_PER_MIN;
  const oldProvider = process.env.LLM_PROVIDER;
  process.env.RATE_LIMIT_PER_MIN = '1';
  process.env.LLM_PROVIDER = 'mock';
  const ip = crypto.randomUUID();
  try {
    const first = await ask('How can I calm my mind?', { ip });
    const sessionId = first.body.session_id;
    const original = await loadSession(sessionId);
    const crisis = await ask('I want to end it.', { ip, session_id: sessionId });
    assert.equal(crisis.body.behavior, 'CARE');
    assert.equal(crisis.body.storage, 'not_saved');
    const followup = await ask('No, the pills are beside me.', { ip, session_id: sessionId });
    assert.equal(followup.body.behavior, 'CARE');
    assert.equal(followup.body.storage, 'not_saved');
    const saved = await loadSession(sessionId);
    assert.equal(saved.messages.length, original.messages.length);
    assert.equal(saved.crisis_active, false);
    assert.equal((await ask('I am safe now.', { ip, session_id: sessionId })).status, 429);
    assert.equal((await ask('No, the pills are beside me.', { ip, session_id: sessionId })).status, 429);
  } finally {
    if (oldLimit === undefined) delete process.env.RATE_LIMIT_PER_MIN;
    else process.env.RATE_LIMIT_PER_MIN = oldLimit;
    if (oldProvider === undefined) delete process.env.LLM_PROVIDER;
    else process.env.LLM_PROVIDER = oldProvider;
  }
});

test('rate-limited secondary session lookups are capped per caller', async () => {
  const oldLimit = process.env.RATE_LIMIT_PER_MIN;
  const oldProvider = process.env.LLM_PROVIDER;
  process.env.RATE_LIMIT_PER_MIN = '1';
  process.env.LLM_PROVIDER = 'mock';
  const ip = crypto.randomUUID();
  try {
    const active = await ask('I want to end it.');
    await ask('How can I calm my mind?', { ip });
    for (let i = 0; i < 3; i++) {
      assert.equal((await ask('An indirect reply.', { ip, session_id: crypto.randomUUID() })).status, 429);
    }
    assert.equal((await ask('The pills are beside me.', { ip, session_id: active.body.session_id })).status, 429);
    // A direct signal still gives support and establishes a marker without a read.
    assert.equal((await ask('I want to end it.', { ip, session_id: active.body.session_id })).body.behavior, 'CARE');
    assert.equal((await ask('The pills are beside me.', { ip, session_id: active.body.session_id })).body.behavior, 'CARE');
  } finally {
    if (oldLimit === undefined) delete process.env.RATE_LIMIT_PER_MIN;
    else process.env.RATE_LIMIT_PER_MIN = oldLimit;
    if (oldProvider === undefined) delete process.env.LLM_PROVIDER;
    else process.env.LLM_PROVIDER = oldProvider;
  }
});

test('the unsaved crisis marker expires instead of persisting indefinitely', async () => {
  const oldLimit = process.env.RATE_LIMIT_PER_MIN;
  const oldProvider = process.env.LLM_PROVIDER;
  const oldNow = Date.now;
  let now = oldNow();
  Date.now = () => now;
  process.env.RATE_LIMIT_PER_MIN = '1';
  process.env.LLM_PROVIDER = 'mock';
  const ip = crypto.randomUUID();
  try {
    const first = await ask('How can I calm my mind?', { ip });
    const sessionId = first.body.session_id;
    assert.equal((await ask('I want to end it.', { ip, session_id: sessionId })).body.behavior, 'CARE');
    assert.equal((await ask('The pills are beside me.', { ip, session_id: sessionId })).body.behavior, 'CARE');
    now += 10 * 60_000 + 1;
    const afterExpiry = await ask('The pills are beside me.', { ip, session_id: sessionId });
    assert.equal(afterExpiry.body.flags.distress, false);
  } finally {
    Date.now = oldNow;
    if (oldLimit === undefined) delete process.env.RATE_LIMIT_PER_MIN;
    else process.env.RATE_LIMIT_PER_MIN = oldLimit;
    if (oldProvider === undefined) delete process.env.LLM_PROVIDER;
    else process.env.LLM_PROVIDER = oldProvider;
  }
});

test('rate-limited secondary session lookups are globally bounded per instance', async () => {
  const oldLimit = process.env.RATE_LIMIT_PER_MIN;
  const oldProvider = process.env.LLM_PROVIDER;
  process.env.RATE_LIMIT_PER_MIN = '1';
  process.env.LLM_PROVIDER = 'mock';
  try {
    const active = await ask('I want to end it.');
    for (let i = 0; i < 120; i++) {
      const ip = crypto.randomUUID();
      await ask('Hello', { ip });
      assert.equal((await ask('An indirect reply.', { ip, session_id: crypto.randomUUID() })).status, 429);
    }
    const ip = crypto.randomUUID();
    await ask('Hello', { ip });
    assert.equal((await ask('The pills are beside me.', { ip, session_id: active.body.session_id })).status, 429);
    assert.equal((await ask('I want to end it.', { ip, session_id: active.body.session_id })).body.behavior, 'CARE');
    assert.equal((await ask('The pills are beside me.', { ip, session_id: active.body.session_id })).body.behavior, 'CARE');
  } finally {
    if (oldLimit === undefined) delete process.env.RATE_LIMIT_PER_MIN;
    else process.env.RATE_LIMIT_PER_MIN = oldLimit;
    if (oldProvider === undefined) delete process.env.LLM_PROVIDER;
    else process.env.LLM_PROVIDER = oldProvider;
  }
});

test('session length cap does not suppress crisis support or add stored turns', async () => {
  const session = newSession(crypto.randomUUID());
  session.messages = Array.from({ length: MAX_TURNS_PER_SESSION }, () => ({ role: 'user', content: 'previous question' }));
  await saveSession(session);
  assert.equal((await ask('How do I find calm?', { session_id: session.id })).status, 400);
  const response = await ask('I want to end it.', { session_id: session.id });
  assert.equal(response.status, 200);
  assert.equal(response.body.behavior, 'CARE');
  assert.equal(response.body.storage, 'not_saved');
  assert.match(response.body.reply, /988/);
  const saved = await loadSession(session.id);
  assert.equal(saved.messages.length, MAX_TURNS_PER_SESSION);
  assert.equal(saved.crisis_active, true);
  const followup = await ask('They are right beside me.', { session_id: session.id });
  assert.equal(followup.body.behavior, 'CARE');
  assert.equal(followup.body.storage, 'not_saved');
  const safe = await ask('I am safe now.', { session_id: session.id });
  assert.equal(safe.body.behavior, 'CARE');
  assert.equal((await loadSession(session.id)).crisis_active, false);
  assert.equal((await ask('What is the capital of France?', { session_id: session.id })).status, 400);
});

test('sessions without a crisis_active flag recover recent crisis context', async () => {
  const session = newSession(crypto.randomUUID());
  session.messages = [
    { role: 'user', content: 'I want to end it.' },
    { role: 'assistant', content: 'I am here to help.', behavior: 'CARE' },
    { role: 'user', content: 'They are right beside me.' },
  ];
  await saveSession(session);
  const result = await ask('I am alone.', { session_id: session.id });
  assert.equal(result.body.behavior, 'CARE');
  assert.equal((await loadSession(session.id)).crisis_active, true);
});
