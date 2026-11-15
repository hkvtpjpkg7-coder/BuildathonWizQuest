// Public Firebase web configuration, never the OpenAI key or a service credential.
const env = (key) => globalThis.Netlify?.env?.get(key) || process.env[key];

export default async (req) => {
  if (req.method !== 'GET') return Response.json({ error: 'Use GET' }, { status: 405 });
  const provider = (env('AUTH_PROVIDER') || '').toLowerCase();
  const headers = { 'cache-control': 'no-store' };
  if (provider === 'off') return Response.json({ enabled: false }, { headers });
  if (provider !== 'firebase') return Response.json({ error: 'Authentication is unavailable.' }, { status: 503, headers });
  const projectId = env('FIREBASE_PROJECT_ID');
  const apiKey = env('FIREBASE_WEB_API_KEY'); // Firebase web config is public; restrict the key to required APIs.
  const authDomain = env('FIREBASE_AUTH_DOMAIN') || (projectId && `${projectId}.firebaseapp.com`);
  if (!projectId || !apiKey || !authDomain) return Response.json({ error: 'Authentication is not configured.' }, { status: 503, headers });
  return Response.json({ enabled: true, firebase: { projectId, apiKey, authDomain, ...(env('FIREBASE_APP_ID') && { appId: env('FIREBASE_APP_ID') }) } }, { headers });
};

export const config = { path: '/api/auth/config' };
