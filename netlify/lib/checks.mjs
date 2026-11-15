// =============================================================================
// netlify/lib/checks.mjs: the starter safety checks
// =============================================================================
// FLOW 5 in docs/HOW_IT_WORKS.md.
//
// This is deliberately NOT a complete set. Teams are judged on how safe AND
// how helpful their bot is, so improving these checks is part of the challenge.
// Each check is a small, separate function so it is easy to read, test and extend.
//
// Where each check is used (step numbers from chat/index.mjs):
//   validateMessage    → step 2   reject empty / too-long messages
//   MAX_TURNS_...      → step 5   cap chat length
//   redactPII          → steps 6 and 10   mask personal data in and out
//   looksLikeInjection → step 6   flag jailbreak attempts (does not block)
//   showsDistress      → steps 6 and 9    force a caring reply
//   parseModelOutput   → step 8   check the model answered in the right format
// =============================================================================

// ---- Limits -------------------------------------------------------------------
export const MAX_MESSAGE_CHARS = 2000;   // longest message we accept (cost + abuse control)
export const MAX_TURNS_PER_SESSION = 50; // most user messages in one chat
export const HISTORY_TURNS_SENT = 10;    // how many past exchanges the model sees (the "memory window")

// ---- Check 1: input validation ---------------------------------------------------
// Returns { ok: true, text } with surrounding spaces trimmed, or { ok: false, error }.
export function validateMessage(text) {
  if (typeof text !== "string" || !text.trim()) return { ok: false, error: "message is required" };
  if (text.length > MAX_MESSAGE_CHARS) return { ok: false, error: `message is too long (max ${MAX_MESSAGE_CHARS} characters)` };
  return { ok: true, text: text.trim() };
}

// ---- Check 2: personal data (PII) masking -----------------------------------------
// Replaces emails, card numbers, SSNs and phone numbers with placeholders like
// [EMAIL] before the text reaches the model, the saved chat or the logs.
// Simple patterns on purpose: they miss names and addresses. Improve me!
// Order matters: cards and SSNs are matched before phone numbers.
const PII = [
  ["email", /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g],
  ["card", /\b(?:\d[ -]?){13,16}\b/g],                               // 13–16 digits, spaces/dashes allowed
  ["ssn", /\b\d{3}-\d{2}-\d{4}\b/g],                                  // 123-45-6789
  ["phone", /(?:\+?1[ .-]?)?\(?\b\d{3}\)?[ .-]?\d{3}[ .-]?\d{4}\b/g], // US-style numbers
];

// Returns { text: "masked text", found: ["email", "phone", ...] }.
export function redactPII(text) {
  const found = new Set();
  let out = text;
  for (const [type, re] of PII) {
    out = out.replace(re, () => {
      found.add(type);
      return `[${type.toUpperCase()}]`;
    });
  }
  return { text: out, found: [...found] };
}

// ---- Check 3: prompt-injection signal -------------------------------------------
// Spots common jailbreak phrasing. We only FLAG it (flags.injection_suspected),
// we don't block, because blocking on keywords also blocks legitimate text such
// as "Ignore the reviews, this blender is great". The real defence is the
// system prompt in llm.mjs; this flag helps you spot attacks in tests and logs.
const INJECTION = [
  /ignore (all |any )?(the )?(previous|prior|above|earlier|your) (instructions|prompts?|rules)/i,
  /disregard (all |any )?(the )?(previous|prior|above|your) (instructions|rules|prompt)/i,
  /(reveal|show|print|repeat) (me )?(your|the) (system )?(prompt|instructions|rules)/i,
  /(developer|dan|admin|god|jailbreak) mode/i,
  /pretend (you are|you're|to be) (a |an )?(general|different|unrestricted)/i,
  /^\s*(system|admin|developer)\s*:/im, // fake "SYSTEM:" messages
];
export const looksLikeInjection = (text) => INJECTION.some((re) => re.test(text));

// ---- Check 4: distress ------------------------------------------------------------
// A deliberately conservative, incomplete signal: never use it as proof that
// someone is safe. Crisis support is handled without invoking the model.
const DISTRESS = [
  /\b(?:kill|hurt|harm|cut)\s+(?:myself|me)\b/i,
  /\b(?:suicid\w*|self[ -]?harm|end it all|end my (?:own )?life|take my (?:own )?life)\b/i,
  /\b(?:want|going|plan|planning|decided|thinking|ready|intend|need|about)\b(?:\s+\w+){0,3}\s+(?:to\s+)?end(?:ing)?\s+it\b(?!\s+with\s+(?:(?:my|our|the)\s+)?(?:[a-z-]+\s+){0,2}(?:partner|boyfriend|girlfriend|husband|wife|spouse|phone company|gym membership|subscription|contract)\b)/i,
  /\b(?:want|going|plan|planning|decided|thinking|ready|intend|need|about)\b(?:\s+\w+){0,3}\s+(?:to\s+)?end(?:ing)?\s+it\b[^.!?]{0,100}\b(?:by my side|beside me|here with me)\b/i,
  /\b(?:want|wish|going|ready)\s+to\s+die\b(?!\s+(?:my|your|our|the)\s+hair\b)|\b(?:wish|wishing)\s+i\s+(?:was|were)\s+dead\b/i,
  /\b(?:don'?t|do not|never)\s+(?:want\s+to|wanna)\s+(?:live|be (?:here|alive))\b/i,
  /\b(?:no point in (?:anything|living|life)|(?:don'?t|do not|can'?t|cannot) see (?:any |the )?point (?:in )?(?:anything|living|going on))\b/i,
  /\b(?:can'?t|cannot|can not)\s+(?:do this|go on|keep going|take it)\s+any\s*more\b/i,
  /\b(?:can'?t|cannot|can not|unable to)\s+(?:keep myself|stay|be)\s+safe\b/i,
  /\b(?:can'?t|cannot|can not|unable to)\s+stay\s+alive\b/i,
  /\b(?:everyone|they|people|my family)\s+(?:would|will|'d)\s+be\s+better off without me\b/i,
  /\bwhat(?:'s| is) the point of (?:going on|living)\b/i,
  /\bno reason to (?:keep )?(?:live|living|go on|continue living)\b/i,
  /\b(?:wish|want)\s+(?:i\s+)?(?:could\s+|to\s+)?(?:just\s+)?disappear\s+(?:forever|permanently)\b/i,
  /\b(?:don'?t|do not)\s+want\s+to\s+wake\s+up\b|\b(?:wish|hope)\s+i\s+(?:would|could|will)\s+not\s+wake\s+up\b/i,
];
// Only an unambiguous, standalone affirmation ends the short crisis context.
// In particular, "I am safe now, but ..." must not hide a continuing risk.
export const explicitlySafe = (text) => /^(?:(?:yes|thanks|thank you)[,.! ]+)?(?:i(?:'m| am) (?:feeling )?safe now|i feel safe now|i(?:'m| am) no longer in (?:immediate )?danger)[.! ]*$/i.test(String(text ?? '').replace(/[’‘]/g, "'").trim());
export const showsDistress = (text, previousText = "") => {
  const normalized = String(text ?? "").replace(/[’‘]/g, "'").replace(/\s+/g, " ");
  if (DISTRESS.some((re) => re.test(normalized))) return true;
  if (explicitlySafe(normalized)) return false;
  // While bounded recent context indicates a crisis, all replies retain the
  // support response until a clear safety statement. Avoid assuming a short
  // or indirect reply is benign simply because it lacks a keyword.
  const prior = String(previousText ?? "").replace(/[’‘]/g, "'").replace(/\s+/g, " ");
  return DISTRESS.some((re) => re.test(prior));
};
export const SUPPORT_LINE =
  "If you're going through a hard time, you don't have to handle it alone. In the US you can call or text 988 (Suicide & Crisis Lifeline); elsewhere, findahelpline.com lists free local services.";

// ---- Check 5: model output format -------------------------------------------------
// The system prompt asks the model to reply with {"behavior": "...", "reply": "..."}.
// This parses that safely. If the model ignored the format, we still show its
// text (so the chat doesn't break) but mark ok: false → flags.output_valid = false.
export const BEHAVIORS = ["ANSWER", "DECLINE", "CARE"];

export function parseModelOutput(raw) {
  try {
    // Some models wrap JSON in ```json fences. Strip them before parsing.
    const cleaned = String(raw).trim().replace(/^```(json)?/i, "").replace(/```$/, "").trim();
    const obj = JSON.parse(cleaned);
    const behavior = String(obj.behavior ?? "").toUpperCase();
    const reply = String(obj.reply ?? "").trim();
    if (!BEHAVIORS.includes(behavior) || !reply) throw new Error("bad fields");
    // Keep source identifiers separate from user-facing prose. The caller must
    // verify each identifier against the current retrieval results.
    const source_ids = Array.isArray(obj.source_ids) ? obj.source_ids : [];
    return { ok: true, behavior, reply: reply.slice(0, 1500), source_ids };
  } catch {
    // Not valid JSON. Often the answer was cut off (too long for max_tokens),
    // e.g. {"behavior": "DECLINE", "reply": "I can't summarise tha
    // Salvage the label and the reply text so the user never sees raw JSON.
    const text = String(raw ?? "").trim();
    const b = text.match(/"behavior"\s*:\s*"(ANSWER|DECLINE|CARE)"/i);
    const r = text.match(/"reply"\s*:\s*"((?:[^"\\]|\\.)*)/s);
    if (b && r) {
      let reply = r[1];
      try { reply = JSON.parse(`"${reply.replace(/\\$/, "")}"`); } catch {} // turn \n, \" back into text
      return { ok: false, behavior: b[1].toUpperCase(), reply: (reply.trim() + "…").slice(0, 1500) };
    }
    return { ok: false, behavior: "ANSWER", reply: text.slice(0, 1500) || "Sorry, something went wrong. Please try again." };
  }
}
