/* ── firebase.js — optional Google auth + cross-device Firestore sync ───────
   The app is fully functional offline (localStorage). This layer activates
   ONLY when a Firebase web config is present at window.HOOPS_FIREBASE_CONFIG
   (see firebase-config.js). When signed in it mirrors Store.state to the
   Firestore doc  users/{uid}  and merges remote snapshots back via
   Store._onRemote(). Firebase web config values are public by design.

   Setup (one time):
     1. console.firebase.google.com → create project → add a Web app.
     2. Enable Authentication → Google sign-in.
     3. Create a Firestore database (production mode) with a rule allowing a
        user to read/write only their own doc:
          match /users/{uid} { allow read, write: if request.auth.uid == uid; }
     4. Paste the config into public/firebase-config.js.
   ──────────────────────────────────────────────────────────────────────── */

const SDK = 'https://www.gstatic.com/firebasejs/10.12.2';

window.HoopsAuth = {
  db: null, auth: null, uid: null, _pushTimer: null, _unsub: null,

  async init() {
    const cfg = window.HOOPS_FIREBASE_CONFIG;
    const slot = document.getElementById('auth-slot');
    if (!cfg || !cfg.apiKey) { if (slot) slot.innerHTML = ''; return; }  // not configured → stay local-only

    try {
      const [{ initializeApp }, authMod, fsMod] = await Promise.all([
        import(`${SDK}/firebase-app.js`),
        import(`${SDK}/firebase-auth.js`),
        import(`${SDK}/firebase-firestore.js`),
      ]);
      const app = initializeApp(cfg);
      this.auth = authMod.getAuth(app);
      this.db = fsMod.getFirestore(app);
      this._authMod = authMod; this._fsMod = fsMod;
      Store.authAvailable = true;   // enables the "one free pack then sign in" gate

      authMod.onAuthStateChanged(this.auth, user => {
        if (user) this._onSignIn(user); else this._onSignOut();
      });
    } catch (e) {
      console.warn('Firebase init failed — running local-only.', e);
      if (slot) slot.innerHTML = '';
    }
  },

  renderSignedOut() {
    const slot = document.getElementById('auth-slot');
    if (slot) slot.innerHTML = `<button class="auth-btn" onclick="HoopsAuth.signIn()">Sign in<span class="hide-narrow"> with Google</span></button>`;
  },
  renderSignedIn(user) {
    const slot = document.getElementById('auth-slot');
    if (!slot) return;
    const name = (user.displayName || user.email || 'Account').split(' ')[0];
    slot.innerHTML = `<span class="auth-user">${user.photoURL ? `<img src="${user.photoURL}" alt="">` : ''}${name}
      <button class="auth-btn" onclick="HoopsAuth.signOut()">Sign out</button></span>`;
  },

  async signIn() {
    const provider = new this._authMod.GoogleAuthProvider();
    try { await this._authMod.signInWithPopup(this.auth, provider); }
    catch (e) { toast('Sign-in failed: ' + (e.code || e.message)); }
  },
  async signOut() {
    if (this._unsub) { this._unsub(); this._unsub = null; }
    Store.remote = null; this.uid = null;
    await this._authMod.signOut(this.auth);
  },

  async _onSignIn(user) {
    this.uid = user.uid;
    Store.signedIn = true;
    this.renderSignedIn(user);
    const { doc, getDoc, setDoc, onSnapshot } = this._fsMod;
    const ref = doc(this.db, 'users', user.uid);

    // Wire Store → remote (debounced pushes).
    Store.remote = {
      push: state => {
        clearTimeout(this._pushTimer);
        this._pushTimer = setTimeout(() => {
          setDoc(ref, { state, updatedAt: Date.now() }, { merge: true }).catch(() => {});
        }, 900);
      },
    };

    // Initial merge: pull remote, merge into local, push the union back.
    try {
      const snap = await getDoc(ref);
      if (snap.exists() && snap.data().state) Store._onRemote(snap.data().state);
    } catch {}
    Store.remote.push(Store.state);            // ensure cloud has the merged union
    toast(`Synced as ${(user.displayName || 'you').split(' ')[0]}`);

    // Live updates from other devices.
    this._unsub = onSnapshot(ref, snap => {
      const d = snap.data();
      if (d && d.state) Store._onRemote(d.state);
    });
  },

  _onSignOut() {
    Store.remote = null;
    Store.signedIn = false;
    this.uid = null;
    if (this._unsub) { this._unsub(); this._unsub = null; }
    this.renderSignedOut();
    window.dispatchEvent(new CustomEvent('store:changed'));
  },
};
