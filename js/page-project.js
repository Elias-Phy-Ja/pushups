var PATTERN_LABEL = { daily: "Taeglich", weekly: "Woechentlich" };
var root = document.querySelector("#app");
var projectId = new URLSearchParams(window.location.search).get("id");

requireAuth(async function (user) {
  root.innerHTML =
    topbarHTML(user, "dashboard.html") +
    '<div class="main"><div class="placeholder">Laedt...</div></div>';
  wireTopbar(root);
  var main = root.querySelector(".main");

  if (!projectId) {
    main.innerHTML = '<div class="error">Keine Challenge angegeben.</div>';
    return;
  }

  try {
    var results = await Promise.all([
      getProject(projectId),
      getAllEntries(projectId),
      getMyTodayEntry(projectId),
    ]);
    var p = results[0];
    var entries = results[1];
    var myToday = results[2];

    if (!p) {
      main.innerHTML = '<div class="error">Challenge nicht gefunden.</div>';
      return;
    }

    var target = targetForToday(p);
    var today = todayKey();

    var todayByUid = {};
    entries.forEach(function (e) {
      if (e.date === today) todayByUid[e.uid] = e;
    });

    var totals = {};
    entries.forEach(function (e) {
      if (e.status === "done")
        totals[e.uid] = (totals[e.uid] || 0) + (e.count || 0);
    });

    var board = p.members
      .map(function (m) {
        return {
          uid: m.uid,
          displayName: m.displayName,
          today: todayByUid[m.uid],
          total: totals[m.uid] || 0,
        };
      })
      .sort(function (a, b) {
        return b.total - a.total;
      });

    // Verlaufs-Grid.
    var startDate =
      p.startDate && p.startDate.toDate
        ? p.startDate.toDate()
        : new Date(
            p.createdAt && p.createdAt.toDate ? p.createdAt.toDate() : Date.now()
          );
    var days = daysSince(startDate);

    var byUidDate = {};
    entries.forEach(function (e) {
      byUidDate[e.uid + "_" + e.date] = e;
    });

    function statusFor(uid, day) {
      var e = byUidDate[uid + "_" + day.key];
      var dayTarget = targetForDate(p, day.date);
      if (e && e.status === "done") {
        return e.count >= dayTarget ? "done" : "partial";
      }
      return day.key === today ? "open" : "missed";
    }

    var gridRows = board.map(function (m) {
      return {
        name: m.displayName,
        isYou: m.uid === user.uid,
        cells: days.map(function (day) {
          var e = byUidDate[m.uid + "_" + day.key];
          return {
            key: day.key,
            status: statusFor(m.uid, day),
            target: targetForDate(p, day.date),
            count: e ? e.count : null,
          };
        }),
      };
    });

    var boardHtml = board
      .map(function (row, i) {
        var statusHtml;
        if (row.today && row.today.status === "done") {
          var hit = row.today.count >= target;
          statusHtml =
            '<span class="pill ' +
            (hit ? "pill-ok" : "pill-partial") +
            '">' +
            row.today.count +
            " von " +
            target +
            "</span>";
        } else {
          statusHtml = '<span class="pill pill-open">offen</span>';
        }
        return (
          '<div class="board-row"><span class="rank">' +
          (i + 1) +
          '</span><span class="board-name">' +
          row.displayName +
          (row.uid === user.uid ? " <span class='you'>(du)</span>" : "") +
          "</span>" +
          statusHtml +
          '<span class="board-total">Summe ' +
          row.total +
          "</span></div>"
        );
      })
      .join("");

    var dayLabels = days
      .map(function (d) {
        return (
          '<div class="grid-daylabel">' +
          d.key.slice(8) +
          "." +
          d.key.slice(5, 7) +
          "</div>"
        );
      })
      .join("");

    var gridHtml = gridRows
      .map(function (r) {
        var cells = r.cells
          .map(function (c) {
            var info =
              c.key +
              ": " +
              (c.count === null ? "kein Eintrag" : c.count + " von " + c.target);
            return (
              '<div class="cell cell-' +
              c.status +
              '" title="' +
              info +
              '" data-info="' +
              info +
              '"></div>'
            );
          })
          .join("");
        return (
          '<div class="grid-row"><div class="grid-name-col">' +
          r.name +
          (r.isYou ? " <span class='you'>(du)</span>" : "") +
          '</div><div class="grid-days">' +
          cells +
          "</div></div>"
        );
      })
      .join("");

    main.innerHTML =
      '<div class="eyebrow">' +
      (PATTERN_LABEL[p.pattern] || p.pattern) +
      ", Ziel heute</div>" +
      '<div class="title-row">' +
      '<h1 class="page-title">' +
      p.name +
      "</h1>" +
      (p.ownerId === user.uid
        ? '<a class="edit-link" href="edit.html?id=' + p.id + '">Bearbeiten</a>'
        : "") +
      "</div>" +
      '<div class="target-big">' +
      (p.targetType === "isoWeek" ? "KW " + target + ", " : "") +
      target +
      " Stueck</div>" +
      (myToday
        ? (myToday.count >= target
            ? '<div class="done-banner">Ziel erreicht: <b>' +
              myToday.count +
              "</b> von " +
              target +
              "</div>"
            : '<div class="partial-banner">Heute gemacht: <b>' +
              myToday.count +
              "</b> von " +
              target +
              ". Ziel knapp verfehlt.</div>")
        : '<a class="btn" href="counter.html?id=' + p.id + '">Jetzt starten</a>') +
      '<div class="section-head" style="margin-top:32px">Leaderboard</div>' +
      '<div class="board">' +
      boardHtml +
      "</div>" +
      '<div class="section-head" style="margin-top:32px">Verlauf seit Start' +
      '<span class="grid-legend">' +
      '<span class="lg lg-done"></span>Ziel' +
      '<span class="lg lg-partial"></span>angefangen' +
      '<span class="lg lg-missed"></span>verpasst' +
      '<span class="lg lg-open"></span>heute offen' +
      "</span></div>" +
      '<div class="grid-scroll"><div class="grid-head"><div class="grid-name-col"></div>' +
      '<div class="grid-days">' +
      dayLabels +
      "</div></div>" +
      gridHtml +
      "</div>" +
      '<div class="grid-tapinfo" id="tapInfo">Tipp auf ein Feld fuer Details</div>' +
      '<div class="invite-box" style="margin-top:28px"><div class="invite-top">' +
      '<span class="invite-label">Einladungscode</span>' +
      '<span class="code code-lg">' +
      p.inviteCode +
      "</span></div>" +
      '<button class="btn-ghost btn-copy" id="copyLink">Einladungslink kopieren</button>' +
      "</div>";

    var copyBtn = root.querySelector("#copyLink");
    copyBtn.addEventListener("click", async function () {
      var link =
        window.location.origin +
        window.location.pathname.replace("project.html", "join.html") +
        "?code=" +
        p.inviteCode;
      try {
        await navigator.clipboard.writeText(link);
        copyBtn.textContent = "Kopiert";
        setTimeout(function () {
          copyBtn.textContent = "Einladungslink kopieren";
        }, 1500);
      } catch (e) {
        copyBtn.textContent = link;
      }
    });

    // Tipp auf ein Grid-Feld zeigt Datum und Zahl (funktioniert am Handy).
    var tapInfo = root.querySelector("#tapInfo");
    root.querySelectorAll(".cell").forEach(function (cell) {
      cell.addEventListener("click", function () {
        root.querySelectorAll(".cell.selected").forEach(function (c) {
          c.classList.remove("selected");
        });
        cell.classList.add("selected");
        tapInfo.textContent = cell.getAttribute("data-info");
      });
    });
  } catch (err) {
    main.innerHTML =
      '<div class="error">Fehler beim Laden: ' + err.message + "</div>";
    console.error(err);
  }
});
