import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// Run the real game handlers with a small DOM and deterministic timers. The
// private test hooks are injected in memory; the browser does not expose them.
function harness() {
  const timers = new Map(), frames = new Map(), animations = [];
  let nextId = 0;
  const elements = new Map(), storage = new Map();
  function element() {
    const listeners = new Map();
    return {
      innerHTML: '', textContent: '', dataset: {}, style: {}, children: [], listeners,
      classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
      viewBox: { baseVal: { height: 180 } },
      addEventListener(type, fn) { listeners.set(type, fn); },
      querySelector() { return null; }, querySelectorAll() { return []; },
      append(...children) { this.children.push(...children); },
      appendChild(child) { this.children.push(child); },
      insertAdjacentHTML() {}, setAttribute() {}, focus() {}, remove() {},
      getBoundingClientRect() { return { left: 0, top: 0, width: 0, height: 0 }; },
      animate() {
        const animation = { cancelled: false, pause() {}, cancel() { this.cancelled = true; } };
        animations.push(animation);
        return animation;
      },
    };
  }
  const el = (id) => {
    if (!elements.has(id)) elements.set(id, element());
    return elements.get(id);
  };
  el('cr').firstChild = element();
  const context = {
    window: { scrollTo() {} },
    localStorage: { getItem(key) { return storage.get(key) ?? null; }, setItem(key,value) { storage.set(key,value); } },
    document: {
      getElementById: el,
      querySelector(selector) { return selector === '.scene' ? el('scene') : null; },
      createElement: element,
      body: element(),
    },
    ResizeObserver: class { observe() {} unobserve() {} disconnect() {} },
    performance: { now: () => 0 },
    setTimeout(fn) { const id = ++nextId; timers.set(id, fn); return id; },
    clearTimeout(id) { timers.delete(id); },
    requestAnimationFrame(fn) { const id = ++nextId; frames.set(id, fn); return id; },
    cancelAnimationFrame(id) { frames.delete(id); },
  };
  let source = readFileSync(new URL('../public/lessons/engine.js', import.meta.url), 'utf8');
  const marker = 'return {start(){';
  assert.ok(source.includes(marker));
  source = source.replace(marker, `return {test:{STEPS,CARDS,leave,renderCard,result,
    setLesson(lesson,index=0){L=lesson;ci=index;petals=[false,false,false];doneC=[false,false,false]},
    setCard(index){ci=index},
    setResults(scores,lost=false){results=scores.map((score,i)=>({score,s:L.steps[i]}));mode={lost}}},start(){`);
  vm.runInNewContext(source, context, { filename: 'mentor-engine.js' });
  return { engine: context.window.YS.test, el, element, timers, frames, animations, storage,
    flush() { const pending = [...timers.values()]; timers.clear(); pending.forEach(fn => fn()); } };
}

function answerQuiz(h, done, count = 1) {
  const button = h.element();
  button.dataset.k = 'yes';
  const progress = Array.from({ length: count }, () => h.element());
  h.el('cq').querySelectorAll = () => [button];
  h.el('st').querySelectorAll = () => progress;
  h.engine.STEPS.choose({
    title: 'Choose the present', visual: 'card', shuffle: false,
    options: [{ k: 'yes', t: 'Now' }],
    items: Array.from({ length: count }, () => ({ text: 'When?', a: 'yes', why: ['Now.'] })),
  }, { st: h.el('st'), ui: h.el('ui'), done });
  button.onclick();
}

test('a quiz still awards its result after the feedback delay on the same screen', () => {
  const h = harness(), results = [];
  answerQuiz(h, result => results.push(result));
  assert.equal(results.length, 0);
  h.flush();
  assert.equal(results.length, 1);
  assert.equal(results[0].score, 1);
});

test('leaving a quiz before its delayed result cannot award the old answer to another lesson', () => {
  const h = harness(), results = [];
  answerQuiz(h, result => results.push(result));
  const queued = [...h.timers.values()];
  h.engine.leave();
  h.flush();
  // Also model a completion event already queued by the browser at navigation.
  queued.forEach(fn => fn());
  assert.equal(results.length, 0);
});

test('leaving between quiz questions cannot reopen feedback on the path', () => {
  const h = harness();
  answerQuiz(h, () => assert.fail('quiz is not finished'), 2);
  h.engine.leave();
  h.flush();
  assert.equal(h.el('app').children.length, 0, 'no stale feedback dialog is appended');
});

test('leaving a gaze card cancels its animation and ignores queued completion', () => {
  const h = harness();
  h.engine.setLesson({ id: 'gaze' });
  const button = h.element();
  button.dataset.i = '0';
  h.el('cb').querySelectorAll = () => [button];
  let completed = 0;
  h.engine.CARDS.choice({ options: [{ t: 'Begin' }], quote: 'Pause.',
    gaze: { button: 'Look', seconds: 5, done: 'Finished.' } }, h.el('cb'), () => completed++);
  button.onclick();
  h.el('gz').onclick();
  const animation = h.animations.at(-1);
  const finish = animation.onfinish;
  h.engine.leave();
  finish();
  assert.equal(animation.cancelled, true);
  assert.equal(completed, 0, 'the previous card cannot collect a petal after navigation');
});

test('moving back or forward from a practice hold card stops its animation loop', () => {
  const h = harness();
  h.engine.setLesson({ id: 'practice', sutra: '1.1', cards: [
    { type: 'holdtry', title: 'Practise', seconds: 6 },
    { type: 'tap', title: 'Next card', statement: 'Read this.', button: 'Continue' },
  ] });
  h.engine.renderCard();
  h.el('po').listeners.get('pointerdown')({ preventDefault() {}, pointerId: 1 });
  assert.equal(h.frames.size, 1);
  h.engine.setCard(1);
  h.engine.renderCard();
  assert.equal(h.frames.size, 0, 'the departed card no longer accesses its removed controls');
});

function lesson(id) {
  const context = { window: {}, YS: { U: () => '' } };
  vm.runInNewContext(readFileSync(new URL('../public/lessons/lessons.js', import.meta.url), 'utf8'), context);
  return context.window.LESSONS.find(item => item.id === id);
}

function finishLesson(id, scores) {
  const h = harness();
  h.engine.setLesson(lesson(id));
  h.engine.setResults(scores);
  h.engine.result();
  return { html: h.el('app').innerHTML, saved: JSON.parse(h.storage.get('ys1-done'))[id] };
}

test('Story Keeper uses the stated four-of-five quiz requirement, independent of reflection focus', () => {
  for (const scores of [[1, .56], [.8, .1]]) {
    const { html, saved } = finishLesson('legend', scores);
    assert.match(html, /Badge earned: Story Keeper/);
    assert.equal(saved.badge, 'Story Keeper');
    assert.equal(saved.best, Math.round((scores[0] + scores[1]) / 2 * 100), 'overall lesson score still includes reflection');
  }
});

test('perfect reflection cannot award Story Keeper for only three correct story answers', () => {
  const { html, saved } = finishLesson('legend', [.6, 1]);
  assert.match(html, /Almost there: Story Keeper/);
  assert.equal(saved.badge, '');
});

test('badges with a whole-lesson requirement still use the average across exercises', () => {
  const earned = finishLesson('atha', [.8, .6]);
  assert.equal(earned.saved.badge, 'Now-Keeper');
  const missed = finishLesson('atha', [.8, .4]);
  assert.equal(missed.saved.badge, '');
});
