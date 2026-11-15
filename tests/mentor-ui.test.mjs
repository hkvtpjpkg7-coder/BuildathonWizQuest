import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// The Mentor prototype lives in its own inline <script> in public/index.html.
// These tests run that script with no DOM and with storage/network traps, so any
// attempt to send or persist a request fails the test.
const html = fs.readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
const scripts = [...html.matchAll(/^<script>\s*\n([\s\S]*?)^<\/script>/gm)].map((m) => m[1]);
const mentorScript = scripts.find((s) => s.includes('globalThis.WizMentor'));

function loadMentor() {
  const trap = (name) => () => { throw new Error(`${name} must not be used by the Mentor prototype`); };
  const context = {
    document: { getElementById: () => null },
    fetch: trap('fetch'),
    XMLHttpRequest: trap('XMLHttpRequest'),
    localStorage: { getItem: trap('localStorage'), setItem: trap('localStorage') },
    sessionStorage: { getItem: trap('sessionStorage'), setItem: trap('sessionStorage') },
    console,
  };
  context.globalThis = context;
  vm.runInNewContext(mentorScript, context);
  return context.WizMentor;
}

test('Mentor runs in its own script, separate from the Personal Coach script', () => {
  assert.ok(mentorScript, 'mentor script exists');
  assert.equal(scripts.length, 2);
  assert.ok(!scripts[0].includes('WizMentor'), 'coach script is unchanged by Mentor');
});

test('Mentor script never sends, stores or reads coach data', () => {
  for (const banned of ['fetch(', 'XMLHttpRequest', 'localStorage', 'sessionStorage', 'sendBeacon', '/api/', 'wizquest_coach', 'wizquest_active_session']) {
    assert.ok(!mentorScript.replace(/^\s*\/\/.*$/gm, '').includes(banned), `mentor script does not use ${banned}`);
  }
});

test('sample mentors are fictional and filter by topic', () => {
  const m = loadMentor();
  assert.deepEqual([...m.TOPICS.map((t) => t.label)], ['Work stress', 'Relationships', 'Meditation practice', 'Personal growth']);
  assert.ok(m.MENTORS.length >= 4);
  assert.ok(m.MENTORS.every((x) => x.id.startsWith('sample-') && /sample mentor/i.test(x.intro)));
  assert.equal(m.filterMentors('all').length, m.MENTORS.length);
  for (const t of m.TOPICS) {
    const list = m.filterMentors(t.id);
    assert.ok(list.length > 0, `${t.label} has at least one mentor`);
    assert.ok(list.every((x) => x.topics.includes(t.id)));
  }
});

test('a submitted request is a sample kept in page memory and marked not sent', () => {
  const m = loadMentor();
  const mentor = m.MENTORS[0];
  const r = m.submitRequest(mentor.id, mentor.topics[0], '  A short note.  ');
  assert.equal(r.sample, true);
  assert.equal(r.status, 'Prototype only: not sent');
  assert.equal(r.description, 'A short note.');
  assert.equal(m.requests().length, 1);
  m.submitRequest(mentor.id, mentor.topics[0]);
  assert.equal(m.requests().length, 2, 'description is optional');
  assert.equal(m.requests()[0].description, '');
});

test('requests are validated', () => {
  const m = loadMentor();
  const mentor = m.MENTORS.find((x) => !x.topics.includes('relationships'));
  assert.throws(() => m.createRequest('no-such-mentor', 'growth'), /Unknown sample mentor/);
  assert.throws(() => m.createRequest(mentor.id, 'relationships'), /areas of focus/);
  assert.throws(() => m.createRequest(mentor.id, mentor.topics[0], 'x'.repeat(m.MAX_DESCRIPTION + 1)), /under 300/);
  assert.equal(m.requests().length, 0, 'createRequest alone stores nothing');
});

test('the Mentor view carries the required notices', () => {
  const view = html.match(/<section class="view" id="view-mentor">[\s\S]*?<\/section>/)?.[0] ?? '';
  assert.ok(html.includes('<button data-view="mentor">Mentor · prototype</button>'));
  assert.match(view, /Prototype with sample data/);
  assert.match(view, /fictional and requests are not sent/);
  assert.match(view, /not emergency or clinical care/);
  assert.match(mentorScript, /has not been sent/);
  assert.match(mentorScript, /no session is booked/);
  assert.match(mentorScript, /don't enter names, health details or other sensitive personal information/);
  assert.match(mentorScript, /Personal Coach conversation is not shared with Mentor/);
});

test('keyboard focus follows the selected filter and each new Mentor screen', () => {
  const document = { body: {}, activeElement: null };
  class Element {
    constructor(tag) { this.tagName = tag.toUpperCase(); this.children = []; this.attributes = {}; this.listeners = {}; }
    append(...children) { this.children.push(...children); }
    replaceChildren(...children) { this.children = children; }
    setAttribute(name, value) { this.attributes[name] = String(value); }
    addEventListener(name, callback) { this.listeners[name] = callback; }
    focus() { document.activeElement = this; }
    click() { this.focus(); this.listeners.click?.({ preventDefault() {} }); }
    querySelector(selector) {
      const match = (element) => selector === 'h2'
        ? element.tagName === 'H2'
        : element.attributes['data-mentor-topic-filter'] === selector.match(/^\[data-mentor-topic-filter="([^"]+)"\]$/)?.[1];
      return find(this, match);
    }
    scrollTo() {}
  }
  const find = (node, predicate) => {
    if (!(node instanceof Element)) return null;
    if (predicate(node)) return node;
    for (const child of node.children) { const found = find(child, predicate); if (found) return found; }
    return null;
  };
  const root = new Element('div');
  const navBrowse = new Element('button');
  const navRequests = new Element('button');
  const mentor = new Element('div');
  const elements = { 'mentor-root': root, 'mentor-nav-browse': navBrowse, 'mentor-nav-requests': navRequests, mentor };
  document.getElementById = (id) => elements[id] ?? null;
  document.createElement = (tag) => new Element(tag);
  const context = { document, console };
  context.globalThis = context;
  vm.runInNewContext(mentorScript, context);

  const filter = root.querySelector('[data-mentor-topic-filter="work-stress"]');
  assert.ok(filter);
  filter.click();
  assert.equal(document.activeElement, root.querySelector('[data-mentor-topic-filter="work-stress"]'));
  assert.notEqual(document.activeElement, filter, 'focus moved to the replacement filter');
  const profile = find(root, (e) => e.tagName === 'BUTTON' && e.attributes['aria-label'] === 'View sample profile: Mira');
  assert.ok(profile);
  profile.click();
  assert.equal(document.activeElement, root.querySelector('h2'));
  assert.equal(document.activeElement.tabIndex, -1);
  const request = find(root, (e) => e.tagName === 'BUTTON' && e.textContent === 'Start a sample request');
  request.click();
  assert.equal(document.activeElement, root.querySelector('h2'));
  navRequests.click();
  assert.equal(document.activeElement, root.querySelector('h2'));
  assert.equal(document.activeElement.textContent, 'My requests');
});
