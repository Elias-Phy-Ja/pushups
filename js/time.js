// Zeit-Helfer, alles in Europe/Zurich. Ohne Module, global verfuegbar.

const ZURICH = "Europe/Zurich";

function zurichParts(date) {
  date = date || new Date();
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: ZURICH,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = fmt.format(date).split("-").map(Number);
  return { year: parts[0], month: parts[1], day: parts[2] };
}

function todayKey(date) {
  const p = zurichParts(date);
  const pad = (n) => String(n).padStart(2, "0");
  return p.year + "-" + pad(p.month) + "-" + pad(p.day);
}

function isoWeek(date) {
  const p = zurichParts(date);
  const d = new Date(Date.UTC(p.year, p.month - 1, p.day));
  const dayNum = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const firstDayNum = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNum + 3);
  const diff = d - firstThursday;
  return 1 + Math.round(diff / (7 * 24 * 3600 * 1000));
}

function targetForToday(project) {
  if (project.targetType === "isoWeek") return isoWeek();
  return project.targetValue || 0;
}

function targetForDate(project, date) {
  if (project.targetType === "isoWeek") return isoWeek(date);
  return project.targetValue || 0;
}

function daysSince(startDate) {
  const days = [];
  const start = new Date(startDate);
  const today = new Date();
  let cursor = new Date(
    Date.UTC(start.getFullYear(), start.getMonth(), start.getDate())
  );
  const end = new Date(
    Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())
  );
  let guard = 0;
  while (cursor <= end && guard < 366) {
    days.push({ key: todayKey(cursor), date: new Date(cursor) });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    guard++;
  }
  return days;
}
