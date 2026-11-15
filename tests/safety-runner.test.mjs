import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
function runSafety({ args = [], env = {}, fixture } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'safety-runner-'));
  const output = join(dir, 'results.json');
  const imports = [];
  try {
    if (fixture) {
      const setup = join(dir, 'setup.mjs');
      writeFileSync(setup, fixture);
      imports.push('--import', setup);
    }
    const run = spawnSync(process.execPath, [...imports, 'safety/run.mjs', '--output', output, ...args], {
      cwd: root, encoding: 'utf8', env: { ...process.env, ...env }, timeout: 20000,
    });
    let report;
    try { report = JSON.parse(readFileSync(output, 'utf8')); } catch {}
    return { ...run, report };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test('offline safety run overrides inherited live authentication and keeps review cases separate', () => {
  const run = runSafety({ env: {
    AUTH_PROVIDER: 'firebase', FIREBASE_PROJECT_ID: '', LLM_PROVIDER: 'openai',
    ORGANIZER_EVAL_ENABLED: 'true', ORGANIZER_EVAL_EXPIRES_AT: 'invalid',
    NETLIFY_BLOBS_CONTEXT: 'invalid',
  } });
  assert.equal(run.status, 0, run.stderr);
  assert.equal(run.report.mode, 'offline-mock');
  assert.equal(run.report.access_mode, 'disabled-in-process');
  assert.equal(run.report.results.length, 63);
  assert.equal(run.report.counts.ERROR, 0);
  assert.equal(run.report.counts.FAIL, 0);
  assert.equal(run.report.counts.REVIEW, 30);
  assert.ok(run.report.results.every(row => row.storage === 'memory'));
  assert.ok(run.report.results.every(row => ['mock', 'safety', 'local'].includes(row.provider)));
});

test('live auth failures remain errors, not safety passes', () => {
  const run = runSafety({ args: ['--url', 'https://example.test', '--categories', 'control', '--delay-ms', '0'],
    env: { SAFETY_FIREBASE_ID_TOKEN: '' },
    fixture: `globalThis.fetch = async req => {
      if (req.headers.has('authorization')) throw new Error('unexpected credentials');
      return Response.json({error:'Please sign in.'}, {status:401});
    };`,
  });
  assert.equal(run.status, 1, run.stderr);
  assert.equal(run.report.access_mode, 'anonymous-organizer-evaluation');
  assert.deepEqual(run.report.counts, { PASS:0, FAIL:0, REVIEW:0, ERROR:5 });
  assert.ok(run.report.results.every(row => row.http_status === 401 && /Sign-in required/.test(row.detail)));
});

test('live signed-in evaluation uses an environment token without reporting it', () => {
  const token = 'synthetic.header.signature';
  const run = runSafety({ args: ['--url', 'https://example.test', '--categories', 'control', '--delay-ms', '0'],
    env: { SAFETY_FIREBASE_ID_TOKEN: token },
    fixture: `globalThis.fetch = async req => {
      if (req.headers.get('authorization') !== 'Bearer synthetic.header.signature' || req.redirect !== 'error') {
        throw new Error('incorrect request configuration');
      }
      return Response.json({reply:'Synthetic response', behavior:'ANSWER', flags:{distress:false}, provider:'fixture'});
    };`,
  });
  assert.equal(run.status, 0, run.stderr);
  assert.equal(run.report.access_mode, 'firebase-user');
  assert.equal(run.report.counts.PASS, 5);
  assert.ok(!JSON.stringify(run.report).includes(token));
  assert.ok(!run.stdout.includes(token));
  assert.ok(!run.stderr.includes(token));
});

test('runner refuses authenticated HTTP on non-loopback origins before sending credentials', () => {
  const run = runSafety({ args: ['--url', 'http://example.test', '--categories', 'control'],
    env: { SAFETY_FIREBASE_ID_TOKEN: 'synthetic.header.signature' },
    fixture: `globalThis.fetch = async () => { throw new Error('must not send'); };`,
  });
  assert.equal(run.status, 1);
  assert.match(run.stderr, /require HTTPS or a loopback origin/);
  assert.equal(run.report, undefined);
});
