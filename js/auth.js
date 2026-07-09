// Auth-Funktionen ueber das globale firebase-Objekt (Compat-API).

async function register(email, password, displayName) {
  const cred = await auth.createUserWithEmailAndPassword(email, password);
  await cred.user.updateProfile({ displayName: displayName });
  await db.collection("users").doc(cred.user.uid).set({
    displayName: displayName,
    email: email,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
  });
  // Konto-Objekt neu laden, damit displayName sofort verfuegbar ist,
  // bevor die App weiterleitet. Ohne das ist der Name kurz noch leer.
  await cred.user.reload();
  return cred.user;
}

async function login(email, password) {
  const cred = await auth.signInWithEmailAndPassword(email, password);
  const ref = db.collection("users").doc(cred.user.uid);
  const snap = await ref.get();
  if (!snap.exists) {
    await ref.set({
      displayName: cred.user.displayName || email.split("@")[0],
      email: email,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
  } else if (!snap.data().displayName && cred.user.displayName) {
    // Falls im Dokument der Name fehlt, aber im Konto einer steht: nachtragen.
    await ref.set({ displayName: cred.user.displayName }, { merge: true });
  }
  return cred.user;
}

function logout() {
  auth.signOut().then(function () {
    window.location.href = "index.html";
  });
}

// Aendert den Anzeigenamen ueberall: im Konto, im users-Dokument und in
// allen Mitglieds-Eintraegen der Projekte, in denen der User Mitglied ist.
// So wirkt die Aenderung sofort im Leaderboard und im Verlauf.
async function updateDisplayName(newName) {
  const user = auth.currentUser;
  if (!user) throw new Error("Nicht angemeldet.");
  const name = newName.trim();
  if (!name) throw new Error("Der Name darf nicht leer sein.");

  // Konto-Profil.
  await user.updateProfile({ displayName: name });
  // users-Dokument.
  await db.collection("users").doc(user.uid).set(
    { displayName: name, email: user.email },
    { merge: true }
  );
  // Mitglieds-Eintrag in jedem Projekt, in dem der User Mitglied ist.
  const projSnap = await db
    .collection("projects")
    .where("memberIds", "array-contains", user.uid)
    .get();
  for (const proj of projSnap.docs) {
    await db
      .collection("projects")
      .doc(proj.id)
      .collection("members")
      .doc(user.uid)
      .set({ displayName: name }, { merge: true });
  }
}

// Auf geschuetzten Seiten aufrufen. Ruft cb mit dem User auf, sobald der
// Login-Status feststeht. Ohne Login: zurueck zur Anmeldung.
// Der Anzeigename wird aus dem stabilen users-Dokument nachgeladen, weil
// user.displayName direkt nach dem Registrieren noch leer sein kann.
function requireAuth(cb) {
  auth.onAuthStateChanged(async function (user) {
    if (!user) {
      window.location.href = "index.html";
      return;
    }
    // Namen aus der Datenbank holen und ans user-Objekt haengen.
    try {
      const snap = await db.collection("users").doc(user.uid).get();
      if (snap.exists && snap.data().displayName) {
        user.resolvedName = snap.data().displayName;
      }
    } catch (e) {
      // Wenn das fehlschlaegt, faellt die Anzeige auf E-Mail zurueck.
    }
    cb(user);
  });
}

// Liefert den anzuzeigenden Namen: erst der aus der DB geladene, dann der
// aus dem Konto, sonst die E-Mail.
function nameOf(user) {
  return user.resolvedName || user.displayName || user.email;
}

// Fuer die Anmeldeseite: schon eingeloggt -> direkt aufs Board.
function redirectIfLoggedIn() {
  auth.onAuthStateChanged(function (user) {
    if (user) window.location.href = "dashboard.html";
  });
}

function authErrorMessage(code) {
  const map = {
    "auth/invalid-email": "Diese E-Mail-Adresse ist ungueltig.",
    "auth/email-already-in-use": "Diese E-Mail wird bereits verwendet.",
    "auth/weak-password": "Das Passwort braucht mindestens 6 Zeichen.",
    "auth/invalid-credential": "E-Mail oder Passwort stimmt nicht.",
    "auth/user-not-found": "Kein Konto mit dieser E-Mail gefunden.",
    "auth/wrong-password": "Das Passwort stimmt nicht.",
    "auth/too-many-requests": "Zu viele Versuche. Warte kurz und probier es erneut.",
  };
  return map[code] || "Etwas ist schiefgelaufen. Versuch es nochmal.";
}
