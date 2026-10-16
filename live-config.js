/*
  Bank Rec Live: OPTIONAL Firebase setup.

  You do NOT need this file if the site runs on Vercel with Upstash Redis
  connected (see api/live.js). Leave LIVE_CONFIG as null in that case.
  Use the steps below only if you'd rather run class games on Firebase.

  1. Go to https://console.firebase.google.com and sign in with a Google account.
  2. Add project. Name it something like "hersey-accounting". Analytics can be off.
  3. Left menu: Build > Realtime Database > Create Database.
     Pick the United States location, then "Start in locked mode".
  4. Open the Rules tab, replace everything with this, and click Publish:

       {
         "rules": {
           "games": { ".read": true, ".write": true },
           ".read": false,
           ".write": false
         }
       }

  5. Project settings (gear icon) > General > Your apps > Web (the </> icon).
     Register an app (any nickname, no hosting). Copy the firebaseConfig object.
  6. Replace the null below with that object so it looks like:

       window.LIVE_CONFIG = {
         apiKey: "....",
         authDomain: "....firebaseapp.com",
         databaseURL: "https://....firebaseio.com",
         projectId: "....",
         storageBucket: "....",
         messagingSenderId: "....",
         appId: "...."
       };

     Make sure databaseURL is included (it appears after step 3).
  7. Upload this file to the site next to bank-rec-live.html.

  Tips: have students enter first name and last initial. When a game ends,
  click "Erase this game's data" on the host screen.
*/
window.LIVE_CONFIG = null;
