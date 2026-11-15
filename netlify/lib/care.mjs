import { showsDistress, SUPPORT_LINE } from './checks.mjs';

// Only reassign a self-harm signal when the subject and the risk are explicitly
// linked in the same clause. Any remaining personal danger keeps priority.
const THIRD_PARTY_RISK = /\b(?:my |our |a )(?:close |best )?(?:friend|sibling|brother|sister|child|son|daughter|partner|colleague|coworker|classmate|parent)\s+(?:just\s+)?(?:(?:told|texted|messaged)\s+me\s+(?:that\s+)?|(?:says|said)\s+(?:that\s+)?|(?:is|was)\s+)?(?:(?:he(?:'s)?|she(?:'s)?|they(?:'re)?)\s+)?(?:(?:wants?|plans?|is going|are going)\s+to\s+(?:die|(?:kill|hurt|harm)\s+(?:himself|herself|themself|themselves))|(?:doesn't|don't|does not|do not)\s+want to live|(?:(?:is|are|was|were)\s+)?(?:suicidal|(?:thinking|talking) about suicide))\b/gi;

const normalize = (text) => String(text ?? '').replace(/[’‘]/g, "'").replace(/\s+/g, ' ');

export function showsPersonalCrisis(message) {
  const text = normalize(message);
  const otherRisk = text.replace(THIRD_PARTY_RISK, ' ');
  if (otherRisk === text) return showsDistress(text);
  return showsDistress(otherRisk) || /\b(?:so (?:am|do) i|me too|i (?:feel|want) the same)\b/i.test(otherRisk);
}

const MINOR = /\b(?:i(?:'m| am)\s+(?:only\s+)?(?:[5-9]|1[0-7])\b(?!\s*(?:days?|weeks?|months?|weeks? pregnant|minutes?|hours?))|i(?:'m| am) (?:a minor|under 18))\b/i;
const CHILD_HARM = /\b(?:parents?|mom|mum|dad|mother|father|step(?:mom|mum|dad|mother|father)|caregiver|guardian)(?:\s+(?:is|are|was|were|has|have|been|keeps?|sometimes|often|always|still|again)){0,4}\s+(?:hit(?:s|ting)?|beat(?:s|ing)?|hurt(?:s|ing)?|abus(?:e[sd]?|ing))\s+me\b/i;
const SECRECY = /\b(?:secret(?:s|ly)?|don't tell|do not tell|keep (?:it|this) between us)\b/i;
const ADULT_CONTACT = /\b(?:adult|grown[- ]up|(?:[2-9]\d|1[89])(?:-year-old| (?:years old|yo)))\b/i;
const CONTACT = /\b(?:calls?|meet|meeting|pictures?|photos?|videos?|messages?|chat|gifts?|friend)\b/i;
const PERCEPTION = /\b(?:i (?:keep |can |am )?hear(?:ing)? voices|(?:the |these )?voices (?:are telling|tell|told) me|hearing voices (?:that|and))\b/i;
const PANIC = /\bpanic attacks?\b/i;
const PERSONAL = /\b(?:i|my|me)\b/i;
const THERAPY_CHANGE = /\b(?:quit(?:ting)?|stop(?:ping)?|drop(?:ping)?|replac(?:e|ing)|giv(?:e|ing) up)\s+(?:(?:my|the|going to)\s+)?(?:therapy|counsel(?:l)?ing|seeing (?:my|a) therapist)\b/i;
const FOOD_RESTRICTION = /\b(?:(?:water|dry|prolonged|extended|multi-day|\d+-day) fast(?:ing)?|fast(?:ing|ed)? (?:for )?(?:\d+|two|three|four|five|six|seven|eight|nine|ten|multiple|several|a few)\s+days?|(?:fasting|water fast)\b[^.!?]{0,50}\b(?:go longer|keep going|extend)|\d{2,3}\s*(?:kcal|calories)\s*(?:a|per|each|\/)?\s*day|starv(?:e|ing) myself)\b/i;
const BREATH_RISK = /\b(?:how long (?:can|should|do) i hold (?:my|the) breath|max(?:imum)?\s+(?:breath[- ]hold|prana)|(?:long|intense|extreme)\s+(?:breath retention|breath[- ]holds?|kumbhaka)|(?:hold(?:ing)?|retain(?:ing)?)\s+(?:my|the)\s+breath\s+for\s+(?:as long as|\d+\s+minutes?))\b/i;
const PREGNANCY = /\b(?:pregnan(?:t|cy)|expecting a baby)\b/i;
const INTENSE_PRACTICE = /\b(?:intense|forceful|advanced|rapid|breath retention|breath[- ]holds?|kumbhaka|kapalabhati|bhastrika)\b/i;
const PRACTICE = /\b(?:yoga|asana(?:s)?|pranayama|breathing|breathwork|breath)\b/i;
const CURE_CLAIM = /\b(?:meditation|yoga|pranayama)\b[^.!?]{0,45}\b(?:cur(?:e[sd]?|ing)|revers(?:e[sd]?|ing))\s+(?:my |the )?(?:cancer|illness|disease)\b/i;
const LETHAL_DOSE = /\b(?:what (?:is|would be)|how (?:many|much)|give me|tell me)\b[^.!?]{0,65}\b(?:lethal|fatal)\s+(?:dose|amount)\b/i;
const MEDICATION_ATTRIBUTION = /\b(?:sutras?|patanjali)\b.{0,250}\b(?:stop|quit|discontinue) (?:taking )?(?:(?:your|their|my|the)\s+)?(?:medications?|medicines?|meds|prescriptions?)\b/i;
const HEALTH_DISCLOSURE = /\b(?:i(?:'m| am) (?:hiv[- ]positive\b|hiv\+(?!\w))|i (?:have|tested positive for) hiv\b|i(?:'ve been| was| have been| got) diagnosed with\b)/i;
const DISCLOSURE_CONCERN = /\b(?:tell(?:ing)?|disclos(?:e|ing)|talk(?:ing)? (?:to|with))\b/i;
const ISOLATION_PRESSURE = /\b(?:guru|teacher|spiritual leader)\b[^.!?]{0,55}\b(?:cut(?:ting)? off|stop (?:seeing|speaking to|talking to)|leave)\s+(?:my|our|the)\s+family\b/i;

export function contextualCare(message, previousKind) {
  const text = normalize(message);
  if (text.replace(THIRD_PARTY_RISK, ' ') !== text) return 'other_at_risk';
  if (previousKind === 'other_at_risk' && /^(?:what (?:else )?should i (?:say|text|send)(?: (?:to )?(?:her|him|them))?|what (?:else )?can i do (?:to help|for (?:her|him|them)))[?!. ]*$/i.test(text.trim())) return 'other_at_risk';
  if (MINOR.test(text) && CHILD_HARM.test(text)) return 'child_harm';
  if (MINOR.test(text) && SECRECY.test(text) && CONTACT.test(text)) return ADULT_CONTACT.test(text) ? 'unsafe_adult_contact' : 'minor_secrecy';
  if (PERCEPTION.test(text)) return 'perception';
  if (THERAPY_CHANGE.test(text) && PERSONAL.test(text)) return 'therapy';
  if (PREGNANCY.test(text) && PRACTICE.test(text) && INTENSE_PRACTICE.test(text)) return 'pregnancy';
  if (LETHAL_DOSE.test(text)) return 'lethal_dose';
  if (MEDICATION_ATTRIBUTION.test(text)) return 'medication_claim';
  if (FOOD_RESTRICTION.test(text) && PERSONAL.test(text)) return 'restriction';
  if (BREATH_RISK.test(text)) return 'breath_retention';
  if (PANIC.test(text) && PERSONAL.test(text)) return 'panic';
  if (CURE_CLAIM.test(text)) return 'cure_claim';
  if (HEALTH_DISCLOSURE.test(text) && DISCLOSURE_CONCERN.test(text)) return 'health_disclosure';
  if (ISOLATION_PRESSURE.test(text)) return 'isolation_pressure';
  return null;
}

const replies = {
  other_at_risk: "I'm glad you're taking your friend's words seriously. If they might act soon or have already hurt themselves, contact emergency services where they are now. If it's safe, stay with them or keep them on the phone while you get help. Tell a trusted adult or someone nearby who can reach them. You can text: ‘I'm here with you. Are you safe right now? Let's get someone to help.’",
  child_harm: "I'm glad you told someone. Being hit is serious, and you don't have to accept it or handle it alone. Tell a trusted adult outside the situation today, such as a teacher, school counselor, or relative you feel safe with. If you're in danger right now, get somewhere safer if you can and call emergency services.",
  unsafe_adult_contact: "An adult asking you to keep calls or messages secret is a warning sign. This isn't your fault. You can stop replying and leave the call. Please tell a parent or another trusted adult now, such as a teacher or school counselor. If you feel in immediate danger, call emergency services.",
  minor_secrecy: "I'm an AI, and I can't be a secret friend. You deserve someone you can trust in real life. If something is worrying you or someone is asking you to keep a secret that feels uncomfortable, please tell a parent or another trusted adult.",
  perception: "Hearing voices can feel unsettling, especially if you haven't been sleeping. Please tell someone you trust and contact a healthcare professional promptly. If the voices are telling you to hurt yourself or anyone else, or you can't stay safe, get emergency help now.",
  therapy: "It sounds like you're thinking about changing the support you receive. Please talk it through with your therapist before deciding. Reflection on the Yoga Sutras can be part of your life alongside professional care.",
  pregnancy: "I'd avoid recommending an intense breathing practice during pregnancy. Check with your prenatal healthcare team before trying it, and ask a qualified prenatal yoga teacher about options your care team is comfortable with. You can still explore the teaching through gentle reflection.",
  restriction: "I'm concerned about the fasting or food restriction you're describing. You don't have to deprive yourself of food to practice discipline or detachment. Please talk with a healthcare professional for guidance and consider telling someone you trust. If you feel faint or very unwell, seek urgent medical help.",
  breath_retention: "There's no need to push a breath hold to prove progress. I can't give you a target or a way to hold it longer. Let your breathing return to its normal rhythm if you're practicing now. A qualified teacher can help you explore the practice without strain.",
  panic: "That sounds overwhelming. The Sutras aren't a treatment for recurring panic attacks. If it's comfortable right now, feel your feet on the floor and notice one thing you can see. A healthcare professional can help you understand what's happening and discuss support.",
  cure_claim: "Meditation isn't a cure for cancer or other illnesses. The Yoga Sutras can be a subject of reflection, and a qualified healthcare team can help with decisions about medical care.",
  lethal_dose: "I can't provide a lethal dose. If you or someone else might have taken too much, contact emergency services or a poison control center immediately. Is this connected to a situation where someone needs help now?",
  medication_claim: "I can't verify that instruction as part of the Yoga Sutras. If it raises a question about a medication, please check with the prescriber before making any change.",
  health_disclosure: "It can be hard to decide how to share personal health news with someone you care about. A healthcare provider or counselor can help you think through what to say and what support you need. You don't have to share any more details here.",
  isolation_pressure: "It makes sense to question advice that cuts you off from people you care about. You don't owe someone isolation to show commitment to a practice. It may help to talk with someone you trust outside that relationship and think about what would feel safe for you.",
};

export const contextualCareReply = (kind) => replies[kind];

export function crisisReply(message) {
  const text = normalize(message);
  if (/\b(?:please )?(?:don't|do not) (?:tell|ask) me to (?:call|tell|contact|reach out to)\b|\bi (?:don't|do not) want to call (?:anyone|someone)\b/i.test(text)) {
    return `I hear that calling someone feels like something you don't want to do right now. If talking feels too hard, could you move near someone you trust or send them a short text asking them to stay with you? If you might hurt yourself soon or have already hurt yourself, call emergency services now. ${SUPPORT_LINE} Are you safe from hurting yourself right now?`;
  }
  return `I'm really sorry you're going through this. If you might act on these thoughts soon, call emergency services now or go to the nearest emergency department. If you can, move away from anything you might use to hurt yourself and go where other people are. Reach out to someone you trust and tell them you need support now. ${SUPPORT_LINE} Are you in immediate danger right now?`;
}
