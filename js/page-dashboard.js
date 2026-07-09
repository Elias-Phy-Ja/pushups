var PATTERN_LABEL = { daily: "Taeglich", weekly: "Woechentlich" };
var root = document.querySelector("#app");

requireAuth(async function (user) {
  root.innerHTML =
    topbarHTML(user) +
    '<div class="main">' +
    '<div class="page-head"><div>' +
    '<div class="eyebrow">Deine Challenges</div>' +
    '<h1 class="page-title">Board</h1></div>' +
    '<div class="head-actions">' +
    '<a class="btn-ghost" href="join.html">Beitreten</a>' +
    '<a class="btn btn-inline" href="new.html">+ Neu</a>' +
    "</div></div>" +
    '<div id="list"><div class="placeholder">Laedt...</div></div>' +
    "</div>";
  wireTopbar(root);

  var list = root.querySelector("#list");
  try {
    var projects = await getMyProjects();
    if (projects.length === 0) {
      list.innerHTML =
        '<div class="empty-state">' +
        '<div class="empty-icon">0 : 0</div>' +
        '<div class="empty-title">Noch keine Challenge</div>' +
        '<div class="empty-sub">Erstell deine erste Challenge und lad deine Kollegen mit einem Link ein.</div>' +
        '<a class="btn" href="new.html">Erste Challenge starten</a>' +
        "</div>";
      return;
    }
    list.innerHTML = "";
    list.className = "card-grid";
    projects.forEach(function (p) {
      var target =
        p.targetType === "isoWeek" ? "KW " + targetForToday(p) : "" + p.targetValue;
      var card = document.createElement("a");
      card.className = "proj-card";
      card.href = "project.html?id=" + p.id;
      card.innerHTML =
        '<div class="proj-name">' +
        p.name +
        "</div>" +
        '<div class="proj-meta"><span>' +
        (PATTERN_LABEL[p.pattern] || p.pattern) +
        '</span><span class="sep">/</span><span>Ziel heute</span></div>' +
        '<div class="proj-target">' +
        target +
        "</div>" +
        '<div class="proj-foot"><span>' +
        p.memberIds.length +
        " " +
        (p.memberIds.length === 1 ? "Mitglied" : "Mitglieder") +
        '</span><span class="code">' +
        p.inviteCode +
        "</span></div>";
      list.appendChild(card);
    });
  } catch (err) {
    var needsIndex = err.code === "failed-precondition";
    list.innerHTML =
      '<div class="error">' +
      (needsIndex
        ? "Firestore braucht einmalig einen Index. Oeffne die Konsole (F12), klick den Link in der Fehlermeldung, warte kurz, lad neu."
        : "Projekte konnten nicht geladen werden: " + err.message) +
      "</div>";
    console.error(err);
  }
});
