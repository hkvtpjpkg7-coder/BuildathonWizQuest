import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// Exercise the displayed response rather than the underlying stored/API text.
function showReply(text, data) {
  const html = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
  const start = html.indexOf('  function addBubble(role, text, data) {');
  const end = html.indexOf('\n  // FLOW 1, browser side:', start);
  assert.ok(start >= 0 && end > start, 'coach bubble renderer exists');
  const thread = { children: [], querySelector: () => null, append(child) { this.children.push(child); } };
  const el = (tag, props = {}, ...children) => ({ tag, ...props, children,
    append(...items) { this.children.push(...items); }, scrollIntoView() {} });
  const scope = { thread, el };
  vm.runInNewContext(`${html.slice(start, end)}\nthis.show = addBubble;`, scope);
  return scope.show('assistant', text, data);
}

test('reference details are optional and include only validated evidence', () => {
  const bubble = showReply('A gentle pause may help.', { behavior: 'ANSWER', context: {
    type: 'rag', used_ids: ['P8-1'], items: [
      { id: 'P8-1', page: 8, text: 'Relevant commentary' },
      { id: 'P9-1', page: 9, text: 'Retrieved but not used' },
    ],
  } });
  assert.equal(bubble.textContent, 'A gentle pause may help.');
  const details = bubble.children.find((item) => item.tag === 'details');
  assert.ok(details, 'reference opens only on request');
  assert.equal(details.children[0].textContent, 'Explore the reference');
  assert.match(details.children[1].textContent, /commentary on Patanjali’s Yoga Sutras/);
  assert.equal(details.children[2].children.length, 1);
  assert.match(details.children[2].children[0].children[0].textContent, /P8-1/);
});

test('older saved answers hide citation markers but preserve optional provenance', () => {
  const bubble = showReply('Try a pause [P8-1], [P8-2]. Then notice how you feel.', {
    behavior: 'ANSWER', context_type: 'rag', context_ids: ['P8-1', 'P8-2', 'P9-1'],
  });
  assert.equal(bubble.textContent, 'Try a pause. Then notice how you feel.');
  const details = bubble.children.find((item) => item.tag === 'details');
  assert.match(details.children[2].textContent, /P8-1, P8-2/);
  assert.doesNotMatch(details.children[2].textContent, /P9-1/);
});

test('a source explicitly requested remains visible and unsourced replies have no reference panel', () => {
  const sourced = showReply('The reference is [P8-1].', { context: {
    type: 'rag', source_requested: true, used_ids: ['P8-1'],
    items: [{ id: 'P8-1', page: 8, text: 'Relevant commentary' }],
  } });
  assert.equal(sourced.textContent, 'The reference is [P8-1].');
  const question = showReply('I’m here. What has been feeling most difficult?', { behavior: 'ANSWER' });
  assert.equal(question.children.some((item) => item.tag === 'details'), false);
});

test('saved declines and care responses do not display old source metadata', () => {
  for (const behavior of ['DECLINE', 'CARE']) {
    const bubble = showReply('I cannot help with that request.', {
      behavior, context_type: 'rag', context_ids: ['P8-1'], context_used_ids: ['P8-1'],
    });
    assert.equal(bubble.children.some((item) => item.tag === 'details'), false);
  }
});
