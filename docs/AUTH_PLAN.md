# Google sign-in prototype: setup and limits

The repository contains an opt-in Firebase Authentication integration. **Do not
claim the deployed app has accounts until Firebase is configured and actual
sign-in and cross-account access have been tested on that deployment.** Missing,
invalid, or incomplete authentication configuration fails closed. Explicit
`AUTH_PROVIDER=off` is only for isolated local development; never use it to
expose a public deployment.

## Firebase setup

1. Add Firebase to the intended Google Cloud project, complete the required
   provider terms, and register a web application in Firebase. The account owner
   must accept any terms themselves.
2. Enable Google as a sign-in provider in Firebase Authentication, configure
   the consent screen, and authorize `wiserwave.app` as a sign-in domain.
3. Set these variables on the server: `AUTH_PROVIDER=firebase`,
   `FIREBASE_PROJECT_ID`, and `FIREBASE_WEB_API_KEY`. Set
   `FIREBASE_AUTH_DOMAIN` and `FIREBASE_APP_ID` if the Firebase web configuration
   requires them. The Firebase web API key is public client configuration;
   restrict it appropriately. It is not the OpenAI API key or a service-account
   credential. Do not commit `.env` or credentials.
4. Restart the app, verify that the site is using HTTPS and that direct access
   to its backend port is blocked, then test Google sign-in, sign-out, retry,
   and separate accounts through the actual site.
5. Test both `/api/chat` and `/api/session` directly: reject missing, expired,
   forged, and another user's credentials/session IDs. Test crisis support and
   follow-ups as well as the browser test runner. A passing unit suite does not
   replace this live test. Configure and test with synthetic data only.

Authenticated sessions are stored in a per-user namespace, and the sidebar is
separated by account on that browser. Legacy ownerless conversations are not
automatically attached to an account. The sidebar list remains browser-local,
so this prototype does not provide a cross-device conversation index. Firebase
ID tokens are verified against Google's signing certificates, issuer, audience,
and time claims; token revocation is not checked by this prototype. Sign-out
clears the local Firebase session but is not an immediate server-side token
revocation mechanism. A review of identity, data retention, account recovery,
and incident handling remains necessary before sensitive or production use.

## Additional design requirements

1. Use an established managed identity provider compatible with the final
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
