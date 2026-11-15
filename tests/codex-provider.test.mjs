import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { PassThrough, Writable } from 'node:stream';
import { callLLM, callPrivateCodex } from '../netlify/lib/llm.mjs';

function fakeSpawn(output, code = 0) {
  const calls = [];
  const spawnProcess = (command, args, options) => {
    const child = new EventEmitter();
    child.stdout = new PassThrough();
    child.kill = () => {};
    let stdin = '';
    child.stdin = new Writable({
      write(chunk, encoding, done) { stdin += chunk.toString(); done(); },
      final(done) {
        calls[0].stdin = stdin;
        child.stdout.end(output);
        child.stdout.on('end', () => child.emit('close', code));
        done();
      },
    });
    calls.push({ command, args, options });
    return child;
  };
  return { spawnProcess, calls };
}

test('private Codex invocation keeps conversation out of arguments and sends valid response through', async () => {
  const fake = fakeSpawn('{"behavior":"ANSWER","reply":"Try pausing [P52-1]."}');
  process.env.OPENAI_API_KEY = 'test-only-never-forward';
  const result = await callPrivateCodex([{ role:'user', content:'Personal question [P52-1]' }], { spawnProcess: fake.spawnProcess });
  assert.match(result.raw, /P52-1/);
  assert.deepEqual(result.usage, { input_tokens: null, output_tokens: null });
  assert.equal(fake.calls[0].command, 'codex');
  assert.equal(fake.calls[0].options.shell, false);
  assert.ok(fake.calls[0].args.includes('--ignore-user-config'));
  assert.ok(fake.calls[0].args.includes('--ephemeral'));
  assert.ok(fake.calls[0].args.includes('read-only'));
  assert.ok(!fake.calls[0].args.join(' ').includes('Personal question'));
  assert.match(fake.calls[0].stdin, /Personal question/);
  assert.equal(fake.calls[0].options.env.OPENAI_API_KEY, undefined);
  delete process.env.OPENAI_API_KEY;
});

test('private Codex rejects errors and malformed responses without exposing output', async () => {
  await assert.rejects(callPrivateCodex([], { spawnProcess: fakeSpawn('secret diagnostic', 1).spawnProcess }), /^Error: Codex request failed$/);
  await assert.rejects(callPrivateCodex([], { spawnProcess: fakeSpawn('not JSON and private text').spawnProcess }), /^Error: Codex returned invalid response$/);
});

test('private Codex aborts an unresponsive process', async () => {
  let stopped = false;
  const spawnProcess = () => {
    const child = new EventEmitter();
    child.stdout = new PassThrough();
    child.stdin = new Writable({ write(chunk, encoding, done) { done(); } });
    child.kill = signal => { stopped = signal === 'SIGKILL'; };
    return child;
  };
  await assert.rejects(callPrivateCodex([], { spawnProcess, timeoutMs: 20 }), /timed out/);
  assert.equal(stopped, true);
});

test('Codex provider is not enabled without the private-test opt in', async () => {
  const oldProvider = process.env.LLM_PROVIDER;
  const oldPrivate = process.env.WIZQUEST_PRIVATE_CODEX;
  process.env.LLM_PROVIDER = 'codex';
  delete process.env.WIZQUEST_PRIVATE_CODEX;
  try {
    await assert.rejects(callLLM([]), /requires explicit private-test configuration/);
  } finally {
    if (oldProvider === undefined) delete process.env.LLM_PROVIDER; else process.env.LLM_PROVIDER = oldProvider;
    if (oldPrivate === undefined) delete process.env.WIZQUEST_PRIVATE_CODEX; else process.env.WIZQUEST_PRIVATE_CODEX = oldPrivate;
  }
});
