import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

test('account changes gate and reload the page to clear prototype and runner data', async () => {
  const nodes = new Map();
  const make = () => ({ listeners: {}, hidden: false, inert: false, textContent: '', addEventListener(name, fn) { this.listeners[name] = fn; } });
  const app = make();
  const document = { getElementById(id) { if (!nodes.has(id)) nodes.set(id, make()); return nodes.get(id); }, querySelector() { return app; } };
  let observer, reloads = 0;
  const sdk = { getAuth: () => ({}), onAuthStateChanged(_auth, fn) { observer = fn; }, signOut: async () => {}, GoogleAuthProvider: class {}, signInWithPopup: async () => {} };
  const fetch = async () => ({ ok: true, json: async () => ({ enabled: true, firebase: { projectId: 'example-project', apiKey: 'public-config', authDomain: 'example-project.firebaseapp.com' } }) });
  const loadFake = async (url) => url.endsWith('firebase-app.js') ? { initializeApp: () => ({}) } : sdk;
  const script = fs.readFileSync(new URL('../public/auth-bridge.js', import.meta.url), 'utf8').replaceAll('await import(', 'await loadFake(');
  const context = { document, fetch, loadFake, location: { reload() { reloads++; } }, Set };
  context.globalThis = context;
  vm.runInNewContext(script, context);
  assert.equal(app.inert, true);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(typeof observer, 'function');
  observer({ uid: 'user-a', email: 'a@example.test', getIdToken: async () => 'token' });
  assert.equal(app.inert, false);
  assert.equal(context.WiserWaveAuth.mode, 'signed-in');
  observer({ uid: 'user-b', email: 'b@example.test', getIdToken: async () => 'token-b' });
  assert.equal(app.inert, true);
  assert.equal(context.WiserWaveAuth.mode, 'pending');
  assert.equal(reloads, 1);
});
