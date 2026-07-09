var root = document.querySelector("#app");
var urlCode = new URLSearchParams(window.location.search).get("code") || "";

requireAuth(function (user) {
  root.innerHTML =
    topbarHTML(user, "dashboard.html") +
    '<div class="main main-narrow">' +
    '<div class="eyebrow">Challenge beitreten</div>' +
    '<h1 class="page-title">Code eingeben</h1>' +
    '<form id="joinForm">' +
    '<label for="code">Einladungscode</label>' +
    '<input id="code" type="text" value="' +
    urlCode +
    '" placeholder="z.B. AB3K9P" autocapitalize="characters" autocomplete="off" required />' +
    '<button class="btn" type="submit" id="joinBtn">Beitreten</button>' +
    '<div id="err"></div>' +
    "</form></div>";
  wireTopbar(root);

  var errBox = root.querySelector("#err");

  async function submit() {
    var btn = root.querySelector("#joinBtn");
    errBox.innerHTML = "";
    btn.disabled = true;
    btn.textContent = "Tritt bei...";
    try {
      var id = await joinByCode(root.querySelector("#code").value);
      window.location.href = "project.html?id=" + id;
    } catch (err) {
      errBox.innerHTML = '<div class="error">' + err.message + "</div>";
      btn.disabled = false;
      btn.textContent = "Beitreten";
    }
  }

  root.querySelector("#joinForm").addEventListener("submit", function (e) {
    e.preventDefault();
    submit();
  });

  if (urlCode) submit();
});
