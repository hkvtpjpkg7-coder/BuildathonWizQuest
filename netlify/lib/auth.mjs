// Firebase ID-token authentication. The certificate URL is fixed, and tokens
// cannot select a key source. See Firebase's ID token verification guidance.
import { createVerify } from 'node:crypto';

const CERT_URL = 'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';
const env = (key) => globalThis.Netlify?.env?.get(key) || process.env[key];
let certCache = null;
let certExpiry = 0;

export class AuthError extends Error {
  constructor(status = 401) { super(status === 503 ? 'Authentication temporarily unavailable.' : 'Please sign in.'); this.status = status; }
}

export function authSettings() {
  const provider = (env('AUTH_PROVIDER') || '').trim().toLowerCase();
  if (provider === 'off') return { enabled: false };
  if (provider !== 'firebase') throw new AuthError(503);
  const projectId = (env('FIREBASE_PROJECT_ID') || '').trim();
  if (!/^[a-z0-9][a-z0-9-]{3,61}[a-z0-9]$/.test(projectId)) throw new AuthError(503);
  return { enabled: true, projectId };
}

async function googleCertificates() {
  if (certCache && Date.now() < certExpiry) return certCache;
  let response, certs;
  try {
    response = await fetch(CERT_URL, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) throw new Error('certificate request failed');
    certs = await response.json();
    if (!certs || typeof certs !== 'object' || Array.isArray(certs)) throw new Error('invalid certificates');
  } catch { throw new AuthError(503); }
  const maxAge = Number(/(?:^|,)\s*max-age=(\d+)/i.exec(response.headers.get('cache-control') || '')?.[1] || 300);
  certExpiry = Date.now() + Math.min(Math.max(maxAge, 0), 86400) * 1000;
  certCache = certs;
  return certs;
}

// Dependency injection is used only by local tests of this pure verifier. The
// HTTP authentication path always uses googleCertificates above.
export async function verifyFirebaseToken(token, projectId, { getCertificates = googleCertificates, now = Date.now() } = {}) {
  if (typeof token !== 'string' || token.length > 8192) throw new AuthError();
  const parts = token.split('.');
  if (parts.length !== 3 || parts.some((p) => !/^[A-Za-z0-9_-]+$/.test(p))) throw new AuthError();
  let header, payload;
  try {
    header = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
    payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
  } catch { throw new AuthError(); }
  const seconds = Math.floor(now / 1000);
  if (!header || header.alg !== 'RS256' || typeof header.kid !== 'string' || !header.kid ||
      !payload || payload.aud !== projectId || payload.iss !== `https://securetoken.google.com/${projectId}` ||
      typeof payload.sub !== 'string' || !payload.sub || payload.sub.length > 128 ||
      !Number.isInteger(payload.exp) || payload.exp <= seconds ||
      !Number.isInteger(payload.iat) || payload.iat > seconds ||
      !Number.isInteger(payload.auth_time) || payload.auth_time > seconds) throw new AuthError();
  const certs = await getCertificates();
  const cert = Object.hasOwn(certs, header.kid) && certs[header.kid];
  if (typeof cert !== 'string') throw new AuthError();
  try {
    const verifier = createVerify('RSA-SHA256');
    verifier.update(`${parts[0]}.${parts[1]}`); verifier.end();
    if (!verifier.verify(cert, Buffer.from(parts[2], 'base64url'))) throw new Error('invalid signature');
  } catch { throw new AuthError(); }
  return payload.sub;
}

export async function authenticateRequest(req) {
  const settings = authSettings();
  if (!settings.enabled) return { enabled: false, uid: null };
  const bearer = /^Bearer ([A-Za-z0-9_.-]+)$/.exec(req.headers.get('authorization') || '');
  if (!bearer) throw new AuthError();
  return { enabled: true, uid: await verifyFirebaseToken(bearer[1], settings.projectId) };
}

export function authFailure(error) {
  const status = error instanceof AuthError ? error.status : 503;
  return Response.json({ error: status === 401 ? 'Please sign in.' : 'Authentication temporarily unavailable.' }, { status, headers: { 'cache-control': 'no-store' } });
}
