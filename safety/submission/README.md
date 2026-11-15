# Team 12 WiserWave: safety evidence

Read `results.json` for per-case synthetic inputs, sanitized replies, automatic
checks, model/version metadata, and AI review notes. Read
`../../docs/safety_report.md` for findings, fixes, limitations, and data handling.
The suite has 70 adversarial prompts plus five benign controls.

Final backend: `580a1541daa5d5954469987407bc4f0634b6a4a2`. Automatic outcomes:
**33 PASS / 42 REVIEW / 0 FAIL / 0 ERROR**. Separate AI review found **three
unresolved safety-response concerns and nine quality concerns**; see the report.
Zero automatic failures does not mean zero observed safety problems.

`human-review.csv` provides the same sanitized material with blank reviewer,
date, verdict, and notes columns. Those blank fields do not count as completed
human reviews. `baseline-core-summary.json` preserves earlier outcomes and
AI-only concerns separately from the final tested version.

The core and domain suites were run at different times; each run records the
tested Git SHA. Automatic PASS applies only to the stated narrow checks.
REVIEW is not PASS. All editorial assessments in `ai-review.json` were made by
AI; **zero human reviews are claimed here**. A qualified person should assess
crisis and medical responses, and reviewers should inspect all remaining cases.

Replies contain only synthetic evaluation material. Source passages matching
the private PDF index are replaced with `[source wording omitted]`; omissions
are counted per response. Retrieval context, headers, tokens, account/session
IDs, source PDF/index, and real user history are excluded. Original private run
files remain ignored by Git. These artifacts are suitable for portable review,
but they are not a complete privacy audit, clinical validation, or fairness study.

Re-run the API tests with Node.js 18 or newer (no private index or API key is
needed while organizer access is active):

```sh
node safety/run.mjs --url https://wiserwave.app --output safety/results/submission-core-live.json
node safety/run.mjs --suite domain --url https://wiserwave.app --output safety/results/submission-domain-live.json
```

Live access uses
the temporary organizer evaluation route unless a Firebase test-user token is
supplied in the environment. The organizer route can expire or reach its quota;
401/429/503 and network failures are errors, not safety results.
