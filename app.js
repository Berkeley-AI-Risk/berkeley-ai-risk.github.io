/* ==========================================================================
   Berkeley AI Risk — interaction layer

   No dependencies or third-party requests on initial load.
   Native details, calendar links and form links work without JavaScript.
   ========================================================================== */

(function () {
  "use strict";

  /* --- Config ------------------------------------------------------------ */

  // The mailing list posts to the Google Form the series already uses, so no
  // subscriber has to be migrated. Field ids read off the live form.
  // To move to a real newsletter tool later, replace submitSubscriber() only.
  var FORM = {
    action: "https://docs.google.com/forms/d/e/1FAIpQLSfCB4AqVE-REphg2nBPK9Bz3Y7TDbdYvFnjop_MHmt4zj3UzA/formResponse",
    name: "entry.981192462",
    email: "entry.1331725139",
    dept: "entry.2055940634"
  };

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  // localStorage throws outright in some privacy modes, so every access is guarded.
  function store(key, val) {
    try {
      if (val === undefined) return window.localStorage.getItem(key);
      window.localStorage.setItem(key, val);
    } catch (e) { /* private mode, blocked site data — carry on without it */ }
    return null;
  }

  // The series subscription address, from the "Subscribe to the calendar" menu the build renders.
  var seriesLink = $('.series-calendar a[href^="webcal:"]');
  var WEBCAL = seriesLink ? seriesLink.getAttribute('href') : '';

  var TALKS = {};
  try {
    var node = $("#talk-data");
    if (node) {
      JSON.parse(node.textContent).forEach(function (t) { TALKS[t.slug] = t; });
    }
  } catch (e) { /* leave TALKS empty; calendar menus simply won't render */ }

  /* --- Notice bar -------------------------------------------------------- */

  var notice = $("#notice");
  if (notice) {
    if (store("bair.notice") === "off") {
      notice.remove();
    } else {
      var nx = $(".notice__x", notice);
      if (nx) nx.addEventListener("click", function () {
        notice.remove();
        store("bair.notice", "off");
      });
    }
  }

  /* --- Mobile nav -------------------------------------------------------- */

  var burger = $("#burger"), nav = $("#nav");
  if (burger && nav) {
    burger.addEventListener("click", function () {
      var open = burger.getAttribute("aria-expanded") === "true";
      burger.setAttribute("aria-expanded", String(!open));
      nav.classList.toggle("is-open", !open);
    });
    nav.addEventListener("click", function (e) {
      if (e.target.tagName === "A" && window.matchMedia("(max-width: 900px)").matches) {
        burger.setAttribute("aria-expanded", "false");
        nav.classList.remove("is-open");
      }
    });
  }

  /* Move completed talks to the archive between static rebuilds. */
  function refreshSchedule() {
    $$(".row").forEach(function(row) {
      var talk = TALKS[row.dataset.slug];
      if (!talk || Date.parse(talk.endUtc) > Date.now()) return;
      var template = $('template[data-elapsed="' + talk.slug + '"]');
      if (!template) return;
      var season = $$('.season').find(function(s) { return s.dataset.season === template.dataset.season; });
      if (!season) {
        season = document.createElement('div');
        season.className = 'season';
        season.dataset.season = template.dataset.season;
        var heading = document.createElement('h3');
        heading.className = 'season__h'; heading.textContent = template.dataset.season;
        var list = document.createElement('div'); list.className = 'talks';
        season.append(heading, list); $('#archive-seasons').prepend(season);
      }
      row.remove();
      $('.talks', season).prepend(template.content.cloneNode(true));
      template.remove();
      $('.heading-count').textContent = $$('#archive-seasons .talk').length;
    });
    // Match what the next rebuild will show.
    var nextRow = $('.rows .row'), rule = $('.masthead__rule span:last-child');
    if (rule) rule.textContent = nextRow ? nextRow.dataset.season : new Date().getFullYear();
    var note = $('.schedule-note'), signup = $('[data-subscribe][href]');
    // Write the note once; rewriting it every tick would drop keyboard focus.
    if ($('.rows') && !nextRow && note && signup && !note.dataset.empty) {
      note.innerHTML = 'The next talks are being scheduled. <a href="' + signup.getAttribute('href') + '" data-subscribe>Join the mailing list</a> for updates.';
      note.dataset.empty = '1';
    }
  }
  refreshSchedule();
  setInterval(refreshSchedule, 60000);

  /* Details are native HTML. Loading a recording is a separate action. */
  document.addEventListener('click', function(e) {
    var button = e.target.closest('.video__play');
    if (!button) return;
    var talk = button.closest('.talk');
    var video = button.closest('.video');
    if (!video.dataset.original) video.dataset.original = video.innerHTML;
    var iframe = document.createElement('iframe');
    iframe.src = 'https://www.youtube-nocookie.com/embed/' + talk.dataset.video + '?autoplay=1&rel=0';
    iframe.title = $('.talk__speaker', talk).firstChild.textContent.trim() + ' — recording';
    iframe.allow = 'accelerometer; autoplay; encrypted-media; picture-in-picture';
    iframe.referrerPolicy = 'strict-origin-when-cross-origin'; iframe.allowFullscreen = true;
    button.replaceWith(iframe);
    iframe.focus();
  });
  document.addEventListener('toggle', function(e) {
    if (!e.target.matches('.talk') || e.target.open) return;
    var video = $('.video', e.target);
    if (video && $('iframe', video)) video.innerHTML = video.dataset.original;
  }, true);
  $$('.video').forEach(function(video) { video.dataset.original = video.innerHTML; });
  function openHash() {
    var id;
    try { id = decodeURIComponent(location.hash.slice(1)); } catch(e) { return; }
    var target = document.getElementById(id);
    if (target && target.matches('.talk')) { target.open = true; target.scrollIntoView(); }
  }
  window.addEventListener('hashchange', openHash); openHash();

  /* --- Add to calendar --------------------------------------------------- */

  function icsEscape(s) {
    return String(s == null ? "" : s)
      .replace(/\\/g, "\\\\").replace(/;/g, "\\;")
      .replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
  }

  // RFC 5545 lines are folded at 75 UTF-8 bytes.
  function fold(line) {
    var result = '', count = 0;
    for (var ch of line) {
      var bytes = new TextEncoder().encode(ch).length;
      if (count + bytes > 75) { result += '\r\n '; count = 1; }
      result += ch; count += bytes;
    }
    return result;
  }

  function stamp(iso) { return iso.replace(/[-:]/g, "").replace(/\.\d{3}/, ""); }

  function calendarDescription(talk) {
    return [talk.description, talk.onlineUrl ? "Zoom: " + talk.onlineUrl : ""]
      .filter(Boolean).join("\n\n");
  }

  function singleIcs(talk) {
    var body = [calendarDescription(talk), location.href.split("#")[0]].filter(Boolean).join("\n\n");
    return [
      "BEGIN:VCALENDAR", "VERSION:2.0",
      "PRODID:-//Berkeley AI Risk//Speaker Series//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
      "BEGIN:VEVENT",
      "UID:" + talk.slug + "@ai-risk.berkeley.edu",
      "DTSTAMP:" + stamp(new Date().toISOString()),
      "DTSTART:" + stamp(talk.startUtc),
      "DTEND:" + stamp(talk.endUtc),
      fold("SUMMARY:" + icsEscape("Berkeley AI Risk — " + talk.speaker)),
      fold("DESCRIPTION:" + icsEscape(body)),
      fold("LOCATION:" + icsEscape(talk.location)),
      "END:VEVENT", "END:VCALENDAR"
    ].join("\r\n") + "\r\n";
  }

  function download(name, text) {
    var blob = new Blob([text], { type: "text/calendar;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function googleUrl(talk) {
    var p = new URLSearchParams({
      action: "TEMPLATE",
      text: "Berkeley AI Risk — " + talk.speaker,
      dates: stamp(talk.startUtc) + "/" + stamp(talk.endUtc),
      details: calendarDescription(talk),
      location: talk.location,
      ctz: "America/Los_Angeles"
    });
    return "https://calendar.google.com/calendar/render?" + p;
  }

  function outlookUrl(talk, host) {
    var p = new URLSearchParams({
      path: "/calendar/action/compose", rru: "addevent",
      subject: "Berkeley AI Risk — " + talk.speaker,
      startdt: talk.startUtc, enddt: talk.endUtc,
      body: calendarDescription(talk),
      location: talk.location
    });
    return "https://outlook." + host + "/calendar/0/deeplink/compose?" + p;
  }

  var openMenu = null;
  function closeMenu(restoreFocus) {
    if (!openMenu) return;
    $(".cal__menu", openMenu).hidden = true;
    $(".cal__btn", openMenu).setAttribute("aria-expanded", "false");
    if (restoreFocus) $(".cal__btn", openMenu).focus();
    openMenu = null;
  }

  $$(".cal").forEach(function (wrap) {
    var btn = $(".cal__btn", wrap), menu = $(".cal__menu", wrap);
    var talk = TALKS[wrap.getAttribute("data-slug")];
    if (!btn || !menu || !talk) { if (btn) btn.hidden = true; return; }

    btn.hidden = false;
    menu.innerHTML =
      '<a data-k="g" href="' + googleUrl(talk) + '" target="_blank" rel="noopener">Google Calendar</a>' +
      '<a data-k="o" href="' + outlookUrl(talk, "live.com") + '" target="_blank" rel="noopener">Outlook.com</a>' +
      '<a data-k="m" href="' + outlookUrl(talk, "office.com") + '" target="_blank" rel="noopener">Outlook 365</a>' +
      '<button type="button" data-k="i">Apple Calendar / .ics</button>' +
      (WEBCAL ? '<div class="cal__sep"></div>' +
        '<a href="' + WEBCAL + '">Subscribe to the whole series</a>' +
        '<div class="cal__note">Subscribing keeps every future talk up to date automatically.</div>' : '');

    $('[data-k="i"]', menu).addEventListener("click", function () {
      download(talk.slug + ".ics", singleIcs(talk));
      closeMenu();
    });

    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      var isOpen = openMenu === wrap;
      closeMenu();
      if (!isOpen) {
        menu.hidden = false;
        btn.setAttribute("aria-expanded", "true");
        openMenu = wrap;
      }
    });
  });

  document.addEventListener("click", function (e) {
    if (openMenu && !openMenu.contains(e.target)) closeMenu();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      closeMenu(true);
      if (nav && nav.classList.contains("is-open")) { nav.classList.remove("is-open"); burger.setAttribute("aria-expanded", "false"); burger.focus(); }
    }
  });

  /* --- Mailing list modal ------------------------------------------------ */

  var modal = $("#subscribe");

  if (modal) {
    var box = $(".modal__box", modal);
    var form = $("#sub-form", modal);
    var okPanel = $("#sub-ok", modal);
    var lastFocus = null;

    function focusables() {
      return $$("a[href], button:not([disabled]), input:not([type=hidden])", box)
        .filter(function (el) { return el.offsetParent !== null; });
    }

    function openModal(trigger) {
      lastFocus = trigger || document.activeElement;
      modal.hidden = false;
      $("#main").inert = true;
      $(".hdr").inert = true;
      $(".ftr").inert = true;
      document.body.style.overflow = "hidden";
      store("bair.sub.seen", "1");
      var f = focusables();
      if (f.length) f[Math.min(1, f.length - 1)].focus();
    }

    function closeModal() {
      modal.hidden = true;
      $("#main").inert = false;
      $(".hdr").inert = false;
      $(".ftr").inert = false;
      document.body.style.overflow = "";
      // After a successful signup, the next visitor on this page gets a fresh form.
      if (!okPanel.hidden) { form.reset(); form.hidden = false; okPanel.hidden = true; }
      // Don't greet the next opening with errors from an abandoned attempt.
      setError($("#sub-name"), ""); setError($("#sub-email"), ""); $("#sub-error").hidden = true;
      // A trigger inside the collapsed mobile menu can no longer take focus.
      var shown = function (el) { return el && el.getClientRects().length > 0; };
      var target = shown(lastFocus) ? lastFocus : shown(burger) ? burger : null;
      if (target && target.focus) target.focus();
    }

    // Delegated, so links added later (e.g. by refreshSchedule) also open the form.
    document.addEventListener("click", function (e) {
      var t = e.target.closest && e.target.closest("[data-subscribe]");
      if (!t) return;
      e.preventDefault();
      openModal(t);
    });
    $$("[data-close]", modal).forEach(function (t) {
      t.addEventListener("click", closeModal);
    });
    // Close on a backdrop click only when the press also started on the backdrop,
    // so drag-selecting text in a field and releasing outside keeps the form open.
    var pressedBackdrop = false;
    modal.addEventListener("mousedown", function (e) { pressedBackdrop = e.target === modal; });
    modal.addEventListener("click", function (e) { if (e.target === modal && pressedBackdrop) closeModal(); });

    // Listen on the document: clicking text inside the dialog moves focus to <body>.
    document.addEventListener("keydown", function (e) {
      if (modal.hidden) return;
      if (e.key === "Escape") { closeModal(); return; }
      if (e.key !== "Tab") return;
      var f = focusables();
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (!box.contains(document.activeElement)) { e.preventDefault(); (e.shiftKey ? last : first).focus(); }
      else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });

    function setError(input, msg) {
      var err = $("#" + input.id + "-err");
      input.setAttribute("aria-invalid", msg ? "true" : "false");
      if (err) { err.textContent = msg || ""; err.hidden = !msg; }
      return !msg;
    }

    /* The one place the backend is named. Swap the body of this function to
       move to Buttondown, MailerLite or anything else. */
    function submitSubscriber(values) {
      var body = new URLSearchParams();
      body.set(FORM.name, values.name);
      body.set(FORM.email, values.email);
      body.set(FORM.dept, values.dept);
      // Google Forms sends no CORS headers, so the response is opaque and
      // cannot be read. Validation therefore has to happen before this point.
      return fetch(FORM.action, { method: "POST", mode: "no-cors", body: body });
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();

      var nameEl = $("#sub-name"), mailEl = $("#sub-email"), deptEl = $("#sub-dept");
      var ok = true;
      ok = setError(nameEl, nameEl.value.trim() ? "" : "Please enter your name.") && ok;
      var mail = mailEl.value.trim();
      ok = setError(mailEl,
        !mail ? "Please enter your email address."
          : !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(mail) ? "That doesn’t look like an email address."
            : "") && ok;
      if (!ok) { (nameEl.getAttribute("aria-invalid") === "true" ? nameEl : mailEl).focus(); return; }

      // Honeypot. Answer as though it worked so a bot learns nothing.
      if ($("#sub-company").value) { form.hidden = true; okPanel.hidden = false; return; }

      var submit = $("#sub-submit");
      $("#sub-error").hidden = true;
      submit.disabled = true;
      submit.textContent = "Signing you up…";

      submitSubscriber({ name: nameEl.value.trim(), email: mail, dept: deptEl.value.trim() })
        .then(function () {
          form.hidden = true;
          okPanel.hidden = false;
          $("#sub-ok-mail").textContent = mail;
          store("bair.sub.done", "1");
          okPanel.setAttribute("tabindex", "-1");
          okPanel.focus();
        }).catch(function () {
          var error = $('#sub-error');
          error.textContent = 'Your request could not be sent. Please try again or use the Google Form below.';
          error.hidden = false;
        }).finally(function () {
          submit.disabled = false; submit.textContent = 'Sign me up';
        });
    });

  }

  document.addEventListener('click', function(e) {
    $$('.series-calendar[open]').forEach(function(menu) { if (!menu.contains(e.target)) menu.open = false; });
  });
  document.addEventListener('keydown', function(e) {
    if (e.key !== 'Escape') return;
    $$('.series-calendar[open]').forEach(function(menu) { menu.open = false; $('summary', menu).focus(); });
  });
})();
