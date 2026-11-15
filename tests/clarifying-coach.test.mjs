import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../netlify/functions/chat/index.mjs';
import { loadSession } from '../netlify/lib/store.mjs';
import { clarificationFor, isClarificationContinuation, requestsSource } from '../netlify/lib/clarify.mjs';
import { withInitialPlan } from './fixtures/planned-fetch.mjs';

process.env.QUIET_LOGS = '1';
process.env.AUTH_PROVIDER = 'off';

async function send(message, session_id) {
  const response = await handler(new Request('http://local/api/chat', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ message, session_id }),
  }), { ip: crypto.randomUUID() });
  return { status: response.status, body: await response.json() };
}

test('greetings and brief emotional concerns get supportive clarification without invented sources', async () => {
  process.env.LLM_PROVIDER = 'openai'; process.env.OPENAI_API_KEY = 'test-only';
  const original = globalThis.fetch;
  globalThis.fetch = async (_url, options) => {
    const history = JSON.parse(options.body).messages;
    assert.match(history[0].content, /^CONVERSATION_PLANNER/, 'clarification does not call the teaching model');
    return Response.json({ choices: [{ message: { content: JSON.stringify({ intent: 'new_topic', query: history.at(-1).content, reply: '', reuse_previous: false }) } }] });
  };
  try {
    const greeting = await send('bro');
    assert.equal(greeting.body.behavior, 'ANSWER');
    assert.match(greeting.body.reply, /what.s on your mind/i);
    assert.equal(greeting.body.context, null);
    const lonely = await send('I feel lonely', greeting.body.session_id);
    assert.equal(lonely.body.behavior, 'ANSWER');
    assert.match(lonely.body.reply, /lonely/i);
    assert.match(lonely.body.reply, /\?$/);
    assert.doesNotMatch(lonely.body.reply, /pdf|passage|\[P\d+-\d+\]/i);
    assert.equal(lonely.body.context, null);
    const sleep = await send('I am not sleeping properly');
    assert.equal(sleep.body.behavior, 'ANSWER');
    assert.match(sleep.body.reply, /fall asleep|stay asleep/i);
    assert.equal(sleep.body.context, null);
  } finally { globalThis.fetch = original; }
});

test('clarification respects third parties and does not assume an unrelated topic continues', () => {
  assert.equal(clarificationFor("My child isn't sleeping properly"), null);
  assert.equal(clarificationFor('My friend is feeling lonely'), null);
  assert.equal(isClarificationContinuation('I changed my car insurance.', 'sleep'), false);
  assert.equal(isClarificationContinuation('How can I focus at work?', 'sleep'), false);
  assert.equal(isClarificationContinuation('How can I handle this?', 'sleep'), true);
  assert.equal(isClarificationContinuation('I lie awake at night.', 'sleep'), true);
  assert.equal(isClarificationContinuation('Since moving, I have no friends here.', 'loneliness'), true);
});

test('source intent distinguishes asking about causes from asking for provenance', () => {
  assert.equal(requestsSource('What is the source of my anxiety?'), false);
  assert.equal(requestsSource('What is the source of suffering?'), false);
  assert.equal(requestsSource('Where did you get that?'), true);
  assert.equal(requestsSource('What is the source of your answer?'), true);
  assert.equal(requestsSource('What is the source?'), true);
  assert.equal(requestsSource('Which sutra discusses sleep?'), false);
  assert.equal(requestsSource('Which sutra was that?'), true);
});

test('loneliness follow-up with no relevant teaching stays supportive rather than forcing a source', async () => {
  process.env.LLM_PROVIDER = 'openai'; process.env.OPENAI_API_KEY = 'test-only';
  const original = globalThis.fetch;
  globalThis.fetch = async (_url, options) => {
    assert.match(JSON.parse(options.body).messages[0].content, /^CONVERSATION_PLANNER/);
    return Response.json({ choices: [{ message: { content: JSON.stringify({ intent: 'continue', query: 'I miss my family', reply: '', reuse_previous: false }) } }] });
  };
  try {
    const first = await send('I feel lonely');
    const second = await send('I miss my family', first.body.session_id);
    assert.equal(second.body.behavior, 'ANSWER');
    assert.doesNotMatch(second.body.reply, /pdf|passage|\[P\d+-\d+\]|what feels most important/i);
    assert.equal(second.body.context, null, "ordinary support has no claimed source context");
    const repeat = await send('I feel lonely');
    const privacy = await send("I don't want to share more", repeat.body.session_id);
    assert.equal(privacy.body.behavior, 'ANSWER');
    assert.match(privacy.body.reply, /don't have to share/i);
    assert.doesNotMatch(privacy.body.reply, /\?/);
  } finally { globalThis.fetch = original; }
});

test('sleep concerns receive grounded-in-situation support without forcing irrelevant teachings', async () => {
  process.env.LLM_PROVIDER = 'openai'; process.env.OPENAI_API_KEY = 'test-only';
  const original = globalThis.fetch;
  globalThis.fetch = async (_url, options) => {
    const history = JSON.parse(options.body).messages;
    assert.match(history[0].content, /^CONVERSATION_PLANNER/, 'sleep support does not call the teaching model');
    return Response.json({ choices: [{ message: { content: JSON.stringify({ intent: 'continue', query: 'I have trouble sleeping and lie awake worrying about an upcoming meeting at work.', reply: '', reuse_previous: false }) } }] });
  };
  try {
    const first = await send('I am not sleeping properly');
    assert.equal(first.body.behavior, 'ANSWER');
    assert.match(first.body.reply, /fall asleep|stay asleep/i);
    const next = await send('I lie awake worrying about an upcoming meeting at work', first.body.session_id);
    assert.equal(next.status, 200);
    assert.equal(next.body.behavior, 'ANSWER');
    assert.equal(next.body.context, null);
    assert.equal(next.body.provider, 'local');
    assert.match(next.body.reply, /worr/i);
    assert.match(next.body.reply, /healthcare professional/i);
    assert.doesNotMatch(next.body.reply, /dream|alertness|wakefulness|P46|sutra|pdf|passage|\[P\d+-\d+\]/i);
    const source = await send('What is the source?', next.body.session_id);
    assert.match(source.body.reply, /didn't use a specific source/i);
    assert.deepEqual(source.body.context.used_ids, []);
    const direct = await send('I have trouble sleeping because my mind is racing about work');
    assert.equal(direct.body.behavior, 'ANSWER');
    assert.equal(direct.body.context, null);
    assert.doesNotMatch(direct.body.reply, /dream|wakefulness|P46|sutra/i);
    for (const question of ["I have trouble falling asleep at night", "I wake up every night at 3am", "I havent slept properly for days", "I keep waking up worrying about tomorrow"]) {
      const result = await send(question);
      assert.equal(result.body.behavior, 'ANSWER', question);
      assert.equal(result.body.context, null, question);
      assert.doesNotMatch(result.body.reply, /dream|wakefulness|P46|sutra|fasting/i, question);
    }
  } finally { globalThis.fetch = original; }
});

test('verified sources stay separate until requested', async () => {
  process.env.LLM_PROVIDER = 'openai';
  process.env.OPENAI_API_KEY = 'test-only';
  const original = globalThis.fetch;
  let seenHistory, calls = 0;
  globalThis.fetch = withInitialPlan(async (_url, options) => {
    calls++;
    seenHistory = JSON.parse(options.body).messages;
    const last = seenHistory.at(-1).content;
    const id = last.match(/\[(P\d+-\d+)\]/)?.[1];
    assert.ok(id, 'grounded request contains reference material');
    return Response.json({ choices: [{ message: { content: JSON.stringify({ behavior:'ANSWER', reply:'That sounds tiring. A gentle pause can be a starting point.', source_ids:[id] }) } }] });
  });
  try {
    const next = await send('How can I calm my restless mind during meditation?');
    assert.equal(next.status, 200);
    assert.equal(next.body.behavior, 'ANSWER');
    assert.equal(calls, 1);
    assert.match(seenHistory.at(-1).content, /USER MESSAGE:[\s\S]*restless mind/i);
    assert.doesNotMatch(next.body.reply, /\[P\d+-\d+\]|pdf|passage/i);
    assert.equal(next.body.context.used_ids.length, 1);
    const saved = await loadSession(next.body.session_id);
    assert.deepEqual(saved.messages.at(-1).context_used_ids, next.body.context.used_ids);
    const source = await send('What is the source?', next.body.session_id);
    assert.equal(calls, 1);
    assert.match(source.body.reply, new RegExp(`\\[${next.body.context.used_ids[0]}\\]`));
    assert.match(source.body.reply, /commentary/i);
    assert.equal(source.body.context.source_requested, true);
    assert.deepEqual(source.body.context.used_ids, next.body.context.used_ids);
  } finally { globalThis.fetch = original; }
});

test('an unrelated question after a clarification does not reuse earlier references', async () => {
  process.env.LLM_PROVIDER = 'openai'; process.env.OPENAI_API_KEY = 'test-only';
  const original = globalThis.fetch;
  globalThis.fetch = async (_url, options) => {
    assert.match(JSON.parse(options.body).messages[0].content, /^CONVERSATION_PLANNER/);
    return Response.json({ choices: [{ message: { content: JSON.stringify({ intent: 'new_topic', query: 'What is the capital of France?', reply: '', reuse_previous: false }) } }] });
  };
  try {
    const first = await send('I am not sleeping properly');
    const next = await send('What is the capital of France?', first.body.session_id);
    assert.equal(next.body.behavior, 'DECLINE');
    assert.equal(next.body.context.items.length, 0);
    assert.doesNotMatch(next.body.reply, /pdf|passage/i);
  } finally { globalThis.fetch = original; }
});

test('sleep concerns still prioritize crisis and medication support', async () => {
  process.env.LLM_PROVIDER = 'ollama';
  const original = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error('Safety must not call the model'); };
  try {
    const crisis = await send("I cannot sleep and I want to die");
    assert.equal(crisis.body.behavior, 'CARE');
    assert.equal(crisis.body.flags.distress, true);
    assert.match(crisis.body.reply, /988/);
    const medication = await send('I cannot sleep. Should I stop taking my antidepressants?');
    assert.equal(medication.body.behavior, 'CARE');
    assert.equal(medication.body.flags.medical_referral, true);
    assert.match(medication.body.reply, /prescriber|pharmacist/i);
  } finally { globalThis.fetch = original; }
});

test('a general educational question on sleep can still consult the source', async () => {
  process.env.LLM_PROVIDER = 'mock';
  const out = await send('What do the Yoga Sutras say about sleep and dreams?');
  assert.equal(out.status, 200);
  assert.equal(out.body.behavior, 'ANSWER');
  assert.ok(out.body.context.items.length > 0);
  assert.notEqual(out.body.provider, 'local');
  const previous = await send('I have trouble falling asleep at night');
  process.env.LLM_PROVIDER = 'openai'; process.env.OPENAI_API_KEY = 'test-only';
  const original = globalThis.fetch;
  globalThis.fetch = async (_url, options) => {
    const history = JSON.parse(options.body).messages;
    const output = history[0].content.startsWith('CONVERSATION_PLANNER')
      ? { intent: 'new_topic', query: 'Which sutra discusses sleep?', reply: '', reuse_previous: false }
      : { behavior: 'ANSWER', reply: 'The commentary discusses sleep as a state of mind.', source_ids: [history.at(-1).content.match(/\[(P\d+-\d+)\]/)[1]] };
    return Response.json({ choices: [{ message: { content: JSON.stringify(output) } }] });
  };
  try {
    const topical = await send('Which sutra discusses sleep?', previous.body.session_id);
    assert.equal(topical.body.behavior, 'ANSWER');
    assert.notEqual(topical.body.provider, 'local');
    assert.ok(topical.body.context.items.length > 0);
    assert.doesNotMatch(topical.body.reply, /didn't use a specific source/i);
  } finally { globalThis.fetch = original; }
});

test('model-declared decline cannot smuggle unsupported advice or claimed sources', async () => {
  process.env.LLM_PROVIDER = 'openai'; process.env.OPENAI_API_KEY = 'test-only';
  const original = globalThis.fetch;
  globalThis.fetch = withInitialPlan(async () => Response.json({ choices: [{ message: { content: JSON.stringify({ behavior:'DECLINE', reply:'Patanjali says to abandon all your friends.' }) } }] }));
  try {
    const out = await send('How can I calm my restless mind during meditation?');
    assert.equal(out.body.behavior, 'DECLINE');
    assert.doesNotMatch(out.body.reply, /abandon|Patanjali/i);
  } finally { globalThis.fetch = original; }
});

test('model-flagged crisis remains on the care path across follow-ups', async () => {
  process.env.LLM_PROVIDER = 'openai'; process.env.OPENAI_API_KEY = 'test-only';
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = withInitialPlan(async () => { calls++; return Response.json({ choices: [{ message: { content: JSON.stringify({ behavior:'CARE', reply:'Unsupported unsafe content' }) } }] }); });
  try {
    const first = await send('I feel restless and overwhelmed by thoughts during work every day.');
    assert.equal(first.body.behavior, 'CARE');
    assert.equal(first.body.flags.distress, true);
    assert.match(first.body.reply, /988/);
    assert.doesNotMatch(first.body.reply, /Unsupported/);
    globalThis.fetch = async () => { throw new Error('model is unavailable'); };
    const next = await send('The pills are beside me', first.body.session_id);
    assert.equal(next.body.behavior, 'CARE');
    assert.match(next.body.reply, /988/);
    assert.equal(calls, 1);
  } finally { globalThis.fetch = original; }
});

test('model-reported CARE is not downgraded by hallucinated references', async () => {
  process.env.LLM_PROVIDER = 'openai'; process.env.OPENAI_API_KEY = 'test-only';
  const original = globalThis.fetch;
  globalThis.fetch = withInitialPlan(async () => Response.json({ choices: [{ message: { content: JSON.stringify({ behavior:'CARE', reply:'Unsafe source [P9999-99]', source_ids:['P9999-99'] }) } }] }));
  try {
    const out = await send('I feel restless and overwhelmed by thoughts during work every day.');
    assert.equal(out.body.behavior, 'CARE');
    assert.equal(out.body.flags.distress, true);
    assert.match(out.body.reply, /988/);
    assert.doesNotMatch(out.body.reply, /P9999/);
    const next = await send('I am alone', out.body.session_id);
    assert.equal(next.body.behavior, 'CARE');
  } finally { globalThis.fetch = original; }
});

test('unsupported medical cure and medication instructions are blocked even with a valid source ID', async () => {
  process.env.LLM_PROVIDER = 'openai'; process.env.OPENAI_API_KEY = 'test-only';
  const original = globalThis.fetch;
  let unsafe = '';
  globalThis.fetch = withInitialPlan(async (_url, options) => {
    const id = JSON.parse(options.body).messages.at(-1).content.match(/\[(P\d+-\d+)\]/)[1];
    return Response.json({ choices: [{ message: { content: JSON.stringify({ behavior:'ANSWER', reply:unsafe, source_ids:[id] }) } }] });
  });
  try {
    for (unsafe of ['This practice cures depression.', 'Stop taking your antidepressants.', 'Stop your prescribed antidepressants.', 'Discontinue your medication.', 'Meditation is a cure for depression.', 'Replace your medication with yoga.', 'Try yoga instead of taking your prescribed meds.']) {
      const out = await send('How can I calm my restless mind during meditation?');
      assert.equal(out.body.behavior, 'CARE', unsafe);
      assert.equal(out.body.flags.medical_referral, true, unsafe);
      assert.equal(out.body.context, null, unsafe);
      assert.match(out.body.reply, /healthcare professional/i);
      assert.doesNotMatch(out.body.reply, /cures depression|Stop taking/i);
    }
  } finally { globalThis.fetch = original; }
});
