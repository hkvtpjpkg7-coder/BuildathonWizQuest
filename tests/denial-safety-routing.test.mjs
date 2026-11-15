import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../netlify/functions/chat/index.mjs';
import { requiresSafetyInterpretation, showsDistress } from '../netlify/lib/checks.mjs';
import { loadSession } from '../netlify/lib/store.mjs';

process.env.QUIET_LOGS = '1';
process.env.AUTH_PROVIDER = 'off'; // isolated tests only
process.env.LLM_PROVIDER = 'openai';
process.env.OPENAI_API_KEY = 'test-only';

async function ask(message, session_id) {
  const response = await handler(new Request('http://localhost/api/chat', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ message, session_id }),
  }), { ip: crypto.randomUUID() });
  assert.equal(response.status, 200);
  return response.json();
}

const json = value => Response.json({ choices: [{ message: {
  content: typeof value === 'string' ? value : JSON.stringify(value),
} }] });

function plannerFixture(plan) {
  const calls = [];
  globalThis.fetch = async (_url, options) => {
    const messages = JSON.parse(options.body).messages;
    if (messages[0].content.startsWith('CONVERSATION_PLANNER')) {
      calls.push(messages);
      return json(plan);
    }
    const ids = [...messages.at(-1).content.matchAll(/\[(P\d+-\d+)\]/g)].map(match => match[1]);
    assert.ok(ids.length, 'generated answers still need actual supplied evidence');
    return json({ behavior: 'ANSWER', reply: 'We can take this at your own pace.', source_ids: [ids[0]] });
  };
  return calls;
}

test('only the exact normalized denial exclusion requests semantic safety interpretation', () => {
  for (const text of [
    'I do not want to hurt myself.',
    'I don’t want to harm myself!',
    'I am sad about a friendship ending.\nI do not want to kill myself.',
  ]) assert.equal(requiresSafetyInterpretation(text), true, text);
  for (const text of [
    'I am sad about a friendship ending.',
    'I do not want to hurt myself, but I might anyway.',
    'I do not want to hurt myself. But the pills are beside me.',
    'I do not want to hurt myself?',
  ]) assert.equal(requiresSafetyInterpretation(text), false, text);
});

test('risky context with a denial reaches the planner intact before intake, sources, or medical routing', async () => {
  const original = globalThis.fetch;
  try {
    for (const message of [
      'I am overwhelmed and afraid of what I might do. I do not want to hurt myself.',
      'I am sad and the pills are next to me. I do not want to hurt myself.',
      'I am overwhelmed and afraid of what I might do. Show me the source. I do not want to hurt myself.',
      'I am afraid of what I might do. Should I stop taking my medication? I do not want to hurt myself.',
    ]) {
      assert.equal(showsDistress(message), false, 'fixture must need semantic interpretation');
      const calls = plannerFixture({ intent: 'care', subject: 'none', query: '', reply: '', reuse_previous: false });
      const result = await ask(message);
      assert.equal(calls.length, 1);
      assert.equal(calls[0].at(-1).content, message);
      assert.equal(result.behavior, 'CARE');
      assert.equal(result.flags.distress, true);
      assert.equal(result.context, null);
      assert.equal((await loadSession(result.session_id)).crisis_active, true);
    }
  } finally { globalThis.fetch = original; }
});

test('ordinary sadness with a denial receives semantic assessment without forced crisis', async () => {
  const original = globalThis.fetch;
  const message = 'I am sad about a friendship ending. I do not want to hurt myself.';
  try {
    const calls = plannerFixture({
      intent: 'new_topic', subject: 'wellbeing', query: 'I feel sad about a friendship ending.', reply: '', reuse_previous: false,
    });
    const result = await ask(message);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].at(-1).content, message);
    assert.equal(result.behavior, 'ANSWER');
    assert.equal(result.flags.distress, false);
    const stored = await loadSession(result.session_id);
    assert.equal(stored.messages[0].content, message);
    assert.equal(stored.crisis_active, false);
  } finally { globalThis.fetch = original; }
});

test('unavailable or invalid semantic assessment cannot quietly clear potential danger', async () => {
  const original = globalThis.fetch;
  const message = 'I am overwhelmed and afraid of what I might do. I do not want to hurt myself.';
  try {
    for (const failure of ['unavailable', 'invalid']) {
      let calls = 0;
      globalThis.fetch = async (_url, options) => {
        calls++;
        assert.equal(JSON.parse(options.body).messages.at(-1).content, message);
        if (failure === 'unavailable') throw new Error('synthetic provider outage');
        return json('invalid planner output');
      };
      const result = await ask(message);
      assert.ok(calls > 0);
      assert.equal(result.behavior, 'CARE', failure);
      assert.equal(result.flags.distress, true, failure);
      assert.equal(result.context, null);
      assert.equal((await loadSession(result.session_id)).crisis_active, true);
    }
  } finally { globalThis.fetch = original; }
});

test('a denial in an active crisis still gets immediate support without a model call', async () => {
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => { calls++; throw new Error('active crisis must bypass the model'); };
  try {
    const first = await ask('I cannot keep myself safe.');
    const followup = await ask('I do not want to hurt myself.', first.session_id);
    assert.equal(followup.behavior, 'CARE');
    assert.equal(followup.flags.distress, true);
    assert.equal(followup.context, null);
    assert.equal(calls, 0);
    assert.equal((await loadSession(first.session_id)).crisis_active, true);
  } finally { globalThis.fetch = original; }
});
