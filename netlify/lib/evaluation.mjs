// Temporary organizer access. Limits are per process, reset on restart, and
// are not a billing guarantee or a shared limit across multiple workers.
import { authSettings, AuthError } from './auth.mjs';

const env = (key) => globalThis.Netlify?.env?.get(key) || process.env[key];

function boundedInt(value, fallback, ceiling) {
  if (value == null || value === '') return fallback;
  if (!/^[1-9]\d*$/.test(value)) throw new AuthError(503);
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number > ceiling) throw new AuthError(503);
  return number;
}

// Disabled unless explicitly enabled with a valid, future UTC expiry and
// valid Firebase auth configuration. These checks occur on every request.
export function evaluationSettings(now = Date.now()) {
  if (env('ORGANIZER_EVAL_ENABLED') !== 'true') return { enabled: false };
  if (!authSettings().enabled) throw new AuthError(503);
  const expiry = env('ORGANIZER_EVAL_EXPIRES_AT') || '';
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(expiry)) throw new AuthError(503);
  const expires = Date.parse(expiry);
  if (!Number.isFinite(expires) || new Date(expires).toISOString().replace('.000Z', 'Z') !== expiry.replace('.000Z', 'Z')) throw new AuthError(503);
  if (now >= expires) return { enabled: false };
  return {
    enabled: true,
    maxRequests: boundedInt(env('ORGANIZER_EVAL_MAX_REQUESTS'), 300, 10000),
    perIpPerMinute: boundedInt(env('ORGANIZER_EVAL_PER_IP_PER_MIN'), 30, 100),
  };
}

// Allow no more than maxRequests in this process and a per-IP rolling limit.
// When tracking is full, new IPs are rejected instead of evicting old ones.
// `context.ip` must be verified as trustworthy behind the deployment proxy.
export function createEvaluationLimiter() {
  let total = 0;
  const hits = new Map();
  return (ip, { maxRequests, perIpPerMinute }, now = Date.now()) => {
    if (total >= maxRequests) return false;
    const key = typeof ip === 'string' && ip.length <= 256 ? ip : 'unknown';
    if (!hits.has(key) && hits.size >= 1000) return false;
    const recent = (hits.get(key) || []).filter((time) => now - time < 60_000);
    if (recent.length >= perIpPerMinute) { hits.set(key, recent); return false; }
    recent.push(now);
    hits.set(key, recent);
    total += 1;
    return true;
  };
}
