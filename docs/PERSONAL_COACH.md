# WiserWave Personal Coach

The Personal Coach helps with a specific everyday question or situation. It
searches locally indexed excerpts of the supplied *Patanjali Yoga Sutras*
commentary and uses a model to offer a tentative reflection. Relevant source
references are available through **Explore the reference** or an explicit
source question; physical PDF page numbers are not sutra numbers.

The coach uses recent messages in the current conversation, asks for useful
context when a concern is underspecified, and supports grounded follow-ups,
including shortening its previous answer. It is paired with the Mentor tab's
incremental lessons and exercises; see [Mentor](MENTOR.md).

Google sign-in is implemented with Firebase. Private coach conversations are
bound to the verified account, and both chat and history APIs enforce that
ownership. Password-based accounts are not implemented. See
[authentication setup and limitations](AUTH_PLAN.md).

## Run locally

First generate the PDF index as described below. **A fresh clone does not
include the generated index and cannot run the coach backend or its retrieval
tests until this step is complete.** The running demonstration already has its
own index. Remote evaluation with `--target https://wiserwave.app` does not
import the local backend and does not need the PDF, index, `.env`, or model key;
see the [judge guide](../README.md).

Install Node.js 24 LTS and the project dependencies (`npm install`), then
copy `.env.example` to `.env`. For real model-generated answers, configure an
existing supported provider in `.env`, for example `LLM_PROVIDER=openai` and
`OPENAI_API_KEY` with an OpenAI Platform project key. You may set
`OPENAI_MODEL` to a model available to that project. Never paste keys into this
repository or a chat. OpenAI API access and any applicable credits are managed
separately from a signed-in Codex session.

Authentication fails closed until configured. For a private local-only preview,
explicitly set `AUTH_PROVIDER=off`; never use that setting on a public site.
For Google sign-in, follow [the Firebase setup and validation steps](AUTH_PLAN.md).
The in-browser runner uses the signed-in account. The public judge runner uses
the separate, temporary organizer evaluation path; it does not sign in or test
Google authentication. The [safety runner](../safety/README.md) also documents an
optional short-lived Firebase-token mode for an operator's test account.

Run `npm run dev` and open the address Netlify prints. If no provider is
configured, the app uses **mock mode**, which only shows an extracted source
passage and explicitly says it is not a personalized AI response. An Ollama
provider is available for local development if an Ollama service and model are
already installed; it is not suitable as a localhost dependency on Netlify.

## Private Codex experiment

An opt-in `codex` provider supports a trusted-user, local-process test using a
Codex CLI that is already signed in on the same machine. Set both
`LLM_PROVIDER=codex` and `WIZQUEST_PRIVATE_CODEX=1` for that test process; these
settings are intentionally absent from the example environment file. Sign-in
credentials must remain private and must never be committed. The Codex process
receives the question, recent conversation and retrieved PDF excerpts.

Do not enable this provider on the public, unauthenticated website. The Codex
read-only sandbox limits writes, but does not guarantee that local tools cannot
read files or that prompt injection cannot influence the agent. The signed-in
account's usage limits apply. Whether a remotely hosted multi-user deployment
is eligible for subscription-backed usage needs separate verification. The
ordinary hosted Netlify deployment also cannot depend on this VM's CLI session.

## PDF index

The working-tree file `netlify/lib/knowledge/patanjali.mjs` is generated from the
supplied PDF, with 1-based *physical PDF page* labels. It contains substantial
source text and is intentionally excluded from Git. Obtain an authorized copy
of the PDF and generate the index locally before starting the app or running
retrieval tests. Install the Python dependency and build the index with:

```sh
python3 -m venv .venv
. .venv/bin/activate
python -m pip install pdfplumber
python3 scripts/build-pdf-index.py '/path/to/Patanjali_yoga_sutras - Sri Sri.pdf'
```

Rebuild after the PDF changes. Text extraction is unreviewed, and source
passages are treated as data, not instructions. Keyword retrieval is
approximate: verify passage relevance and the model's interpretation manually.
Check permission before distributing the PDF-derived text or deploying it.

## Test and limitations

In the browser, open **Test runner**, choose **Load sample coach tests**, then
select **Run**. You can also upload a custom CSV and export results and
transcripts. The bundled cases live in
`public/data/coach_tests.csv`; they exercise coaching, follow-ups, out-of-scope
questions and sensitive scenarios. Its automatic result compares only the
final behavior label (`ANSWER`, `DECLINE`, or `CARE`). A label match is not a
check of the wording, the cited passage, or safety: read each response.

The same coach cases can be run in the terminal with `npm test`, or against a
running deployment with `node scripts/run-tests.mjs --target http://HOST:8888`.
These runs use the configured provider and can consume API credits; to use the
local extractive mock instead, run
`AUTH_PROVIDER=off LLM_PROVIDER=mock npm test` in an isolated local process.
Legacy CSVs in
`public/data/` are starter examples, not coach evaluations.
The command exits with a non-zero status if a scored case fails or a request
or test case has an error. Reports are still saved for review.

Run `node --test tests/*.test.mjs` for the code regression tests. They use
simulated provider responses and do not prove the accuracy, clinical safety,
or quality of a live cloud model. See `safety/README.md` for the separate
red-team harness and its limitations.

The crisis detector includes the phrase "I want to end it" and related
patterns, and routes detected cases to a support response without a model call.
It is still heuristic: it can miss untested expressions or misinterpret context.
See `safety/README.md` and `docs/safety_report.md` for the evaluation and its
limits. The coach must not be relied on as crisis care.

## Data, access, and remaining limits

- **Private conversations:** Firebase ID tokens are verified on the server.
  Conversations use account-specific storage keys; knowing another user's
  conversation ID does not grant access. Revocation is not checked on each
  request, and sign-out does not instantly revoke an issued token.
- **Storage:** The current Google Cloud VM runs Netlify development services
  with locally persisted Blobs under its private `.netlify` directory.
  Persistence of a synthetic conversation across a service restart was
  verified during integration. This is a VM demo deployment, not managed
  Netlify production hosting. Other environments fall back to process memory
  if Blobs is unavailable; that fallback loses conversations on restart. Check
  the API response's `storage` field. The conversation sidebar is browser-local
  and separated by account; there is no cross-device conversation index.
- **Organizer evaluation:** When explicitly enabled by the operator, requests
  without an Authorization header may use a separate evaluation namespace
  until a configured expiry, subject to request limits. This is for synthetic
  judge inputs. It cannot retrieve private account conversations, and invalid
  bearer tokens do not downgrade to anonymous access. Expiry stops future
  anonymous access; it does not itself delete stored evaluation records.
- **Context:** The coach sends the last ten exchanges to the model. Ordinary
  conversations are limited to 50 user messages, each at most 2,000 characters.
  It has no durable personal profile across chats. Retrieval is lexical and can
  miss context or choose a weak match; references need human assessment.
- **Privacy:** Pattern-based redaction is incomplete. Prompts, recent history,
  and retrieved excerpts may go to the configured model provider. Use
  fictional examples for evaluation and avoid sensitive personal or health
  details. This prototype is educational reflection, not medical care or a
  clinically validated service.
- **Mentor:** Progress and the Seeker live in browser storage shared by that
  browser profile's Google accounts. They are not saved to the signed-in
  account. Lessons retain their own styling and only inherit light/dark
  color-scheme; the full WiserWave theme palette is not passed into them.

API keys, authentication tokens, the source PDF, generated knowledge index,
private configuration, and stored conversations must remain out of Git.
