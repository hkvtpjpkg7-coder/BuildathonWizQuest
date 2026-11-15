# Mentor: Yoga Sutras Chapter 1 lessons

The **Mentor** tab is a guided path through Chapter 1 (Samadhi Pada) of
Patanjali's Yoga Sutras, taught from Gurudev's commentary. It replaces the
earlier sample "find a mentor" prototype.

## What the learner sees

- **Their Seeker.** On the first visit they build a Seeker: one of five skin
  tones (chosen once), six hair styles, four beard styles (none, stubble, short,
  full), glasses (none, round, square) and a saffron or white robe. The Seeker
  sits cross-legged in the avatar. "Change Seeker" later offers everything but
  the skin tone.
- **Level and rewards on the home screen.** A Prana meter shows the Seeker's
  level on a beginner-to-expert scale of nine: Seed, Sprout, Roots, Stem,
  Floating Leaf, Bud, Opening Bud, Blossom and Full Lotus (at 0, 50, 150, 300,
  500, 800, 1200, 1800 and 2600 Prana). Four tiles show Prana, badges, support
  gems and lotus petals; tapping one opens a rewards page with every badge.
- **The snake path, one level at a time.** Starting at the bottom: 11 chapter
  dots (Chapter 1 is built; 2–11 show "Coming soon"). Tapping Chapter 1 shows
  only its 8 modules; tapping a module shows only its lessons. Each module opens
  when the one before it is complete, and finished modules and lessons can
  always be reopened. Lessons not built yet show "Coming soon" and do not block
  the path.
- **A lesson.** Three interactive intro cards (each earns a lotus petal), then
  one to six short games (choose, sort, order, match, hold, timed and others),
  then a badge and Gurudev's closing line. Prana points add up across lessons.
- **Fixed-size screens.** Every screen fits the window with no vertical
  scrolling, on phones and desktop: pictures and game areas shrink to the space
  left, and feedback slides up in a panel. On phones the WizQuest chat list and
  download buttons are hidden while the Mentor tab is open.

Built so far: lessons 1–7, the Module 1 boss (the Lake Guardian), and several
lessons in Modules 2, 3, 4, 6 and 7 (Modules 5 and 8 are not started).

## How it is built

| Part | Where |
| --- | --- |
| Lesson page (styles, illustrations) | `public/lessons/index.html` |
| Engine (screens, games, progress, Seeker) | `public/lessons/engine.js` |
| Lessons as data, and the chapter menu | `public/lessons/lessons.js` |
| Fonts (Yatra One, Mukta, Tiro Devanagari Sanskrit; SIL OFL 1.1) | `public/lessons/fonts/` |

The Mentor tab shows `/lessons/index.html` in a frame from the same site, so
its styles and script stay apart from the Personal Coach page. The lessons make
no network requests: fonts are self-hosted and everything else is in the three
files.

Because of the frame, the security headers (in `netlify.toml` and
`scripts/private-preview.mjs`) now use `X-Frame-Options: SAMEORIGIN`,
`frame-ancestors 'self'`, `frame-src 'self' …` and `img-src 'self' data:`
(the lesson bullets are small inline SVG images). Framing by other sites is
still refused.

## Content rules

Every quote, meaning, pop-up and quiz answer comes only from Gurudev's
commentary, quoted exactly. Game scenarios written for the lessons are not
credited to Gurudev. The lessons say "Gurudev", not "Sri Sri"; the one
exception is the Gurudev pop-up, which gives his full name. Permission to
publish these quotes in this repository has been confirmed by the project team.

## Data and privacy

Progress (finished lessons, Prana, badges, petals, gems) and the Seeker are
kept in the browser's `localStorage` under keys starting with `ys1-`. Nothing is sent to the
server, and nothing from the Personal Coach conversation is used.

## Still to do

- Lessons for the rest of Chapter 1, and Chapters 2–11.
- Saving progress to the signed-in account instead of the browser only.
- Accessibility review of the games (keyboard and screen reader) with real users.
- Known layout issues (headless check in the Mentor tab through the private
  preview, at 360x740, 390x844 and 1280x800; fix them in the lesson app, then
  copy it here):
  - All sizes: in The Lake Guardian's six challenges and Catch the Now step 1
    the "Mist on the lake" meter label is cut off, because the Prana level meter's `.meter` rule (12px high, overflow
    hidden) also matches the challenge meter.
  - 390 and 360 wide: in "Meet Your Sleep" step 2 the dream clouds run past
    the right edge.
  - 360x740 only (the lessons frame is 636px high there): a few panels scroll
    or push buttons below the fold: the rewards page ("Back to the path"),
    the first intro card of Firm Roots, Five Gems and One Sense, Still Mind,
    Guardian card 2 and challenge 4, Still the Lake step 3, Five Gems step 3,
    Clear the Glass step 1, Firm Roots step 1, and the result lines of Five
    Gems and the Guardian.

## Tests

`tests/mentor-ui.test.mjs` checks that the Mentor tab frames the lessons, that
the coach page keeps a single inline script, that the lessons load no outside
files, that the engine and lesson data parse and match the menu, and the
framing headers in both `netlify.toml` and the private preview (and that the
two send identical headers), that every file in `public/lessons/` is on the
private preview's static-file allowlist, and that on phones the Mentor tab
hides the chat list and downloads with CSS only.
