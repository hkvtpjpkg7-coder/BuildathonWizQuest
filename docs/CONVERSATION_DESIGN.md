# Coach conversation handling

The Coach interprets the user's conversational intent before searching the
commentary. Previously, `I see` retrieved passages about seeing, while `got it`
could be declined because it had no lexical matches. Requiring citations for
every reply made ordinary conversation impossible.

## Flow

1. Authenticate and load only the caller's session; apply existing limits,
   privacy redaction, crisis checks, and explicit clinical routing.
2. Handle explicit source requests and initial local clarification as before.
3. Ask the configured language model to classify the redacted conversational
   turn, with bounded history and no retrieved source passages.
4. Acknowledgment, closure, and clarification receive brief source-free replies.
   A substantive continuation or new topic supplies a standalone retrieval query.
   An acceptance of an offer is a continuation; a mixed acknowledgment/question
   is evaluated as a whole. Corrections replace earlier assumptions.
5. Retrieve only when the turn needs a teaching answer. Rephrasing/application
   can reuse the active answer's verified references. New topics use their own
   query. Validate all claimed source IDs and apply existing output safeguards.

Only pure acknowledgment turns are transparent to the active context. A decline,
clinical/crisis response, closure, or substantive new subject becomes the next
context boundary. The planner preserves an older active exchange within its
existing history budget when repeated acknowledgments would otherwise evict it.
The session still stores each exchange normally, so reopening a conversation
retains this behavior. A source request about an acknowledgment correctly says
that the acknowledgment used no specific source.

## Boundaries

- Crisis handling and explicit medical requests take priority and do not require
  a successful language-model call. Resolved queries are checked again before
  retrieval, and medication context survives intervening acknowledgments.
- The planner has a validated schema. Malformed output or a provider failure
  gets one bounded repair attempt, then a short clarification; raw model output is never displayed and there
  is no fallback search for literal acknowledgment words.
- A valid acknowledgment or closure intent with an empty reply uses a short
  server-owned response, so choosing silence cannot trigger another question.
- Source-free replies are limited to 45 words/350 characters, with checks for
  obvious source claims and advice. This is not proof of semantic correctness.
- Acknowledgments use one model call; a sourced substantive response normally
  uses two. This adds latency and token cost, included in response usage totals.
- Retrieval remains lexical. Model interpretation and source support still need
  evaluation and human review. The offline mock is only a wiring preview, not a
  substitute for testing the actual model.

## Reproduce checks

`node --test tests/*.test.mjs` runs unit/integration tests with phase-aware provider
fixtures. `node scripts/evaluate-conversation.mjs --target https://wiserwave.app`
runs synthetic multi-turn checks through the temporary organizer endpoint and
writes a JSON report to `/tmp/wiserwave-conversation-results.json` by default.
Omitting `--target` runs an isolated CLI handler with memory storage using the
configured provider. It starts no server and never reads real user sessions.
The synthetic checks cover the requested phrases, paraphrases, first turns,
follow-ups, correction, topic changes, closure, provenance, medication, and crisis.
Automated results do not establish clinical safety or replace human review.
