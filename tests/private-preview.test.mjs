import test from 'node:test';
import assert from 'node:assert/strict';
import { routePreview } from '../scripts/private-preview.mjs';

const req = (path, options) => new Request(`http://127.0.0.1:8890${path}`, options);

test('private preview serves the coach and its known sample files only', async () => {
  const home = await routePreview(req('/'));
  assert.equal(home.status, 200);
  assert.match(await home.text(), /Personal Coach/);
  assert.equal((await routePreview(req('/data/sample_tests.csv'))).status, 200);
  assert.equal((await routePreview(req('/netlify/lib/llm.mjs'))).status, 404);
  assert.equal((await routePreview(req('/%2fetc%2fpasswd'))).status, 404);
});

test('private preview routes chat and session requests and requires JSON', async () => {
  let received;
  const fakeChat = async (request, context) => {
    received = { body: await request.json(), ip: context.ip };
    return Response.json({ reply: 'private result' });
  };
  const result = await routePreview(req('/api/chat', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"message":"hello"}' }), { chatHandler: fakeChat });
  assert.equal((await result.json()).reply, 'private result');
  assert.deepEqual(received, { body: { message: 'hello' }, ip: 'private-preview' });
  assert.equal((await routePreview(req('/api/chat', { method: 'POST', headers: { 'content-type': 'text/plain' }, body: '{}' }))).status, 415);
  assert.equal((await routePreview(req('/api/chat'))).status, 405);
  const session = await routePreview(req('/api/session?id=123'), { sessionHandler: async request => Response.json({ id: new URL(request.url).searchParams.get('id') }) });
  assert.equal((await session.json()).id, '123');
});
