// Private browser preview for the VM. This is not a production web server.
// It listens only on loopback; use an authenticated SSH tunnel to reach it.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import chat from '../netlify/functions/chat/index.mjs';
import session from '../netlify/functions/session/index.mjs';

const publicDir = resolve(dirname(fileURLToPath(import.meta.url)), '../public');
const staticFiles = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/index.html', ['index.html', 'text/html; charset=utf-8']],
  ['/data/coach_tests.csv', ['data/coach_tests.csv', 'text/csv; charset=utf-8']],
  ['/data/sample_tests.csv', ['data/sample_tests.csv', 'text/csv; charset=utf-8']],
  ['/data/demo_tests.csv', ['data/demo_tests.csv', 'text/csv; charset=utf-8']],
  ['/data/rag_api_tests.csv', ['data/rag_api_tests.csv', 'text/csv; charset=utf-8']],
]);
const securityHeaders = {
  'cache-control': 'no-store',
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'content-security-policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self'",
};
const jsonError = (status, error) => Response.json({ error }, { status, headers: securityHeaders });

// Exported separately so routing can be tested without opening a socket.
export async function routePreview(req, { chatHandler = chat, sessionHandler = session } = {}) {
  const url = new URL(req.url);
  const path = url.pathname;
  if (path === '/api/chat') {
    if (req.method !== 'POST') return jsonError(405, 'Use POST');
    if (!/^application\/json(?:\s*;|$)/i.test(req.headers.get('content-type') || '')) {
      return jsonError(415, 'Use application/json');
    }
    return chatHandler(req, { ip: 'private-preview' });
  }
  if (path === '/api/session') {
    if (req.method !== 'GET') return jsonError(405, 'Use GET');
    return sessionHandler(req);
  }
  const file = staticFiles.get(path);
  if (!file) return jsonError(404, 'Not found');
  if (req.method !== 'GET' && req.method !== 'HEAD') return jsonError(405, 'Use GET');
  try {
    const bytes = await readFile(join(publicDir, file[0]));
    return new Response(req.method === 'HEAD' ? null : bytes, { headers: { ...securityHeaders, 'content-type': file[1] } });
  } catch {
    return jsonError(404, 'Not found');
  }
}

const isMain = process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (isMain) {
  http.createServer(async (incoming, outgoing) => {
    try {
      // Accept origin-form targets only; exact route allowlists prevent file traversal.
      const target = incoming.url || '/';
      if (!target.startsWith('/') || target.startsWith('//') || target.includes('\\') || target.includes('#')) {
        outgoing.writeHead(400).end(); return;
      }
      const chunks = [];
      let size = 0;
      for await (const chunk of incoming) {
        size += chunk.length;
        if (size > 16384) { outgoing.writeHead(413).end(); return; }
        chunks.push(chunk);
      }
      const method = incoming.method || 'GET';
      const headers = new Headers();
      if (incoming.headers['content-type']) headers.set('content-type', incoming.headers['content-type']);
      const init = { method, headers };
      if (method !== 'GET' && method !== 'HEAD') init.body = Buffer.concat(chunks);
      const result = await routePreview(new Request(`http://127.0.0.1:8890${target}`, init));
      outgoing.writeHead(result.status, Object.fromEntries(result.headers));
      outgoing.end(Buffer.from(await result.arrayBuffer()));
    } catch {
      if (!outgoing.headersSent) outgoing.writeHead(500, { 'content-type': 'application/json', ...securityHeaders });
      outgoing.end('{"error":"Preview request failed"}');
    }
  }).listen(8890, '127.0.0.1', () => {
    console.log('Private preview listening on 127.0.0.1:8890');
    console.log('Use an authenticated SSH tunnel. Do not expose this port publicly.');
  });
}
