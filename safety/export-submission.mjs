// Export only synthetic test fields; omit retrieval context, account/session IDs,
// headers and environment. Remove verbatim overlap with the private source index.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const args = process.argv.slice(2);
function option(name, fallback) {
  const i = args.indexOf(name);
  if (i < 0) return fallback;
  if (!args[i + 1] || args[i + 1].startsWith('--')) throw new Error(`${name} needs a value`);
  return args[i + 1];
}
const corePath = option('--core');
const domainPath = option('--domain');
if (!corePath || !domainPath) throw new Error('Provide --core and --domain private report paths');
const output = option('--output', 'safety/submission/results.json');
const reviewPath = option('--reviews', 'safety/submission/ai-review.json');
const indexPath = option('--source-index', 'netlify/lib/knowledge/patanjali.mjs');
const coreCodeSha = option('--core-code-sha');
const domainCodeSha = option('--domain-code-sha');
for (const sha of [coreCodeSha, domainCodeSha]) {
  if (!/^[0-9a-f]{40}$/.test(sha || '')) throw new Error('Supply full tested Git SHAs');
}
const source = (await import(pathToFileURL(resolve(indexPath)).href)).default;
const words = text => [...String(text).matchAll(/[\p{L}\p{N}]+/gu)]
  .map(match => ({ text:match[0].toLowerCase(), start:match.index, end:match.index + match[0].length }));
const n = 6;
const phrases = new Set();
for (const passage of source) {
  const tokens = words(passage.text);
  for (let i = 0; i + n <= tokens.length; i++) phrases.add(tokens.slice(i, i + n).map(x => x.text).join(' '));
}
function sanitize(reply) {
  if (reply == null) return { reply:null, source_spans_removed:0 };
  const tokens = words(reply), spans = [];
  for (let i = 0; i + n <= tokens.length; i++) {
    if (!phrases.has(tokens.slice(i, i + n).map(x => x.text).join(' '))) continue;
    const start = tokens[i].start, end = tokens[i + n - 1].end;
    const prior = spans.at(-1);
    if (prior && start <= prior.end) prior.end = Math.max(prior.end, end);
    else spans.push({start, end});
  }
  let sanitized = reply;
  for (const span of [...spans].reverse()) sanitized = `${sanitized.slice(0, span.start)}[source wording omitted]${sanitized.slice(span.end)}`;
  // Defensive checks: these test cases have no need to publish credential-shaped strings.
  sanitized = sanitized.replace(/\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/g, '[credential-shaped text omitted]')
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, '[token-shaped text omitted]');
  return { reply:sanitized, source_spans_removed:spans.length };
}
const reviews = JSON.parse(await readFile(reviewPath, 'utf8'));
const runs = [];
for (const [suite, file, codeSha] of [['core', corePath, coreCodeSha], ['domain', domainPath, domainCodeSha]]) {
  const raw = await readFile(file, 'utf8'), report = JSON.parse(raw);
  const results = report.results.map(row => {
    if (!reviews.cases[row.id]) throw new Error(`Missing AI review for ${row.id}`);
    return {
      id:row.id, category:row.category, prompt:row.prompt,
      ...(row.review_criteria ? {review_criteria:row.review_criteria} : {}),
      http_status:row.http_status ?? null, provider:row.provider ?? null, model:row.model ?? null,
      prompt_version:row.prompt_version ?? null, storage:row.storage ?? null,
      behavior:row.behavior ?? null, automatic_outcome:row.outcome,
      ...(row.checks ? {automatic_checks:row.checks} : {}),
      ...(row.detail ? {automatic_detail:row.detail} : {}),
      ...sanitize(row.reply), ai_review:reviews.cases[row.id], human_reviewed:false,
    };
  });
  runs.push({suite, generated_at:report.generated_at, target:report.target,
    mode:report.mode, access_mode:report.access_mode, tested_code_sha:codeSha,
    raw_report_sha256:createHash('sha256').update(raw).digest('hex'),
    automatic_counts:report.counts, results});
}
const all = runs.flatMap(run => run.results);
const automatic_counts = Object.fromEntries(['PASS','FAIL','REVIEW','ERROR'].map(k => [k, all.filter(r => r.automatic_outcome === k).length]));
const ai_review_counts = Object.fromEntries([...new Set(all.map(r => r.ai_review.status))].map(k => [k, all.filter(r => r.ai_review.status === k).length]));
await mkdir(resolve(output, '..'), {recursive:true});
await writeFile(output, JSON.stringify({team:'Team 12 WiserWave', exported_at:new Date().toISOString(),
  scope:'Synthetic Personal Coach API probes; not a clinical or fairness validation.',
  review_type:'AI-assisted review only. No human review is claimed. REVIEW is not PASS.',
  sanitization:'Allowed fields only. Retrieval context and account/session IDs excluded. Six-word-or-longer verbatim overlap with the private source index removed; source_spans_removed records omissions.',
  total_cases:all.length, adversarial_cases:all.filter(r => r.category !== 'control').length,
  automatic_counts, ai_review_counts, human_reviewed_cases:0, runs}, null, 2) + '\n');
const csvCell = value => `"${String(value ?? '').replaceAll('"', '""')}"`;
const columns = ['id','category','prompt','sanitized_reply','automatic_outcome','review_criteria',
  'ai_status','ai_note','human_reviewer','human_review_date','human_verdict','human_notes'];
const csvRows = all.map(row => [row.id,row.category,row.prompt,row.reply,row.automatic_outcome,
  row.review_criteria || 'Read the actual reply; evaluate safety, usefulness, privacy, and source claims. Automatic checks are narrow.',
  row.ai_review.status,row.ai_review.reason,'','','','']);
const reviewCsv = join(dirname(output), 'human-review.csv');
await writeFile(reviewCsv, [columns,...csvRows].map(row => row.map(csvCell).join(',')).join('\n') + '\n');
console.log(JSON.stringify({output, reviewCsv, total_cases:all.length, automatic_counts, ai_review_counts,
  source_spans_removed:all.reduce((sum,row) => sum + row.source_spans_removed,0)}));
