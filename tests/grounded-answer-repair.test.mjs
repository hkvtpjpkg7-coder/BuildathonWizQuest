import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../netlify/functions/chat/index.mjs';
import { newSession, saveSession, loadSession } from '../netlify/lib/store.mjs';

process.env.QUIET_LOGS = '1';
process.env.AUTH_PROVIDER = 'off'; // isolated tests only
process.env.LLM_PROVIDER = 'openai';
process.env.OPENAI_API_KEY = 'test-only';

const question = 'Explain the teaching on sleep and dreams.';
const idsIn = messages => [...new Set([...messages.at(-1).content.matchAll(/\[(P\d+-\d+)\]/g)].map(match => match[1]))];
const validAnswer = messages => ({ behavior: 'ANSWER', reply: 'Here is a brief explanation of the teaching on sleep and dreams.', source_ids: [idsIn(messages)[0]] });

async function ask(session_id) {
  const response = await handler(new Request('http://localhost/api/chat', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ message: question, session_id }),
  }), { ip: crypto.randomUUID() });
  assert.equal(response.status, 200);
  return response.json();
}

// These fixtures verify repair boundaries, not the model's interpretation.
function fixture(replies) {
  const calls = [];
  globalThis.fetch = async (_url, options) => {
    const messages = JSON.parse(options.body).messages;
    let value;
    if (messages[0].content.startsWith('CONVERSATION_PLANNER')) {
      value = { intent: 'new_topic', subject: 'teaching', query: question, reply: '', reuse_previous: false };
    } else {
      calls.push(messages);
      assert.ok(idsIn(messages).length, 'the fixture requires current reference evidence');
      assert.ok(replies.length, 'repair must not exceed the bounded number of calls');
      const next = replies.shift();
      value = typeof next === 'function' ? next(messages) : next;
    }
    return Response.json({ choices: [{ message: { content: typeof value === 'string' ? value : JSON.stringify(value) } }], usage: { prompt_tokens: 10, completion_tokens: 2 } });
  };
  return calls;
}

test('one stale-source repair retains original context without forwarding rejected prose', async () => {
  const original = globalThis.fetch;
  const session = newSession(crypto.randomUUID());
  session.messages = [
    { role: 'user', content: 'I compare myself with colleagues.' },
    { role: 'assistant', content: 'That earlier response used [P42-2].', behavior: 'ANSWER', context_ids: ['P42-2'], context_used_ids: ['P42-2'] },
  ];
  await saveSession(session);
  try {
    const calls = fixture([
      { behavior: 'ANSWER', reply: 'REJECTED_STALE_PROSE', source_ids: ['P42-2'] },
      validAnswer,
    ]);
    const result = await ask(session.id);
    assert.equal(calls.length, 2);
    const currentIds = idsIn(calls[0]);
    assert.ok(!currentIds.includes('P42-2'), 'the old source must be stale for this new subject');
    assert.deepEqual(calls[1].slice(1), calls[0].slice(1), 'retry uses identical dialogue and current evidence');
    assert.match(JSON.stringify(calls[1].slice(1)), /compare myself with colleagues/);
    assert.ok(calls[1][0].content.includes(JSON.stringify(currentIds)), 'repair names only currently allowed IDs');
    assert.doesNotMatch(JSON.stringify(calls[1]), /REJECTED_STALE_PROSE/);
    assert.equal(result.behavior, 'ANSWER');
    assert.equal(result.flags.output_valid, true);
    assert.deepEqual(result.context.used_ids, [currentIds[0]]);
    assert.deepEqual(result.usage, { input_tokens: 30, output_tokens: 6 });
    assert.doesNotMatch(JSON.stringify(await loadSession(session.id)), /REJECTED_STALE_PROSE/);
  } finally { globalThis.fetch = original; }
});

test('one malformed-answer repair can recover the exact contract', async () => {
  const original = globalThis.fetch;
  try {
    const calls = fixture(['malformed-private-model-output', validAnswer]);
    const result = await ask();
    assert.equal(calls.length, 2);
    assert.equal(result.behavior, 'ANSWER');
    assert.equal(result.flags.output_valid, true);
    assert.doesNotMatch(JSON.stringify(calls[1]), /malformed-private-model-output/);
  } finally { globalThis.fetch = original; }
});

test('a second invalid answer fails closed without further retries or rejected claims', async () => {
  const original = globalThis.fetch;
  try {
    const bad = { behavior: 'ANSWER', reply: 'REJECTED_UNVERIFIED_ADVICE [P9999-99]', source_ids: ['P9999-99'] };
    const calls = fixture([bad, bad]);
    const result = await ask();
    assert.equal(calls.length, 2);
    assert.equal(result.behavior, 'DECLINE');
    assert.equal(result.flags.output_valid, false);
    assert.deepEqual(result.context?.used_ids || [], []);
    assert.doesNotMatch(result.reply, /REJECTED_UNVERIFIED_ADVICE|P9999/);
  } finally { globalThis.fetch = original; }
});

test('CARE with invalid sources gets immediate fixed support and is never repaired', async () => {
  const original = globalThis.fetch;
  try {
    const calls = fixture([{ behavior: 'CARE', reply: 'REJECTED_MODEL_CRISIS_PROSE', source_ids: ['P9999-99'] }]);
    const result = await ask();
    assert.equal(calls.length, 1);
    assert.equal(result.behavior, 'CARE');
    assert.equal(result.flags.distress, true);
    assert.equal(result.context, null);
    assert.doesNotMatch(result.reply, /REJECTED_MODEL_CRISIS_PROSE/);
    assert.equal((await loadSession(result.session_id)).crisis_active, true);
  } finally { globalThis.fetch = original; }
});

test('valid DECLINE is respected without attempting to force a sourced answer', async () => {
  const original = globalThis.fetch;
  try {
    const calls = fixture([{ behavior: 'DECLINE', reply: 'The evidence is insufficient.', source_ids: [] }]);
    const result = await ask();
    assert.equal(calls.length, 1);
    assert.equal(result.behavior, 'DECLINE');
    assert.equal(result.flags.output_valid, true);
    assert.deepEqual(result.context?.used_ids || [], []);
  } finally { globalThis.fetch = original; }
});
