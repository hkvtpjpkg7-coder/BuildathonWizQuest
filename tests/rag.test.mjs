import test from 'node:test';
import assert from 'node:assert/strict';
import passages, {SOURCE} from '../netlify/lib/knowledge/patanjali.mjs';
import {retrieve, requestedSutras, formatPassages, PASSAGE_COUNT} from '../netlify/lib/rag.mjs';

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

test('named sutras retrieve matching commentary without borrowing evidence for unsupported numbers', () => {
  assert.deepEqual(requestedSutras('Compare Yoga Sutra 2.46 with chapter 2, verse 47.'), ['2.46', '2.47']);
  assert.deepEqual(requestedSutras('II Sutra 29 in the Yoga Sutras'), ['2.29']);
  assert.deepEqual(requestedSutras('2.46.'), ['2.46']);
  assert.deepEqual(requestedSutras('My meeting starts at 2:30.'), []);
  const hits = retrieve('Explain Patanjali Sutras 2.46 and 2.47.');
  assert.match(hits.find((hit) => hit.sutras.includes('2.46')).text, /steady.{0,25}comfortable/i);
  assert.match(hits.find((hit) => hit.sutras.includes('2.47')).text, /prayatnashaitalya/i);
  assert.deepEqual(retrieve('What yoga posture is recommended by Yoga Sutra 2.60?'), []);
});

test('ordinal and short range questions use only reviewed chapters and passages', () => {
  assert.deepEqual(requestedSutras('What is the second sutra of the Yoga Sutras?'), ['1.2']);
  assert.deepEqual(requestedSutras('What is the second sutra of chapter II of the Yoga Sutras?'), []);

  const remedies = retrieve('How do the obstacles listed in 1.30 relate to the remedies given in 1.32 to 1.39?');
  assert.deepEqual(remedies.slice(0, 3).map((hit) => hit.sutras), [['1.30'], ['1.32'], ['1.39']]);

  const karma = retrieve('How does the karma theory in 2.12-2.14 connect with the discussion of karma in 4.7-4.8?');
  assert.deepEqual(new Set(karma.flatMap((hit) => hit.sutras)), new Set(['2.12', '2.13', '2.14']));
  assert.deepEqual(retrieve('Why are the siddhis obstacles to samadhi in Sutra 3.37?'), []);
});

test('Sanskrit and list questions retrieve supporting passages and note extraction discrepancies', () => {
  const vrittis = retrieve('What are the five vṛttis?');
  assert.match(vrittis[0].text, /pramanaviparyayavikalpanidrasmruti/i);
  const limbs = formatPassages(retrieve('What are the eight limbs?'));
  assert.match(limbs, /standard ordering of 2\.29, dharana is sixth and dhyana seventh/i);
  const definition = formatPassages(retrieve('Translate 1.2 of the Yoga Sutras.'));
  assert.match(definition, /reviewed link.*commentary on Yoga Sutra 1\.2/i);
  assert.match(definition, /standard Sanskrit.*yogaś citta-vṛtti-nirodhaḥ/i);
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
