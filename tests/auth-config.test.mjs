import test from 'node:test';
import assert from 'node:assert/strict';
import config from '../netlify/functions/auth-config/index.mjs';

test('auth configuration is opt-in and fails closed when incomplete', async () => {
  const names = ['AUTH_PROVIDER', 'FIREBASE_PROJECT_ID', 'FIREBASE_WEB_API_KEY', 'FIREBASE_AUTH_DOMAIN'];
  const old = Object.fromEntries(names.map((n) => [n, process.env[n]]));
  try {
    for (const n of names) delete process.env[n];
    const req = new Request('http://localhost/api/auth/config');
    assert.equal((await config(req)).status, 503);
    process.env.AUTH_PROVIDER = 'off';
    assert.deepEqual(await (await config(req)).json(), { enabled: false });
    process.env.AUTH_PROVIDER = 'firebase';
    assert.equal((await config(req)).status, 503);
    process.env.FIREBASE_PROJECT_ID = 'sample-project';
    process.env.FIREBASE_WEB_API_KEY = 'test-public-web-config';
    const response = await config(req);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    const data = await response.json();
    assert.equal(data.firebase.authDomain, 'sample-project.firebaseapp.com');
    process.env.AUTH_PROVIDER = 'unknown';
    assert.equal((await config(req)).status, 503);
  } finally {
    for (const n of names) old[n] === undefined ? delete process.env[n] : process.env[n] = old[n];
  }
});
