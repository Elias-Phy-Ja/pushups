var root = document.querySelector("#app");
var projectId = new URLSearchParams(window.location.search).get("id");

requireAuth(async function (user) {
  root.innerHTML =
    topbarHTML(user, "project.html?id=" + projectId) +
    '<div class="main main-narrow"><div class="placeholder">Laedt...</div></div>';
  wireTopbar(root);
  var main = root.querySelector(".main");

  var project = await getProject(projectId);
  if (!project) {
    main.innerHTML = '<div class="error">Challenge nicht gefunden.</div>';
    return;
  }

  var existing = await getMyTodayEntry(projectId);
  if (existing) {
    main.innerHTML =
      '<div class="eyebrow">' +
      project.name +
      "</div>" +
      '<h1 class="page-title">Heute schon gemacht</h1>' +
      '<div class="target-big">' +
      existing.count +
      " Stueck</div>" +
      '<p class="hint">Pro Tag zaehlt ein Versuch. Morgen wieder.</p>' +
      '<a class="btn" href="project.html?id=' +
      projectId +
      '">Zum Leaderboard</a>';
    return;
  }

  var target = targetForToday(project);
  main.innerHTML =
    '<div class="eyebrow">' +
    project.name +
    ", Ziel " +
    target +
    "</div>" +
    '<h1 class="page-title">Kamera-Zaehler</h1>' +
    '<div class="cam-wrap">' +
    '<video id="video" playsinline muted></video>' +
    '<canvas id="overlay"></canvas>' +
    '<div class="cam-count" id="count">0</div>' +
    "</div>" +
    '<div class="cam-status" id="status">Bereit.</div>' +
    '<div id="controls"><button class="btn" id="startBtn">Kamera starten</button></div>' +
    '<div id="err"></div>' +
    '<p class="hint" style="margin-top:16px">Stell dein Geraet so, dass dich die Kamera <b>von der Seite</b> sieht, Kopf bis Huefte im Bild. Sobald du <b>' +
    target +
    "</b> Stueck geschafft hast, wird automatisch gespeichert. Brichst du vorher ab, zaehlt der Tag als offen.</p>";

  var video = main.querySelector("#video");
  var canvas = main.querySelector("#overlay");
  var countEl = main.querySelector("#count");
  var statusEl = main.querySelector("#status");
  var controls = main.querySelector("#controls");
  var errBox = main.querySelector("#err");

  var counter = null;
  var finalCount = 0;
  var countdownTimer = null;

  window.addEventListener("beforeunload", function () {
    if (countdownTimer) clearInterval(countdownTimer);
    if (counter) counter.stop();
  });

  var startBtn = main.querySelector("#startBtn");
  startBtn.addEventListener("click", async function () {
    startBtn.disabled = true;
    startBtn.textContent = "Startet...";
    try {
      counter = new PushupCounter({
        video: video,
        canvas: canvas,
        target: target,
        onCount: function (c) {
          finalCount = c;
          countEl.textContent = c + " / " + target;
          countEl.style.transform = "scale(1.3)";
          setTimeout(function () {
            countEl.style.transform = "scale(1)";
          }, 100);
        },
        onStatus: function (s) {
          statusEl.textContent = s;
        },
        onComplete: async function (c) {
          // Ziel erreicht: automatisch speichern und weiter.
          controls.innerHTML =
            '<div class="countdown-note" style="color:var(--led)">Geschafft! Speichert...</div>';
          try {
            await saveTodayEntry(projectId, c);
            window.location.href = "project.html?id=" + projectId;
          } catch (err) {
            errBox.innerHTML = '<div class="error">' + err.message + "</div>";
          }
        },
      });
      await counter.init();
      await counter.start();

      // 15-Sekunden-Countdown, damit man sich bereit machen kann.
      // Die Kamera laeuft schon, aber gezaehlt wird erst danach.
      controls.innerHTML =
        '<div class="countdown-note">Mach dich bereit. Los geht es in</div>';
      var remaining = 15;
      countEl.classList.add("counting-down");
      countEl.textContent = remaining;
      statusEl.textContent = "Positionier dich seitlich zur Kamera.";

      countdownTimer = setInterval(function () {
        remaining--;
        if (remaining > 0) {
          countEl.textContent = remaining;
          countEl.style.transform = "scale(1.2)";
          setTimeout(function () {
            countEl.style.transform = "scale(1)";
          }, 120);
        } else {
          clearInterval(countdownTimer);
          countdownTimer = null;
          countEl.classList.remove("counting-down");
          countEl.textContent = "0 / " + target;
          finalCount = 0;
          counter.arm(); // ab jetzt wird gezaehlt
          statusEl.textContent = "Los! Mach deine " + target + " Stueck.";
          controls.innerHTML =
            '<button class="btn-ghost" id="cancelBtn">Abbrechen</button>';
          main.querySelector("#cancelBtn").addEventListener("click", onCancel);
        }
      }, 1000);
    } catch (err) {
      errBox.innerHTML = '<div class="error">' + camError(err) + "</div>";
      startBtn.disabled = false;
      startBtn.textContent = "Kamera starten";
    }
  });

  // Abbrechen: Kamera stoppen, NICHTS speichern, zurueck zum Projekt.
  // Der Tag bleibt dadurch offen bzw. wird spaeter als verpasst gewertet.
  function onCancel() {
    if (countdownTimer) clearInterval(countdownTimer);
    if (counter) counter.stop();
    window.location.href = "project.html?id=" + projectId;
  }
});

function camError(err) {
  if (err.name === "NotAllowedError")
    return "Kamerazugriff verweigert. Erlaub ihn in den Browser-Einstellungen.";
  if (err.name === "NotFoundError") return "Keine Kamera gefunden.";
  return "Kamera-Fehler: " + (err.message || err.name);
}
