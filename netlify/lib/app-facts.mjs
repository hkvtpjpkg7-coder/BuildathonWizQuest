const DATA_NOTICE = 'Your messages may be sent to the configured AI provider and saved on the server, so please avoid names and sensitive details.';

export const SENSITIVE_DATA_NOTICE = 'Please avoid sharing payment card numbers, identification numbers, passwords, or other sensitive details here. Messages may be saved on the server.';

const CHAT_DATA = /\b(?:chats?|messages?|conversations?|data|transcripts?|chat history|what (?:i|we) (?:type|say|share|write)|what i (?:said|typed|wrote|shared))\b/i;
const APP_CONTEXT = /\b(?:wiserwave|the app|this (?:app|chat|coach|conversation)|you|your|here|my (?:chats?|messages?|conversations?|data|transcripts?|chat history)|our (?:chats?|messages?|conversations?|data|transcripts?|chat history))\b/i;
const PRIVACY_PROPERTY = /\b(?:private|confidential|encrypted|secure|stored|saved|retained|logged|shared|sent|read by|seen by|accessed by)\b/i;
const APP_HANDLING_INQUIRY = /^(?:do|does|will|would) (?:you|this app|the app|wiserwave|the (?:ai )?provider)\b[^.!?]{0,45}\b(?:store|save|retain|log|share|send|encrypt|protect|read)\b/i;
const APP_ACCESS_INQUIRY = /^(?:who|can (?:someone|anyone|other users?))\b[^.!?]{0,45}\b(?:see|read|access)\b/i;

// A masked number alone, or a request to remember it, needs no model call.
export function sharesSensitiveNumberOnly(message) {
  return /^(?:(?:here (?:is|'s) |this is |(?:please )?(?:remember|save|store|keep) )?(?:my |the )?(?:(?:credit |debit |payment )?card(?: number)?|social security number|ssn)[: ]*(?:is )?\s*)?\[(?:CARD|SSN)\][.!]?$/i.test(message);
}

export function appFactReply(message) {
  const text = String(message || '').trim();

  if (/^(?:are you (?:an? )?(?:ai|human|real person|(?:licensed )?(?:doctor|therapist))|what are you)[.!?]*$/i.test(text)) {
    return "I'm WiserWave's AI Personal Coach. I can make mistakes, and I don't provide medical care.";
  }
  if (/^is this (?:private|confidential|encrypted|secure)[.!?]*$/i.test(text)) return DATA_NOTICE;
  const data = CHAT_DATA.exec(text);
  if (data) {
    if (/^(?:(?:can|could|would) you |please )?(?:show|find|retrieve|read|see|access|give)\b.{0,65}\b(?:another user|other users?|someone else['’]s)\b/i.test(text)) return "I can't see other users' conversations.";
    if (APP_CONTEXT.test(text) && /^(?:(?:can|could|would) (?:you|i) |please |how (?:can|do) i )?(?:delete|erase|remove|clear|purge|wipe)\b/i.test(text)) return `I can't delete your messages from this chat. ${DATA_NOTICE}`;
    if (/\b(?:train|training|fine[- ]tun(?:e|ing))\b/i.test(text) && APP_CONTEXT.test(text)) return `I can't verify how the AI provider handles training. ${DATA_NOTICE}`;
    const asksPrivacy = /^(?:is|are|will|would|can|could)\b/i.test(text) && PRIVACY_PROPERTY.test(text.slice(data.index + data[0].length));
    if (asksPrivacy || APP_HANDLING_INQUIRY.test(text) || (APP_CONTEXT.test(text) && APP_ACCESS_INQUIRY.test(text))) return DATA_NOTICE;
  }

  if (!APP_CONTEXT.test(text)) return null;
  if (/\b(?:your privacy policy|privacy policy (?:for|of) (?:wiserwave|this app)|(?:wiserwave|this app)(?:'s)? privacy policy)\b/i.test(text)) return DATA_NOTICE;
  if (/\b(?:prana|energy levels?)\b/i.test(text) && /\b(?:measure\w*|track\w*|record\w*|detect\w*|read\w*|calculate\w*|assess\w*)\b/i.test(text)) {
    return 'WiserWave does not measure prana or energy levels. Prana points in Mentor track lesson progress.';
  }
  if (/\b(?:certif\w*|qualify\w*|accredit\w*)\b/i.test(text) && /\b(?:yoga|teacher|teach|mentor|courses?|lessons?)\b/i.test(text)) {
    return 'Using WiserWave does not certify you as a yoga teacher.';
  }
  if (/^(?:can|could|do|will) you (?:send|write and send) (?:an? )?(?:e-?mail|message)\b/i.test(text)) return "I can't send emails or messages from this chat.";
  if (/^(?:can|could|do|will) you (?:remember|recall|see)\b.{0,80}\b(?:another chat|other chats|different chat|previous conversations?|past conversations?)\b/i.test(text)) {
    return 'I can use recent messages from this conversation when I reply.';
  }
  return null;
}
