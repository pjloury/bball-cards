/* Optional cross-device sync. Leave as null to run local-only (default).
   To enable: create a Firebase project (see js/firebase.js header for the
   4 steps) and replace null with your web app config object, e.g.:

   window.HOOPS_FIREBASE_CONFIG = {
     apiKey: "…", authDomain: "your-app.firebaseapp.com",
     projectId: "your-app", appId: "1:…:web:…"
   };

   Firebase web config is safe to commit — it is public by design; access is
   controlled by Firestore security rules, not by hiding these values. */
window.HOOPS_FIREBASE_CONFIG = null;
