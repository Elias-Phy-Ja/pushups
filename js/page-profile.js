var root = document.querySelector("#app");

requireAuth(function (user) {
  var currentName =
    user.resolvedName ||
    (user.displayName && user.displayName !== user.email
      ? user.displayName
      : "");

  root.innerHTML =
    topbarHTML(user, "dashboard.html") +
    '<div class="main main-narrow">' +
    '<div class="eyebrow">Dein Profil</div>' +
    '<h1 class="page-title">Anzeigename</h1>' +
    '<p class="hint" style="margin-bottom:20px">So erscheinst du im Leaderboard und im Verlauf. Aktuell angemeldet als ' +
    user.email +
    ".</p>" +
    '<form id="nameForm">' +
    '<label for="name">Anzeigename</label>' +
    '<input id="name" type="text" placeholder="z.B. Elias" value="' +
    currentName +
    '" required />' +
    '<button class="btn" type="submit" id="saveBtn">Namen speichern</button>' +
    '<div id="msg"></div>' +
    "</form></div>";
  wireTopbar(root);

  var msg = root.querySelector("#msg");

  root.querySelector("#nameForm").addEventListener("submit", async function (e) {
    e.preventDefault();
    var btn = root.querySelector("#saveBtn");
    msg.innerHTML = "";
    btn.disabled = true;
    btn.textContent = "Speichert...";
    try {
      await updateDisplayName(root.querySelector("#name").value);
      msg.innerHTML =
        '<div class="success-msg">Gespeichert. Dein Name erscheint jetzt ueberall.</div>';
      btn.disabled = false;
      btn.textContent = "Namen speichern";
    } catch (err) {
      msg.innerHTML = '<div class="error">' + err.message + "</div>";
      btn.disabled = false;
      btn.textContent = "Namen speichern";
    }
  });
});
