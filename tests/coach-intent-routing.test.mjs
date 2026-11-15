import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../netlify/functions/chat/index.mjs';
import { parseConversationPlan } from '../netlify/lib/conversation.mjs';
import { medicalReferral } from '../netlify/lib/medical.mjs';
import { retrieve } from '../netlify/lib/rag.mjs';
import { isPersonalConcern } from '../netlify/lib/clarify.mjs';

process.env.QUIET_LOGS = '1';
process.env.AUTH_PROVIDER = 'off';
process.env.LLM_PROVIDER = 'openai';
process.env.OPENAI_API_KEY = 'test-only';

const searchPlan = (overrides = {}) => ({
  intent: 'new_topic', query: 'flermish qzvextralorn', reply: '', reuse_previous: false,
  subject: 'wellbeing', ...overrides,
});

async function send(message, session_id) {
  const response = await handler(new Request('http://localhost/api/chat', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ message, ...(session_id && { session_id }) }),
  }), { ip: crypto.randomUUID() });
  assert.equal(response.status, 200);
  return response.json();
}

// Fixtures isolate server routing. They are not a claim that a real model
// interprets intent correctly; evaluate-coach-intents.mjs checks that separately.
function providerFixture(plan) {
  const calls = { planner: 0, answer: 0, support: 0 };
  globalThis.fetch = async (_url, options) => {
    const messages = JSON.parse(options.body).messages;
    let value;
    if (messages[0].content.startsWith('CONVERSATION_PLANNER')) {
      calls.planner++;
      value = plan;
    } else if (messages[0].content.startsWith('SUPPORT_CONVERSATION')) {
      calls.support++;
      value = { behavior: 'ANSWER', reply: 'You can make space for how you feel without judging yourself.', source_ids: [] };
    } else {
      calls.answer++;
      const ids = [...messages.at(-1).content.matchAll(/\[(P\d+-\d+)\]/g)].map(match => match[1]);
      assert.ok(ids.length, 'answer generation must receive actual source IDs');
      value = { behavior: 'ANSWER', reply: 'You can make space for how you feel without judging yourself.', source_ids: [ids[0]] };
    }
    return Response.json({ choices: [{ message: { content: JSON.stringify(value) } }] });
  };
  return calls;
}

test('semantic wellbeing subject keeps an unfamiliar no-source concern in scope', async () => {
  const query = 'flermish qzvextralorn';
  assert.deepEqual(retrieve(query), [], 'fixture must not accidentally retrieve evidence');
  assert.equal(isPersonalConcern(query), false, 'fixture must not pass the old keyword fallback');
  const original = globalThis.fetch;
  try {
    const calls = providerFixture(searchPlan({ query }));
    const result = await send('My sense of belonging feels threadbare.');
    assert.equal(result.behavior, 'ANSWER');
    assert.equal(result.flags.output_valid, true);
    assert.equal(result.flags.distress, false);
    assert.equal(result.flags.medical_referral, false);
    assert.equal(result.provider, 'openai');
    assert.deepEqual(result.context?.items || [], []);
    assert.deepEqual(result.context?.used_ids || [], []);
    assert.doesNotMatch(result.reply, /\b(?:sutras?|commentary|P\d+-\d+)\b/i, 'fallback must not invent a source claim');
    assert.deepEqual(calls, { planner: 1, answer: 0, support: 1 });
  } finally { globalThis.fetch = original; }
});

test('teaching subject with no evidence cannot use the wellbeing fallback', async () => {
  const original = globalThis.fetch;
  try {
    const calls = providerFixture(searchPlan({ subject: 'teaching' }));
    const result = await send('What does flermish qzvextralorn mean?');
    assert.equal(result.behavior, 'DECLINE');
    assert.equal(result.flags.output_valid, true);
    assert.deepEqual(result.context?.items || [], []);
    assert.deepEqual(calls, { planner: 1, answer: 0, support: 0 });
  } finally { globalThis.fetch = original; }
});

test('a generated retrieval paraphrase cannot establish a medication-change request', async () => {
  const message = 'I compare myself to colleagues and wish I could be kinder to myself.';
  const query = 'Should I stop taking my medication?';
  assert.equal(medicalReferral(message), null);
  assert.equal(medicalReferral(query), 'medication', 'fixture must exercise the removed paraphrase guard');
  const original = globalThis.fetch;
  try {
    const calls = providerFixture(searchPlan({ query }));
    const result = await send(message);
    assert.equal(result.behavior, 'ANSWER');
    assert.equal(result.flags.output_valid, true);
    assert.equal(result.flags.medical_referral, false);
    assert.equal(result.flags.distress, false);
    assert.notEqual(result.provider, 'safety');
    assert.equal(calls.planner, 1);
    assert.doesNotMatch(result.reply, /prescriber|pharmacist|can't advise.*medication/i);
  } finally { globalThis.fetch = original; }
});

test('an original medication-change request still routes before any model call', async () => {
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => { calls++; throw new Error('The raw medical guard must run first'); };
  try {
    const result = await send('Should I stop taking my medication?');
    assert.equal(result.behavior, 'CARE');
    assert.equal(result.flags.medical_referral, true);
    assert.equal(result.flags.distress, false);
    assert.equal(result.provider, 'safety');
    assert.equal(result.context, null);
    assert.equal(calls, 0);
  } finally { globalThis.fetch = original; }
});

test('semantic medical intent still routes when the raw heuristic has no match', async () => {
  const message = 'Would that be clinically appropriate for me?';
  assert.equal(medicalReferral(message), null);
  const original = globalThis.fetch;
  try {
    const calls = providerFixture({ intent: 'medical', query: '', reply: '', reuse_previous: false });
    const result = await send(message);
    assert.equal(result.behavior, 'CARE');
    assert.equal(result.flags.medical_referral, true);
    assert.equal(result.flags.distress, false);
    assert.equal(result.provider, 'safety');
    assert.equal(result.context, null);
    assert.deepEqual(calls, { planner: 1, answer: 0, support: 0 });
  } finally { globalThis.fetch = original; }
});

test('planner subjects are validated while omitted subjects remain backward compatible', () => {
  for (const subject of ['wellbeing', 'teaching']) {
    const parsed = parseConversationPlan(JSON.stringify(searchPlan({ subject })));
    assert.equal(parsed.valid, true);
    assert.equal(parsed.subject, subject);
  }
  for (const subject of ['', 'medical', 'general', 'Wellbeing', null, true, [], {}]) {
    const parsed = parseConversationPlan(JSON.stringify(searchPlan({ subject })));
    assert.equal(parsed.valid, false, JSON.stringify(subject));
    assert.equal(parsed.intent, 'clarify');
    assert.equal(parsed.query, '');
  }
  const { subject: _subject, ...legacy } = searchPlan();
  const compatible = parseConversationPlan(JSON.stringify(legacy));
  assert.equal(compatible.valid, true);
  assert.equal(compatible.intent, 'new_topic');
  assert.equal(Object.hasOwn(compatible, 'subject'), false);
});

test('repeating a concern does not repeat intake when the planner calls it a new topic', async () => {
  const message = 'I feel stressed.';
  const original = globalThis.fetch;
  try {
    const calls = providerFixture(searchPlan({ intent: 'new_topic', query: message }));
    const first = await send(message);
    assert.equal(first.behavior, 'ANSWER');
    assert.match(first.reply, /\?/, 'initial broad concern may ask for context');
    assert.deepEqual(calls, { planner: 0, answer: 0, support: 0 }, 'first clarification is local');

    const second = await send(message, first.session_id);
    assert.equal(second.behavior, 'ANSWER');
    assert.equal(second.flags.output_valid, true);
    assert.equal(second.flags.distress, false);
    assert.notEqual(second.reply, first.reply, 'do not trap the person in the same intake question');
    assert.doesNotMatch(second.reply, /\?/, 'offer support instead of demanding the same details');
    assert.equal(calls.planner, 1);
    if (calls.answer) {
      assert.equal(calls.answer, 1);
      assert.equal(second.provider, 'openai');
      assert.ok(second.context?.used_ids?.length, 'a generated answer must identify its evidence');
      const supplied = second.context.items.map(item => item.id);
      const relevant = retrieve(message).map(item => item.id);
      assert.ok(second.context.used_ids.every(id => supplied.includes(id) && relevant.includes(id)), 'only sources retrieved for this concern may be claimed');
    } else {
      assert.equal(second.provider, calls.support ? 'openai' : 'local');
      assert.deepEqual(second.context?.items || [], [], 'source-free support must not claim retrieved evidence');
      assert.deepEqual(second.context?.used_ids || [], []);
    }
  } finally { globalThis.fetch = original; }
});
