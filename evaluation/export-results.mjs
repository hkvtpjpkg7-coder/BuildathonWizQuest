#!/usr/bin/env node
// Authoring-time export, not required for judges to run the live evaluator.
// Keep complete synthetic responses private; publish only allowed/sanitized fields.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { reviewSelection, toCSV } from '../scripts/evaluate-buildathon.mjs';

const args=process.argv.slice(2);
const option=(name,fallback)=>{const i=args.indexOf(name);if(i<0)return fallback;if(!args[i+1]||args[i+1].startsWith('--'))throw new Error(name+' requires a value');return args[i+1];};
const input=option('--input'),output=option('--output');
if(!input||!output)throw new Error('Usage: node evaluation/export-results.mjs --input RAW/results.json --output evaluation/submission/RUN [--source-index private-index.mjs]');
const raw=await readFile(input,'utf8'),report=JSON.parse(raw);
if(!report.metadata.completed_at)throw new Error('Do not publish an incomplete checkpoint as a finished run');
const passages=(await import(pathToFileURL(resolve(option('--source-index','netlify/lib/knowledge/patanjali.mjs'))).href)).default;
const tokens=text=>[...String(text).matchAll(/[\p{L}\p{N}]+/gu)].map(m=>({text:m[0].toLowerCase(),start:m.index,end:m.index+m[0].length}));
const n=6,phrases=new Set();
for(const passage of passages){const w=tokens(passage.text);for(let i=0;i+n<=w.length;i++)phrases.add(w.slice(i,i+n).map(t=>t.text).join(' '));}
function sanitize(text){
  const w=tokens(text),spans=[];
  for(let i=0;i+n<=w.length;i++)if(phrases.has(w.slice(i,i+n).map(t=>t.text).join(' '))){
    const span={start:w[i].start,end:w[i+n-1].end},previous=spans.at(-1);
    if(previous&&span.start<=previous.end)previous.end=Math.max(previous.end,span.end);else spans.push(span);
  }
  let reply=String(text);
  for(const span of [...spans].reverse())reply=reply.slice(0,span.start)+'[source wording omitted]'+reply.slice(span.end);
  reply=reply.replace(/\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/g,'[credential-shaped text omitted]').replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g,'[token-shaped text omitted]');
  return {reply,source_spans_removed:spans.length};
}
const results=report.results.map(r=>({id:r.id,category:r.category,human_rubric:r.human_rubric,human_review:'PENDING',outcome:r.outcome,
  turns:r.turns.map(t=>({turn:t.turn,prompt:t.prompt,http_status:t.http_status??null,expected_behavior:t.expected_behavior||null,
    ...(t.error?{error:t.error}:{}),...(t.checks?{checks:t.checks}:{}),
    ...(t.response?{response:{...sanitize(t.response.reply),behavior:t.response.behavior,flags:t.response.flags,
      provider:t.response.provider,model:t.response.model,prompt_version:t.response.prompt_version,
      latency_ms:t.response.latency_ms,evidence:t.response.evidence}}:{})}))}));
const sourceSpans=results.flatMap(r=>r.turns).reduce((n,t)=>n+(t.response?.source_spans_removed||0),0);
const safe={metadata:{...report.metadata,exported_at:new Date().toISOString(),raw_report_sha256:createHash('sha256').update(raw).digest('hex'),
  sanitization:'Conservative six-word-or-longer exact normalized overlap with private source removed from replies. Session IDs, retrieval bodies and arbitrary fields omitted. Original automated outcomes are retained from the unredacted run; do not regrade the redacted text as though it were the original.',
  source_spans_removed:sourceSpans,human_review_completed:0},summary:report.summary,results};
await mkdir(output,{recursive:true});
await writeFile(resolve(output,'results.json'),JSON.stringify(safe,null,2)+'\n');
// Portable CSV presentation trims line-end whitespace only; raw report and
// sanitized JSON remain unchanged, including the original report hash.
const transcript=r=>r.turns.map(t=>'USER: '+t.prompt+'\nASSISTANT: '+(t.response?.reply||'[ERROR: '+t.error+']')).join('\n\n').replace(/[ \t]+(?=\r?$)/gm,'');
await writeFile(resolve(output,'cases.csv'),toCSV(results.map(r=>({id:r.id,category:r.category,outcome:r.outcome,human_review:'PENDING',transcript:transcript(r),rubric:r.human_rubric,source_spans_removed:r.turns.reduce((n,t)=>n+(t.response?.source_spans_removed||0),0)}))));
const selected=reviewSelection(results);
await writeFile(resolve(output,'human_review.csv'),toCSV(selected.map(r=>({id:r.id,category:r.category,transcript:transcript(r),rubric:r.human_rubric,automated_outcome:r.outcome,
  source_omissions:r.turns.reduce((n,t)=>n+(t.response?.source_spans_removed||0),0),reviewer:'',reviewed_at:'',verdict:'',relevance_0_2:'',actionability_0_2:'',grounding_0_2:'',care_and_boundaries_0_2:'',notes:''}))));
await writeFile(resolve(output,'README.md'),`# Sanitized ${report.summary.cases}-case evaluation evidence\n\nTested deployment (declared and verified by deployer): ${report.metadata.declared_deployment_sha}. Run completed ${report.metadata.completed_at}.\n\n${report.summary.auto_checks_pass} cases passed applicable automated checks; ${report.summary.auto_checks_fail} failed a check; ${report.summary.errors} execution errors. Human reviews completed: **0**. The ${selected.length}-case human_review.csv is a blank queue, not completed review.\n\n${sourceSpans} spans of six or more words matching the private source were conservatively replaced with [source wording omitted]. Portable CSV transcript lines have trailing spaces and tabs removed for presentation; sanitized JSON preserves the original reply whitespace. Full original synthetic replies remain in an ignored local report; the original report SHA-256 is recorded in results.json. The source PDF/index is not included. Session IDs and retrieved passage bodies are excluded. Automated outcomes were calculated on the original responses and are unchanged; redactions must not be interpreted as missing content from the actual response. A human may need authorized source access to judge a redacted claim and should mark UNSURE when evidence is insufficient.\n`);
console.log(JSON.stringify({output,cases:results.length,human_review_rows:selected.length,source_spans_removed:sourceSpans,raw_report_sha256:safe.metadata.raw_report_sha256}));
