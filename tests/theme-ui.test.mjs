import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// Exercise the page's theme bootstrap without fetching account data or opening
// the app. Both controls must stay in sync across sign-in and the main view.
test('theme follows the saved choice, syncs both controls, and tolerates blocked storage', () => {
  const html = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
  const script = html.match(/<script>\s*\/\/ Set the theme before painting[\s\S]*?<\/script>/)?.[0]
    .replace(/^<script>/, '').replace(/<\/script>$/, '');
  assert.ok(script, 'theme bootstrap exists');

  function boot(saved, darkSystem = false, storageBlocked = false) {
    let ready;
    const controls = [0, 1].map(() => ({ value: '', addEventListener(type, fn) { if (type === 'change') this.change = fn; } }));
    const document = {
      documentElement: { dataset: {} },
      addEventListener(type, fn) { if (type === 'DOMContentLoaded') ready = fn; },
      querySelectorAll() { return controls; },
    };
    const localStorage = {
      getItem() { if (storageBlocked) throw new Error('blocked'); return saved; },
      setItem(_key, value) { if (storageBlocked) throw new Error('blocked'); saved = value; },
    };
    vm.runInNewContext(script, { document, localStorage, window: { matchMedia: () => ({ matches: darkSystem }) } });
    const beforeReady = document.documentElement.dataset.theme;
    ready();
    return { document, controls, beforeReady, stored: () => saved };
  }

  const app = boot('colorful', true);
  assert.equal(app.beforeReady, 'colorful');
  assert.deepEqual(app.controls.map((c) => c.value), ['colorful', 'colorful']);
  app.controls[1].value = 'dark';
  app.controls[1].change();
  assert.equal(app.document.documentElement.dataset.theme, 'dark');
  assert.deepEqual(app.controls.map((c) => c.value), ['dark', 'dark']);
  assert.equal(app.stored(), 'dark');

  const blocked = boot(null, true, true);
  assert.equal(blocked.beforeReady, 'dark');
  blocked.controls[0].value = 'light';
  assert.doesNotThrow(() => blocked.controls[0].change());
  assert.equal(blocked.document.documentElement.dataset.theme, 'light');
  assert.equal(blocked.controls[1].value, 'light');
});
