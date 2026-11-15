# WiserWave · Team 12

**Live app:** [wiserwave.app](https://wiserwave.app)

**Repository:** [BuildathonWizQuest](https://github.com/hkvtpjpkg7-coder/BuildathonWizQuest)

WiserWave pairs a Personal Coach for a specific situation with a Mentor path
of short lessons and interactive exercises drawn from Gurudev's commentary on
Patanjali's Yoga Sutras.

## Problem and target user

Our target-user hypothesis is **working adults already interested in yoga or
mindfulness who want to apply those teachings to everyday stress**: speaking
up in a meeting, responding to criticism, handling comparison, or sustaining a
small practice. Knowing an idea and using it at a difficult moment are different
things. WiserWave aims to make that next step more concrete.

The AI coach can respond to the person's own situation and follow-up questions,
using retrieved commentary as a reference. Mentor provides a structured path
for learning between those conversations. This is a product hypothesis, not a
claim that user demand, effectiveness, or clinical benefit has been validated.

## Try the app

Open [wiserwave.app](https://wiserwave.app) on a laptop or phone and use
**Sign in with Google**. No local installation or model key is needed.
Use fictional examples and avoid sensitive details.

1. **Personal Coach:** try “I compare myself to experienced colleagues and stay
   quiet in meetings. How can I be humble and still speak up?” Add your own
   follow-up, such as “Can you shorten that to one sentence I can use in the
   meeting?” **Explore the reference** shows the source used; you can also ask
   “What is the source?”
2. **Mentor:** create your Seeker, open **Chapter 1 → What is Yoga? → The
   Thousand Students**, and complete the intro cards and exercises. Completing
   a lesson opens the next one. Unbuilt material is marked **Coming soon**.
3. Switch back to **Personal Coach** to continue the same conversation. Try
   the **Light**, **Dark**, and **Colorful** theme choices.
4. **Test runner:** load the sample coach tests, run them, and inspect the
   responses as well as the behavior labels. These tests use the signed-in
   account and may create synthetic conversations in it.

## Run the public evaluation from a fresh clone

Prerequisites: Git, Node.js 24 or newer, and an Internet connection. For this
remote run, **no `npm install`, `.env`, source PDF, generated index, Firebase
login, or model API key is required**.

```sh
git clone https://github.com/hkvtpjpkg7-coder/BuildathonWizQuest.git
cd BuildathonWizQuest
node scripts/evaluate-buildathon.mjs --target https://wiserwave.app --output reports/judge-evaluation
```

This runs **108 synthetic cases**, including multi-turn conversations. It
writes `summary.md`, `results.json`, `cases.csv`, and `human_review.csv` under
`reports/judge-evaluation/`. Use a different output directory for a later run
to preserve earlier results. For a short connectivity check, append
`--ids reflection-01,followup-01,scope-01`.

The script checks behavior on each turn, response/API contracts, consistency
of reference IDs, and selected format/safety signals. It separates
`AUTO_CHECKS_PASS`, `AUTO_CHECKS_FAIL`, and `ERROR`, exiting nonzero for a failed
check or execution error. **An automated pass is not a human quality verdict.**
The full run prepares 32 balanced cases for review, with blank reviewer names
and verdicts. Read the conversations and their rubrics before filling them in;
the script does not count those blanks as completed human reviews.

The older 15-case smoke runner remains available:

```sh
node scripts/run-tests.mjs --target https://wiserwave.app --tests public/data/coach_tests.csv --concurrency 1
```

Its timestamped reports go to `reports/`; its score checks only the final
`ANSWER`, `DECLINE`, or `CARE` label. Neither runner establishes quality,
faithfulness to the commentary, or clinical safety from a label match.

Anonymous requests use the app's **temporary organizer evaluation API**, which
must be enabled and unexpired by the operator. They are isolated from private
Google-account conversations. The script does not enable public access or
bypass limits. A 401 means access is unavailable; a 429 means a request limit;
a 503 means unavailable configuration or service. Errors are not passes.
If the evaluation window has closed, contact the team to reopen its configured
window; do not disable authentication. Live runs consume the team's provider
usage. Use synthetic data only.

The separate safety runner sends 63 synthetic red-team/control cases:

```sh
node safety/run.mjs --url https://wiserwave.app --output reports/judge-safety.json
```

It reports **PASS, FAIL, REVIEW, and ERROR separately**. REVIEW requires a person
to read the response; neither REVIEW nor a mock result is a live safety pass.
See [the safety method](safety/README.md) and
[the safety report](docs/safety_report.md). Automated checks are not clinical
certification. The buildathon's human-review requirements must be documented
with actual human verdicts; this README does not claim they are complete.

## Run the backend locally

Local backend and unit tests need the private generated knowledge index.
Obtain an authorized source PDF and follow
[Personal Coach setup](docs/PERSONAL_COACH.md) to generate it. Then install the
project dependencies, copy `.env.example` to `.env`, and configure the desired
provider and Firebase authentication before running `npm run dev`.

For a private, loopback-only mock preview after generating the index:

```sh
npm install
AUTH_PROVIDER=off LLM_PROVIDER=mock node scripts/private-preview.mjs
```

Open `http://127.0.0.1:8890`. This explicitly labeled mock uses extracted text,
not a live AI response. **Never use `AUTH_PROVIDER=off` on a public deployment.**
Run `node --test tests/*.test.mjs` for code regression tests after generating
the index. These are separate from live-model evaluation.

## Data and limitations

- **Coach privacy:** Google/Firebase identity is checked server-side and private
  conversations are scoped to that account. The VM demo uses locally persisted
  Netlify Blobs; other environments may fall back to memory. The sidebar's
  conversation list remains browser-local and has no cross-device index.
  Prompts, recent conversation, and source excerpts go to the configured model
  provider. Pattern-based masking is incomplete.
- **Organizer access:** the anonymous API uses a separate evaluation namespace,
  with an expiry and request limits. Expiry stops future access, but does not
  itself erase saved synthetic test records. It cannot read private account
  conversations. A successful organizer run does not verify Google sign-in.
- **Mentor:** progress, rewards, and the Seeker are stored only in this browser
  profile, shared across accounts on that profile. Clearing site data loses
  them. The static lessons are public. Chapter 1 is partial; later chapters are
  placeholders. Full game accessibility needs human testing.
- **Appearance:** the WiserWave picker works in the shell; Mentor has its own
  Lotus Lake styling and can inherit light/dark color-scheme. The full theme
  palette is not passed to the lessons.
- **Coach quality and safety:** lexical retrieval and model interpretation can
  be wrong. Crisis and medical safeguards are heuristic and may miss cases.
  The coach is educational reflection, not therapy, medical advice, or
  emergency care. Follow-ups use bounded conversation history, not a durable
  personal profile.
- **Private material:** keep API keys, authentication tokens, source PDFs,
  generated knowledge indexes, `.env`, `.netlify`, and conversations out of
  Git. Review generated transcripts for source rights and private information
  before sharing them.

Implementation details: [Coach](docs/PERSONAL_COACH.md),
[Mentor](docs/MENTOR.md), [Google sign-in](docs/AUTH_PLAN.md).
The project began with the buildathon chat starter; legacy sentiment/review
fixtures are not evidence for WiserWave's coaching quality.
