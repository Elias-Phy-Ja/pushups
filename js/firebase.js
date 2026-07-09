// Firebase wird ueber die CDN-Skripte im HTML geladen und ist global als
// window.firebase verfuegbar. Kein Build noetig.

const firebaseConfig = {
  apiKey: "AIzaSyCdh4XDNOPZnHcTXENJceotluTPfs9qDRY",
  authDomain: "pushup-challenge-a2ff4.firebaseapp.com",
  projectId: "pushup-challenge-a2ff4",
  storageBucket: "pushup-challenge-a2ff4.firebasestorage.app",
  messagingSenderId: "988272029059",
  appId: "1:988272029059:web:26994ca4711d09e2f15ab6",
};

firebase.initializeApp(firebaseConfig);

// Global verfuegbar machen fuer die anderen Skripte.
window.auth = firebase.auth();
window.db = firebase.firestore();
