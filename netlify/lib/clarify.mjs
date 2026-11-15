// Small, source-free acknowledgements for underspecified personal concerns.
// These do not interpret the user's circumstances or attribute a teaching.
// Crisis and clinical routing must run before any response from this module.

const greeting = /^(?:(?:hey|hi|hello|hiya|yo|bro|buddy|friend|namaste)[\s,!.?]*)+$/i;
const noDetails = /\b(?:because|since|when|whenever|after|before|during|due to|at work|at night|in bed|(?:my|our|his|her|their|your) (?:boss|partner|family|friends?|colleagues?|coworkers?|children|child|son|daughter|mother|father|wife|husband|job|work|relationship))\b/i;
const lonely = /\b(?:lonely|loneliness|isolated|isolation|disconnected)\b/i;
const sleep = /\b(?:sleep(?:ing)?|insomnia|sleepless)\b/i;
const sleepConcern = /\b(?:not|cannot|can't|can’t|haven't|haven’t|havent|trouble|difficult|difficulty|struggl\w*|bad(?:ly)?|poor(?:ly)?|improper(?:ly)?|problem\w*|issue\w*|unable|hard)\b/i;
const distress = /\b(?:anxious|anxiety|stressed|stress|overwhelmed|overwhelm|sad|unhappy|down|lost|worried|worry)\b/i;
const person = /\b(?:i|i'm|i’m|i’ve|my|me|myself|feeling)\b/i;
const self = /\b(?:i|i'm|i’m|i’ve|myself)\b|^(?:feeling|my sleep)\b/i;

/** Ask at most once about the same broad concern until the topic changes. */
export function clarificationFor(message, priorClarificationTopic = null) {
  const text = String(message || '').trim();
  if (greeting.test(text)) return { topic: 'greeting', reply: "Hey! I'm here. What's on your mind?" };
  if (text.length > 120 || noDetails.test(text) || !self.test(text)) return null;
  let result = null;
  if (lonely.test(text)) result = { topic: 'loneliness', reply: "I'm sorry you've been feeling lonely. Is there a particular time or situation when you feel it most?" };
  else if (sleep.test(text) && sleepConcern.test(text)) result = { topic: 'sleep', reply: "That sounds tiring. Is it harder to fall asleep, stay asleep, or something else?" };
  else if (distress.test(text)) result = { topic: 'feelings', reply: "I'm sorry things feel difficult right now. What's been weighing on you most?" };
  return result?.topic === priorClarificationTopic ? null : result;
}

/** Support without claiming a source when lexical retrieval has no evidence. */
export function isPersonalConcern(message) {
  const text = String(message || '');
  return person.test(text) && (lonely.test(text) || sleep.test(text) || distress.test(text) ||
    /\b(?:friends?|family|relationships?|colleagues?|coworkers?|workplace|work|boss|grief|grieving|hurt|heartbroken|uncertain|struggl\w*)\b/i.test(text));
}

export function isClarificationContinuation(message, topic) {
  const text = String(message || '').trim();
  // Carry context only for an explicit reference, a plausible answer to the
  // specific question, or a clear request for help. Unrelated messages should
  // not silently inherit old source material.
  if (/\b(?:different topic|new topic|another topic|change the subject|unrelated)\b/i.test(text)) return false;
  // A new educational question about a named teaching is its own query, even
  // if it shares a word such as sleep with a previous personal concern.
  if (/^(?:what|which|how|where|who)\b/i.test(text) && /\b(?:sutra|sutras|teaching|teachings|scripture|scriptures)\b/i.test(text) && !/\b(?:this|that|those|these|you (?:used|mentioned|cited))\b/i.test(text)) return false;
  if (/\b(?:prefer not|rather not|don't want to|don’t want to|not comfortable|just (?:give|tell|help))\b/i.test(text)) return true;
  if (/^(?:it|that|this|yes|no|because|mostly|usually|sometimes|at night|what (?:can|could|should) i do|how (?:can|could|should|do) i (?:cope|handle (?:it|this|that)|deal with (?:it|this|that)|do (?:it|this|that))|what about (?:it|this|that)|how about (?:it|this|that)|is (?:it|this|that))\b/i.test(text)) return true;
  if (topic === 'sleep') return /\b(?:sleep\w*|awake|night|bed|dream\w*|tired|restless|racing thoughts)\b/i.test(text);
  if (topic === 'loneliness') return /\b(?:lonely|alone|isolat\w*|disconnect\w*|friends?|relationship\w*|moved|moving|miss\w*|connect\w*|people|social|new city)\b/i.test(text);
  return false;
}

export function requestsSource(message) {
  const text = String(message || '').trim().replace(/[’‘]/g, "'").replace(/\s+/g, ' ')
    .replace(/^(?:(?:thanks|thank you|okay|got it)[,.!]\s+|please\s+)/i, '')
    .replace(/^what's\s+/i, 'what is ')
    .replace(/(?:,?\s+please)?[.!?]*$/i, '');
  // Standalone provenance questions can point back to an actual answer.
  // Do not intercept a new teaching question merely because it asks for
  // citations, or mistake a question about the cause of an emotion for one.
  if (/^where did you (?:get|find|read|learn) (?:this|that|it|these|those|that information)$/i.test(text)) return true;
  if (/^(?:(?:can|could|would) you )?cite (?:this|that|(?:the |your )?sources?|your (?:(?:last|previous) )?(?:answer|response|reply))$/i.test(text)) return true;
  if (/^(?:what|which) (?:sutra|sutras|verse|verses) (?:(?:is|was|were) (?:this|that|these|those)|did you (?:use|quote|cite|mention))$/i.test(text)) return true;
  return /^(?:(?:what|which) (?:(?:is|are|was|were) )?|(?:(?:can|could|would) you )?(?:show|give|tell|provide|share)(?: me)? )?(?:(?:your|the) )?(?:sources?|references?|citations?|reference ids?)(?: (?:of|for) (?:this|that|these|those|(?:your|the) (?:(?:last|previous) )?(?:answer|response|reply))| (?:did )?you (?:used?|cited?|quoted?))?$/i.test(text);
}

export function declinesToElaborate(message) {
  return /\b(?:prefer not|rather not|don't want to (?:share|talk|explain)|don’t want to (?:share|talk|explain)|not comfortable (?:sharing|talking|explaining)|(?:just|please) (?:give|tell|help))\b/i.test(String(message || ''));
}

/** Recognize a personal sleep problem, not an educational question on dreams. */
export function isPersonalSleepConcern(message) {
  const text = String(message || '').trim();
  if (!self.test(text)) return false;
  if (/\b(?:my|our|his|her|their|your)\s+(?:child|children|son|daughter|friend|partner|mother|father|wife|husband)\b/i.test(text)) return false;
  if (/\b(?:sleep(?:ing)?|slept|asleep|insomnia|sleepless)\b/i.test(text) && sleepConcern.test(text)) return true;
  return /\b(?:i\s+(?:lie|lying|am lying)\s+awake|i\s+(?:wake|woke|keep waking|am waking)\s+up(?:\s+(?:every|at|during|in|worrying)\b)|my sleep (?:is|has been|gets)\s+(?:poor|bad|disrupted))\b/i.test(text);
}

/** Non-clinical support; intentionally no claim about a textual source. */
export function sleepSupport(message, previousUser = '') {
  const text = `${String(message || '')} ${String(previousUser || '')}`;
  const prefix = /\b(?:worr\w*|anxious|anxiety|racing thoughts|mind (?:races|is racing)|thinking about)\b/i.test(text)
    ? "That sounds tiring, especially when worries keep running through your mind. If it feels helpful, you could jot down one concern to revisit tomorrow and give yourself permission to pause for tonight."
    : "That sounds tiring. If it feels helpful, you could make a little room for a quiet, low-pressure wind-down before bed.";
  return `${prefix} If sleep difficulties continue or affect your daily life, consider talking with a healthcare professional.`;
}

/** Small optional steps are ordinary support, never framed as source claims. */
export function supportiveFallback(message, previousUser = '') {
  const text = String(message || '');
  const prior = String(previousUser || '');
  if (/\b(?:miss|missing)\b.{0,40}\b(?:family|friends?|home)\b/i.test(text)) {
    return "Missing people you care about can hurt. If it feels right, perhaps you could send a short message or arrange a call with someone you trust. You can take this at your own pace.";
  }
  if (/\b(?:moved|moving|relocat\w*|new (?:city|place|town))\b/i.test(text) && /\b(?:friends?|people|lonel\w*|isolat\w*)\b/i.test(`${text} ${prior}`)) {
    return "Moving somewhere new without familiar people nearby can feel isolating. If it feels comfortable, a small step could be reaching out to someone you trust or trying an activity you enjoy around others.";
  }
  return "That sounds difficult, and you don't have to figure it out alone. If it feels comfortable, consider reaching out to someone you trust. We can take this at your own pace.";
}
