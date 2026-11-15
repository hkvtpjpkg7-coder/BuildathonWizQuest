// Authentication is opt-in on the server. While its configuration is loading
// or unavailable, keep the interface blocked instead of falling back to guest.
(function () {
  const listeners = new Set();
  const gate = document.getElementById('auth-gate');
  const app = document.querySelector('.app');
  const status = document.getElementById('auth-status');
  const login = document.getElementById('auth-login');
  const logout = document.getElementById('auth-logout');
  const account = document.getElementById('auth-account');
  let sdk, firebaseAuth;
  let observedUser = false, lastUid = null;
  const state = {
    mode: 'pending', user: null, version: 0,
    subscribe(fn) { listeners.add(fn); fn(state); return () => listeners.delete(fn); },
    async token() {
      if (state.mode === 'off') return null;
      if (state.mode !== 'signed-in' || !state.user) throw new Error('Please sign in first.');
      return state.user.getIdToken();
    },
  };
  globalThis.WiserWaveAuth = state;
  function update(mode, user = null, message = '') {
    state.mode = mode; state.user = user; state.version++;
    const allow = mode === 'off' || mode === 'signed-in';
    gate.hidden = allow;
    app.inert = !allow;
    login.hidden = mode !== 'signed-out';
    logout.hidden = mode !== 'signed-in';
    account.textContent = user?.email || '';
    status.textContent = message || (mode === 'signed-out' ? 'Sign in to open your personal coach.' : 'Checking sign-in…');
    for (const fn of listeners) fn(state);
  }
  login.addEventListener('click', async () => {
    login.disabled = true; status.textContent = 'Opening Google sign-in…';
    try { await sdk.signInWithPopup(firebaseAuth, new sdk.GoogleAuthProvider()); }
    catch { status.textContent = 'Could not sign in. Please try again or check that pop-ups are allowed.'; }
    finally { login.disabled = false; }
  });
  logout.addEventListener('click', async () => {
    update('pending'); // hide the previous account immediately
    try { await sdk.signOut(firebaseAuth); }
    catch { update('error', null, 'Sign-out could not be completed. Please reload and try again.'); }
  });
  update('pending');
  (async () => {
    try {
      const response = await fetch('/api/auth/config', { cache: 'no-store' });
      if (!response.ok) throw new Error('config');
      const config = await response.json();
      if (config.enabled === false) { update('off'); return; }
      if (config.enabled !== true || !config.firebase?.apiKey || !config.firebase?.projectId || !config.firebase?.authDomain) throw new Error('config');
      const firebase = await import('https://www.gstatic.com/firebasejs/13.3.0/firebase-app.js');
      sdk = await import('https://www.gstatic.com/firebasejs/13.3.0/firebase-auth.js');
      firebaseAuth = sdk.getAuth(firebase.initializeApp(config.firebase));
      sdk.onAuthStateChanged(firebaseAuth, (user) => {
        const uid = user?.uid || null;
        if (observedUser && uid !== lastUid) {
          // A fresh page clears drafts, test results, Mentor sample requests,
          // and in-flight UI from the previous account before revealing the next.
          update('pending');
          location.reload();
          return;
        }
        observedUser = true; lastUid = uid;
        update(user ? 'signed-in' : 'signed-out', user);
      }, () => update('error', null, 'Sign-in is unavailable. Please try again later.'));
    } catch { update('error', null, 'Sign-in is unavailable. Please try again later.'); }
  })();
})();
