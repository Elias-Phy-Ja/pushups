// Baut die Topbar-HTML. backHref optional.
function topbarHTML(user, backHref) {
  return (
    '<div class="topbar">' +
    '<div class="brand-row">' +
    (backHref
      ? '<a class="back" href="' + backHref + '" aria-label="Zurueck">&larr;</a>'
      : "") +
    '<a class="brand" href="dashboard.html">PUSH<span class="dot">.</span></a>' +
    "</div>" +
    '<div class="who">' +
    '<a class="who-name" href="profile.html">' +
    nameOf(user) +
    "</a>" +
    '<button class="btn-ghost" id="logoutBtn">Abmelden</button>' +
    "</div>" +
    "</div>"
  );
}

function wireTopbar(root) {
  const btn = root.querySelector("#logoutBtn");
  if (btn) btn.addEventListener("click", logout);
}
