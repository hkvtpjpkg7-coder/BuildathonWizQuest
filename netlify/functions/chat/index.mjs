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

import { loadSession, saveSession, newSession, isValidId, storageKind, EVALUATION_OWNER } from "../../lib/store.mjs";
import {
  validateMessage, redactPII, looksLikeInjection, showsDistress, explicitlySafe, requiresSafetyInterpretation, parseModelOutput,
  MAX_TURNS_PER_SESSION,
} from "../../lib/checks.mjs";
import { callLLM, provider, modelName, env, PROMPT_VERSION, SYSTEM_PROMPT } from "../../lib/llm.mjs";
import { retrieve, formatPassages, passagesById, requestedSutras } from "../../lib/rag.mjs";
import { medicalReferral, medicalReferralReply } from "../../lib/medical.mjs";
import { contextualCare, contextualCareReply, crisisReply, showsPersonalCrisis } from "../../lib/care.mjs";
import { appFactReply, sharesSensitiveNumberOnly, SENSITIVE_DATA_NOTICE } from "../../lib/app-facts.mjs";
import { clarificationFor, isPersonalConcern, isClarificationContinuation, requestsSource, declinesToElaborate, supportiveFallback, isPersonalSleepConcern, sleepSupport } from "../../lib/clarify.mjs";
import { authenticateRequest, authFailure } from "../../lib/auth.mjs";
import { evaluationSettings, createEvaluationLimiter } from "../../lib/evaluation.mjs";
import { supportConversationTurn } from "../../lib/support.mjs";
import { planConversationTurn, conversationHistory } from "../../lib/conversation.mjs";

// -----------------------------------------------------------------------------
// Rate limiter used in step 3.
// Remembers the timestamps of recent requests per IP address and refuses
// anything over RATE_LIMIT_PER_MIN in the last 60 seconds.
// Limitation: it lives in this function instance's memory, so it is
// best-effort (Netlify may run several instances). Good enough for a demo;
// use a shared store (e.g. Netlify Blobs or Redis) for real traffic.
// -----------------------------------------------------------------------------
const hits = new Map(); // ip -> [timestamp, timestamp, ...]
const admitEvaluation = createEvaluationLimiter();
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
// The model has suggested fasting even when not asked. This deliberately
// conservative check can also flag neutral mentions; it is not a complete
// dietary-advice detector and requires continued review of model output.
const RESTRICTIVE_DIET = /\b(?:fasting|fasts|(?:intermittent\s+)?fast\s+(?:for|until|from|during)|intermittent\s+fast|skip(?:ping)?\s+(?:a\s+|your\s+)?meals?|restrict(?:ing)?\s+(?:your\s+)?(?:food|calories|eating)|restrictive\s+(?:diet|eating)|(?:cut|reduce|limit)\s+(?:your\s+)?(?:calories|food intake)|(?:avoid(?:ing)?|stop)\s+eating)\b/i;
// Targeted post-generation guard for treatment/cure assertions and medication
// changes. This is not comprehensive medical-content detection.
const MEDICAL_CURE_ADVICE = /\b(?:cure[sd]?|treats?|heal[sd]?|revers(?:e|es|ed))\s+(?:(?:your|the|a|any)\s+){0,3}(?:anxiety|depression|insomnia|cancer|diabetes|illness|disease|infection|adhd|ptsd)\b|\b(?:a|the)\s+(?:cure|treatment)\s+for\s+(?:(?:your|the|a|any)\s+){0,3}(?:anxiety|depression|insomnia|cancer|diabetes|illness|disease|infection|adhd|ptsd)\b|\b(?:stop|start|change|increase|reduce|skip|discontinue|quit|taper|replace|substitute|wean off)\s+(?:(?:taking|using|your|the|a|any|prescribed|daily|regular|own|current)\s+){0,6}(?:medications?|medicines?|meds|prescriptions?|antidepressants?|antipsychotics?|ssris?|snris?|pills?)\b|\binstead of\s+(?:(?:taking|using|your|the|a|any|prescribed|daily|regular|current)\s+){0,6}(?:medications?|medicines?|meds|prescriptions?|antidepressants?|antipsychotics?|ssris?|snris?|pills?)\b/i;
const MAX_BODY_BYTES = 16 * 1024;
const TEACHING_LIMIT_REPLY = "I don't have enough information in the commentary to answer that reliably.";
// Common editions end chapter three at either 55 or 56. Use the upper
// bound when correcting an impossible number across both editions.
// Sanskrit editions: https://heritage.iitk.ac.in/YGS and the GRETIL Yoga Sutra.
const LAST_SUTRA = [0, 51, 55, 56, 34];

function invalidSutraReply(refs) {
  if (refs.length !== 1) return null;
  const [chapter, verse] = refs[0].split('.').map(Number);
  if (!LAST_SUTRA[chapter]) return "The Yoga Sutras have four chapters, so that chapter number doesn't exist in standard numbering.";
  if (verse < 1 || verse > LAST_SUTRA[chapter]) {
    return `Sutra ${refs[0]} doesn't exist in standard Yoga Sutra numbering. Chapter ${chapter} ${chapter === 3 ? 'has 55 or 56 sutras, depending on the edition' : `has ${LAST_SUTRA[chapter]} sutras`}.`;
  }
  return null;
}

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
    if (showsPersonalCrisis(message.content)) return message.content;
    if (explicitlySafe(message.content)) return '';
  }
  return '';
}

function hasActiveCrisis(session) {
  if (typeof session?.crisis_active === 'boolean') return session.crisis_active;
  return Boolean(recentCrisisMessage(session?.messages));
}

function crisisInContext(text, session, ownerId = null) {
  return showsPersonalCrisis(text) || ((hasActiveCrisis(session) || hasLimitedCrisisMarker(session?.id, ownerId)) && !explicitlySafe(text));
}

// Acknowledgments are conversational turns, not a new subject. Find the last
// substantive exchange without skipping a decline, safety referral or closure.
// Read persisted turns so this also works after reopening a chat or restarting.
function activeExchange(messages = []) {
  for (let i = messages.length - 1; i >= 0; i--) {
    const assistant = messages[i];
    if (assistant.role !== 'assistant') continue;
    if (assistant.kind === 'conversation' && assistant.conversation_intent === 'acknowledge') continue;
    const user = messages.slice(0, i).reverse().find((m) => m.role === 'user');
    return { assistant, user };
  }
  return {};
}

function verifiedReplyPassages(message) {
  if (message?.behavior && message.behavior !== 'ANSWER') return [];
  const oldContext = Array.isArray(message?.context_ids) ? message.context_ids : [];
  const oldCitations = [...String(message?.content || '').matchAll(/\[(P\d+-\d+)\]/g)]
    .map((match) => match[1]).filter((id) => oldContext.includes(id));
  return passagesById(message?.context_used_ids ?? oldCitations);
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
    reply: crisisReply(text),
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
  let evalOptions;
  try {
    // Only a completely absent Authorization header may enter this isolated
    // evaluation path. Invalid/empty/expired bearer tokens never downgrade.
    if (!req.headers.has('authorization')) evalOptions = evaluationSettings();
    identity = evalOptions?.enabled
      ? { enabled: true, uid: EVALUATION_OWNER, evaluation: true }
      : await authenticateRequest(req);
  } catch (error) { return authFailure(error); }
  const ownerId = identity.uid;
  const callerIp = context?.ip ?? "unknown";
  // Reserve from the evaluator's independent per-IP and process-wide budget
  // before any storage lookup or model call. Never consume user rate buckets.
  const evaluationLimited = identity.evaluation && !admitEvaluation(callerIp, evalOptions);

  let body;
  try {
    body = JSON.parse(await readBoundedBody(req));
  } catch (error) {
    if (error instanceof RangeError) return Response.json({ error: 'Request body too large.' }, { status: 413 });
    return Response.json({ error: 'Body must be JSON: {"message": "..."}' }, { status: 400 });
  }

  if (evaluationLimited) {
    const text = typeof body?.message === 'string' ? body.message : '';
    const marked = isValidId(body?.session_id) && hasLimitedCrisisMarker(body.session_id, ownerId);
    if (showsDistress(text)) return limitedCrisisResponse(marked ? body : {}, text, started, ownerId);
    if (marked && !explicitlySafe(text)) return limitedCrisisResponse(body, text, started, ownerId);
    if (marked && explicitlySafe(text)) limitedCrisisMarkers.delete(markerKey(body.session_id, ownerId));
    return Response.json({ error: 'Evaluation request limit reached.' }, { status: 429, headers: { 'retry-after': '60', 'cache-control': 'no-store' } });
  }
  // Authenticated callers are throttled before any session lookup. Crisis
  // responses remain available; a bounded lookup may recover an owned active
  // crisis, but never looks in another account's namespace.
  if (identity.enabled && !identity.evaluation && rateLimited(callerIp)) {
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
  const lastAssistant = [...session.messages].reverse().find((m) => m.role === "assistant");
  const focus = activeExchange(session.messages);
  const careKind = contextualCare(input.text, lastAssistant?.care_kind);
  const flags = {
    pii_redacted: redacted.found,                     // e.g. ["email", "phone"]
    injection_suspected: looksLikeInjection(input.text), // flagged, NOT blocked
    distress: crisisInContext(input.text, session, ownerId), // triggers step 9
    output_valid: true,                                  // updated in step 8
    dietary_referral: false,
  };

  // ---- Step 7a: retrieve PDF passages for the current concern ----------------
  // Short follow-ups may need the previous question to locate passages, or the
  // verified sources of the last answer when explicitly asking to reword it.
  // The model separately receives bounded history. A new explicit subject is
  // not forced to reuse old sources.
  let extra = null;
  let contextText = "";
  let medicalKind = medicalReferral(redacted.text, focus.user?.content || lastUser?.content);
  flags.medical_referral = Boolean(medicalKind);
  const canAnswer = !flags.distress && !medicalKind && !careKind;
  const sensitiveNumberOnly = redacted.found.length > 0 && sharesSensitiveNumberOnly(redacted.text);
  const appReply = canAnswer ? (sensitiveNumberOnly ? SENSITIVE_DATA_NOTICE : appFactReply(redacted.text)) : null;
  const sourceRequested = Boolean(lastAssistant && canAnswer && !appReply && requestsSource(redacted.text));
  const previousClarification = focus.assistant?.kind === 'clarification' ? focus.assistant.clarification_topic : null;
  const privacyPreference = previousClarification && previousClarification !== 'greeting' && declinesToElaborate(redacted.text);
  const safetyInterpretationNeeded = requiresSafetyInterpretation(redacted.text);
  // A separate disclosure in a source or app question still needs review.
  const mixedLocalRequest = (appReply || sourceRequested) && /[?!.;]\s+\S|\b(?:and|but|because)\s+(?:i|we)\b/i.test(redacted.text);
  let clarification = !safetyInterpretationNeeded && !lastAssistant && canAnswer && !appReply && !sourceRequested ? clarificationFor(redacted.text, previousClarification) : null;
  // Interpret the conversational act before presenting any retrieved text.
  // The planner sees only bounded, redacted conversation, never source chunks.
  let plan = null;
  if (!flags.distress && (safetyInterpretationNeeded || mixedLocalRequest || (canAnswer && !appReply && !sourceRequested && !clarification && !privacyPreference))) {
    plan = await planConversationTurn(redacted.text, session.messages);
    // An explicit topic change must never borrow the previous answer's sources.
    if (plan.intent === 'continue' && /\b(?:new topic|different topic|change (?:the )?subject|unrelated)\b/i.test(redacted.text)) {
      plan = { ...plan, intent: 'new_topic', query: redacted.text, reuse_previous: false };
    }
    flags.output_valid = plan.valid;
    if (plan.intent === 'care' || (safetyInterpretationNeeded && !plan.valid)) flags.distress = true;
    if (plan.intent === 'medical') { medicalKind = 'treatment'; flags.medical_referral = true; }
    // Medical intent is decided from original dialogue (raw guard or planner),
    // never by treating a generated search paraphrase as a new user request.
  }
  if (plan && plan.subject !== 'teaching' && ['continue', 'new_topic'].includes(plan.intent)) {
    // An unanswered clarification about this same concern must not repeat,
    // even if the planner mislabels a repeated disclosure as a new topic.
    clarification = clarificationFor(plan.query, previousClarification);
  }
  const conversationalReply = plan && ['acknowledge', 'close', 'clarify'].includes(plan.intent);
  const sleepContinuation = (!plan || plan.intent === 'continue') &&
    (previousClarification === 'sleep' || focus.assistant?.kind === 'sleep_support') &&
    isClarificationContinuation(redacted.text, 'sleep');
  const sleepSupportNeeded = canAnswer && !flags.distress && !medicalKind && !appReply && !sourceRequested && !clarification && !privacyPreference && !conversationalReply &&
    (isPersonalSleepConcern(plan?.query || redacted.text) || sleepContinuation);
  const followsPrevious = plan?.intent === 'continue';
  const explicitSutras = requestedSutras(redacted.text);
  const numberingReply = plan?.subject === 'teaching' ? invalidSutraReply(explicitSutras) : null;
  if (sourceRequested && !flags.distress && !medicalKind) {
    // Only restore IDs verified for the immediately preceding assistant reply,
    // not every retrieved candidate or a different prior conversation turn.
    // Older saved replies predate context_used_ids; recover their explicit
    // citations only if those IDs were among the context originally supplied.
    const used = verifiedReplyPassages(lastAssistant);
    extra = { type: 'rag', source: 'Patanjali Yoga Sutras — Sri Sri Ravi Shankar', items: used, used_ids: used.map((item) => item.id), source_requested: true };
  } else if (canAnswer && !flags.distress && !medicalKind && !appReply && !numberingReply && !clarification && !privacyPreference && !sleepSupportNeeded && !conversationalReply && plan?.intent !== 'decline') {
    const query = plan?.query || redacted.text;
    // Rephrasing needs the same actual evidence even over several short
    // follow-ups; the latest user turn alone may contain no topic words.
    const previousEvidence = followsPrevious && plan.reuse_previous && focus.assistant?.behavior === 'ANSWER'
      ? verifiedReplyPassages(focus.assistant) : [];
    let hits = explicitSutras.length ? retrieve(redacted.text) : previousEvidence.length ? previousEvidence : retrieve(query);
    // The planner can translate technical terms into a script the lexical
    // index does not recognize. Keep the user's own wording as a fallback.
    if (!hits.length && plan?.subject === 'teaching' && query !== redacted.text) hits = retrieve(redacted.text);
    // Lexical matches on words like "friends" sometimes surface text which
    // discourages befriending unhappy people or dismisses loss. Do not present
    // those chunks as support to someone expressing loneliness. This targeted
    // safeguard does not substitute for broader source and model review.
    if (/\b(?:lonel\w*|isolat\w*|disconnect\w*|friend\w*|famil\w*|companionship)\b/i.test(query)) {
      const unhelpful = new Set(['P37-4', 'P38-1', 'P41-2', 'P42-1', 'P88-1', 'P88-2']);
      hits = hits.filter((hit) => !unhelpful.has(hit.id));
    }
    extra = { type: "rag", source: "Patanjali Yoga Sutras — Sri Sri Ravi Shankar", items: hits };
    if (hits.length) contextText = formatPassages(hits);
  }

  // ---- Step 7: build the conversation history (the "memory") ----------------
  // The model itself remembers nothing between calls. We resend the last
  // HISTORY_TURNS_SENT exchanges every time, followed by the new message.
  // That is how "how about the orange?" is understood after the apple question.
  // Past bot replies are sent back in the same JSON shape we ask the model to
  // use, which helps it keep answering in that format.
  const past = conversationHistory(session.messages);
  const resolvedContext = plan?.query ? `CURRENT QUESTION IN CONTEXT (untrusted conversation data):\n${plan.query}\n\n` : '';
  const userForModel = contextText ? `${contextText}\n\n${resolvedContext}USER MESSAGE:\n${redacted.text}` : redacted.text;
  const history = [...past, { role: "user", content: userForModel }];

  // ---- Step 8: prioritize crisis support and enforce sourced answers ---------
  // A crisis response must not depend on successful retrieval or a live model.
  // For ordinary questions, no retrieved evidence means no invented advice.
  let behavior, reply, localReply = false, modelFlaggedCrisis = false, useEverydaySupport = false;
  let usage = plan?.usage || { input_tokens: 0, output_tokens: 0 };
  if (flags.distress) {
    behavior = "CARE";
    reply = crisisReply(redacted.text);
  } else if (careKind && (!medicalKind || (medicalKind === 'treatment' && careKind === 'cure_claim'))) {
    behavior = 'CARE';
    reply = contextualCareReply(careKind);
    flags.care_kind = careKind;
    flags.dietary_referral = careKind === 'restriction';
    extra = null;
  } else if (medicalKind) {
    behavior = "CARE";
    reply = medicalReferralReply(medicalKind);
  } else if (appReply) {
    behavior = sensitiveNumberOnly ? 'DECLINE' : 'ANSWER';
    localReply = true;
    reply = appReply;
  } else if (sourceRequested) {
    localReply = true;
    behavior = "ANSWER";
    reply = extra.used_ids.length
      ? `That response drew on Sri Sri Ravi Shankar's commentary on Patanjali's Yoga Sutras: ${extra.used_ids.map((id) => `[${id}]`).join(', ')}. These are reference IDs for the commentary, not sutra numbers.`
      : "I didn't use a specific source for my last response, so I don't have a source reference to share for it.";
  } else if (conversationalReply) {
    behavior = 'ANSWER';
    reply = plan.reply;
  } else if (plan?.intent === 'decline') {
    behavior = 'DECLINE';
    reply = "I'm here for reflection on everyday wellbeing and personal concerns. I can't help with that request.";
  } else if (numberingReply) {
    behavior = 'ANSWER';
    reply = numberingReply;
    localReply = true;
  } else if (clarification) {
    behavior = "ANSWER";
    reply = clarification.reply;
    localReply = true;
  } else if (privacyPreference) {
    behavior = 'ANSWER';
    localReply = true;
    reply = previousClarification === 'sleep'
      ? "That's completely okay—you don't have to share more. If sleep problems keep happening, consider talking with a healthcare professional. We can take this at your own pace."
      : "That's completely okay—you don't have to share more. If it feels comfortable, consider reaching out to someone you trust. We can take this at your own pace.";
  } else if (sleepSupportNeeded) {
    behavior = 'ANSWER';
    localReply = true;
    reply = sleepSupport(redacted.text, sleepContinuation ? focus.user?.content : '');
  } else if (!extra?.items?.length) {
    localReply = true;
    if (plan?.subject === 'teaching') {
      behavior = 'DECLINE';
      reply = TEACHING_LIMIT_REPLY;
    } else if (plan?.subject === 'wellbeing' || isPersonalConcern(plan?.query || redacted.text) || (followsPrevious && isPersonalConcern(focus.user?.content))) {
      useEverydaySupport = true;
    } else {
      behavior = "DECLINE";
      reply = "I'm here to help you reflect on everyday wellbeing and personal concerns. What would you like to explore?";
    }
  } else {
    try {
      const allowed = new Set(extra.items.map((item) => item.id));
      let claimed, invalidGrounding;
      // One bounded repair uses exactly the same dialogue and reference data,
      // never the rejected prose. Current IDs can differ from an older answer.
      for (let attempt = 0; attempt < 2; attempt++) {
        const options = attempt ? { systemPrompt: `${SYSTEM_PROMPT}\nReturn the exact JSON contract. The only currently allowed source IDs are ${JSON.stringify([...allowed])}. Do not copy IDs from earlier turns unless they are in this list. For ANSWER, identify actual supporting current evidence; if it cannot support an answer, use DECLINE. Retain CARE if the original dialogue indicates danger.` } : undefined;
        const llm = await callLLM(history, options);
        usage = { input_tokens: (usage.input_tokens || 0) + (llm.usage?.input_tokens || 0), output_tokens: (usage.output_tokens || 0) + (llm.usage?.output_tokens || 0) };
        const parsed = parseModelOutput(llm.raw);
        flags.output_valid = parsed.ok;
        ({ behavior, reply } = parsed);
        // ID membership is required, but is not proof of source faithfulness.
        const mentioned = [...reply.matchAll(/\[([A-Za-z][A-Za-z0-9_-]*\d[A-Za-z0-9_-]*)\]/g)].map((m) => m[1]);
        claimed = [...new Set([...parsed.source_ids ?? [], ...mentioned])];
        invalidGrounding = !parsed.ok || claimed.some((id) => typeof id !== 'string' || !allowed.has(id)) || (behavior === 'ANSWER' && !claimed.length);
        if (behavior === 'CARE' || !invalidGrounding) break;
      }
      if (behavior === 'CARE') {
        // A model-detected crisis gets fixed immediate support even if the
        // model supplied malformed or invented citations; never downgrade it.
        reply = crisisReply(redacted.text);
        extra = null;
        modelFlaggedCrisis = true;
        flags.distress = true;
      } else if (invalidGrounding) {
        flags.output_valid = false;
        behavior = "DECLINE";
        reply = plan?.subject === 'teaching' ? TEACHING_LIMIT_REPLY : "I'd like to understand your situation better. What feels most important to you right now?";
      } else if (behavior === 'DECLINE') {
        // Do not trust a model-selected label to bypass citation checks while
        // smuggling unsupported advice or false attribution into the reply.
        useEverydaySupport = plan?.subject === 'wellbeing' && !flags.injection_suspected;
        reply = plan?.subject === 'teaching' ? TEACHING_LIMIT_REPLY : "I'd like to understand your situation better. What feels most important to you right now?";
      } else {
        extra.used_ids = claimed;
        // Older model responses may still contain inline IDs. Preserve them in
        // metadata but keep the ordinary conversational reply free of labels.
        reply = reply.replace(/\s*\[([A-Za-z][A-Za-z0-9_-]*\d[A-Za-z0-9_-]*)\]/g, '').replace(/\s+([.,!?])/g, '$1').trim();
      }
    } catch (err) {
      // The model provider's error body can include user data; never log it.
      console.error(JSON.stringify({ event: "llm_error" }));
      return Response.json({ error: "The assistant is unavailable right now. Please try again." }, { status: 502 });
    }
  }

  if (useEverydaySupport) {
    behavior = 'ANSWER';
    localReply = true;
    extra = null;
    reply = supportiveFallback(plan?.query || redacted.text, followsPrevious ? focus.user?.content : '');
    if (plan?.subject === 'wellbeing' && provider() !== 'mock') {
      const support = await supportConversationTurn(redacted.text, session.messages);
      usage.input_tokens = (usage.input_tokens || 0) + (support.usage.input_tokens || 0);
      usage.output_tokens = (usage.output_tokens || 0) + (support.usage.output_tokens || 0);
      if (support.crisis) {
        behavior = 'CARE';
        reply = crisisReply(redacted.text);
        modelFlaggedCrisis = true;
        flags.distress = true;
      } else if (support.reply) {
        reply = support.reply;
        localReply = false; // Apply the normal medical/dietary output guards.
      } else {
        flags.output_valid = false;
      }
    }
  }

  // Apply the same output safeguards to source-free conversational replies.
  if (behavior === 'ANSWER' && (conversationalReply || !localReply) && RESTRICTIVE_DIET.test(reply)) {
    flags.dietary_referral = true;
    behavior = "CARE";
    reply = "I can't advise you on fasting or restricting food. A qualified healthcare professional can help you consider what is safe for your circumstances.";
    // Do not attach source passages to a safety referral, or persist the
    // model's original advice as part of the conversation.
    extra = null;
  }
  if (behavior === 'ANSWER' && (conversationalReply || !localReply) && MEDICAL_CURE_ADVICE.test(reply)) {
    flags.medical_referral = true;
    behavior = 'CARE';
    reply = "I can't advise on treatment or medication. A qualified healthcare professional can discuss what is appropriate for your situation.";
    extra = null;
  }

  if (behavior !== 'ANSWER') extra = null;
  if (behavior !== 'CARE' && reply !== SENSITIVE_DATA_NOTICE && redacted.found.some((kind) => kind === 'card' || kind === 'ssn')) {
    reply = `${reply} ${SENSITIVE_DATA_NOTICE}`;
  }

  // ---- Step 10: never echo personal data back --------------------------------
  reply = redactPII(reply).text;

  // ---- Step 11: save both messages to the session ----------------------------
  // The chat title is the first message (shown in the sidebar and downloads).
  session.crisis_active = flags.distress || modelFlaggedCrisis;
  session.messages.push({ role: "user", content: redacted.text, ts: new Date().toISOString() });
  session.messages.push({
    role: "assistant", content: reply, behavior, ts: new Date().toISOString(),
    ...(flags.care_kind && { care_kind: flags.care_kind }),
    ...(clarification && { kind: 'clarification', clarification_topic: clarification.topic }),
    ...(sleepSupportNeeded && { kind: 'sleep_support' }),
    ...(conversationalReply && behavior === 'ANSWER' && { kind: 'conversation', conversation_intent: plan.intent }),
    // Remember which sources were used, so follow-ups can reuse RAG (step 7a)
    // and reopened chats can show the source tags.
    ...(extra && { context_type: extra.type, context_source: extra.source, context_ids: extra.items.map((x, i) => x.id ?? `H${i + 1}`), ...(extra.used_ids && { context_used_ids: extra.used_ids }), ...(extra.source_requested && { context_source_requested: true }) }),
  });
  if (!session.title) session.title = redacted.text.slice(0, 60);
  try {
    await saveSession(session);
  } catch (error) {
    if (flags.distress) return limitedCrisisResponse(body, input.text, started, ownerId);
    throw error;
  }
  // Keep follow-ups in an active evaluator crisis on the immediate-support path
  // even when its public request budget is reached in this process.
  if (identity.evaluation && flags.distress) rememberLimitedCrisis(session.id, ownerId);

  // ---- Step 12: respond, and log without message text ------------------------
  const response = {
    session_id: session.id,   // the browser keeps this and sends it with the next message
    turn: userTurns + 1,
    behavior,                 // ANSWER | DECLINE | CARE (used by the test runner)
    reply,                    // what the user sees
    flags,
    context: extra,         // which reviews / headlines were given to the model (null if none)
    provider: flags.distress || medicalKind || flags.care_kind ? "safety" : localReply ? "local" : provider(),
    model: flags.distress || medicalKind || flags.care_kind || localReply ? "none" : modelName(),
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
