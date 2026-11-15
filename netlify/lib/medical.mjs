// Narrow routing for requests that this reflection coach must not answer as a
// substitute for a prescriber or clinician. This is a heuristic, not a full
// medical triage or diagnosis system. Crisis detection remains a separate,
// higher-priority path in the handler.
const MEDICINE = /\b(?:medications?|medicines?|meds|prescriptions?|pills?|tablets?|dos(?:e|age)s?|insulin|antidepressants?|antipsychotics?|benzodiazepines?|painkillers?|antibiotics?|ssris?|snris?|sertraline|fluoxetine|lexapro|zoloft|prozac)\b/i;
const CHANGE = /\b(?:start|begin|stop|quit|discontinue|withdraw|change|switch|replace|adjust|increase|raise|reduce|lower|decrease|double|halve|skip|restart|mix|combine|take)\w*\b/i;
const REQUEST = /\b(?:should|shall|can|could|may|would|safe|okay|ok|help|advi[sc]e|recommend|need|want|plan|thinking|how|what|whether|instead)\b|\?/i;
const INTENT_TO_CHANGE = new RegExp(String.raw`\b(?:should|shall|can|could|may|would|safe|okay|ok|help|advi[sc]e|recommend|need|want|plan|thinking|how|what|whether|instead)\b.{0,70}${CHANGE.source}`, 'i');
const DIAGNOSIS = /\b(?:diagnos(?:e|is|tic|ing)|what(?:'s| is) wrong with me|(?:do|could|might) i have|am i suffering from|is this (?:a sign|a symptom) of)\b/i;

/** Return only the type of explicit medical request; no inference of illness. */
export function medicalReferral(message, previousUserMessage = '') {
  const text = String(message || '').trim();
  const previous = String(previousUserMessage || '');
  if (!text) return null;
  if (DIAGNOSIS.test(text)) return 'diagnosis';
  // Mentioning an existing prescription alongside an unrelated wish ("I take
  // medication and want to understand meditation") is not a dosage request.
  const directMedicationQuestion = MEDICINE.test(text) && INTENT_TO_CHANGE.test(text);
  const substitutionQuestion = MEDICINE.test(text) && /\b(?:instead of|replace|cure|treat without)\b/i.test(text) && REQUEST.test(text);
  // Resolve an explicit short medication follow-up only against the last user
  // message, without forwarding unrelated questions into the medical branch.
  const medicationFollowUp = MEDICINE.test(previous) && text.length <= 100 && CHANGE.test(text) && REQUEST.test(text)
    && /\b(?:it|them|these|those|this|that|taking|stop|start|reduce|increase|change|switch|continue)\b/i.test(text);
  return (directMedicationQuestion || substitutionQuestion || medicationFollowUp) ? 'medication' : null;
}

export function medicalReferralReply(kind) {
  if (kind === 'diagnosis') return "I can't diagnose symptoms. A qualified healthcare professional can assess what's going on and discuss appropriate next steps with you.";
  return "I can't advise you to start, stop, replace, or change a medication. Please speak with your prescriber or pharmacist before making a change; they can advise you based on your situation.";
}
