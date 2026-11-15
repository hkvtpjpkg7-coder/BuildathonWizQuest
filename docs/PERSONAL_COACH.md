# WizQuest Personal Coach

The personal coach is the current first phase of WizQuest. It searches locally
indexed excerpts of the supplied *Patanjali Yoga Sutras* PDF and uses a model to
offer a tentative reflection with references to physical PDF page numbers.
Conversation history is kept within the current session. The Mentor feature and
password-based accounts are future work; see `docs/AUTH_PLAN.md`.

## Run locally

First generate the PDF index as described below. **A fresh clone does not
include the generated index and cannot run the coach or its retrieval tests
until this step is complete.** The running demonstration already has its own
local index.

Install Node.js 24 LTS and the project dependencies (`npm install`), then
copy `.env.example` to `.env`. For real model-generated answers, configure an
existing supported provider in `.env`, for example `LLM_PROVIDER=openai` and
`OPENAI_API_KEY` with an OpenAI Platform project key. You may set
`OPENAI_MODEL` to a model available to that project. Never paste keys into this
repository or a chat. OpenAI API access and any applicable credits are managed
separately from a signed-in Codex session.

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

Run `node --test tests/*.test.mjs`. These checks
cover the PDF index, retrieval, conversation handling, crisis fallback, and
source-ID validation. They use simulated provider responses; they do not prove
the accuracy, clinical safety, or quality of a live cloud model. The three
starter CSV presets remain legacy sentiment/review examples, not coach evals.

The crisis detector includes the phrase "I want to end it" and related
patterns, and routes detected cases to a support response without a model call.
It is still heuristic: it can miss untested expressions or misinterpret context.
See `safety/README.md` and `docs/safety_report.md` for the evaluation and its
limits. The coach must not be relied on as crisis care.

The starter can store conversations in Netlify Blobs. It has no user login or
ownership enforcement: anyone with a conversation ID may be able to retrieve
it. Basic pattern-based redaction is incomplete. Use fictional test data and do
not enter private health information until authentication and data protection
are implemented. The coach is educational reflection, not medical advice.
