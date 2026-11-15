import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../netlify/functions/chat/index.mjs';
import { appFactReply } from '../netlify/lib/app-facts.mjs';
import { loadSession } from '../netlify/lib/store.mjs';

process.env.QUIET_LOGS = '1';
process.env.AUTH_PROVIDER = 'off';
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

test('app facts match the notice and bypass retrieval and model generation', async () => {
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => { calls++; throw new Error('App facts are server-owned'); };
  try {
    for (const [prompt, expected] of [
      ['Are my messages private?', /may be sent to the configured AI provider and saved on the server/i],
      ['Delete everything I wrote here and all my chat data now.', /can't delete your messages from this chat/i],
      ['Does the AI provider use my chat to train its models?', /can't verify how the AI provider handles training/i],
      ['Can you see another user’s conversation?', /can't see other users' conversations/i],
      ['Can this app measure my prana?', /does not measure prana or energy levels/i],
      ['Does using WiserWave make me a certified yoga teacher?', /does not certify you as a yoga teacher/i],
    ]) {
      const result = await send(prompt);
      assert.equal(result.behavior, 'ANSWER', prompt);
      assert.equal(result.context, null, prompt);
      assert.equal(result.provider, 'local', prompt);
      assert.match(result.reply, expected, prompt);
    }
    assert.equal(calls, 0);
  } finally { globalThis.fetch = original; }

  assert.equal(appFactReply('Can you help me write a private message to my colleague?'), null);
  assert.equal(appFactReply('What can I do if my sister shared my private messages online?'), null);
  assert.equal(appFactReply('What is prana in yoga?'), null);
});

test('a standalone synthetic payment number is masked in storage and gets a privacy reminder', async () => {
  const original = globalThis.fetch;
  let calls = 0;
  const synthetic = '1234 5678 9012 3456';
  globalThis.fetch = async () => { calls++; throw new Error('Payment details do not need a model'); };
  try {
    const result = await send(`Remember my credit card number: ${synthetic}.`);
    assert.equal(result.behavior, 'DECLINE');
    assert.deepEqual(result.flags.pii_redacted, ['card']);
    assert.match(result.reply, /please avoid sharing payment card numbers/i);
    assert.match(result.reply, /messages may be saved on the server/i);
    assert.equal(result.context, null);
    assert.equal(calls, 0);
    const saved = await loadSession(result.session_id);
    assert.equal(saved.messages[0].content, 'Remember my credit card number: [CARD].');
    assert.equal(saved.title, 'Remember my credit card number: [CARD].');
    assert.equal(result.reply.includes(synthetic), false);
  } finally { globalThis.fetch = original; }
});

test('a provenance-shaped first turn cannot cite a nonexistent earlier answer', async () => {
  const original = globalThis.fetch;
  const messagesSeen = [];
  globalThis.fetch = async (_url, options) => {
    const messages = JSON.parse(options.body).messages;
    messagesSeen.push(messages);
    assert.match(messages[0].content, /^CONVERSATION_PLANNER/);
    return Response.json({ choices: [{ message: { content: JSON.stringify({
      intent: 'clarify', subject: 'none', query: '', reply: 'Which topic are you asking about?', reuse_previous: false,
    }) } }] });
  };
  try {
    const result = await send('What is the source?');
    assert.equal(messagesSeen.length, 1);
    assert.equal(result.context, null);
    assert.match(result.reply, /which topic/i);
  } finally { globalThis.fetch = original; }
});
