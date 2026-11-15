// =============================================================================
// netlify/functions/chat/index.mjs: POST /api/chat
// =============================================================================
// The main backend. Every chat message (from the web page or the test runner)
// comes here. It is a Netlify Function: Netlify runs this file on its servers
// whenever someone calls /api/chat, so the API key never reaches the browser.
//
// Request : { "session_id": "<uuid>" (omit for a new chat), "message": "..." }
// Response: { session_id, turn, behavior, reply, flags, provider, model,
//             prompt_version, storage, latency_ms, usage }
//
// FLOW 1 in docs/HOW_IT_WORKS.md. The step numbers below match the doc:
//   1  Accept only POST with a JSON body
//   2  Validate the message (empty / too long)
//   3  Rate-limit the caller
//   4  Load the chat session, or create a new one
//   5  Stop if the chat is too long
//   6  Mask personal data, and flag injection / distress
//   7a Add extra context if the question needs it:
//        RAG (matching product reviews, FLOW 10) or live data from an external API (FLOW 11)
//   7  Build the conversation history the model will see (this is the "memory")
//   8  Call the model and check its answer format
//   9  Force a caring reply if distress was detected
//   10 Remove personal data from the reply
//   11 Save both messages to the session
//   12 Return the reply, and log (without message text)
// =============================================================================

import { loadSession, saveSession, newSession, isValidId, storageKind } from "../../lib/store.mjs";
import {
  validateMessage, redactPII, looksLikeInjection, showsDistress, explicitlySafe, parseModelOutput,
  SUPPORT_LINE, MAX_TURNS_PER_SESSION, HISTORY_TURNS_SENT,
} from "../../lib/checks.mjs";
import { callLLM, provider, modelName, env, PROMPT_VERSION } from "../../lib/llm.mjs";
import { retrieve, formatPassages } from "../../lib/rag.mjs";
import { medicalReferral, medicalReferralReply } from "../../lib/medical.mjs";
import { authenticateRequest, authFailure } from "../../lib/auth.mjs";

// -----------------------------------------------------------------------------
// Rate limiter used in step 3.
// Remembers the timestamps of recent requests per IP address and refuses
// anything over RATE_LIMIT_PER_MIN in the last 60 seconds.
// Limitation: it lives in this function instance's memory, so it is
// best-effort (Netlify may run several instances). Good enough for a demo;
// use a shared store (e.g. Netlify Blobs or Redis) for real traffic.
// -----------------------------------------------------------------------------
const hits = new Map(); // ip -> [timestamp, timestamp, ...]
// This emergency marker is best-effort, instance-local and expires after ten
// minutes. It contains session IDs and expiry times only, never message text.
const limitedCrisisMarkers = new Map();
const LIMITED_MARKER_TTL_MS = 10 * 60_000;
const LIMITED_MARKER_MAX = 1000;
const limitedLookupByIp = new Map();
const LIMITED_LOOKUP_IP_MAX = 1000;
const LIMITED_LOOKUP_PER_IP = 3;
const LIMITED_LOOKUP_GLOBAL = 120;
let limitedLookupWindow = { start: 0, count: 0 };

const markerKey = (id, ownerId) => ownerId ? JSON.stringify([ownerId, id]) : id;
function hasLimitedCrisisMarker(id, ownerId = null) {
  if (!isValidId(id)) return false;
  const key = markerKey(id, ownerId);
  const expires = limitedCrisisMarkers.get(key);
  if (!expires) return false;
  if (expires <= Date.now()) { limitedCrisisMarkers.delete(key); return false; }
  return true;
}

function rememberLimitedCrisis(id, ownerId = null) {
  if (!isValidId(id)) return;
  const key = markerKey(id, ownerId);
  limitedCrisisMarkers.delete(key);
  while (limitedCrisisMarkers.size >= LIMITED_MARKER_MAX) limitedCrisisMarkers.delete(limitedCrisisMarkers.keys().next().value);
  limitedCrisisMarkers.set(key, Date.now() + LIMITED_MARKER_TTL_MS);
}

function allowLimitedLookup(ip) {
  const now = Date.now();
  if (now - limitedLookupWindow.start >= 60_000) limitedLookupWindow = { start: now, count: 0 };
  if (limitedLookupWindow.count >= LIMITED_LOOKUP_GLOBAL) return false;
  let bucket = limitedLookupByIp.get(ip);
  if (!bucket || now - bucket.start >= 60_000) bucket = { start: now, count: 0 };
  if (bucket.count >= LIMITED_LOOKUP_PER_IP) return false;
  if (!limitedLookupByIp.has(ip)) {
    while (limitedLookupByIp.size >= LIMITED_LOOKUP_IP_MAX) limitedLookupByIp.delete(limitedLookupByIp.keys().next().value);
  }
  bucket.count += 1;
  limitedLookupByIp.set(ip, bucket);
  limitedLookupWindow.count += 1;
  return true;
}
const CRISIS_REPLY = `I'm really sorry you're going through this. If you might act on these thoughts soon, call emergency services now or go to the nearest emergency department. If you can, move away from anything you might use to hurt yourself and go where other people are. Reach out to someone you trust and tell them you need support now. ${SUPPORT_LINE} Are you in immediate danger right now?`;
// The model has suggested fasting even when not asked. This deliberately
// conservative check can also flag neutral mentions; it is not a complete
// dietary-advice detector and requires continued review of model output.
const RESTRICTIVE_DIET = /\b(?:fasting|fasts|(?:intermittent\s+)?fast\s+(?:for|until|from|during)|intermittent\s+fast|skip(?:ping)?\s+(?:a\s+|your\s+)?meals?|restrict(?:ing)?\s+(?:your\s+)?(?:food|calories|eating)|restrictive\s+(?:diet|eating)|(?:cut|reduce|limit)\s+(?:your\s+)?(?:calories|food intake)|(?:avoid(?:ing)?|stop)\s+eating)\b/i;
const MAX_BODY_BYTES = 16 * 1024;

async function readBoundedBody(req) {
  const length = Number(req.headers.get('content-length'));
  if (Number.isFinite(length) && length > MAX_BODY_BYTES) throw new RangeError('body too large');
  if (!req.body) return '';
  const reader = req.body.getReader();
  const chunks = [];
  let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BODY_BYTES) {
      await reader.cancel();
      throw new RangeError('body too large');
    }
    chunks.push(value);
  }
  const data = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { data.set(chunk, offset); offset += chunk.byteLength; }
  return new TextDecoder().decode(data);
}

// Backward compatibility for sessions saved before crisis_active existed.
// An explicit statement of present safety is not verified by the application.
function recentCrisisMessage(messages = []) {
  for (const message of messages.filter((m) => m.role === 'user').slice(-4).reverse()) {
    if (showsDistress(message.content)) return message.content;
    if (explicitlySafe(message.content)) return '';
  }
  return '';
}

function hasActiveCrisis(session) {
  if (typeof session?.crisis_active === 'boolean') return session.crisis_active;
  return Boolean(recentCrisisMessage(session?.messages));
}

function crisisInContext(text, session, ownerId = null) {
  return showsDistress(text) || ((hasActiveCrisis(session) || hasLimitedCrisisMarker(session?.id, ownerId)) && !explicitlySafe(text));
}

// Under rate or session limits, return the same immediate support without
// creating a session, storing messages, making a model call, or lifting caps.
function limitedCrisisResponse(body, text, started, ownerId = null) {
  const redacted = redactPII(text);
  const responseSessionId = isValidId(body?.session_id) ? body.session_id : crypto.randomUUID();
  // Also remember a newly generated ID for follow-ups in this process. It is
  // still unsaved, bounded by the same TTL/cap and lost on worker changes.
  if (!explicitlySafe(text)) rememberLimitedCrisis(responseSessionId, ownerId);
  return Response.json({
    session_id: responseSessionId,
    turn: null,
    behavior: "CARE",
    reply: CRISIS_REPLY,
    flags: { pii_redacted: redacted.found, injection_suspected: looksLikeInjection(text), distress: true, output_valid: true, medical_referral: false },
    context: null,
    provider: "safety",
    model: "none",
    prompt_version: PROMPT_VERSION,
    storage: "not_saved",
    latency_ms: Date.now() - started,
    usage: { input_tokens: 0, output_tokens: 0 },
  });
}

function rateLimited(ip) {
  const limit = Number(env("RATE_LIMIT_PER_MIN") || 30);
  const now = Date.now();
  // Keep only requests from the last 60 seconds, then add this one.
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 60_000);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > limit;
}

// -----------------------------------------------------------------------------
// The handler. Netlify calls this with a standard web Request object and a
// `context` object (context.ip is the caller's IP address).
// -----------------------------------------------------------------------------
export default async (req, context) => {
  const started = Date.now(); // used for latency_ms in the response

  // ---- Step 1: accept only POST with a JSON body ---------------------------
  if (req.method !== "POST") return Response.json({ error: "Use POST" }, { status: 405 });

  let identity;
  try { identity = await authenticateRequest(req); } catch (error) { return authFailure(error); }
  const ownerId = identity.uid;

  let body;
  try {
    body = JSON.parse(await readBoundedBody(req));
  } catch (error) {
    if (error instanceof RangeError) return Response.json({ error: 'Request body too large.' }, { status: 413 });
    return Response.json({ error: 'Body must be JSON: {"message": "..."}' }, { status: 400 });
  }

  const callerIp = context?.ip ?? "unknown";
  // Authenticated callers are throttled before any session lookup. Crisis
  // responses remain available; a bounded lookup may recover an owned active
  // crisis, but never looks in another account's namespace.
  if (identity.enabled && rateLimited(callerIp)) {
    const text = typeof body?.message === 'string' ? body.message : '';
    const validId = isValidId(body?.session_id);
    const marked = validId && hasLimitedCrisisMarker(body.session_id, ownerId);
    let owned = null;
    if (validId && !marked && allowLimitedLookup(callerIp)) {
      try { owned = await loadSession(body.session_id, ownerId); } catch { /* give generic support if needed */ }
    }
    if (showsDistress(text)) {
      // Only return the supplied ID when ownership is established or this
      // user's own unsaved crisis marker already exists.
      return limitedCrisisResponse(owned || marked ? body : {}, text, started, ownerId);
    }
    if (marked) {
      if (explicitlySafe(text)) limitedCrisisMarkers.delete(markerKey(body.session_id, ownerId));
      else return limitedCrisisResponse(body, text, started, ownerId);
    }
    if (owned && crisisInContext(text, owned, ownerId)) {
      rememberLimitedCrisis(body.session_id, ownerId);
      return limitedCrisisResponse(body, text, started, ownerId);
    }
    return Response.json(
      { error: "Too many messages, please slow down." },
      { status: 429, headers: { "retry-after": "10" } }
    );
  }

  // Authenticated chats may only refer to a session already owned by this user,
  // or to a temporary crisis marker created for this user. Do this before any
  // validation, rate-limit, or crisis branch can read or mutate session state.
  let ownedSession = null;
  if (identity.enabled && isValidId(body?.session_id)) {
    try { ownedSession = await loadSession(body.session_id, ownerId); }
    catch {
      if (typeof body?.message === 'string' && showsDistress(body.message)) {
        return limitedCrisisResponse({}, body.message, started, ownerId);
      }
      return Response.json({ error: 'Session temporarily unavailable.' }, { status: 503 });
    }
    if (!ownedSession && !hasLimitedCrisisMarker(body.session_id, ownerId)) {
      // Preserve immediate support even if a user is holding a stale or
      // unowned ID; never return or adopt that ID or inspect another account.
      if (typeof body?.message === 'string' && showsDistress(body.message)) {
        return limitedCrisisResponse({}, body.message, started, ownerId);
      }
      return Response.json({ error: 'session not found' }, { status: 404 });
    }
  }

  // ---- Step 2: validate the message ----------------------------------------
  // Rejects empty messages and messages over MAX_MESSAGE_CHARS (see checks.mjs).
  const input = validateMessage(body?.message);
  if (!input.ok) {
    if (typeof body?.message === 'string' && showsDistress(body.message)) return limitedCrisisResponse(body, body.message, started, ownerId);
    return Response.json({ error: input.error }, { status: 400 });
  }
  if (body.session_id != null && !isValidId(body.session_id)) {
    if (showsDistress(input.text)) return limitedCrisisResponse(body, input.text, started, ownerId);
    return Response.json({ error: "invalid session_id" }, { status: 400 });
  }

  // ---- Step 3: rate limit ----------------------------------------------------
  // 429 + retry-after tells well-behaved clients (like scripts/run-tests.mjs)
  // to wait and try again.
  if (!identity.enabled && rateLimited(callerIp)) {
    if (showsDistress(input.text)) {
      rememberLimitedCrisis(body.session_id, ownerId);
      return limitedCrisisResponse(body, input.text, started, ownerId);
    }
    if (hasLimitedCrisisMarker(body.session_id, ownerId)) {
      // This only clears the transient marker. A stored crisis_active flag is
      // not changed while rate-limited; the person may retry the affirmation.
      if (explicitlySafe(input.text)) limitedCrisisMarkers.delete(markerKey(body.session_id, ownerId));
      else return limitedCrisisResponse(body, input.text, started, ownerId);
    }
    // For any potential crisis follow-up, check existing session context.
    // Do not save a new turn or call the model while the rate limit is active.
    if (body.session_id && !explicitlySafe(input.text) && allowLimitedLookup(callerIp)) {
      try {
        const existing = identity.enabled ? ownedSession : await loadSession(body.session_id, ownerId);
        if (crisisInContext(input.text, existing, ownerId)) {
          rememberLimitedCrisis(body.session_id, ownerId);
          return limitedCrisisResponse(body, input.text, started, ownerId);
        }
      } catch { /* retain normal rate-limit response if storage is unavailable */ }
    }
    return Response.json(
      { error: "Too many messages, please slow down." },
      { status: 429, headers: { "retry-after": "10" } }
    );
  }

  // ---- Step 4: load the session, or create a new one -----------------------
  // The browser sends the session_id it got back from the first message.
  // We only accept proper UUIDs, so nobody can use odd keys in the store.
  let session = null;
  if (body.session_id != null) {
    try {
      session = identity.enabled ? ownedSession : await loadSession(body.session_id, ownerId);
    } catch (error) {
      if (showsDistress(input.text) || (hasLimitedCrisisMarker(body.session_id, ownerId) && !explicitlySafe(input.text))) return limitedCrisisResponse(body, input.text, started, ownerId);
      throw error;
    }
  }
  // No id, or an id we've never seen (e.g. after a local restart): start a new chat.
  session ??= newSession(isValidId(body.session_id) ? body.session_id : crypto.randomUUID(), ownerId);
  if (explicitlySafe(input.text)) limitedCrisisMarkers.delete(markerKey(session.id, ownerId));

  // ---- Step 5: cap the conversation length (cost control) -------------------
  const userTurns = session.messages.filter((m) => m.role === "user").length;
  if (userTurns >= MAX_TURNS_PER_SESSION) {
    if (crisisInContext(input.text, session, ownerId)) {
      // Persist only the bounded state flag: never append beyond the turn cap.
      // A storage failure must not prevent the immediate support response.
      if (!hasActiveCrisis(session)) {
        session.crisis_active = true;
        try { await saveSession(session); } catch { /* return support anyway */ }
      }
      return limitedCrisisResponse(body, input.text, started, ownerId);
    }
    if (hasActiveCrisis(session) && explicitlySafe(input.text)) {
      session.crisis_active = false;
      try { await saveSession(session); } catch { /* return support anyway */ }
      return limitedCrisisResponse(body, input.text, started, ownerId);
    }
    return Response.json({ error: "This conversation is full. Please start a new chat." }, { status: 400 });
  }

  // ---- Step 6: mask personal data, and raise flags ---------------------------
  // From here on we only use `redacted.text`: the model, the saved chat and
  // the logs never see the original email / phone / card / SSN.
  const redacted = redactPII(input.text);
  const lastUser = [...session.messages].reverse().find((m) => m.role === "user");
  const flags = {
    pii_redacted: redacted.found,                     // e.g. ["email", "phone"]
    injection_suspected: looksLikeInjection(input.text), // flagged, NOT blocked
    distress: crisisInContext(input.text, session, ownerId), // triggers step 9
    output_valid: true,                                  // updated in step 8
    dietary_referral: false,
  };

  // ---- Step 7a: retrieve PDF passages for the current concern ----------------
  // Short follow-ups often need the previous question to locate relevant
  // passages. Add only the previous user turn to the retrieval query; the model
  // separately receives the bounded conversation history below. A new explicit
  // question is not forced to reuse old sources.
  let extra = null;
  let contextText = "";
  const medicalKind = medicalReferral(redacted.text, lastUser?.content);
  flags.medical_referral = Boolean(medicalKind);
  const followsPrevious = lastUser && /^(?:and|but|what about|how about|why\b|what if|tell me more|can you (?:explain|clarify)|how (?:can|do|should) i (?:do|practice|apply|use) (?:this|that)|what does (?:this|that) mean|what (?:can|could|should) i do (?:before|during|after) (?:my|the|a|an)\b)\b/i.test(redacted.text.trim());
  if (!flags.distress && !medicalKind) {
    const query = followsPrevious ? `${lastUser.content} ${redacted.text}` : redacted.text;
    const hits = retrieve(query);
    extra = { type: "rag", source: "Patanjali Yoga Sutras — Sri Sri Ravi Shankar", items: hits };
    if (hits.length) contextText = formatPassages(hits);
  }

  // ---- Step 7: build the conversation history (the "memory") ----------------
  // The model itself remembers nothing between calls. We resend the last
  // HISTORY_TURNS_SENT exchanges every time, followed by the new message.
  // That is how "how about the orange?" is understood after the apple question.
  // Past bot replies are sent back in the same JSON shape we ask the model to
  // use, which helps it keep answering in that format.
  const past = session.messages.slice(-HISTORY_TURNS_SENT * 2).map((m) => ({
    role: m.role,
    content: m.role === "assistant" ? JSON.stringify({ behavior: m.behavior, reply: m.content }) : m.content,
  }));
  const userForModel = contextText ? `${contextText}\n\nUSER MESSAGE:\n${redacted.text}` : redacted.text;
  const history = [...past, { role: "user", content: userForModel }];

  // ---- Step 8: prioritize crisis support and enforce sourced answers ---------
  // A crisis response must not depend on successful retrieval or a live model.
  // For ordinary questions, no retrieved evidence means no invented advice.
  let behavior, reply, usage = { input_tokens: 0, output_tokens: 0 };
  if (flags.distress) {
    behavior = "CARE";
    reply = CRISIS_REPLY;
  } else if (medicalKind) {
    behavior = "CARE";
    reply = medicalReferralReply(medicalKind);
  } else if (!extra.items.length) {
    behavior = "DECLINE";
    reply = "I couldn't find a relevant passage in the available PDF for that question. Try describing the situation in a different way.";
  } else {
    try {
      const llm = await callLLM(history);
      usage = llm.usage;
      const parsed = parseModelOutput(llm.raw);
      flags.output_valid = parsed.ok;
      ({ behavior, reply } = parsed);
      // Reject malformed model output and any invented passage identifiers.
      // Checking IDs is not proof that the interpretation is faithful.
      const mentioned = [...reply.matchAll(/\[([A-Za-z][A-Za-z0-9_-]*\d[A-Za-z0-9_-]*)\]/g)].map((m) => m[1]);
      const allowed = new Set(extra.items.map((item) => item.id));
      if (!parsed.ok || (behavior === "ANSWER" && (!mentioned.length || mentioned.some((id) => !allowed.has(id))))) {
        flags.output_valid = false;
        behavior = "DECLINE";
        reply = "I couldn't produce a reliably sourced response from these passages. Please try another question or consult the source directly.";
      }
      if (RESTRICTIVE_DIET.test(reply)) {
        flags.dietary_referral = true;
        behavior = "CARE";
        reply = "I can't advise you on fasting or restricting food. A qualified healthcare professional can help you consider what is safe for your circumstances.";
        // Do not attach source passages to a safety referral, or persist the
        // model's original advice as part of the conversation.
        extra = null;
      }
      if (behavior === "CARE" && !flags.dietary_referral && !reply.includes("988")) reply = `${reply} ${SUPPORT_LINE}`.trim();
    } catch (err) {
      // The model provider's error body can include user data; never log it.
      console.error(JSON.stringify({ event: "llm_error" }));
      return Response.json({ error: "The assistant is unavailable right now. Please try again." }, { status: 502 });
    }
  }

  // ---- Step 10: never echo personal data back --------------------------------
  reply = redactPII(reply).text;

  // ---- Step 11: save both messages to the session ----------------------------
  // The chat title is the first message (shown in the sidebar and downloads).
  session.crisis_active = flags.distress;
  session.messages.push({ role: "user", content: redacted.text, ts: new Date().toISOString() });
  session.messages.push({
    role: "assistant", content: reply, behavior, ts: new Date().toISOString(),
    // Remember which sources were used, so follow-ups can reuse RAG (step 7a)
    // and reopened chats can show the source tags.
    ...(extra && { context_type: extra.type, context_source: extra.source, context_ids: extra.items.map((x, i) => x.id ?? `H${i + 1}`) }),
  });
  if (!session.title) session.title = redacted.text.slice(0, 60);
  try {
    await saveSession(session);
  } catch (error) {
    if (flags.distress) return limitedCrisisResponse(body, input.text, started, ownerId);
    throw error;
  }

  // ---- Step 12: respond, and log without message text ------------------------
  const response = {
    session_id: session.id,   // the browser keeps this and sends it with the next message
    turn: userTurns + 1,
    behavior,                 // ANSWER | DECLINE | CARE (used by the test runner)
    reply,                    // what the user sees
    flags,
    context: extra,         // which reviews / headlines were given to the model (null if none)
    provider: flags.distress || medicalKind ? "safety" : provider(),
    model: flags.distress || medicalKind ? "none" : modelName(),
    prompt_version: PROMPT_VERSION,
    storage: await storageKind(), // netlify-blobs | memory
    latency_ms: Date.now() - started,
    usage,                    // tokens, for cost estimates
  };

  // QUIET_LOGS is set by the test script to keep its output readable.
  if (!env("QUIET_LOGS")) {
    console.log(JSON.stringify({ event: "chat", turn: response.turn, behavior, flags, context_type: extra?.type ?? null, latency_ms: response.latency_ms }));
  }
  return Response.json(response);
};

// Tells Netlify which URL this function answers on.
export const config = { path: "/api/chat" };
