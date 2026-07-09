// Projekte und Eintraege ueber die Compat-API (db.collection...).

function makeInviteCode(len) {
  len = len || 6;
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < len; i++)
    out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

async function createProject(opts) {
  const user = auth.currentUser;
  if (!user) throw new Error("Nicht angemeldet.");
  const ts = firebase.firestore.FieldValue.serverTimestamp();
  const data = {
    name: opts.name.trim(),
    ownerId: user.uid,
    pattern: opts.pattern,
    targetType: opts.targetType,
    targetValue: opts.targetType === "fixed" ? Number(opts.targetValue) : null,
    memberIds: [user.uid],
    inviteCode: makeInviteCode(),
    startDate: ts,
    createdAt: ts,
  };
  const ref = await db.collection("projects").add(data);
  await db
    .collection("projects")
    .doc(ref.id)
    .collection("members")
    .doc(user.uid)
    .set({
      displayName: nameOf(user),
      joinedAt: ts,
      role: "owner",
    });
  return ref.id;
}

async function getMyProjects() {
  const user = auth.currentUser;
  if (!user) return [];
  const snap = await db
    .collection("projects")
    .where("memberIds", "array-contains", user.uid)
    .orderBy("createdAt", "desc")
    .get();
  return snap.docs.map(function (d) {
    return Object.assign({ id: d.id }, d.data());
  });
}

async function getProject(projectId) {
  const snap = await db.collection("projects").doc(projectId).get();
  if (!snap.exists) return null;
  const project = Object.assign({ id: snap.id }, snap.data());
  const memSnap = await db
    .collection("projects")
    .doc(projectId)
    .collection("members")
    .get();
  project.members = memSnap.docs.map(function (d) {
    return Object.assign({ uid: d.id }, d.data());
  });
  return project;
}

// Aktualisiert Name, Muster und Ziel eines Projekts. Nur der Owner darf das,
// die Firestore-Rules erzwingen das zusaetzlich serverseitig.
async function updateProject(projectId, opts) {
  const user = auth.currentUser;
  if (!user) throw new Error("Nicht angemeldet.");
  await db
    .collection("projects")
    .doc(projectId)
    .update({
      name: opts.name.trim(),
      pattern: opts.pattern,
      targetType: opts.targetType,
      targetValue: opts.targetType === "fixed" ? Number(opts.targetValue) : null,
    });
}

// Loescht ein Projekt samt Mitgliedern und Eintraegen. Nur der Owner.
// Firestore loescht Untersammlungen nicht automatisch mit, deshalb raeumen
// wir sie zuerst von Hand ab, dann das Projekt selbst.
async function deleteProject(projectId) {
  const user = auth.currentUser;
  if (!user) throw new Error("Nicht angemeldet.");

  const base = db.collection("projects").doc(projectId);

  // Eintraege loeschen (in Bloecken, falls es viele sind).
  const entriesSnap = await base.collection("entries").get();
  for (const d of entriesSnap.docs) {
    await d.ref.delete();
  }
  // Mitglieder loeschen.
  const membersSnap = await base.collection("members").get();
  for (const d of membersSnap.docs) {
    await d.ref.delete();
  }
  // Zuletzt das Projekt selbst.
  await base.delete();
}

async function joinByCode(rawCode) {
  const user = auth.currentUser;
  if (!user) throw new Error("Nicht angemeldet.");
  const code = rawCode.trim().toUpperCase();
  if (!code) throw new Error("Kein Code angegeben.");
  const snap = await db
    .collection("projects")
    .where("inviteCode", "==", code)
    .limit(1)
    .get();
  if (snap.empty) throw new Error("Kein Projekt mit diesem Code gefunden.");
  const projectDoc = snap.docs[0];
  const projectId = projectDoc.id;
  const data = projectDoc.data();
  if (data.memberIds && data.memberIds.indexOf(user.uid) !== -1)
    return projectId;
  await db
    .collection("projects")
    .doc(projectId)
    .update({
      memberIds: firebase.firestore.FieldValue.arrayUnion(user.uid),
    });
  await db
    .collection("projects")
    .doc(projectId)
    .collection("members")
    .doc(user.uid)
    .set({
      displayName: nameOf(user),
      joinedAt: firebase.firestore.FieldValue.serverTimestamp(),
      role: "member",
    });
  return projectId;
}

function entryId(uid, dateKey) {
  return uid + "_" + dateKey;
}

async function getMyTodayEntry(projectId) {
  const user = auth.currentUser;
  const id = entryId(user.uid, todayKey());
  const snap = await db
    .collection("projects")
    .doc(projectId)
    .collection("entries")
    .doc(id)
    .get();
  return snap.exists ? Object.assign({ id: snap.id }, snap.data()) : null;
}

async function saveTodayEntry(projectId, count) {
  const user = auth.currentUser;
  const n = Math.round(Number(count));
  // Eine 0 zaehlt nicht als erledigt. Kein leerer Eintrag.
  if (!n || n < 1) throw new Error("Noch keine Liegestuetze gezaehlt.");
  const id = entryId(user.uid, todayKey());
  const ref = db
    .collection("projects")
    .doc(projectId)
    .collection("entries")
    .doc(id);
  const existing = await ref.get();
  if (existing.exists) throw new Error("Heute schon eingetragen.");
  await ref.set({
    uid: user.uid,
    displayName: nameOf(user),
    date: todayKey(),
    status: "done",
    count: n,
    source: "camera",
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
  });
}

async function getAllEntries(projectId) {
  const snap = await db
    .collection("projects")
    .doc(projectId)
    .collection("entries")
    .get();
  return snap.docs.map(function (d) {
    return Object.assign({ id: d.id }, d.data());
  });
}
