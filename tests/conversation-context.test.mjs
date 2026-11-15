import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../netlify/functions/chat/index.mjs';
import { loadSession } from '../netlify/lib/store.mjs';
import { HISTORY_TURNS_SENT } from '../netlify/lib/checks.mjs';

process.env.QUIET_LOGS = '1';
process.env.AUTH_PROVIDER = 'off';
process.env.LLM_PROVIDER = 'openai';
process.env.OPENAI_API_KEY = 'test-only';

const concern = 'I compare myself to my colleagues and feel I am not doing enough. How can I grow without being so hard on myself?';
const plan = (intent, { query = '', reply = '', reuse_previous = false } = {}) => ({ intent, query, reply, reuse_previous });
const jsonResponse = value => Response.json({ choices: [{ message: { content: typeof value === 'string' ? value : JSON.stringify(value) } }] });

async function send(message, session_id) {
  const response = await handler(new Request('http://localhost/api/chat', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ message, session_id }),
  }), { ip: crypto.randomUUID() });
  assert.equal(response.status, 200);
  return response.json();
}

// The planner and answer model have distinct contracts. These fixtures test
// server routing and evidence boundaries; live model tests assess semantics.
function provider(plans, { answer = 'You can contribute one thoughtful idea without having to prove yourself.', planFirstTurn = false } = {}) {
  const planning = [], initialPlanning = [], answering = [];
  globalThis.fetch = async (_url, options) => {
    const messages = JSON.parse(options.body).messages;
    if (messages[0].content.startsWith('CONVERSATION_PLANNER')) {
      if (!planFirstTurn && !messages.some(turn => turn.role === 'assistant')) {
        initialPlanning.push(messages);
        return jsonResponse(plan('new_topic', { query: messages.at(-1).content }));
      }
      planning.push(messages);
      assert.ok(plans.length, 'unexpected planner request');
      return jsonResponse(plans.shift());
    }
    answering.push(messages);
    const ids = [...messages.at(-1).content.matchAll(/\[(P\d+-\d+)\]/g)].map(match => match[1]);
    assert.ok(ids.length, 'a teaching response must have supplied evidence');
    return jsonResponse({ behavior: 'ANSWER', reply: answer, source_ids: [ids.at(-1)] });
  };
  return { planning, initialPlanning, answering };
}

test('first-turn acknowledgments are source-free even without any previous history', async () => {
  const original = globalThis.fetch;
  try {
    for (const message of ['I see', 'okay', 'got it']) {
      const calls = provider([plan('acknowledge', { reply: 'I’m here when you’re ready.' })], { planFirstTurn: true });
      const result = await send(message);
      assert.equal(result.behavior, 'ANSWER');
      assert.equal(result.context, null);
      assert.equal(calls.planning.length, 1);
      assert.equal(calls.answering.length, 0);
      assert.equal(calls.planning[0].filter(turn => turn.role !== 'system').length, 1);
    }
  } finally { globalThis.fetch = original; }
});

test('I see, okay, got it, and varied acknowledgments bypass retrieval and preserve conversation history', async () => {
  const original = globalThis.fetch;
  try {
    for (const message of ['I see', 'okay', 'got it', 'That makes sense now.', 'Thanks, that clicked for me.', 'Ah, understood!']) {
      const calls = provider([plan('acknowledge', { reply: 'Take your time with it.' })]);
      const first = await send(concern);
      const next = await send(message, first.session_id);
      assert.equal(next.behavior, 'ANSWER', message);
      assert.equal(next.context, null, message);
      assert.equal(next.reply, 'Take your time with it.', message);
      assert.equal(calls.answering.length, 1, 'acknowledgment does not call the teaching model');
      assert.equal(calls.planning.length, 1);
      assert.ok(calls.planning[0].some(turn => turn.content.includes(concern)), 'planner sees the actual concern');
      assert.ok(calls.planning[0].some(turn => turn.content.includes(first.reply)), 'planner sees the previous answer');
      assert.doesNotMatch(calls.planning[0].at(-1).content, /REFERENCE PASSAGES|PDF page/);
      const saved = await loadSession(first.session_id);
      assert.equal(saved.messages.at(-1).content, next.reply);
      assert.equal(saved.messages.at(-2).content, message);
      assert.equal(saved.messages.length, 4);
      assert.ok(!saved.messages.at(-1).context_used_ids?.length, 'acknowledgment claims no supporting references');
    }
  } finally { globalThis.fetch = original; }
});

test('several acknowledgments do not erase the substantive concern or verified sources', async () => {
  const original = globalThis.fetch;
  try {
    const calls = provider([
      ...['I see', 'okay', 'got it'].map(() => plan('acknowledge', { reply: 'Take your time.' })),
      plan('continue', { query: 'Apply the earlier advice about comparing myself to colleagues before a team meeting.', reuse_previous: true }),
    ]);
    const first = await send(concern);
    for (const message of ['I see', 'okay', 'got it']) await send(message, first.session_id);
    const next = await send('How could I apply that before my meeting?', first.session_id);
    assert.equal(next.behavior, 'ANSWER');
    assert.deepEqual(next.context.items.map(item => item.id), first.context.used_ids);
    assert.equal(calls.answering.length, 2);
    assert.ok(calls.answering.at(-1).some(turn => turn.content.includes(concern)));
    assert.equal((await loadSession(first.session_id)).messages.length, 10);
  } finally { globalThis.fetch = original; }
});

test('active context survives more acknowledgments than the recent-history window', async () => {
  const original = globalThis.fetch;
  try {
    const acknowledgments = Array.from({ length: HISTORY_TURNS_SENT + 2 }, () => 'That makes sense.');
    const calls = provider([
      ...acknowledgments.map(() => plan('acknowledge', { reply: 'Take your time.' })),
      plan('continue', { query: 'Apply the earlier advice about comparing myself to colleagues before a team meeting.', reuse_previous: true }),
    ]);
    const first = await send(concern);
    for (const message of acknowledgments) await send(message, first.session_id);
    const next = await send('How could I apply that?', first.session_id);
    assert.equal(next.behavior, 'ANSWER');
    assert.deepEqual(next.context.items.map(item => item.id), first.context.used_ids);
    const finalHistory = calls.answering.at(-1).filter(turn => turn.role !== 'system');
    assert.ok(finalHistory.length <= HISTORY_TURNS_SENT * 2 + 1);
    assert.ok(finalHistory.some(turn => turn.role === 'user' && turn.content === concern));
    assert.ok(finalHistory.some(turn => turn.role === 'assistant' && turn.content.includes(first.reply)));
  } finally { globalThis.fetch = original; }
});

test('mixed acknowledgments and yes accepting an offer continue the discussion', async () => {
  const original = globalThis.fetch;
  try {
    for (const message of ['I see, but how could I put that into practice?', 'okay, can you make that shorter?', 'yes, please']) {
      const calls = provider([plan('continue', { query: 'Offer one simple way to handle comparison with colleagues in a team meeting.', reuse_previous: true })], {
        answer: 'You can contribute without proving yourself. Would you like a shorter way to phrase that?',
      });
      const first = await send(concern);
      const next = await send(message, first.session_id);
      assert.equal(next.behavior, 'ANSWER');
      assert.equal(calls.answering.length, 2, message);
      assert.deepEqual(next.context.items.map(item => item.id), first.context.used_ids);
    }
  } finally { globalThis.fetch = original; }
});

test('corrections and new topics use their resolved query rather than unrelated earlier evidence', async () => {
  const original = globalThis.fetch;
  try {
    const query = 'What do the Yoga Sutras say about sleep and dreams?';
    const calls = provider([plan('new_topic', { query })]);
    const first = await send(concern);
    const standalone = await send(query);
    const next = await send('Actually, I meant the teaching on sleep and dreams, not my work situation.', first.session_id);
    assert.equal(next.behavior, 'ANSWER');
    assert.deepEqual(next.context.items.map(item => item.id), standalone.context.items.map(item => item.id));
    assert.notDeepEqual(next.context.items.map(item => item.id), first.context.used_ids);
    assert.equal(calls.answering.length, 3);
  } finally { globalThis.fetch = original; }
});

test('an explicit topic change cannot borrow old evidence even if the planner requests it', async () => {
  const original = globalThis.fetch;
  try {
    const calls = provider([plan('continue', { query: 'Apply the previous comparison advice.', reuse_previous: true })]);
    const first = await send(concern);
    const message = 'New topic: what do the Yoga Sutras say about sleep and dreams?';
    const standalone = await send(message);
    const changed = await send(message, first.session_id);
    assert.deepEqual(changed.context.items.map(item => item.id), standalone.context.items.map(item => item.id));
    assert.notDeepEqual(changed.context.items.map(item => item.id), first.context.used_ids);
    assert.equal(calls.answering.length, 3);
  } finally { globalThis.fetch = original; }
});

test('a source request after an acknowledgment does not falsely cite it', async () => {
  const original = globalThis.fetch;
  try {
    const calls = provider([plan('acknowledge', { reply: 'Take your time.' })]);
    const first = await send(concern);
    await send('got it', first.session_id);
    const source = await send('What is the source of your last reply?', first.session_id);
    assert.deepEqual(source.context.used_ids, []);
    assert.match(source.reply, /didn.t use a specific source/i);
    assert.equal(calls.planning.length, 1, 'explicit source lookup remains local');
    assert.equal(calls.answering.length, 1);
  } finally { globalThis.fetch = original; }
});

test('closure stays brief and does not pressure the user to keep talking', async () => {
  const original = globalThis.fetch;
  try {
    const calls = provider([plan('close', { reply: 'Of course. Take care.' })]);
    const first = await send(concern);
    const next = await send('Thanks, that is enough for now.', first.session_id);
    assert.equal(next.context, null);
    assert.equal(next.behavior, 'ANSWER');
    assert.doesNotMatch(next.reply, /\?/);
    assert.equal(calls.answering.length, 1);
  } finally { globalThis.fetch = original; }
});

test('invalid planner output produces safe clarification without literal-word retrieval', async () => {
  const original = globalThis.fetch;
  try {
    for (const invalid of ['not JSON', { intent: 'acknowledge', query: '', reply: 'Unsupported claim [P9999-99].', reuse_previous: false }]) {
      const calls = provider([invalid]);
      const first = await send(concern);
      const next = await send('I see', first.session_id);
      assert.equal(next.context, null);
      assert.doesNotMatch(next.reply, /not JSON|Unsupported|P9999|seeing|eyes/);
      assert.equal(calls.answering.length, 1);
    }
  } finally { globalThis.fetch = original; }
});

test('planner outages do not leak provider details or fall back to literal retrieval', async () => {
  const original = globalThis.fetch;
  try {
    provider([]);
    const first = await send(concern);
    globalThis.fetch = async () => { throw new Error('private-provider-diagnostic'); };
    const next = await send('I see', first.session_id);
    assert.equal(next.context, null);
    assert.doesNotMatch(next.reply, /private-provider-diagnostic|seeing|eyes/);
  } finally { globalThis.fetch = original; }
});

test('crisis and clinical context retain priority over conversational planning', async () => {
  const original = globalThis.fetch;
  try {
    const calls = provider([plan('acknowledge', { reply: 'Understood.' })]);
    const first = await send('I take prescribed medication and want to understand meditation.');
    await send('okay', first.session_id);
    const clinical = await send('Okay, but should I stop taking it?', first.session_id);
    assert.equal(clinical.behavior, 'CARE');
    assert.equal(clinical.flags.medical_referral, true);
    assert.equal(clinical.context, null);
    assert.equal(calls.planning.length, 1, 'medication antecedent survives an acknowledgment');

    globalThis.fetch = async () => { throw new Error('Crisis and its follow-ups must not call a model'); };
    const crisis = await send('I want to die and cannot keep myself safe.');
    for (const message of ['I see', 'okay', 'got it']) {
      const next = await send(message, crisis.session_id);
      assert.equal(next.behavior, 'CARE');
      assert.equal(next.flags.distress, true);
      assert.equal(next.context, null);
    }
  } finally { globalThis.fetch = original; }
});
