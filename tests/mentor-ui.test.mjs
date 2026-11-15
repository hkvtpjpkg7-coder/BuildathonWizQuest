import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { routePreview } from '../scripts/private-preview.mjs';

// The Mentor tab shows the Yoga Sutras Chapter 1 lessons: their own page in
// public/lessons/ (index.html, engine.js, lessons.js, self-hosted fonts),
// framed from the same site so the Personal Coach page is not changed by them.
const read = (p) => fs.readFileSync(new URL(p, import.meta.url), 'utf8');
const html = read('../public/index.html');
const lessonsHtml = read('../public/lessons/index.html');
const engine = read('../public/lessons/engine.js');
const lessonsJs = read('../public/lessons/lessons.js');

test('the Mentor tab frames the lessons page from the same site', () => {
  assert.ok(html.includes('<button data-view="mentor">Mentor</button>'));
  const view = html.match(/<section class="view" id="view-mentor">[\s\S]*?<\/section>/)?.[0] ?? '';
  assert.match(view, /<iframe id="mentor-lessons" src="\/lessons\/index\.html" title="[^"]+"/);
});

test('the Personal Coach page keeps a single inline script', () => {
  const inline = [...html.matchAll(/^<script>\s*\n/gm)];
  assert.equal(inline.length, 1, 'only the coach script is inline; the lessons run in their own page');
  assert.ok(!html.includes('WizMentor'));
});

test('the lessons page loads only its own files', () => {
  const urls = [...lessonsHtml.matchAll(/https?:\/\/[^"' )]+/g)].map((m) => m[0]).filter((u) => !u.startsWith('http://www.w3.org/'));
  assert.deepEqual(urls, []);
  assert.match(lessonsHtml, /<link href="fonts\/fonts\.css" rel="stylesheet">/);
  for (const m of read('../public/lessons/fonts/fonts.css').matchAll(/url\(\.\/([^)]+)\)/g)) {
    assert.ok(fs.existsSync(new URL('../public/lessons/fonts/' + m[1], import.meta.url)), `font file ${m[1]} exists`);
  }
});

test('lesson engine and data parse, and every menu entry has a lesson', () => {
  new vm.Script(engine, { filename: 'engine.js' });
  const ctx = { window: {}, YS: { U: () => '' } };
  vm.runInNewContext(lessonsJs, ctx, { filename: 'lessons.js' });
  const lessons = ctx.window.LESSONS, catalog = ctx.window.CATALOG;
  assert.ok(lessons.length >= 15, 'Chapter 1 lessons are present');
  const ids = new Set(lessons.map((l) => l.id));
  for (const l of lessons) assert.equal(l.cards.length, 3, `${l.id} starts with three intro cards`);
  for (const m of catalog) for (const x of m.lessons) if (x.id) assert.ok(ids.has(x.id), `${x.id} is in LESSONS`);
  for (const id of ['legend', 'atha', 'anushasana', 'nirodha', 'chitta', 'seer', 'saarupya']) assert.ok(ids.has(id));
});

test('lesson text says Gurudev, never Sri Sri', () => {
  // The one exception is the Gurudev pop-up in engine.js, which gives his full name.
  assert.ok(!/Sri Sri/.test(lessonsJs + lessonsHtml));
  assert.equal((engine.match(/Sri Sri/g) || []).length, 1);
});

test('the private preview serves the lessons with same-origin framing', async () => {
  const req = (path) => new Request('http://127.0.0.1' + path);
  for (const path of ['/lessons/', '/lessons/index.html', '/lessons/engine.js', '/lessons/lessons.js', '/lessons/fonts/fonts.css', '/lessons/fonts/mukta-latin-400-normal.woff2']) {
    const res = await routePreview(req(path));
    assert.equal(res.status, 200, path);
    assert.equal(res.headers.get('x-frame-options'), 'SAMEORIGIN');
    const csp = res.headers.get('content-security-policy');
    assert.match(csp, /frame-src 'self' /);
    assert.match(csp, /frame-ancestors 'self'/);
    assert.match(csp, /img-src 'self' data:/);
  }
  assert.equal((await routePreview(req('/lessons/../netlify/lib/llm.mjs'))).status, 404);
});

test('Netlify headers allow same-origin framing only', () => {
  const toml = read('../netlify.toml');
  assert.match(toml, /X-Frame-Options = "SAMEORIGIN"/);
  assert.ok(!/X-Frame-Options = "DENY"/.test(toml));
  assert.match(toml, /frame-src 'self' https:\/\/\*\.firebaseapp\.com https:\/\/accounts\.google\.com; frame-ancestors 'self'/);
  assert.match(toml, /img-src 'self' data:/);
});

test('every lesson file is on the private preview allowlist', async () => {
  const root = new URL('../public/lessons/', import.meta.url);
  const files = fs.readdirSync(root, { recursive: true })
    .filter((f) => fs.statSync(new URL(f, root)).isFile() && !/^fonts\/LICENSE-/.test(f) && !f.endsWith('.DS_Store'));
  assert.ok(files.length >= 4);
  for (const f of files) {
    const res = await routePreview(new Request('http://127.0.0.1/lessons/' + f));
    assert.equal(res.status, 200, `/lessons/${f} is served by the private preview`);
  }
});

test('netlify.toml and the private preview send the same framing headers', async () => {
  const toml = read('../netlify.toml');
  const tomlCsp = toml.match(/Content-Security-Policy = "([^"]+)"/)[1];
  const tomlXfo = toml.match(/X-Frame-Options = "([^"]+)"/)[1];
  const res = await routePreview(new Request('http://127.0.0.1/lessons/index.html'));
  assert.equal(res.headers.get('content-security-policy'), tomlCsp);
  assert.equal(res.headers.get('x-frame-options'), tomlXfo);
});

test('on phones the Mentor tab hides the chat list and downloads with CSS only', () => {
  const block = html.match(/@media \(max-width: 760px\) \{\s*\.app:has\(#view-mentor\.on\)[\s\S]*?\n {4}\}/)?.[0] ?? '';
  for (const sel of ['.app:has(#view-mentor.on) > aside', '.app:has(#view-mentor.on) #dl-json', '.app:has(#view-mentor.on) #dl-csv']) {
    assert.ok(block.includes(sel), `${sel} is hidden on phones`);
  }
  assert.match(block, /display: none;/);
});
