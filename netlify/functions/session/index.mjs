// =============================================================================
// netlify/functions/session/index.mjs: GET /api/session?id=<uuid>
// =============================================================================
// Returns one saved chat. Used by the web page to:
//   - reopen a chat when you click it in the sidebar   (FLOW 2 in docs/HOW_IT_WORKS.md)
//   - download a chat as JSON or CSV                   (FLOW 3)
//
// Response: { id, title, created_at, updated_at,
//             messages: [ { role: "user"|"assistant", content, behavior?, ts } ] }
//
// Firebase mode requires an authenticated owner. With auth disabled, anyone
// holding a chat's random UUID can read it: that mode is for local demos only.
// =============================================================================

import { loadSession, isValidId } from "../../lib/store.mjs";
import { authenticateRequest, authFailure } from "../../lib/auth.mjs";

export default async (req) => {
  // Step 1: read-only endpoint, GET only.
  if (req.method !== "GET") return Response.json({ error: "Use GET" }, { status: 405 });
  let identity;
  try { identity = await authenticateRequest(req); } catch (error) { return authFailure(error); }

  // Step 2: take the id from the URL and check it's a real UUID.
  const id = new URL(req.url).searchParams.get("id");
  if (!isValidId(id)) return Response.json({ error: "invalid id" }, { status: 400 });

  // Step 3: load it from the store (Netlify Blobs, or memory when testing locally).
  const session = await loadSession(id, identity.uid);
  if (!session) return Response.json({ error: "session not found" }, { status: 404 });

  // Step 4: send the whole chat back.
  const { owner_id, ...publicSession } = session;
  return Response.json(publicSession, { headers: { 'cache-control': 'no-store' } });
};

// Tells Netlify which URL this function answers on.
export const config = { path: "/api/session" };
