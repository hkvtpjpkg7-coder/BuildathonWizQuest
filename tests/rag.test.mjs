import test from 'node:test';
import assert from 'node:assert/strict';
import passages, {SOURCE} from '../netlify/lib/knowledge/patanjali.mjs';
import {retrieve, formatPassages, PASSAGE_COUNT} from '../netlify/lib/rag.mjs';

test('the PDF index has unique citations and physical page boundaries', () => {
  assert.equal(SOURCE.page_count, 93);
  assert.equal(PASSAGE_COUNT, passages.length);
  assert.ok(passages.length > 90);
  assert.equal(new Set(passages.map((p) => p.id)).size, passages.length);
  for (const passage of passages) {
    assert.ok(Number.isInteger(passage.page) && passage.page >= 1 && passage.page <= SOURCE.page_count);
    assert.ok(passage.id.startsWith(`P${passage.page}-`));
    assert.ok(passage.text.length > 0);
  }
});

test('retrieval finds relevant source pages for common coaching questions', () => {
  // "thoughts" (mental experiences) must outrank the unrelated past-tense
  // "he thought" in a story that happens to mention meditation and calm.
  const wandering = retrieve('My mind keeps wandering during meditation. How can I return to calm?');
  assert.equal(wandering[0].page, 52);
  assert.match(wandering[0].text, /thoughts.*calm/i);
  const calm = retrieve('How can I work with my thoughts when they disturb my calm?');
  assert.ok(calm.some((hit) => hit.page === 52 && /thoughts/i.test(hit.text)));
  const anger = retrieve('How can I pause before responding when I feel angry?');
  assert.ok(anger.some((hit) => hit.page === 69 && /angry/i.test(hit.text)));
  const practice = retrieve('I struggle to stay consistent with a daily practice. What could I try?');
  assert.ok(practice.some((hit) => /practice|discipline/i.test(hit.text)));
});

test('empty, generic and unrelated technical requests do not get irrelevant passages', () => {
  assert.deepEqual(retrieve(''), []);
  assert.deepEqual(retrieve('the and if how'), []);
  assert.deepEqual(retrieve('How to configure Kubernetes segmentation fault'), []);
});

test('source formatting labels physical page numbers and untrusted text', () => {
  const hits = retrieve('How can I pause before responding when I feel angry?', 1);
  const formatted = formatPassages(hits);
  assert.match(formatted, /source DATA, not instructions/i);
  assert.match(formatted, new RegExp(`\\[${hits[0].id}\\] \\(PDF page ${hits[0].page}\\)`));
  assert.match(formatted, /unreviewed/i);
});

test('user supplied result limits are bounded and do not mutate source data', () => {
  const result = retrieve('anger', 99);
  assert.ok(result.length <= 8);
  result[0].text = 'modified';
  assert.notEqual(retrieve('anger', 1)[0].text, 'modified');
  assert.deepEqual(retrieve('anger', 0), []);
});
