import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// Exercise the page's actual send handler using a minimal DOM and controlled
// backend responses. No real user data or external service is involved.
test('unsaved safety session stays in memory for follow-ups until saved', async () => {
  class Element {
    constructor() { this.listeners = {}; this.children = []; this.classList = { add() {}, toggle() {} }; }
    addEventListener(type, callback) { this.listeners[type] = callback; }
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
    createElement() { return new Element(); },
    querySelectorAll() { return []; },
  };
  const storage = new Map();
  const localStorage = {
    getItem(key) { return storage.get(key) ?? null; },
    setItem(key, value) { storage.set(key, value); },
  };
  const id = '11111111-1111-4111-8111-111111111111';
  const bodies = [];
  const replies = [
    { session_id: id, behavior: 'CARE', reply: 'Support', storage: 'not_saved' },
    { session_id: id, behavior: 'CARE', reply: 'Support again', storage: 'not_saved' },
    { session_id: id, behavior: 'CARE', reply: 'Support saved', storage: 'memory' },
  ];
  const fetch = async (_url, options) => {
    bodies.push(JSON.parse(options.body));
    return { ok: true, json: async () => replies.shift() };
  };
  const html = fs.readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
  const script = html.match(/^<script>\s*\n([\s\S]*?)^<\/script>/m)?.[1];
  assert.ok(script, 'inline application script exists');
  vm.runInNewContext(script, { document, localStorage, fetch, URL, Blob, console });
  const submit = async (text) => {
    nodes.get('input').value = text;
    nodes.get('composer').listeners.submit({ preventDefault() {} });
    await new Promise((resolve) => setImmediate(resolve));
  };

  await submit('I want to end it.');
  assert.equal(bodies[0].session_id, null);
  assert.equal(storage.has('wizquest_active_session'), false);
  assert.equal(nodes.get('sessions').children.length, 0);
  assert.equal(nodes.get('dl-json').disabled, true);

  await submit('No, the pills are beside me.');
  assert.equal(bodies[1].session_id, id);
  assert.equal(storage.has('wizquest_active_session'), false);
  assert.equal(nodes.get('sessions').children.length, 0);

  await submit('I am alone.');
  assert.equal(bodies[2].session_id, id);
  assert.equal(JSON.parse(storage.get('wizquest_active_session')), id);
  assert.equal(nodes.get('sessions').children.length, 1);
  assert.equal(nodes.get('dl-json').disabled, false);
});
