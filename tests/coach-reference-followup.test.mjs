import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../netlify/functions/chat/index.mjs';
import { loadSession } from '../netlify/lib/store.mjs';

process.env.QUIET_LOGS = '1';
process.env.AUTH_PROVIDER = 'off'; // isolated test process
process.env.LLM_PROVIDER = 'openai';
process.env.OPENAI_API_KEY = 'test-only';

async function send(message, session_id) {
  const response = await handler(new Request('http://localhost/api/chat', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ message, session_id }),
  }), { ip: crypto.randomUUID() });
  assert.equal(response.status, 200);
  return response.json();
}

const concern = 'I compare myself to my colleagues and feel I am not doing enough. How can I grow without being so hard on myself?';

function groundedProvider(histories) {
  return async (_url, options) => {
    const history = JSON.parse(options.body).messages;
    histories.push(history);
    const ids = [...history.at(-1).content.matchAll(/\[(P\d+-\d+)\]/g)].map((match) => match[1]);
    assert.ok(ids.length, 'provider receives reference material');
    // Choose a source other than the first retrieval candidate when possible.
    return Response.json({ choices: [{ message: { content: JSON.stringify({
      behavior: 'ANSWER', reply: 'I can contribute one thoughtful idea without needing to prove myself.', source_ids: [ids.at(-1)],
    }) } }] });
  };
}

test('shortening and pronoun follow-ups reuse only the last answer’s verified evidence', async () => {
  const original = globalThis.fetch, histories = [];
  globalThis.fetch = groundedProvider(histories);
  try {
    let previous = await send(concern);
    const used = previous.context.used_ids;
    assert.equal(used.length, 1);
    assert.ok(previous.context.items.length > used.length);
    for (const prompt of [
      'Can you shorten that to one sentence I can use in the meeting?',
      'Could you make it simpler?',
      'How could I use it before my next meeting?',
      'Please explain that in simpler words.',
      'Please say that in one sentence.',
      'Give me just one small action.',
      'How do I practise that in the actual conversation?',
    ]) {
      const next = await send(prompt, previous.session_id);
      assert.equal(next.behavior, 'ANSWER', prompt);
      assert.equal(next.provider, 'openai', prompt);
      assert.deepEqual(next.context.items.map((item) => item.id), used, prompt);
      assert.deepEqual(next.context.used_ids, used, prompt);
      assert.ok(histories.at(-1).some((turn) => turn.role === 'assistant' && turn.content.includes(previous.reply)), 'previous response reaches the model');
      assert.ok(histories.at(-1).at(-1).content.endsWith(prompt));
      assert.doesNotMatch(next.reply, /\[P\d+-\d+\]/);
      previous = next;
    }
    const source = await send('What is the source?', previous.session_id);
    assert.deepEqual(source.context.used_ids, used);
    assert.equal(histories.length, 8, 'explicit source lookup remains local');
  } finally { globalThis.fetch = original; }
});

test('new topics and appended unrelated requests do not borrow previous answer evidence', async () => {
  const original = globalThis.fetch, histories = [];
  globalThis.fetch = groundedProvider(histories);
  try {
    for (const prompt of [
      'What is the capital of France?',
      'Can you shorten that to one sentence about the capital of France?',
      'Can you shorten that and write JavaScript code?',
    ]) {
      const first = await send(concern);
      const calls = histories.length;
      const next = await send(prompt, first.session_id);
      assert.equal(next.behavior, 'DECLINE', prompt);
      assert.deepEqual(next.context.items, [], prompt);
      assert.equal(histories.length, calls, 'no model call without relevant evidence');
    }
  } finally { globalThis.fetch = original; }
});

test('an action request naming a new subject uses its own retrieval and can still decline', async () => {
  const original = globalThis.fetch, histories = [];
  globalThis.fetch = groundedProvider(histories);
  try {
    const first = await send(concern);
    // "small action" has lexical matches in the commentary, even without a
    // preceding conversation. Those matches are not evidence of scope: the
    // model must still be able to decline the unrelated programming request.
    globalThis.fetch = async () => Response.json({ choices: [{ message: { content: JSON.stringify({
      behavior: 'DECLINE', reply: 'I cannot help with programming.', source_ids: [],
    }) } }] });
    const prompt = 'Give me just one small action to write JavaScript code.';
    const standalone = await send(prompt);
    const continued = await send(prompt, first.session_id);
    assert.equal(continued.behavior, 'DECLINE');
    assert.deepEqual(continued.context.items.map((item) => item.id), standalone.context.items.map((item) => item.id));
    assert.notDeepEqual(continued.context.items.map((item) => item.id), first.context.used_ids);
    assert.equal(continued.context.used_ids, undefined);
  } finally { globalThis.fetch = original; }
});

// Before the readiness fix this exact two-turn live sequence returned DECLINE
// on the second turn, before a model call, because retrieval lost the concern.
test('a concrete pre-meeting continuation keeps the preceding concern grounded', async () => {
  const original = globalThis.fetch, histories = [];
  globalThis.fetch = groundedProvider(histories);
  try {
    const first = await send('I feel tense before a difficult meeting and keep rehearsing what could go wrong. What is one small thing I can try?');
    assert.equal(first.behavior, 'ANSWER');
    const next = await send('What could I do just before I enter the meeting?', first.session_id);
    assert.equal(next.behavior, 'ANSWER');
    assert.equal(next.provider, 'openai');
    assert.deepEqual(next.context.items.map((item) => item.id), first.context.used_ids);
    assert.equal(histories.length, 2);
    assert.ok(histories.at(-1).some((turn) => turn.content.includes('keep rehearsing what could go wrong')));
  } finally { globalThis.fetch = original; }
});

test('a rewrite request needs an immediately preceding grounded answer', async () => {
  const original = globalThis.fetch, histories = [];
  globalThis.fetch = groundedProvider(histories);
  try {
    assert.equal((await send('Can you shorten that?')).behavior, 'DECLINE');
    assert.equal(histories.length, 0);
    const first = await send(concern);
    const declined = await send('What is the capital of France?', first.session_id);
    const next = await send('Can you shorten that?', declined.session_id);
    assert.equal(next.behavior, 'DECLINE');
    assert.deepEqual(next.context.items, []);
    assert.equal(histories.length, 1, 'does not skip a declined turn to resurrect older sources');
  } finally { globalThis.fetch = original; }
});

test('follow-up answers still reject invented citations and preserve crisis priority', async () => {
  const original = globalThis.fetch, histories = [];
  globalThis.fetch = groundedProvider(histories);
  try {
    const first = await send(concern);
    globalThis.fetch = async () => Response.json({ choices: [{ message: { content: JSON.stringify({
      behavior: 'ANSWER', reply: 'Unsupported claim.', source_ids: ['P9999-99'],
    }) } }] });
    const invalid = await send('Can you shorten that?', first.session_id);
    assert.equal(invalid.behavior, 'DECLINE');
    assert.equal(invalid.flags.output_valid, false);
    assert.doesNotMatch(invalid.reply, /Unsupported/);
    globalThis.fetch = async () => { throw new Error('Crisis support must not call a model'); };
    const crisis = await send('Can you shorten that? I want to die.', first.session_id);
    assert.equal(crisis.behavior, 'CARE');
    assert.equal(crisis.flags.distress, true);
    assert.equal(crisis.context, null);
    const saved = await loadSession(first.session_id);
    assert.equal(saved.crisis_active, true);
  } finally { globalThis.fetch = original; }
});
