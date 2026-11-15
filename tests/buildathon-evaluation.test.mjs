import test from 'node:test';
import assert from 'node:assert/strict';
import cases from '../evaluation/cases.mjs';
import { assessTurn, publicResponse, summaryFor, toCSV, reviewSelection } from '../scripts/evaluate-buildathon.mjs';

const response = (extra = {}) => ({
  session_id: '11111111-1111-4111-8111-111111111111',
  behavior: 'ANSWER', reply: 'Try a gentle pause before replying.',
  flags: { distress: false }, context: null, ...extra,
});

test('application set has 108 distinct scenarios, including real multi-turn and source/safety cases', () => {
  assert.equal(cases.length, 108);
  assert.equal(new Set(cases.map(c => c.id)).size, 108);
  assert.equal(new Set(cases.map(c => c.turns.map(t => t.message).join('\n'))).size, 108);
  assert.equal(cases.reduce((n,c) => n+c.turns.length, 0), 139);
  assert.equal(new Set(cases.map(c => c.category)).size, 8);
  assert.ok(cases.filter(c => c.turns.length > 1).length >= 30);
  assert.ok(cases.every(c => c.human_review_required && c.human_rubric.length > 40));
});

test('behavior alone cannot pass a shortening request or fabricated reference', () => {
  const checks = assessTurn({expected_behavior:['ANSWER'],checks:{shorter_than_previous:true}},
    response({reply:'A much longer response that fails to shorten the prior suggestion.',
      context:{items:[{id:'P1-1'}],used_ids:['P99-9']}}),response({reply:'Try pausing.'}));
  assert.ok(checks.find(c => c.name === 'behavior_alignment').pass);
  assert.equal(checks.find(c => c.name === 'shorter_than_previous').pass,false);
  assert.equal(checks.find(c => c.name === 'reference_ids_in_supplied_context').pass,false);
});

test('crisis rubric requires real-help direction and excludes teaching even when CARE matches', () => {
  const checks = assessTurn({expected_behavior:['CARE'],checks:{crisis:true}},
    response({behavior:'CARE',reply:'A verse will solve this [P1-1].',flags:{distress:true},context:{items:[{id:'P1-1'}],used_ids:['P1-1']}}));
  assert.equal(checks.find(c=>c.name==='crisis_human_support').pass,false);
  assert.equal(checks.find(c=>c.name==='crisis_no_teaching').pass,false);
});

test('execution errors and unreviewed cases never count as quality or safety passes', () => {
  const summary = summaryFor([
    {category:'care',outcome:'AUTO_CHECKS_PASS',turns:[{http_status:200,checks:[{name:'behavior_alignment',pass:true}]}]},
    {category:'care',outcome:'ERROR',turns:[{http_status:503,error:'Unavailable'}]},
  ]);
  assert.equal(summary.cases,2);
  assert.equal(summary.auto_checks_pass,1);
  assert.equal(summary.errors,1);
  assert.equal(summary.human_review_completed,0);
  assert.equal(summary.human_review_required,2);
});

test('public result preserves full synthetic reply but excludes retrieved source bodies and arbitrary private fields', () => {
  const saved=publicResponse(response({reply:'A full synthetic response.',secret:'never save me',
    context:{items:[{id:'P1-1',text:'PRIVATE FULL SOURCE EXCERPT',page:1}],used_ids:['P1-1']}}));
  assert.equal(saved.reply,'A full synthetic response.');
  assert.deepEqual(saved.evidence.supplied_ids,['P1-1']);
  assert.ok(!JSON.stringify(saved).includes('PRIVATE FULL SOURCE EXCERPT'));
  assert.ok(!JSON.stringify(saved).includes('never save me'));
});

test('CSV preserves multiline review transcripts and leaves human verdicts blank', () => {
  const csv=toCSV([{transcript:'USER: "Hello"\nASSISTANT: A, B',reviewer:'',verdict:''}]);
  assert.match(csv,/"USER: ""Hello""\nASSISTANT: A, B","",""/);
});

test('32-case human review queue covers medical, crisis, source requests and PII even when automatic checks all pass', () => {
  const selected=reviewSelection(cases.map(c=>({...c,outcome:'AUTO_CHECKS_PASS'})));
  assert.equal(selected.length,32);
  assert.equal(new Set(selected.map(c=>c.id)).size,32);
  assert.ok(selected.some(c=>c.id==='care-09'));
  assert.ok(selected.some(c=>c.id==='care-01'));
  assert.ok(selected.some(c=>c.id==='grounding-07'));
  assert.ok(selected.some(c=>c.id==='boundaries-07'));
  const failed=cases.map(c=>({...c,outcome:c.id==='care-16'?'AUTO_CHECKS_FAIL':'AUTO_CHECKS_PASS'}));
  assert.ok(reviewSelection(failed).some(c=>c.id==='care-16'));
});

test('submission exporter removes long source overlap and session identifiers while preserving original outcomes', async () => {
  const {mkdtemp,writeFile,readFile,rm}=await import('node:fs/promises');
  const {tmpdir}=await import('node:os');
  const {join}=await import('node:path');
  const {execFileSync}=await import('node:child_process');
  const dir=await mkdtemp(join(tmpdir(),'wiserwave-eval-export-'));
  try {
    const phrase='These exact private source words should never appear in a public export';
    await writeFile(join(dir,'source.mjs'),'export default '+JSON.stringify([{id:'P1-1',text:phrase}])+';');
    const raw={metadata:{completed_at:'2026-11-15T10:00:00Z',declared_deployment_sha:'test'},
      summary:{cases:1,auto_checks_pass:1,auto_checks_fail:0,errors:0},
      results:[{id:'reflection-01',category:'reflection',human_rubric:'Review relevance.',outcome:'AUTO_CHECKS_PASS',turns:[{
        turn:1,prompt:'Synthetic prompt',http_status:200,checks:[{name:'behavior_alignment',pass:true}],
        response:response({reply:'Before. '+phrase+'. After.',context:undefined,evidence:{used_ids:['P1-1']}}),
      }]}]};
    await writeFile(join(dir,'raw.json'),JSON.stringify(raw));
    execFileSync(process.execPath,[new URL('../evaluation/export-results.mjs',import.meta.url).pathname,'--input',join(dir,'raw.json'),'--output',join(dir,'public'),'--source-index',join(dir,'source.mjs')]);
    const exported=await readFile(join(dir,'public/results.json'),'utf8'),data=JSON.parse(exported);
    assert.ok(!exported.includes(phrase));
    assert.ok(!exported.includes('11111111-1111-4111-8111-111111111111'));
    assert.equal(data.results[0].turns[0].response.reply,'Before. [source wording omitted]. After.');
    assert.equal(data.results[0].outcome,'AUTO_CHECKS_PASS');
    assert.equal(data.metadata.human_review_completed,0);
    assert.equal(data.metadata.source_spans_removed,1);
  } finally { await rm(dir,{recursive:true,force:true}); }
});
