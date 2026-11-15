# Mentor (prototype)

The **Mentor · prototype** tab shows the intended journey for finding a human
mentor. It is a front-end prototype only: **every mentor and request is sample
data**, and nothing is sent to anyone.

## The journey

1. **Browse mentors.** Five fictional sample profiles, each marked *Sample*.
   Filter by topic: Work stress, Relationships, Meditation practice or
   Personal growth.
2. **Open a profile.** See the mentor's sample introduction and areas of focus.
3. **Start a sample request.** Choose one of the mentor's topics and,
   optionally, add a short description (up to 300 characters).
4. **My requests.** The request appears with the status *Prototype only: not
   sent*. It can be removed.

After saving, the page says the request is a prototype only, has not been sent,
that no mentor has been contacted and that no session is booked.

## What is mocked

| Part | In this prototype |
| --- | --- |
| Mentors | Fictional sample profiles written into `public/index.html`. Not real people; no credentials claimed |
| Requests | Kept in the page's memory only. Not sent, emailed, scheduled or saved; gone on reload |
| Availability and booking | None. The page never says a mentor is available or a session is booked |
| Accounts | None. No sign-in, and no link between a request and a person |

The Mentor code runs in its own `<script>` block and does not call the
backend, use `localStorage`, or read the Personal Coach conversation.

## Safety and privacy notes in the UI

- A banner says the page uses sample data and that mentoring is not emergency
  or clinical care, with the same crisis directions the coach uses (emergency
  services; 988 in the US; findahelpline.com elsewhere).
- The request form asks people not to enter names, health details or other
  sensitive personal information, and says the Personal Coach conversation is
  not shared with Mentor.

## Still needs integration

- A real mentor directory, with vetting, consent and accurate profiles.
- Accounts and authorization (see `docs/AUTH_PLAN.md`), so requests belong to a
  signed-in person.
- A backend to store requests, with retention and deletion rules.
- Delivery to mentors (email or notifications) and scheduling, if wanted.
- Screening free-text descriptions for crisis or medical content, and a
  defined handover, before anything is sent to a person.
- Accessibility and usability review with real users.

## Tests

`tests/mentor-ui.test.mjs` runs the Mentor script with storage and network
traps and checks the topic filter, that requests are marked as unsent samples,
input validation, the required notices, and that the Personal Coach script is
unchanged.
