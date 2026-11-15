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
