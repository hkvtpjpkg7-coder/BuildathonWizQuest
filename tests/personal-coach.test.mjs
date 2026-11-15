import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../netlify/functions/chat/index.mjs';

process.env.QUIET_LOGS = '1';
process.env.AUTH_PROVIDER = 'off'; // isolated test process

async function send(message, session_id) {
  const req = new Request('http://localhost/api/chat', {
    method: 'POST', headers: {'content-type': 'application/json'},
    body: JSON.stringify({message, session_id}),
  });
  const result = await handler(req, {ip: crypto.randomUUID()});
  return {status: result.status, body: await result.json()};
}

test('mock mode uses the PDF and labels the answer as an extractive preview', async () => {
  process.env.LLM_PROVIDER = 'mock';
  const {status, body} = await send('How can I calm my restless mind during meditation?');
  assert.equal(status, 200);
  assert.equal(body.behavior, 'ANSWER');
  assert.equal(body.provider, 'mock');
  assert.match(body.reply, /Demo mode/);
  assert.ok(body.context.items.length > 0);
  assert.match(body.reply, new RegExp(`\\[${body.context.items[0].id}\\]`));
  assert.ok(Number.isInteger(body.context.items[0].page));
});

test('conversation follow-up preserves the same session and PDF context', async () => {
  process.env.LLM_PROVIDER = 'mock';
  const first = await send('I feel distracted when I try to meditate. How can I focus?');
  assert.equal(first.body.behavior, 'ANSWER');
  const second = await send('How can I practice this?', first.body.session_id);
  assert.equal(second.body.session_id, first.body.session_id);
  assert.equal(second.body.turn, 2);
  assert.equal(second.body.behavior, 'ANSWER');
  assert.ok(second.body.context.items.length > 0);
});

test('a situational follow-up retrieves passages about the earlier concern', async () => {
  process.env.LLM_PROVIDER = 'mock';
  const first = await send('I compare myself to my colleagues and feel I am not doing enough. How can I grow without being so hard on myself?');
  const second = await send('What could I do before my next team meeting?', first.body.session_id);
  assert.equal(second.body.session_id, first.body.session_id);
  assert.equal(second.body.behavior, 'ANSWER');
  assert.ok(second.body.context.items.some((item) => first.body.context.items.some((previous) => previous.id === item.id)));
});

test('crisis response does not depend on the model being reachable', async () => {
  process.env.LLM_PROVIDER = 'ollama';
  const prior = globalThis.fetch;
  let requested = false;
  globalThis.fetch = async () => { requested = true; throw new Error('provider down'); };
  try {
    const {status, body} = await send('I want to die and cannot keep myself safe.');
    assert.equal(status, 200);
    assert.equal(body.behavior, 'CARE');
    assert.equal(requested, false);
    assert.match(body.reply, /988/);
  } finally { globalThis.fetch = prior; }
});

test('unknown citations in model answers are not shown as sourced advice', async () => {
  process.env.LLM_PROVIDER = 'openai';
  process.env.OPENAI_API_KEY = 'test-only';
  const prior = globalThis.fetch;
  globalThis.fetch = async () => Response.json({choices: [{message: {content: JSON.stringify({behavior:'ANSWER', reply:'Try this [P9999-99].'})}}]});
  try {
    const {status, body} = await send('How can I calm my restless mind during meditation?');
    assert.equal(status, 200);
    assert.equal(body.behavior, 'DECLINE');
    assert.equal(body.flags.output_valid, false);
    assert.doesNotMatch(body.reply, /P9999/);
  } finally { globalThis.fetch = prior; }
});

test('unrelated new question does not inherit evidence from an earlier concern', async () => {
  process.env.LLM_PROVIDER = 'mock';
  const first = await send('I feel distracted when I try to meditate. How can I focus?');
  const second = await send('What is the capital of France?', first.body.session_id);
  assert.equal(second.body.behavior, 'DECLINE');
  assert.equal(second.body.context.items.length, 0);
});

test('malformed provider output is not treated as safe sourced advice', async () => {
  process.env.LLM_PROVIDER = 'openai';
  process.env.OPENAI_API_KEY = 'test-only';
  const prior = globalThis.fetch;
  globalThis.fetch = async () => Response.json({choices: [{message: {content: 'unstructured unsourced advice'}}]});
  try {
    const {body} = await send('How can I calm my restless mind during meditation?');
    assert.equal(body.behavior, 'DECLINE');
    assert.equal(body.flags.output_valid, false);
    assert.doesNotMatch(body.reply, /unstructured unsourced advice/);
  } finally { globalThis.fetch = prior; }
});

test('medication change and diagnosis requests bypass retrieval and provider', async () => {
  process.env.LLM_PROVIDER = 'ollama';
  const prior = globalThis.fetch;
  let requested = false;
  globalThis.fetch = async () => { requested = true; throw new Error('provider down'); };
  try {
    for (const prompt of ['Should I stop taking my antidepressants?', 'I feel tired. Do I have depression?', 'Can yoga replace my medication?']) {
      const {status, body} = await send(prompt);
      assert.equal(status, 200);
      assert.equal(body.behavior, 'CARE');
      assert.equal(body.flags.medical_referral, true);
      assert.equal(body.context, null);
      assert.match(body.reply, /healthcare professional|prescriber or pharmacist/i);
    }
    assert.equal(requested, false);
  } finally { globalThis.fetch = prior; }
});

test('a medication follow-up is referred, and crisis support retains priority', async () => {
  process.env.LLM_PROVIDER = 'mock';
  const first = await send('I take medication and want to understand meditation.');
  assert.equal(first.body.flags.medical_referral, false);
  const next = await send('Should I stop taking it?', first.body.session_id);
  assert.equal(next.body.flags.medical_referral, true);
  assert.equal(next.body.behavior, 'CARE');
  const crisis = await send('I want to die and want to stop taking my medication.', first.body.session_id);
  assert.equal(crisis.body.behavior, 'CARE');
  assert.equal(crisis.body.flags.distress, true);
  assert.match(crisis.body.reply, /988/);
});
