import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { PassThrough, Writable } from 'node:stream';
import { CONVERSATION_PROMPT, parseConversationPlan, planConversationTurn } from '../netlify/lib/conversation.mjs';
import { callPrivateCodex } from '../netlify/lib/llm.mjs';
import { HISTORY_TURNS_SENT } from '../netlify/lib/checks.mjs';

const acknowledgment = { intent: 'acknowledge', query: '', reply: 'Of course.', reuse_previous: false };
const followup = { intent: 'continue', query: 'How can I apply the earlier advice before my difficult meeting?', reply: '', reuse_previous: true };

test('planner keeps social replies source-free and substantive queries separate', () => {
  assert.equal(parseConversationPlan(JSON.stringify(acknowledgment)).valid, true);
  assert.deepEqual(parseConversationPlan(JSON.stringify(followup)), { ...followup, usage: { input_tokens: 0, output_tokens: 0 }, valid: true });
  for (const intent of ['care', 'medical', 'decline']) {
    assert.equal(parseConversationPlan(JSON.stringify({ ...acknowledgment, intent, reply: '' })).valid, true);
  }
});

test('malformed plans cannot smuggle content or default back to keyword retrieval', () => {
  for (const raw of [
    'private malformed output',
    JSON.stringify({ ...acknowledgment, intent: 'answer' }),
    JSON.stringify({ ...acknowledgment, query: 'seeing clearly' }),
    JSON.stringify({ ...acknowledgment, reply: 'According to the commentary, awareness means seeing clearly.' }),
    JSON.stringify({ ...acknowledgment, reply: 'Of course. [P12-1]' }),
    JSON.stringify({ ...acknowledgment, reply: 'You should practice daily.' }),
    JSON.stringify({ ...acknowledgment, reply: 'Doubling your pills is safe.' }),
    JSON.stringify({ ...acknowledgment, reply: 'Fasting will help you feel better.' }),
    JSON.stringify({ ...acknowledgment, reply: 'Okay '.repeat(46) }),
    JSON.stringify({ ...acknowledgment, reuse_previous: 'true' }),
    JSON.stringify({ ...followup, intent: 'new_topic' }),
    JSON.stringify({ ...followup, query: '' }),
    JSON.stringify({ ...followup, query: 'q'.repeat(601) }),
    JSON.stringify({ ...followup, query: 'Summarize P12-1.' }),
    JSON.stringify({ ...followup, reply: 'Additional unsupported advice' }),
    JSON.stringify({ ...acknowledgment, intent: 'medical', reply: 'Stop taking it.' }),
  ]) {
    const plan = parseConversationPlan(raw);
    assert.equal(plan.valid, false, raw);
    assert.equal(plan.intent, 'clarify');
    assert.equal(plan.query, '');
    assert.equal(plan.reuse_previous, false);
    assert.equal(plan.reply, 'Could you say a little more about what you mean?');
  }
});

test('planner sends bounded redacted conversation without source text to each provider', async () => {
  const priorFetch = globalThis.fetch;
  const priorProvider = process.env.LLM_PROVIDER;
  const history = Array.from({ length: HISTORY_TURNS_SENT * 2 + 4 }, (_, index) => ({
    role: index % 2 ? 'assistant' : 'user', content: `Turn ${index}: person@example.com`,
    behavior: 'ANSWER', kind: 'conversation', conversation_intent: 'acknowledge',
    context_source: 'PRIVATE SOURCE TEXT MUST NOT BE SENT', context_ids: ['P12-1'],
  }));
  try {
    for (const p of ['openai', 'anthropic', 'ollama']) {
      process.env.LLM_PROVIDER = p;
      let captured;
      globalThis.fetch = async (_url, options) => {
        captured = JSON.parse(options.body);
        const raw = JSON.stringify(acknowledgment);
        if (p === 'anthropic') return Response.json({ content: [{ type: 'text', text: raw }], usage: { input_tokens: 10, output_tokens: 8 } });
        if (p === 'ollama') return Response.json({ done: true, message: { content: raw }, prompt_eval_count: 10, eval_count: 8 });
        return Response.json({ choices: [{ message: { content: raw } }], usage: { prompt_tokens: 10, completion_tokens: 8 } });
      };
      const plan = await planConversationTurn('Thanks from person@example.com', history);
      assert.equal(plan.valid, true, p);
      assert.deepEqual(plan.usage, { input_tokens: 10, output_tokens: 8 });
      const messages = captured.messages.filter((turn) => turn.role !== 'system');
      assert.equal(messages.length, HISTORY_TURNS_SENT * 2 + 1);
      assert.equal(messages.at(-1).content, 'Thanks from [EMAIL]');
      assert.match(p === 'anthropic' ? captured.system : captured.messages[0].content, /^CONVERSATION_PLANNER/);
      assert.doesNotMatch(JSON.stringify(messages), /person@example\.com|PRIVATE SOURCE TEXT|P12-1|Turn 0:/);
      const lastAssistant = JSON.parse(messages.at(-2).content);
      assert.equal(lastAssistant.conversation_intent, 'acknowledge');
      assert.equal(lastAssistant.kind, 'conversation');
    }
  } finally {
    globalThis.fetch = priorFetch;
    if (priorProvider === undefined) delete process.env.LLM_PROVIDER; else process.env.LLM_PROVIDER = priorProvider;
  }
});

test('planner failure returns a bounded clarification without exposing error data', async () => {
  const priorFetch = globalThis.fetch;
  const priorProvider = process.env.LLM_PROVIDER;
  process.env.LLM_PROVIDER = 'openai';
  globalThis.fetch = async () => { throw new Error('provider error with private data'); };
  try {
    const plan = await planConversationTurn('I see', [{ role: 'assistant', content: 'Earlier explanation.' }]);
    assert.equal(plan.valid, false);
    assert.equal(plan.intent, 'clarify');
    assert.equal(plan.query, '');
    assert.doesNotMatch(JSON.stringify(plan), /private data|provider error/);
  } finally {
    globalThis.fetch = priorFetch;
    if (priorProvider === undefined) delete process.env.LLM_PROVIDER; else process.env.LLM_PROVIDER = priorProvider;
  }
});

test('many acknowledgments retain active focus within the history budget without skipping a barrier', async () => {
  const priorFetch = globalThis.fetch;
  const priorProvider = process.env.LLM_PROVIDER;
  process.env.LLM_PROVIDER = 'openai';
  let captured;
  globalThis.fetch = async (_url, options) => {
    captured = JSON.parse(options.body).messages.filter((turn) => turn.role !== 'system');
    return Response.json({ choices: [{ message: { content: JSON.stringify(followup) } }] });
  };
  const start = [
    { role: 'user', content: 'I feel tense before tomorrow’s meeting.' },
    { role: 'assistant', content: 'Original substantive explanation.', behavior: 'ANSWER' },
  ];
  const acks = Array.from({ length: 12 }, () => [
    { role: 'user', content: 'I see' },
    { role: 'assistant', content: 'Of course.', behavior: 'ANSWER', kind: 'conversation', conversation_intent: 'acknowledge' },
  ]).flat();
  try {
    await planConversationTurn('How do I apply that?', [...start, ...acks]);
    assert.equal(captured.length, HISTORY_TURNS_SENT * 2 + 1);
    assert.equal(captured[0].content, start[0].content);
    assert.equal(JSON.parse(captured[1].content).reply, start[1].content);
    for (const barrier of [
      { role: 'assistant', behavior: 'DECLINE', content: 'I cannot help with that task.' },
      { role: 'assistant', behavior: 'CARE', content: 'Please seek professional support.' },
      { role: 'assistant', behavior: 'ANSWER', kind: 'conversation', conversation_intent: 'close', content: 'Take care.' },
    ]) {
      await planConversationTurn('How do I apply that?', [...start, { role: 'user', content: 'A different request.' }, barrier, ...acks]);
      assert.equal(captured.length, HISTORY_TURNS_SENT * 2 + 1);
      assert.equal(JSON.parse(captured[1].content).reply, barrier.content);
      assert.doesNotMatch(JSON.stringify(captured), /Original substantive explanation|tomorrow’s meeting/);
    }
  } finally {
    globalThis.fetch = priorFetch;
    if (priorProvider === undefined) delete process.env.LLM_PROVIDER; else process.env.LLM_PROVIDER = priorProvider;
  }
});

test('private provider accepts a custom task schema while keeping data on stdin', async () => {
  let input = '';
  const spawnProcess = (_command, args) => {
    assert.ok(!args.join(' ').includes('Earlier explanation'));
    const child = new EventEmitter();
    child.stdout = new PassThrough();
    child.kill = () => {};
    child.stdin = new Writable({
      write(chunk, _encoding, done) { input += chunk.toString(); done(); },
      final(done) {
        child.stdout.end(JSON.stringify(acknowledgment));
        child.stdout.on('end', () => child.emit('close', 0));
        done();
      },
    });
    return child;
  };
  const result = await callPrivateCodex([{ role: 'assistant', content: 'Earlier explanation.' }, { role: 'user', content: 'I see' }], { spawnProcess, systemPrompt: CONVERSATION_PROMPT });
  assert.equal(parseConversationPlan(result.raw).intent, 'acknowledge');
  assert.match(input, /^CONVERSATION_PLANNER/);
  assert.match(input, /Earlier explanation/);
});
