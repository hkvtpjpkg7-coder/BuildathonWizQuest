import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../netlify/functions/chat/index.mjs';
import { loadSession } from '../netlify/lib/store.mjs';
import { retrieve } from '../netlify/lib/rag.mjs';
import { showsDistress } from '../netlify/lib/checks.mjs';

process.env.QUIET_LOGS = '1';
process.env.AUTH_PROVIDER = 'off';
process.env.LLM_PROVIDER = 'openai';
process.env.OPENAI_API_KEY = 'test-only';

const unknownQuery = 'flermish qzvextralorn';
const ordinaryPlan = { intent: 'new_topic', subject: 'wellbeing', query: unknownQuery, reply: '', reuse_previous: false };
const json = value => Response.json({ choices: [{ message: { content: typeof value === 'string' ? value : JSON.stringify(value) } }] });

async function send(message, session_id) {
  const response = await handler(new Request('http://localhost/api/chat', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ message, ...(session_id && { session_id }) }),
  }), { ip: crypto.randomUUID() });
  assert.equal(response.status, 200);
  return response.json();
}

function fixture({ replies = [], plan = ordinaryPlan, failSupport = false } = {}) {
  const calls = [];
  globalThis.fetch = async (_url, options) => {
    const messages = JSON.parse(options.body).messages;
    if (messages[0].content.startsWith('CONVERSATION_PLANNER')) {
      calls.push({ kind: 'planner', messages });
      return json(plan);
    }
    assert.match(messages[0].content, /^SUPPORT_CONVERSATION/, 'no-source support has its own contract');
    calls.push({ kind: 'support', messages });
    if (failSupport) throw new Error('synthetic-provider-private-error-body');
    assert.ok(replies.length, 'unexpected support request');
    return json(replies.shift());
  };
  return calls;
}

test('source-free support retains the original concern and earlier reply across a shortening request', async () => {
  assert.deepEqual(retrieve(unknownQuery), []);
  const original = globalThis.fetch;
  const concern = 'I get tense when plans change unexpectedly. My contact is synthetic@example.com.';
  const firstReply = 'When plans change, you could pause and choose one manageable next step.';
  const shortReply = 'Pause, then choose one next step.';
  try {
    const calls = fixture({ replies: [
      { behavior: 'ANSWER', reply: firstReply, source_ids: [] },
      { behavior: 'ANSWER', reply: shortReply, source_ids: [] },
    ] });
    const first = await send(concern);
    const second = await send('Can we make that simpler?', first.session_id);
    assert.equal(first.reply, firstReply);
    assert.equal(second.reply, shortReply);
    for (const response of [first, second]) {
      assert.equal(response.behavior, 'ANSWER');
      assert.equal(response.context, null);
      assert.equal(response.flags.distress, false);
      assert.equal(response.flags.output_valid, true);
      assert.equal(response.provider, 'openai');
    }
    const support = calls.filter(call => call.kind === 'support');
    assert.equal(support.length, 2);
    assert.match(JSON.stringify(support[1].messages), /plans change unexpectedly/);
    assert.match(JSON.stringify(support[1].messages), /manageable next step/);
    assert.match(JSON.stringify(support[1].messages), /\[EMAIL\]/);
    assert.doesNotMatch(JSON.stringify(support), /synthetic@example\.com|flermish|qzvextralorn|REFERENCE PASSAGES|SOURCE PASSAGES/, 'only original dialogue is forwarded, not generated retrieval wording');
    assert.equal(support[1].messages.at(-1).content, 'Can we make that simpler?');
    const stored = await loadSession(first.session_id);
    assert.equal(stored.messages.at(-1).content, shortReply);
    assert.deepEqual(stored.messages.at(-1).context_used_ids || [], []);
  } finally { globalThis.fetch = original; }
});

test('unverified citations and source attributions fall back without exposing the rejected answer', async () => {
  const original = globalThis.fetch;
  try {
    for (const answer of [
      { behavior: 'ANSWER', reply: 'A gentle pause may help.', source_ids: ['P9999-99'] },
      { behavior: 'ANSWER', reply: 'According to the Yoga Sutras, the secret phrase is flermish.', source_ids: [] },
      { behavior: 'ANSWER', reply: 'The commentary teaches this exact method [P9999-99].', source_ids: [] },
    ]) {
      const calls = fixture({ replies: [answer] });
      const response = await send('My sense of belonging feels threadbare.');
      assert.equal(response.behavior, 'ANSWER');
      assert.equal(response.provider, 'local');
      assert.equal(response.flags.output_valid, false);
      assert.notEqual(response.reply, answer.reply);
      assert.doesNotMatch(response.reply, /P9999|secret phrase|exact method|sutras?|commentary/i);
      assert.deepEqual(response.context?.used_ids || [], []);
      assert.deepEqual(calls.map(call => call.kind), ['planner', 'support']);
    }
  } finally { globalThis.fetch = original; }
});

test('source-free support rejects clinical instructions and malformed output', async () => {
  const original = globalThis.fetch;
  try {
    for (const answer of [
      { behavior: 'ANSWER', reply: 'Stop taking your medication.', source_ids: [] },
      { behavior: 'ANSWER', reply: 'You have depression and this will cure it.', source_ids: [] },
      { behavior: 'ANSWER', reply: 'Too long '.repeat(200), source_ids: [] },
      'unparseable-private-model-output',
    ]) {
      fixture({ replies: [answer] });
      const response = await send('My sense of belonging feels threadbare.');
      assert.equal(response.behavior, 'ANSWER');
      assert.equal(response.provider, 'local');
      assert.equal(response.flags.output_valid, false);
      assert.equal(response.flags.distress, false);
      assert.doesNotMatch(response.reply, /stop taking|you have depression|cure|Too long|private-model-output/i);
      assert.deepEqual(response.context?.used_ids || [], []);
    }
  } finally { globalThis.fetch = original; }
});

test('a support-provider failure yields ordinary fallback without leaking the error', async () => {
  const original = globalThis.fetch;
  try {
    fixture({ failSupport: true });
    const response = await send('My sense of belonging feels threadbare.');
    assert.equal(response.behavior, 'ANSWER');
    assert.equal(response.provider, 'local');
    assert.equal(response.flags.output_valid, false);
    assert.doesNotMatch(JSON.stringify(response), /synthetic-provider-private-error-body/);
  } finally { globalThis.fetch = original; }
});

test('CARE from source-free support becomes fixed crisis support and persists across acknowledgments', async () => {
  const original = globalThis.fetch;
  try {
    const calls = fixture({ replies: [{ behavior: 'CARE', reply: 'Model crisis prose must not be shown.', source_ids: [] }] });
    const first = await send('My sense of belonging feels threadbare.');
    assert.equal(first.behavior, 'CARE');
    assert.equal(first.flags.distress, true);
    assert.equal(first.context, null);
    assert.doesNotMatch(first.reply, /Model crisis prose/);
    assert.match(first.reply, /emergency|immediate danger/i);
    assert.equal((await loadSession(first.session_id)).crisis_active, true);
    const followup = await send('okay', first.session_id);
    assert.equal(followup.behavior, 'CARE');
    assert.equal(followup.flags.distress, true);
    assert.deepEqual(calls.map(call => call.kind), ['planner', 'support'], 'active crisis follow-up bypasses both models');
  } finally { globalThis.fetch = original; }
});

test('semantic danger assessment precedes source-free support for a denial with risky context', async () => {
  const original = globalThis.fetch;
  const message = 'I am overwhelmed and afraid of what I might do. I do not want to hurt myself.';
  assert.equal(showsDistress(message), false, 'fixture requires semantic safety interpretation');
  try {
    const calls = fixture({ plan: { intent: 'care', query: '', reply: '', reuse_previous: false } });
    const response = await send(message);
    assert.equal(response.behavior, 'CARE');
    assert.equal(response.flags.distress, true);
    assert.equal(response.context, null);
    assert.deepEqual(calls.map(call => call.kind), ['planner']);
    assert.equal(calls[0].messages.at(-1).content, message);
  } finally { globalThis.fetch = original; }
});
