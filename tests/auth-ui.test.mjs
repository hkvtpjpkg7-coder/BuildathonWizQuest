import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

test('authenticated coach requests carry the token and account sidebars stay separate', async () => {
  class Element {
    constructor() { this.listeners = {}; this.children = []; this.classList = { add() {}, toggle() {} }; this.value = ''; }
    addEventListener(type, cb) { this.listeners[type] = cb; }
    append(...items) { this.children.push(...items); }
    replaceChildren(...items) { this.children = items; }
    querySelector() { return null; }
    remove() {}
    scrollIntoView() {}
    focus() {}
  }
  const nodes = new Map();
  const document = {
    getElementById(id) { if (!nodes.has(id)) nodes.set(id, new Element()); return nodes.get(id); },
    createElement() { return new Element(); }, querySelectorAll() { return []; },
  };
  const values = new Map();
  const localStorage = { getItem: (k) => values.get(k) ?? null, setItem: (k, v) => values.set(k, v) };
  let listener;
  const auth = { mode: 'pending', user: null, version: 0, subscribe(fn) { listener = fn; fn(this); }, async token() { return this.user ? `id-token-${this.user.uid}` : null; } };
  const requests = [];
  const id = '11111111-1111-4111-8111-111111111111';
  const fetch = async (path, options) => {
    requests.push({ path, options });
    return { ok: true, json: async () => ({ session_id: id, behavior: 'ANSWER', reply: 'A', storage: 'memory' }) };
  };
  const html = fs.readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
  const script = html.match(/^<script>\s*\n([\s\S]*?)^<\/script>/m)?.[1];
  vm.runInNewContext(script, { document, localStorage, fetch, URL, Blob, console, WiserWaveAuth: auth });
  auth.mode = 'signed-in'; auth.user = { uid: 'user-a' }; auth.version++; listener(auth);
  nodes.get('input').value = 'How can I stay calm?';
  nodes.get('composer').listeners.submit({ preventDefault() {} });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(requests[0].options.headers.Authorization, 'Bearer id-token-user-a');
  assert.equal(JSON.parse(requests[0].options.body).session_id, null);
  assert.equal(JSON.parse(values.get('wizquest_active_session:firebase:user-a')), id);
  auth.mode = 'signed-out'; auth.user = null; auth.version++; listener(auth);
  assert.equal(nodes.get('sessions').children.length, 0);
  auth.mode = 'signed-in'; auth.user = { uid: 'user-b' }; auth.version++; listener(auth);
  assert.equal(nodes.get('sessions').children.length, 0);
  nodes.get('input').value = 'How do I begin?';
  nodes.get('composer').listeners.submit({ preventDefault() {} });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(requests[1].options.headers.Authorization, 'Bearer id-token-user-b');
  assert.equal(JSON.parse(requests[1].options.body).session_id, null);
});
