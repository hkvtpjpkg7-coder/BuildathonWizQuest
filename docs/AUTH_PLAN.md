# Plan: accounts and private conversation history

This is a design plan, not an implemented login. The current app uses a session
ID and does not authenticate a user or protect chats with a password.

1. Choose an established managed identity provider compatible with the final
   hosting environment, including email/password sign-in and password recovery.
   Do not implement or store passwords in the app itself.
2. Verify the provider's identity token on every server-side chat and history
   request; never trust a user ID supplied by the browser. Bind every stored
   conversation to the verified stable user ID.
3. Enforce ownership on both `/api/chat` and `/api/session` before reading or
   changing any conversation. A session ID alone must not grant access.
4. Use HTTPS and the provider's secure session/cookie mechanism, with
   appropriate CSRF protection. Restrict token and secret access to the server.
5. Define privacy and retention: tell users what is sent to the model provider,
   minimize stored details, allow conversation deletion, and document retention
   and incident handling. Do not rely on pattern-based masking as anonymization.
6. Test sign-up, login, reset, logout, expired sessions, and cross-account
   access attempts, including concurrent users and direct API requests.

Before public use with sensitive content, perform a security review and choose
the identity and storage configuration deliberately. No protected-account
claim should appear in the UI until the ownership tests pass.
