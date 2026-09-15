/* ==========================================================================
   Berkeley AI Risk — static site generator

   Reads data/*.json and writes the committed HTML, the calendar feed and the
   sitemap. Run it after editing any data file:

       node tools/build.mjs

   Pre-rendering (rather than the client-side rendering the old site used)
   is what makes the talks visible to search engines and link previews.
   Zero dependencies; nothing is installed to build or to serve.
   ========================================================================== */

import fs from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const assetVersion = (p) => createHash("sha256").update(fs.readFileSync(path.join(ROOT, p))).digest("hex").slice(0, 12);
const read = (p) => {
  try {
    return JSON.parse(fs.readFileSync(path.join(ROOT, p), "utf8"));
  } catch (err) {
    console.error(`\nThe site was not built: ${p} could not be read as JSON.\n  ${err.message}\n  Common causes: a missing or extra comma, or curly quotes instead of straight quotes (").\n`);
    process.exit(1);
  }
};
const write = (p, s) => {
  if (p.endsWith(".html")) s = s.replace(/[ \t]+$/gm, "");
  fs.writeFileSync(path.join(ROOT, p), s);
  console.log(`  ${p.padEnd(24)} ${String(Buffer.byteLength(s)).padStart(7)} bytes`);
};

const site = read("data/site.json");
const talks = read("data/talks.json");
const reading = read("data/reading-group.json");

/* --- Validation ----------------------------------------------------------- */

// The data files are often edited by hand on github.com. Tidy the common slips
// (2026-10-7, 9:30) and stop with a readable message for anything that would
// publish a broken page or calendar entry. A failed build leaves the previous
// site live.
const problems = [];
for (const [file, list] of [["data/talks.json", talks], ["data/reading-group.json", reading]]) {
  if (!Array.isArray(list)) {
    console.error(`\nThe site was not built: ${file} must be a list of entries inside [ ].\n`);
    process.exit(1);
  }
}
const isBlank = (v) => v === undefined || v === null || String(v).trim() === "";
function normaliseWhen(item, label) {
  const d = String(item.date ?? "").trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isBlank(item.date)) {
    problems.push(`${label}: "date" is missing`);
  } else if (!d) {
    problems.push(`${label}: date "${item.date}" must look like 2026-11-17`);
  } else {
    const [y, mo, day] = [+d[1], +d[2], +d[3]];
    const check = new Date(Date.UTC(y, mo - 1, day));
    if (check.getUTCMonth() !== mo - 1 || check.getUTCDate() !== day) problems.push(`${label}: date "${item.date}" is not a real date`);
    item.date = `${d[1]}-${String(mo).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }
  const tm = String(item.time ?? "").trim().match(/^(\d{1,2}):(\d{2})$/);
  if (isBlank(item.time)) problems.push(`${label}: "time" is missing`);
  else if (!tm || +tm[1] > 23 || +tm[2] > 59) problems.push(`${label}: time "${item.time}" must be 24-hour, like 16:00`);
  else item.time = `${tm[1].padStart(2, "0")}:${tm[2]}`;
}
const slugs = new Set();
talks.forEach((t, i) => {
  const label = `data/talks.json entry ${i + 1} (${t.speaker || "no speaker"})`;
  for (const k of ["slug", "speaker", "title", "location"]) if (isBlank(t[k])) problems.push(`${label}: "${k}" is missing`);
  if (!isBlank(t.slug) && !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(t.slug)) problems.push(`${label}: slug "${t.slug}" may only use lowercase letters, digits and hyphens`);
  if (!isBlank(t.slug) && slugs.has(t.slug)) problems.push(`${label}: slug "${t.slug}" is used twice`);
  slugs.add(t.slug);
  if (!isBlank(t.durationMinutes) && !(Number(t.durationMinutes) > 0)) problems.push(`${label}: durationMinutes "${t.durationMinutes}" must be a number of minutes, like 90`);
  normaliseWhen(t, label);
});
if (isBlank(site.googleCalendarId)) problems.push(`data/site.json: "googleCalendarId" is missing`);
reading.forEach((s, i) => {
  const label = `data/reading-group.json entry ${i + 1} (${s.title || "no title"})`;
  for (const k of ["title", "location", "presenter", "readings"]) if (isBlank(s[k])) problems.push(`${label}: "${k}" is missing`);
  normaliseWhen(s, label);
});
if (problems.length) {
  console.error(`\nThe site was not built. Fix these in the data files:\n  - ${problems.join("\n  - ")}\n`);
  process.exit(1);
}

// "Today" has to mean today in Berkeley. Using the UTC date would flip a talk
// from upcoming to past eight hours early, every evening.
const TODAY = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Los_Angeles", year: "numeric", month: "2-digit", day: "2-digit",
}).format(new Date());

/* --- Time ---------------------------------------------------------------- */

const LA = "America/Los_Angeles";
const laParts = new Intl.DateTimeFormat("en-US", {
  timeZone: LA, hour12: false,
  year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", second: "2-digit",
});

// Milliseconds that must be added to a UTC instant to read it as local LA time.
function tzOffsetMs(utcMs) {
  const p = {};
  for (const x of laParts.formatToParts(utcMs)) if (x.type !== "literal") p[x.type] = +x.value;
  // en-US with hour12:false renders midnight as "24"; normalise it.
  return Date.UTC(p.year, p.month - 1, p.day, p.hour % 24, p.minute, p.second) - utcMs;
}

// Wall-clock time in Berkeley -> the UTC instant. Two passes so the answer is
// still right for a time that sits near a DST transition.
function laToUtc(y, mo, d, hh, mm) {
  const naive = Date.UTC(y, mo - 1, d, hh, mm);
  return naive - tzOffsetMs(naive - tzOffsetMs(naive));
}

function offsetLabel(utcMs) {
  const mins = tzOffsetMs(utcMs) / 60000;
  const sign = mins < 0 ? "-" : "+";
  const a = Math.abs(mins);
  return `${sign}${String(Math.floor(a / 60)).padStart(2, "0")}:${String(a % 60).padStart(2, "0")}`;
}

// A UTC instant -> Berkeley wall-clock ISO 8601 with its offset.
function laIso(utcMs) {
  const p = {};
  for (const x of laParts.formatToParts(utcMs)) if (x.type !== "literal") p[x.type] = x.value;
  return `${p.year}-${p.month}-${p.day}T${String(+p.hour % 24).padStart(2, "0")}:${p.minute}:00${offsetLabel(utcMs)}`;
}

// Format from Y/M/D as a UTC instant so nothing shifts by a day. This is the
// bug the old reading-group page had: new Date("2025-06-03") is UTC midnight,
// which renders as June 2 anywhere west of Greenwich.
const asUTC = (y, mo, d) => new Date(Date.UTC(y, mo - 1, d));
const fmt = (o) => new Intl.DateTimeFormat("en-US", { timeZone: "UTC", ...o });
const F = {
  dow: fmt({ weekday: "short" }), dowLong: fmt({ weekday: "long" }),
  mon: fmt({ month: "short" }), monLong: fmt({ month: "long" }),
};

function timeLabel(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${ampm}`;
}

const TBA = "Title to be announced";

// Abstracts may be written as HTML that starts with a tag (<p>…</p>) or as
// plain text with a blank line between paragraphs.
function abstractHtml(a) {
  const s = String(a).trim();
  if (/^<[a-z]/i.test(s)) return s;
  return s.split(/\r?\n\s*\n/)
    .map((para) => `<p>${para.trim().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>`)
    .join("");
}

const ENTITIES = {
  nbsp: " ", lt: "<", gt: ">", quot: '"', apos: "'", amp: "&", mdash: "—", ndash: "–", hellip: "…",
  lsquo: "‘", rsquo: "’", ldquo: "“", rdquo: "”", middot: "·", eacute: "é", egrave: "è", ccedil: "ç", uuml: "ü", ouml: "ö", auml: "ä",
};

// Plain text for calendar entries and search-engine data.
function plainText(html) {
  return html
    .replace(/<\/p>\s*/gi, "\n\n")
    .replace(/<br\s*\/?>|<\/(li|blockquote|ul|ol)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&#x([0-9a-f]+);|&#(\d+);|&([a-z]+);/gi, (m, hex, dec, name) =>
      hex ? String.fromCodePoint(parseInt(hex, 16)) : dec ? String.fromCodePoint(Number(dec)) : ENTITIES[name.toLowerCase()] ?? m)
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function decorate(t) {
  const [y, mo, d] = t.date.split("-").map(Number);
  const [hh, mm] = t.time.split(":").map(Number);
  const dt = asUTC(y, mo, d);
  const startMs = laToUtc(y, mo, d, hh, mm);
  const endMs = startMs + (Number(t.durationMinutes) || 90) * 60000;
  const abstractText = String(t.abstract ?? "").trim();
  return {
    ...t,
    abstract: abstractText ? abstractHtml(abstractText) : "",
    description: abstractText ? plainText(abstractHtml(abstractText)) : "",
    title: t.title === "TBA" ? TBA : t.title,
    y, mo, d,
    dow: F.dow.format(dt), dowLong: F.dowLong.format(dt),
    mon: F.mon.format(dt), monLong: F.monLong.format(dt),
    day: d,
    longDate: `${F.dowLong.format(dt)}, ${F.monLong.format(dt)} ${d}, ${y}`,
    shortDate: `${F.mon.format(dt)} ${d}, ${y}`,
    timeLabel: timeLabel(t.time),
    startUtc: new Date(startMs).toISOString().replace(/\.\d{3}Z$/, "Z"),
    endUtc: new Date(endMs).toISOString().replace(/\.\d{3}Z$/, "Z"),
    startLocal: `${t.date}T${t.time}:00${offsetLabel(startMs)}`,
    endLocal: laIso(endMs),
    // Berkeley's academic calendar splits at the summer, so month >= 8 is Fall.
    season: `${mo >= 8 ? "Fall" : "Spring"} ${y}`,
    isPast: endMs <= Date.now(),
  };
}

const all = talks.map(decorate).sort((a, b) => a.startUtc.localeCompare(b.startUtc));
const upcoming = all.filter((t) => !t.isPast);
const past = all.filter((t) => t.isPast).reverse();

/* --- Helpers -------------------------------------------------------------- */

const esc = (s) => String(s ?? "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;");

const attr = (s) => esc(s);
const initials = (name) => name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
const hasPhoto = (t) => t.headshot && fs.existsSync(path.join(ROOT, t.headshot));

function face(t, cls) {
  return hasPhoto(t)
    ? `<img class="${cls}" src="${attr(t.headshot)}" alt="" width="400" height="400" loading="lazy" decoding="async">`
    : `<span class="${cls} initials" aria-hidden="true">${esc(initials(t.speaker))}</span>`;
}

const ICON = {
  linkedin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.98 3.5A2.5 2.5 0 1 1 0 3.5a2.5 2.5 0 0 1 4.98 0zM.4 8.4h4.2V24H.4zM8.5 8.4h4v2.1h.06c.56-1.06 1.93-2.18 3.97-2.18 4.25 0 5.03 2.8 5.03 6.43V24h-4.2v-7.4c0-1.77-.03-4.04-2.46-4.04-2.47 0-2.85 1.93-2.85 3.92V24H8.5z"/></svg>',
  x: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18.24 2.25h3.31l-7.23 8.26L22.5 21.75h-6.66l-5.22-6.82-5.97 6.82H1.34l7.73-8.84L1.5 2.25h6.83l4.72 6.23zm-1.16 17.52h1.83L7.01 4.13H5.05z"/></svg>',
  link: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm6.9 6h-2.95a15.7 15.7 0 0 0-1.38-3.56A8.03 8.03 0 0 1 18.9 8zM12 4.04c.83 1.2 1.48 2.53 1.91 3.96h-3.82c.43-1.43 1.08-2.76 1.91-3.96zM4.26 14a7.96 7.96 0 0 1 0-4h3.38a16.5 16.5 0 0 0 0 4zm.84 2h2.95c.3 1.26.76 2.46 1.38 3.56A8 8 0 0 1 5.1 16zm2.95-8H5.1a8 8 0 0 1 4.33-3.56A15.7 15.7 0 0 0 8.05 8zM12 19.96A13.9 13.9 0 0 1 10.09 16h3.82A13.9 13.9 0 0 1 12 19.96zM14.34 14H9.66a14.9 14.9 0 0 1 0-4h4.68a14.9 14.9 0 0 1 0 4zm.23 5.56c.62-1.1 1.08-2.3 1.38-3.56h2.95a8 8 0 0 1-4.33 3.56zM16.36 14a16.5 16.5 0 0 0 0-4h3.38a7.96 7.96 0 0 1 0 4z"/></svg>',
  mail: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 5.5A1.5 1.5 0 0 1 3.5 4h17A1.5 1.5 0 0 1 22 5.5v13a1.5 1.5 0 0 1-1.5 1.5h-17A1.5 1.5 0 0 1 2 18.5zm2.4.5L12 12.2 19.6 6zM20 7.9l-7.4 6a1 1 0 0 1-1.2 0L4 7.9V18h16z"/></svg>',
  chev: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>',
};

function iconLink(href, label, icon, extra = "") {
  return `<a class="iconbtn ${extra}" href="${attr(href)}"${href.startsWith("mailto:") ? "" : ' target="_blank" rel="noopener"'} title="${attr(label)}" aria-label="${attr(label)}">${icon}</a>`;
}

/* --- Shared chrome -------------------------------------------------------- */

const NAV = [
  ["./#upcoming", "Upcoming"],
  ["./#archive", "Past talks"],
  ["reading-group.html", "Reading group"],
  ["./#about", "About"],
];

function head({ title, description, page }) {
  const url = site.canonical + (page === "index" ? "" : `${page}.html`);
  // GitHub Pages serves 404.html at every missing path, so it names no canonical URL.
  const is404 = page === "404";
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${attr(description)}">
${site.noindex ? '<meta name="robots" content="noindex,nofollow">\n' : is404 ? '<meta name="robots" content="noindex">\n' : ""}${is404 ? "" : `<link rel="canonical" href="${attr(url)}">`}
<meta name="theme-color" content="#002676">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${attr(site.name)}">
<meta property="og:title" content="${attr(title)}">
<meta property="og:description" content="${attr(description)}">
${is404 ? "" : `<meta property="og:url" content="${attr(url)}">`}
<meta property="og:image" content="${attr(site.canonical)}assets/og.png">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="assets/favicon.svg" type="image/svg+xml">
<link rel="preload" href="assets/fonts/inter-var-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="assets/fonts/newsreader-var-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="alternate" type="text/calendar" href="${attr(GCAL.ics)}" title="${attr(site.name)} — talks">
<link rel="stylesheet" href="styles.css?v=${assetVersion("styles.css")}">
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
${site.proposalNotice ? notice() : ""}
${header()}
<main id="main">`;
}

function notice() {
  return `<div class="notice" id="notice">
  <div class="notice__in">
    <span>Design proposal &nbsp;·&nbsp; Official site: <a href="${attr(site.officialSite)}">ai-risk.berkeley.edu</a>.</span>
    <button class="notice__x" type="button" aria-label="Dismiss">&times;</button>
  </div>
</div>`;
}

function header() {
  return `<header class="hdr">
  <div class="hdr__in">
    <a class="brand" href="./"><span class="brand__berkeley">Berkeley</span><span class="brand__series">AI Risk</span></a>
    <button class="burger" id="burger" type="button" aria-expanded="false" aria-controls="nav" aria-label="Menu"><span></span></button>
    <nav class="nav" id="nav" aria-label="Main navigation">
      ${NAV.map(([h, l]) => `<a href="${attr(h)}">${esc(l)}</a>`).join("\n      ")}
      <a href="${attr(site.mailingListForm)}" data-subscribe>Join mailing list</a>
    </nav>
    <a class="btn btn--sm hdr__cta" href="${attr(site.mailingListForm)}" data-subscribe>Join mailing list</a>
  </div>
</header>`;
}

function footer() {
  return `</main>
<footer class="ftr">
  <div class="wrap">
    <div class="ftr__grid">
      <div>
        <div class="ftr__brand">Berkeley AI Risk</div>
        <p style="max-width:38ch">${esc(site.tagline)}.</p>
        <p class="ftr__a11y"><strong style="color:#efece3">Accessibility.</strong> ${esc(site.accessibility)} <a href="${attr(site.accessibilityLink)}">Accessibility information for Sutardja Dai Hall</a>.</p>
      </div>
      <div>
        <h2 class="ftr__h">The series</h2>
        <ul>
          <li><a href="./#upcoming">Upcoming talks</a></li>
          <li><a href="./#archive">Past talks</a></li>
          <li><a href="reading-group.html">Reading group</a></li>
          <li><a href="${attr(site.youtubePlaylist)}">Video archive</a></li>
          <li>${seriesCalendar()}</li>
        </ul>
      </div>
      <div>
        <h2 class="ftr__h">Get in touch</h2>
        <ul>
          <li><a href="${attr(site.mailingListForm)}" data-subscribe>Join the mailing list</a></li>
          ${site.organizers.map((o) => `<li><a href="mailto:${attr(o.email)}">${esc(o.name)}</a></li>`).join("\n          ")}
        </ul>
      </div>
    </div>
    <div class="ftr__base">
      <span>&copy; ${new Date().getFullYear()} Berkeley AI Risk</span>
      <span>Web design by Evan Bright</span>
    </div>
  </div>
</footer>
${modal()}

<script type="application/json" id="talk-data">${JSON.stringify(
    all.map((t) => ({
      slug: t.slug, speaker: t.speaker, title: t.title, description: t.description,
      location: t.location, onlineUrl: site.zoom, longDate: t.longDate, timeLabel: t.timeLabel,
      startUtc: t.startUtc, endUtc: t.endUtc,
    }))
  ).replace(/</g, "\\u003c")}</script>
<script src="app.js?v=${assetVersion("app.js")}" defer></script>
</body>
</html>
`;
}

function modal() {
  return `<div class="modal" id="subscribe" hidden role="dialog" aria-modal="true" aria-labelledby="sub-h">
  <div class="modal__box">
    <div class="modal__head">
      <button class="modal__x" type="button" data-close aria-label="Close">&times;</button>
      <h2 id="sub-h">Join the mailing list</h2>
      <p class="modal__sub">Receive announcements about upcoming talks and reading-group sessions.</p>
    </div>
    <form id="sub-form" novalidate>
      <p class="form-error" id="sub-error" role="alert" hidden></p>
      <div class="field">
        <label for="sub-name">Name</label>
        <input id="sub-name" name="name" type="text" autocomplete="name" required aria-describedby="sub-name-err">
        <span class="err" id="sub-name-err" hidden></span>
      </div>
      <div class="field">
        <label for="sub-email">Email</label>
        <input id="sub-email" name="email" type="email" autocomplete="email" required aria-describedby="sub-email-err">
        <span class="err" id="sub-email-err" hidden></span>
      </div>
      <div class="field">
        <label for="sub-dept">Department <span class="opt">— optional, for Cal students and staff</span></label>
        <input id="sub-dept" name="dept" type="text" autocomplete="organization">
      </div>
      <div class="hp" aria-hidden="true"><label for="sub-company">Company website</label><input id="sub-company" name="company_website" type="text" tabindex="-1" autocomplete="off"></div>
      <button class="btn btn--lg" id="sub-submit" type="submit" style="width:100%">Sign me up</button>
      <p class="modal__fine">Prefer the plain form? <a href="${attr(site.mailingListForm)}" target="_blank" rel="noopener">Open it on Google Forms</a>.</p>
    </form>
    <div id="sub-ok" hidden>
      <div class="modal__ok">
        <div class="tick" aria-hidden="true">&#10003;</div>
        <h2 style="font-size:23px;margin-bottom:8px">Signup request sent</h2>
        <p class="modal__sub" style="margin-bottom:20px">Your request for <strong id="sub-ok-mail"></strong> has been sent. This page cannot confirm that it was accepted. You can also <a href="${attr(site.mailingListForm)}" target="_blank" rel="noopener">sign up directly</a>.</p>
        <button class="btn btn--ghost" type="button" data-close>Close</button>
      </div>
    </div>
  </div>
</div>`;
}

/* --- Sections ------------------------------------------------------------- */

function updatesButton() {
  return `<a class="btn btn--berkeley" href="${attr(site.mailingListForm)}" data-subscribe>Get talk updates</a>`;
}

// Subscriptions use the series' public Google Calendar, which
// tools/google-calendar-sync.gs keeps in step with data/talks.json.
const GCAL = {
  add: `https://calendar.google.com/calendar/u/0?cid=${Buffer.from(site.googleCalendarId).toString("base64").replace(/=+$/, "")}`,
  ics: `https://calendar.google.com/calendar/ical/${encodeURIComponent(site.googleCalendarId)}/public/basic.ics`,
  view: `https://calendar.google.com/calendar/embed?src=${encodeURIComponent(site.googleCalendarId)}&ctz=America%2FLos_Angeles`,
};

function seriesCalendar() {
  return `<details class="series-calendar"><summary>Subscribe to the calendar</summary><div class="series-calendar__menu">
    <a href="${attr(GCAL.add)}" target="_blank" rel="noopener">Google Calendar</a>
    <a href="${attr(GCAL.ics.replace(/^https:/, "webcal:"))}">Apple Calendar / Outlook</a>
    <a href="${attr(GCAL.view)}" target="_blank" rel="noopener">View the calendar</a>
  </div></details>`;
}

function calMenu(t) {
  return `<div class="cal" data-slug="${attr(t.slug)}">
        <button class="cal__btn btn btn--ghost btn--sm" type="button" aria-expanded="false" hidden>Add to calendar</button>
        <div class="cal__menu" hidden></div>
      </div>`;
}

function upcomingRow(t) {
  return `<li class="row" id="${attr(t.slug)}" data-slug="${attr(t.slug)}" data-season="${attr(t.season)}">
    <div class="row__main">
      <time class="badge" datetime="${attr(t.date)}"><span class="dow">${esc(t.dow)}</span><span class="day">${t.day}</span><span class="mon">${esc(t.mon)} ${t.y}</span></time>
      ${face(t, "row__face")}
      <div class="row__txt"><h3 class="row__speaker">${esc(t.speaker)}</h3><p class="row__affil">${esc(t.affiliation)}</p><p class="row__title">${esc(t.title)}</p><p class="row__time">${esc(t.timeLabel)} PT &nbsp;·&nbsp; ${esc(t.location)}${site.zoom ? ` &nbsp;·&nbsp; <a href="${attr(site.zoom)}" target="_blank" rel="noopener">Join on Zoom</a>` : ""}</p></div>
      <div class="row__cta">${updatesButton()}${calMenu(t)}</div>
    </div>
    ${t.abstract || t.website ? `<div class="row__description">${t.abstract ? `<div class="talk__abstract">${t.abstract}</div>` : ''}${t.website ? `<a class="text-link" href="${attr(t.website)}" target="_blank" rel="noopener">About ${esc(t.speaker)}</a>` : ''}</div>` : ''}
  </li>`;
}

function archiveCard(t) {
  return `<details class="talk" id="${attr(t.slug)}"${t.videoId ? ` data-video="${attr(t.videoId)}"` : ''}>
    <summary class="talk__row">
      <time class="talk__date" datetime="${attr(t.date)}"><span>${esc(t.mon)}</span><strong>${t.day}</strong></time>
      ${face(t, "talk__face")}
      <span class="talk__text"><span class="talk__speaker">${esc(t.speaker)}<span class="talk__affil">${esc(t.affiliation)}</span></span><span class="talk__title">${esc(t.title)}</span></span>
      <span class="talk__action">${t.videoId ? 'Recording' : 'Details'}<span class="talk__plus" aria-hidden="true">+</span></span>
    </summary>
    <div class="talk__content">
      ${t.videoId ? `<div class="video"><button class="video__play" type="button" aria-label="Play ${attr(t.speaker)}’s talk"><img src="assets/thumbs/${attr(t.slug)}.jpg" alt="" width="640" height="360" loading="lazy"><span class="video__label"><span aria-hidden="true">▶</span> Watch recording</span></button></div>` : ''}
      ${t.abstract ? `<div class="talk__abstract">${t.abstract}</div>` : ''}${t.videoId ? '' : '<p class="recording-note">Recording not yet available.</p>'}
      <div class="card__links">${t.videoId ? `<a href="https://www.youtube.com/watch?v=${attr(t.videoId)}" target="_blank" rel="noopener">Watch on YouTube</a>` : ''}${t.slidesUrl ? `<a href="${attr(t.slidesUrl)}" target="_blank" rel="noopener">Slides (PDF)</a>` : ''}${t.website ? `<a href="${attr(t.website)}" target="_blank" rel="noopener">Speaker’s website</a>` : ''}</div>
    </div>
  </details>`;
}

function personCard(o) {
  const links = [
    iconLink(`mailto:${o.email}`, `Email ${o.name}: ${o.email}`, ICON.mail, "iconbtn--mail"),
    o.website && iconLink(o.website, o.name === "Will Fithian" ? "Will Fithian’s Berkeley faculty page" : `${o.name}’s website`, ICON.link, "iconbtn--web"),
    o.linkedin && iconLink(o.linkedin, `${o.name} on LinkedIn`, ICON.linkedin, "iconbtn--li"),
    o.x && iconLink(o.x, `${o.name} on Twitter / X`, ICON.x, "iconbtn--x"),
  ].filter(Boolean).join("\n        ");

  return `<div class="person">
    <img class="person__photo" src="${attr(o.photo)}" alt="" width="400" height="400" loading="lazy" decoding="async">
    <div>
      <div class="person__name">${esc(o.name)}</div>
      <div class="person__role">${esc(o.role)}</div>
      <div class="person__links" role="group" aria-label="${attr(o.name)}’s contact and profiles">${links}</div>
    </div>
  </div>`;
}

function sponsorMark(s) {
  const inner = s.logo
    ? `<img src="${attr(s.logo)}" alt="${attr(s.name)}" data-l="${attr(s.key)}" loading="lazy">`
    : `<span class="wordmark"><b>${esc(s.wordmark.line1)}</b><span>${esc(s.wordmark.line2)}</span></span>`;
  return `<a href="${attr(s.url)}" target="_blank" rel="noopener" title="${attr(s.name)}">${inner}</a>`;
}

/* --- Structured data ------------------------------------------------------ */

function jsonLd() {
  const events = all.map((t) => {
    const online = /zoom/i.test(t.location);
    const virtual = { "@type": "VirtualLocation", ...(site.zoom ? { url: site.zoom } : {}) };
    const place = {
      "@type": "Place", name: t.location,
      address: { "@type": "PostalAddress", addressLocality: "Berkeley", addressRegion: "CA", addressCountry: "US" },
    };
    return {
      "@context": "https://schema.org",
      "@type": "Event",
      name: `${t.speaker} — ${t.title}`,
      startDate: t.startLocal,
      endDate: t.endLocal,
      eventAttendanceMode: `https://schema.org/${online ? "Online" : site.zoom ? "Mixed" : "Offline"}EventAttendanceMode`,
      eventStatus: "https://schema.org/EventScheduled",
      ...(t.description ? { description: t.description } : {}),
      url: `${site.canonical}#${t.slug}`,
      ...(hasPhoto(t) ? { image: site.canonical + t.headshot } : {}),
      location: online ? virtual : site.zoom ? [place, virtual] : place,
      performer: { "@type": "Person", name: t.speaker, ...(t.affiliation ? { affiliation: { "@type": "Organization", name: t.affiliation } } : {}), ...(t.website ? { url: t.website } : {}) },
      organizer: { "@type": "Organization", name: site.name, url: site.officialSite },
      isAccessibleForFree: true,
    };
  });
  return `<script type="application/ld+json">${JSON.stringify(events).replace(/</g, "\\u003c")}</script>`;
}

/* --- index.html ----------------------------------------------------------- */

function indexPage() {
  const next = upcoming[0];
  const seasons = [];
  for (const t of past) {
    let s = seasons.find((x) => x.name === t.season);
    if (!s) seasons.push((s = { name: t.season, items: [] }));
    s.items.push(t);
  }

  return head({
    title: `${site.name} — speaker series on AI risk at UC Berkeley`,
    description: `${site.tagline}. Talks by researchers from academia, civil society and industry, with the full archive of past talks and recordings.`,
    page: "index",
  }) + `
<section class="masthead">
  <div class="wrap masthead__grid">
    <div class="masthead__title"><p class="eyebrow">University of California, Berkeley</p><h1>AI <span>RISK</span></h1><div class="masthead__rule"><span>Speaker series</span><span>${next ? esc(next.season) : new Date().getFullYear()}</span></div></div>
    <div class="masthead__intro"><p class="masthead__statement">Assessing risks to society from AI</p><p>Scholars from across disciplines examine the risks of artificial intelligence and how to mitigate them.</p><a class="text-link" href="#archive">Explore the conversations <span aria-hidden="true">↓</span></a></div>
  </div>
</section>

<section id="upcoming" class="programme">
  <div class="wrap">
    <div class="section-heading"><h2>Upcoming speakers</h2>${seriesCalendar()}</div>
    <ul class="rows">${upcoming.map(upcomingRow).join('')}</ul>
    <p class="schedule-note">${upcoming.length ? 'More dates will be announced.' : 'The next talks are being scheduled.'} <a href="${attr(site.mailingListForm)}" data-subscribe>Join the mailing list</a> for updates.</p>
  </div>
</section>

<section id="archive" class="archive">
  <div class="wrap">
    <div class="section-heading"><h2>Past talks<span class="heading-count">${past.length}</span></h2><a class="text-link" href="${attr(site.youtubePlaylist)}" target="_blank" rel="noopener">${past.filter(t => t.videoId).length} recordings on YouTube <span aria-hidden="true">↗</span></a></div>
    <div id="archive-seasons">${seasons.map(s => `<div class="season" data-season="${attr(s.name)}"><h3 class="season__h">${esc(s.name)}</h3><div class="talks">${s.items.map(archiveCard).join('')}</div></div>`).join('')}</div>
    ${upcoming.map(t => `<template data-elapsed="${attr(t.slug)}" data-season="${attr(t.season)}">${archiveCard(t)}</template>`).join('')}
  </div>
</section>

<section id="about" class="about">
  <div class="wrap about-grid">
    <div><p class="eyebrow">Across disciplines. Across campus.</p><h2>A shared concern.<br>Many perspectives.</h2>${site.about.map(p => `<p>${esc(p)}</p>`).join('')}<details class="disclose"><summary>Our campus community</summary><div class="depts">${site.departments.map(d => `<span>${esc(d)}</span>`).join('')}</div></details><a class="reading-link" href="reading-group.html"><span><strong>The reading group</strong><span>Papers and discussion on AI risk, safety and alignment.</span></span><span aria-hidden="true">↗</span></a></div>
    <div class="questions"><p class="eyebrow">Questions we explore</p><ol class="qs">${site.questions.map(q => `<li>${esc(q)}</li>`).join('')}</ol></div>
  </div>
</section>

<section id="organizers">
  <div class="wrap">
    <div class="section-heading"><h2>Meet the organizers</h2><p>Statistics, philosophy, and a common concern.</p></div>
    <div class="people">${site.organizers.map(personCard).join('')}</div>
    <div class="support"><div><p class="eyebrow">Co-sponsored by</p><div class="sponsors">${site.sponsors.filter(s => !s.unconfirmed).map(sponsorMark).join('')}</div></div>${site.sponsors.some(s => s.unconfirmed) ? `<div class="affiliated"><p class="eyebrow">Campus connection</p><div class="sponsors">${site.sponsors.filter(s => s.unconfirmed).map(sponsorMark).join('')}</div></div>` : ''}</div>
  </div>
</section>
${jsonLd()}
` + footer();
}

/* --- reading-group.html ---------------------------------------------------- */

function readingPage() {
  const items = reading.map((s) => {
    const [y, mo, d] = s.date.split("-").map(Number);
    const dt = asUTC(y, mo, d);
    return { ...s, label: `${F.dow.format(dt)}<br>${F.mon.format(dt)} ${d}, ${y}`, tl: timeLabel(s.time) };
  });

  return head({
    title: `Reading group — ${site.name}`,
    description: "Discussions of papers and research on AI risk, safety, ethics and alignment at UC Berkeley.",
    page: "reading-group",
  }) + `
<section class="hero" style="padding-bottom:clamp(28px,4vw,40px)">
  <div class="wrap wrap--narrow">
    <p class="eyebrow">Berkeley AI Risk</p>
    <h1>Reading group</h1>
    <p class="lede" style="max-width:46ch;margin-top:16px">Discussions of papers and research on AI risk, safety, ethics and alignment.</p>
    <div class="btn-row" style="margin-top:26px">
      <a class="btn" href="${attr(site.mailingListForm)}" data-subscribe>Join the mailing list</a>
      <a class="btn btn--ghost" href="./#upcoming">Speaker series</a>
    </div>
  </div>
</section>

<section id="schedule">
  <div class="wrap wrap--narrow">
    <div class="sec-head"><div><p class="eyebrow">Summer 2025 &middot; ${items.length} sessions</p><h2>Sessions</h2></div></div>
    <ul class="rg">
      ${items.map((s) => `<li>
        <div class="rg__date">${s.label}<br>${esc(s.tl)}</div>
        <div>
          <div class="rg__title">${esc(s.title)}</div>
          <div class="rg__meta">${esc(s.location)} &middot; led by ${esc(s.presenter)}</div>
          <div class="rg__read">${s.readings}</div>
        </div>
      </li>`).join("\n      ")}
    </ul>
    <p style="margin-top:26px;color:var(--muted);font-size:15px">The reading group is not currently meeting. Mailing-list subscribers will hear when it resumes.</p>
  </div>
</section>
` + footer();
}

/* --- 404 ------------------------------------------------------------------ */

function notFoundPage() {
  return head({ title: `Page not found — ${site.name}`, description: "Page not found.", page: "404" }) + `
<section class="hero">
  <div class="wrap wrap--narrow">
    <p class="eyebrow">404</p>
    <h1>Page not found</h1>
    <p class="lede" style="margin-top:16px">That page doesn&rsquo;t exist here.</p>
    <div class="btn-row" style="margin-top:26px">
      <a class="btn" href="./">Back to the series</a>
      <a class="btn btn--ghost" href="./#archive">Past talks</a>
    </div>
  </div>
</section>
` + footer();
}

// GitHub Pages serves 404.html for a missing path at any depth, where relative
// links would resolve beneath that path. Anchor them at the domain root.
const rootRelative = (html) => html
  .replace(/(\s(?:href|src))="\.\//gi, '$1="/')
  .replace(/(\s(?:href|src))="(?![a-z][a-z0-9+.-]*:|\/|#)/gi, '$1="/');

/* --- speaker-series.html --------------------------------------------------- */

// The old site's speaker-series page is linked from emails and other sites.
function redirectPage(target) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${esc(site.name)}</title>
<meta name="robots" content="noindex">
<link rel="canonical" href="${attr(site.canonical)}">
<meta http-equiv="refresh" content="0; url=${attr(target)}">
<script>location.replace(${JSON.stringify(target)});</script>
</head>
<body>
<p>The speaker series has moved to <a href="${attr(target)}">the ${esc(site.name)} home page</a>.</p>
</body>
</html>
`;
}

/* --- events.json ----------------------------------------------------------- */

// Read by tools/google-calendar-sync.gs, which copies the talks into the
// Google Calendar that visitors subscribe to.
function eventsFeed() {
  const who = (t) => `${t.speaker}${t.affiliation ? ` (${t.affiliation})` : ""}`;
  const events = all.map((t) => ({
    slug: t.slug,
    title: `AI Risk speaker series: ${t.speaker}`,
    start: t.startLocal,
    end: t.endLocal,
    location: t.location,
    description: [
      t.title === TBA ? who(t) : `${t.title}\n${who(t)}`,
      t.description,
      site.zoom ? `Zoom: ${site.zoom}` : "",
      `${site.canonical}#${t.slug}`,
    ].filter(Boolean).join("\n\n"),
  }));
  return JSON.stringify({ calendar: site.googleCalendarId, events }, null, 2) + "\n";
}

/* --- sitemap / robots ------------------------------------------------------ */

const sitemap = () =>
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  ["", "reading-group.html"].map((p) =>
    `  <url><loc>${site.canonical}${p}</loc></url>`).join("\n") +
  `\n</urlset>\n`;

/* robots.txt is only honoured at a domain root, so a copy inside this
   subdirectory would do nothing. Indexing is controlled by the noindex meta tag
   instead — which is also the right tool: a Disallow rule stops the crawl
   before the crawler can read the noindex, which can leave the bare URL indexed
   with no content. A robots.txt is therefore only written when this site owns
   its domain root. Same for the sitemap: pointless while noindex is on. */
const ownsRoot = () => { try { return new URL(site.canonical).pathname === "/"; } catch { return false; } };

/* --- Run ------------------------------------------------------------------- */

console.log(`\nBerkeley AI Risk — build  (today ${TODAY})`);
console.log(`  ${all.length} talks · ${upcoming.length} upcoming · ${past.length} past · ${all.filter((t) => t.videoId).length} recordings\n`);

write("index.html", indexPage());
write("reading-group.html", readingPage());
write("404.html", rootRelative(notFoundPage()));
write("speaker-series.html", redirectPage("./#upcoming"));
write("events.json", eventsFeed());
if (ownsRoot() && !site.noindex) {
  write("sitemap.xml", sitemap());
  write("robots.txt", `User-agent: *\nAllow: /\n\nSitemap: ${site.canonical}sitemap.xml\n`);
} else {
  for (const f of ["sitemap.xml", "robots.txt"]) {
    const p = path.join(ROOT, f);
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
  console.log(`  ${"sitemap.xml/robots.txt".padEnd(24)} skipped (noindex, or not at a domain root)`);
}

const missing = all.filter((t) => !hasPhoto(t)).map((t) => t.speaker);
if (missing.length) console.log(`\n  note: initials tile used for ${missing.join(", ")} (no public headshot found)`);
const noThumb = all.filter((t) => t.videoId && !fs.existsSync(path.join(ROOT, `assets/thumbs/${t.slug}.jpg`)));
if (noThumb.length) console.log(`  warn: missing thumbnails for ${noThumb.map((t) => t.slug).join(", ")}`);
console.log("");
