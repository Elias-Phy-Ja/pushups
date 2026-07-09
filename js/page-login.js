redirectIfLoggedIn();

var root = document.querySelector("#app");
var mode = "login";

function draw() {
  var isReg = mode === "register";
  root.innerHTML =
    '<div class="auth-wrap"><div class="auth-card">' +
    '<div class="auth-eyebrow">Push Challenge</div>' +
    '<h1 class="auth-title">' +
    (isReg ? "Konto erstellen" : "Anmelden") +
    "</h1>" +
    '<form id="authForm">' +
    (isReg
      ? '<label for="name">Anzeigename</label><input id="name" type="text" autocomplete="nickname" required />'
      : "") +
    '<label for="email">E-Mail</label><input id="email" type="email" autocomplete="email" required />' +
    '<label for="password">Passwort</label><input id="password" type="password" autocomplete="' +
    (isReg ? "new-password" : "current-password") +
    '" required />' +
    '<button class="btn" type="submit" id="submitBtn">' +
    (isReg ? "Konto erstellen" : "Anmelden") +
    "</button></form>" +
    '<div id="err"></div>' +
    '<div class="switch">' +
    (isReg
      ? 'Schon ein Konto? <a id="toggle">Anmelden</a>'
      : 'Noch kein Konto? <a id="toggle">Registrieren</a>') +
    "</div></div></div>";

  root.querySelector("#toggle").addEventListener("click", function () {
    mode = isReg ? "login" : "register";
    draw();
  });

  root.querySelector("#authForm").addEventListener("submit", async function (e) {
    e.preventDefault();
    var btn = root.querySelector("#submitBtn");
    var errBox = root.querySelector("#err");
    errBox.innerHTML = "";
    btn.disabled = true;
    btn.textContent = "Moment...";
    var email = root.querySelector("#email").value.trim();
    var password = root.querySelector("#password").value;
    var name = isReg ? root.querySelector("#name").value.trim() : null;
    try {
      if (isReg) await register(email, password, name);
      else await login(email, password);
      window.location.href = "dashboard.html";
    } catch (err) {
      errBox.innerHTML =
        '<div class="error">' + authErrorMessage(err.code) + "</div>";
      btn.disabled = false;
      btn.textContent = isReg ? "Konto erstellen" : "Anmelden";
    }
  });
}

draw();
