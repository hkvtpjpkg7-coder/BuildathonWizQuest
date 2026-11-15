import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../netlify/functions/chat/index.mjs';
import { retrieve } from '../netlify/lib/rag.mjs';
import { loadSession } from '../netlify/lib/store.mjs';

process.env.AUTH_PROVIDER = 'off'; // isolated test process

const question = 'I feel distracted when I try to meditate. How can I focus?';
const source = retrieve(question)[0].id;

async function withModelReply(reply, run) {
  const oldProvider = process.env.LLM_PROVIDER;
  const oldKey = process.env.OPENAI_API_KEY;
  const oldFetch = globalThis.fetch;
  process.env.LLM_PROVIDER = 'openai';
  process.env.OPENAI_API_KEY = 'test-only';
  globalThis.fetch = async () => Response.json({choices:[{message:{content:JSON.stringify({behavior:'ANSWER',reply})}}]});
  try {
    const request = new Request('http://localhost/api/chat', {
      method:'POST', headers:{'content-type':'application/json'},
      body:JSON.stringify({message:question}),
    });
    const response = await handler(request, {ip:crypto.randomUUID()});
    await run(response, await response.json());
  } finally {
    globalThis.fetch = oldFetch;
    if (oldProvider === undefined) delete process.env.LLM_PROVIDER;
    else process.env.LLM_PROVIDER = oldProvider;
    if (oldKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = oldKey;
  }
}

test('unsolicited fasting guidance is replaced and not stored or returned', async () => {
  const unsafe = `Consider fasting to calm your mind [${source}].`;
  await withModelReply(unsafe, async (response, body) => {
    assert.equal(response.status, 200);
    assert.equal(body.behavior, 'CARE');
    assert.equal(body.flags.dietary_referral, true);
    assert.match(body.reply, /healthcare professional/i);
    assert.doesNotMatch(body.reply, /Consider fasting/);
    assert.equal(body.context, null);
    // A model was called even though the safety layer replaced its output.
    assert.equal(body.provider, 'openai');
    const saved = await loadSession(body.session_id);
    assert.ok(saved);
    assert.ok(!JSON.stringify(saved).includes(unsafe));
  });
});

test('ordinary references to a fast-paced day and breakfast are not blocked', async () => {
  const benign = `During a fast-paced day, pause after breakfast and take a breath [${source}].`;
  await withModelReply(benign, async (response, body) => {
    assert.equal(response.status, 200);
    assert.equal(body.behavior, 'ANSWER');
    assert.equal(body.flags.dietary_referral, false);
    assert.equal(body.reply, 'During a fast-paced day, pause after breakfast and take a breath.');
    assert.deepEqual(body.context.used_ids, [source]);
  });
});
