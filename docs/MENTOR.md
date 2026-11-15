# Mentor: Yoga Sutras Chapter 1 lessons

The **Mentor** tab is a guided path through Chapter 1 (Samadhi Pada) of
Patanjali's Yoga Sutras, taught from Gurudev's commentary. It replaces the
earlier sample "find a mentor" prototype.

## What the learner sees

- **Their Seeker.** On the first visit they pick a character, a skin tone (one
  of five) and a saffron or white robe. The skin tone is chosen only once;
  "Change Seeker" later offers character and robe only.
- **The snake path.** Starting at the bottom: 11 chapter dots (Chapter 1 is
  built; 2–11 show "Coming soon"). Chapter 1 opens into its 8 modules, and a
  module opens into its lessons. Each dot opens when the one before it is
  complete. Lessons not built yet show "Coming soon" and do not block the path.
- **A lesson.** Three interactive intro cards (each earns a lotus petal), then
  one to six short games (choose, sort, order, match, hold, timed and others),
  then a badge and Gurudev's closing line. Prana points add up across lessons.

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

Progress (finished lessons, Prana, badges) and the Seeker are kept in the
browser's `localStorage` under keys starting with `ys1-`. Nothing is sent to the
server, and nothing from the Personal Coach conversation is used.

## Still to do

- Lessons for the rest of Chapter 1, and Chapters 2–11.
- Saving progress to the signed-in account instead of the browser only.
- Accessibility review of the games (keyboard and screen reader) with real users.

## Tests

`tests/mentor-ui.test.mjs` checks that the Mentor tab frames the lessons, that
the coach page keeps a single inline script, that the lessons load no outside
files, that the engine and lesson data parse and match the menu, and the
framing headers in both `netlify.toml` and the private preview.
