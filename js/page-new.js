var root = document.querySelector("#app");

requireAuth(function (user) {
  root.innerHTML =
    topbarHTML(user, "dashboard.html") +
    '<div class="main main-narrow">' +
    '<div class="eyebrow">Neue Challenge</div>' +
    '<h1 class="page-title">Setup</h1>' +
    '<form id="projForm">' +
    '<label for="name">Name</label>' +
    '<input id="name" type="text" placeholder="z.B. Liegestuetzen" required />' +
    "<label>Muster</label>" +
    '<div class="seg" id="pattern">' +
    '<button type="button" class="seg-opt active" data-val="daily">Taeglich</button>' +
    '<button type="button" class="seg-opt" data-val="weekly">Woechentlich</button>' +
    "</div>" +
    "<label>Ziel</label>" +
    '<div class="seg" id="targetType">' +
    '<button type="button" class="seg-opt active" data-val="fixed">Feste Zahl</button>' +
    '<button type="button" class="seg-opt" data-val="isoWeek">Kalenderwoche</button>' +
    "</div>" +
    '<div id="targetValueWrap">' +
    '<label for="targetValue">Anzahl pro Tag</label>' +
    '<input id="targetValue" type="number" min="1" value="30" />' +
    "</div>" +
    '<div id="isoHint" class="hint" hidden>Ziel gleich aktuelle Kalenderwoche. Diese Woche: <b>KW ' +
    isoWeek() +
    "</b>, also " +
    isoWeek() +
    " Stueck.</div>" +
    '<button class="btn" type="submit" id="submitBtn">Challenge erstellen</button>' +
    '<div id="err"></div>' +
    "</form></div>";
  wireTopbar(root);

  var pattern = "daily";
  var targetType = "fixed";

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

  root.querySelector("#projForm").addEventListener("submit", async function (e) {
    e.preventDefault();
    var btn = root.querySelector("#submitBtn");
    var errBox = root.querySelector("#err");
    errBox.innerHTML = "";
    btn.disabled = true;
    btn.textContent = "Erstellt...";
    try {
      var id = await createProject({
        name: root.querySelector("#name").value,
        pattern: pattern,
        targetType: targetType,
        targetValue: root.querySelector("#targetValue").value,
      });
      window.location.href = "project.html?id=" + id;
    } catch (err) {
      errBox.innerHTML =
        '<div class="error">Konnte nicht erstellen: ' + err.message + "</div>";
      btn.disabled = false;
      btn.textContent = "Challenge erstellen";
    }
  });
});
