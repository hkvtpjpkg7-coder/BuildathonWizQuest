import test from 'node:test';
import assert from 'node:assert/strict';
import { callLLM } from '../netlify/lib/llm.mjs';

test('OpenAI requests use a bounded JSON completion and keep credentials out of the prompt', async () => {
  const originalFetch = globalThis.fetch;
  const saved = Object.fromEntries(['LLM_PROVIDER', 'OPENAI_API_KEY', 'OPENAI_MODEL'].map(k => [k, process.env[k]]));
  process.env.LLM_PROVIDER = 'openai';
  process.env.OPENAI_API_KEY = 'test-only-key';
  process.env.OPENAI_MODEL = 'gpt-5.4-mini';
  let request;
  globalThis.fetch = async (url, options) => {
    request = { url, options, body: JSON.parse(options.body) };
    return Response.json({ choices: [{ message: { content: '{"behavior":"ANSWER","reply":"Try pausing [P52-1]."}' } }], usage: { prompt_tokens: 20, completion_tokens: 10 } });
  };
  try {
    const result = await callLLM([{ role: 'user', content: 'How can I find calm? [P52-1]' }]);
    assert.equal(request.url, 'https://api.openai.com/v1/chat/completions');
    assert.equal(request.options.headers.authorization, 'Bearer test-only-key');
    assert.equal(request.body.model, 'gpt-5.4-mini');
    assert.equal(request.body.max_completion_tokens, 800);
    assert.deepEqual(request.body.response_format, { type: 'json_object' });
    assert.equal(request.body.messages.at(-1).content, 'How can I find calm? [P52-1]');
    assert.ok(!request.options.body.includes('test-only-key'));
    assert.deepEqual(result.usage, { input_tokens: 20, output_tokens: 10 });
    assert.match(result.raw, /P52-1/);
  } finally {
    globalThis.fetch = originalFetch;
    for (const [key, value] of Object.entries(saved)) value === undefined ? delete process.env[key] : process.env[key] = value;
  }
});

test('OpenAI errors do not expose the response body', async () => {
  const originalFetch = globalThis.fetch;
  const savedProvider = process.env.LLM_PROVIDER;
  const savedKey = process.env.OPENAI_API_KEY;
  process.env.LLM_PROVIDER = 'openai';
  process.env.OPENAI_API_KEY = 'test-only-key';
  globalThis.fetch = async () => new Response('secret diagnostic test-only-key', { status: 401 });
  try {
    await assert.rejects(callLLM([]), /^Error: OpenAI 401$/);
  } finally {
    globalThis.fetch = originalFetch;
    savedProvider === undefined ? delete process.env.LLM_PROVIDER : process.env.LLM_PROVIDER = savedProvider;
    savedKey === undefined ? delete process.env.OPENAI_API_KEY : process.env.OPENAI_API_KEY = savedKey;
  }
});
