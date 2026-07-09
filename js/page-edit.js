var root = document.querySelector("#app");
var projectId = new URLSearchParams(window.location.search).get("id");

requireAuth(async function (user) {
  root.innerHTML =
    topbarHTML(user, "project.html?id=" + projectId) +
    '<div class="main main-narrow"><div class="placeholder">Laedt...</div></div>';
  wireTopbar(root);
  var main = root.querySelector(".main");

  if (!projectId) {
    main.innerHTML = '<div class="error">Keine Challenge angegeben.</div>';
    return;
  }

  var p = await getProject(projectId);
  if (!p) {
    main.innerHTML = '<div class="error">Challenge nicht gefunden.</div>';
    return;
  }

  // Nur der Owner darf bearbeiten.
  if (p.ownerId !== user.uid) {
    main.innerHTML =
      '<div class="error">Nur der Ersteller kann diese Challenge bearbeiten.</div>' +
      '<a class="btn" href="project.html?id=' + projectId + '">Zurueck</a>';
    return;
  }

  var isDaily = p.pattern === "daily";
  var isFixed = p.targetType === "fixed";

  main.innerHTML =
    '<div class="eyebrow">Challenge bearbeiten</div>' +
    '<h1 class="page-title">' + p.name + "</h1>" +
    '<form id="projForm">' +
    '<label for="name">Name</label>' +
    '<input id="name" type="text" required value="' + p.name + '" />' +
    "<label>Muster</label>" +
    '<div class="seg" id="pattern">' +
    '<button type="button" class="seg-opt' + (isDaily ? " active" : "") + '" data-val="daily">Taeglich</button>' +
    '<button type="button" class="seg-opt' + (!isDaily ? " active" : "") + '" data-val="weekly">Woechentlich</button>' +
    "</div>" +
    "<label>Ziel</label>" +
    '<div class="seg" id="targetType">' +
    '<button type="button" class="seg-opt' + (isFixed ? " active" : "") + '" data-val="fixed">Feste Zahl</button>' +
    '<button type="button" class="seg-opt' + (!isFixed ? " active" : "") + '" data-val="isoWeek">Kalenderwoche</button>' +
    "</div>" +
    '<div id="targetValueWrap"' + (isFixed ? "" : " hidden") + '>' +
    '<label for="targetValue">Anzahl pro Tag</label>' +
    '<input id="targetValue" type="number" min="1" value="' + (p.targetValue || 30) + '" />' +
    "</div>" +
    '<div id="isoHint" class="hint"' + (isFixed ? " hidden" : "") + '>Ziel gleich aktuelle Kalenderwoche. Diese Woche: <b>KW ' +
    isoWeek() + "</b>, also " + isoWeek() + " Stueck.</div>" +
    '<button class="btn" type="submit" id="submitBtn">Aenderungen speichern</button>' +
    '<div id="err"></div>' +
    "</form>" +
    '<div class="danger-zone">' +
    '<div class="danger-title">Challenge loeschen</div>' +
    '<div class="danger-sub">Loescht die Challenge fuer alle Mitglieder samt allen Eintraegen. Das kann nicht rueckgaengig gemacht werden.</div>' +
    '<button class="btn-danger" id="deleteBtn">Challenge endgueltig loeschen</button>' +
    "</div>";

  var pattern = p.pattern;
  var targetType = p.targetType;

  function wireSeg(id, onChange) {
    var seg = root.querySelector(id);
    seg.querySelectorAll(".seg-opt").forEach(function (b) {
      b.addEventListener("click", function () {
        seg.querySelectorAll(".seg-opt").forEach(function (x) {
          x.classList.remove("active");
        });
        b.classList.add("active");
        onChange(b.dataset.val);
      });
    });
  }

  wireSeg("#pattern", function (v) {
    pattern = v;
  });
  wireSeg("#targetType", function (v) {
    targetType = v;
    var showFixed = v === "fixed";
    root.querySelector("#targetValueWrap").hidden = !showFixed;
    root.querySelector("#isoHint").hidden = showFixed;
  });

  // Speichern.
  root.querySelector("#projForm").addEventListener("submit", async function (e) {
    e.preventDefault();
    var btn = root.querySelector("#submitBtn");
    var errBox = root.querySelector("#err");
    errBox.innerHTML = "";
    btn.disabled = true;
    btn.textContent = "Speichert...";
    try {
      await updateProject(projectId, {
        name: root.querySelector("#name").value,
        pattern: pattern,
        targetType: targetType,
        targetValue: root.querySelector("#targetValue").value,
      });
      window.location.href = "project.html?id=" + projectId;
    } catch (err) {
      errBox.innerHTML =
        '<div class="error">Konnte nicht speichern: ' + err.message + "</div>";
      btn.disabled = false;
      btn.textContent = "Aenderungen speichern";
    }
  });

  // Loeschen mit zweistufiger Bestaetigung.
  var deleteBtn = root.querySelector("#deleteBtn");
  var armed = false;
  deleteBtn.addEventListener("click", async function () {
    if (!armed) {
      armed = true;
      deleteBtn.textContent = "Wirklich? Nochmal tippen zum Loeschen";
      deleteBtn.classList.add("armed");
      // Nach 4 Sekunden zuruecksetzen, damit man nicht aus Versehen loescht.
      setTimeout(function () {
        armed = false;
        deleteBtn.textContent = "Challenge endgueltig loeschen";
        deleteBtn.classList.remove("armed");
      }, 4000);
      return;
    }
    deleteBtn.disabled = true;
    deleteBtn.textContent = "Loescht...";
    try {
      await deleteProject(projectId);
      window.location.href = "dashboard.html";
    } catch (err) {
      deleteBtn.disabled = false;
      deleteBtn.textContent = "Challenge endgueltig loeschen";
      deleteBtn.classList.remove("armed");
      armed = false;
      var hint =
        err.code === "permission-denied"
          ? "Keine Berechtigung. Sind die neuen Firestore-Regeln in der Firebase Console veroeffentlicht?"
          : err.message;
      var box = document.createElement("div");
      box.className = "error";
      box.style.marginTop = "12px";
      box.textContent = "Loeschen fehlgeschlagen: " + hint;
      deleteBtn.parentNode.appendChild(box);
      console.error(err);
    }
  });
});
