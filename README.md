# Berkeley AI Risk website

Source for https://ai-risk.berkeley.edu/, published with GitHub Pages. Design by Evan Bright ([ebright09/BAIRS-site](https://github.com/ebright09/BAIRS-site)).

## Updating the site

Talks, reading-group sessions and site settings live in JSON files, and the HTML pages are generated from them:

- `data/talks.json`: dates, speakers, abstracts, recordings and slides.
- `data/reading-group.json`: reading sessions.
- `data/site.json`: site settings, organizers, sponsors and shared links.

Editing one of these files on github.com and committing to `main` is enough. The **Deploy static content to Pages** workflow (`.github/workflows/static.yml`) runs `node tools/build.mjs` and publishes the result. Within about an hour, new and changed talks also appear in the series' Google Calendar (see **Google Calendar** below).

To add a talk, copy an existing entry in `data/talks.json` and change every field:

- `slug`: unique; lowercase letters, digits and hyphens (`emma-pierson`). It is the talk's link anchor (`#emma-pierson`) and the name of its video thumbnail.
- `date`: `YYYY-MM-DD`. `time`: 24-hour `HH:MM`, Berkeley time (`16:00`). `durationMinutes` is usually 90.
- `title`: use `"TBA"` until it is known.
- `abstract`: the speaker's abstract, shown as written. Plain text works (separate paragraphs with `\n\n`). An abstract that starts with an HTML tag, such as `<p>…</p>`, is used as HTML. Use `null` if there isn't one yet.
- `headshot`: path to an image under `assets/speakers/`, or `null` to show the speaker's initials.
- `videoId`: the YouTube video ID, with a thumbnail at `assets/thumbs/<slug>.jpg`. `slidesUrl` is optional.

Reading-group dates and times use the same formats. The build tidies small slips such as `2026-11-7` or `9:30`. If it finds a problem it can't fix (invalid JSON, a missing speaker, an impossible date, a slug used twice), it stops without publishing: the previous site stays live, and the run shows a red ✗ in the repository's Actions tab with a message saying what to fix.

A talk becomes past after its scheduled end time. The browser moves finished talks into the archive right away, and the **Nightly rebuild** workflow (`.github/workflows/nightly.yml`) rebuilds the pages once a day. GitHub pauses scheduled workflows after 60 days without repository activity; if that happens, re-enable **Nightly rebuild** in the Actions tab. Deploys on push are not affected.

The Zoom link (`zoom` in `data/site.json`) is shown on upcoming talks and in the calendar feed. Set it to `""` to hide it everywhere.

## Building locally

The build has no dependencies and needs Node 18 or later.

```sh
node tools/build.mjs
node --check app.js
python3 -m http.server 4184 --bind 127.0.0.1
```

Then open http://127.0.0.1:4184/. When you build locally, commit the generated files along with the data. Edits made on github.com don't update the committed HTML; the workflow rebuilds it when publishing.

## Files

- `tools/build.mjs`: generates `index.html`, `reading-group.html`, `404.html`, `speaker-series.html`, `events.json` (the talks, read by the Google Calendar sync), and (when `canonical` is a domain root and `noindex` is false) `sitemap.xml` and `robots.txt`.
- `tools/google-calendar-sync.gs`: the Google Apps Script that copies talks into the series' Google Calendar (see **Google Calendar** below).
- `styles.css`: responsive visual design.
- `app.js`: calendar menus, mailing-list form, video playback and elapsed-talk handling.
- `speaker-series.html`: redirect from the address of the old speaker-series page, which is linked from emails and other sites.
- `slides/`: talk slides linked from `data/talks.json`.
- `.github/workflows/`: `static.yml` builds and deploys; `nightly.yml` starts it once a day.
- `CNAME` and `.nojekyll`: used only if Pages is switched back to "Deploy from a branch". With the GitHub Actions source, the custom domain is set in Settings → Pages.

## Publishing

Settings → Pages → Build and deployment → Source must be **GitHub Actions**. With **Deploy from a branch**, GitHub also publishes the committed files directly, in a race with the workflow, and an edit made on github.com could be overwritten by the stale committed HTML.

## Design and navigation

The home page puts the next speaker immediately after a blue-and-gold typographic masthead. Upcoming dates, affiliation, venue, Zoom access and the speaker's abstract are visible without a hover interaction. Each upcoming talk has a **Get talk updates** button, which opens the mailing-list signup, and an **Add to calendar** menu.

Past talks form a chronological index grouped by semester. Native HTML disclosure controls reveal each recording and abstract. Opening a talk does not start a video; the visitor explicitly selects the play button. Closing a talk stops its player. Direct links such as `#stuart-russell` open the corresponding archive entry.

The reading group has its own page. The sponsor row includes CDSS, Kavli, and BRSL.

## Mailing list

The custom modal opens only after a visitor requests it. It posts name, email and optional department to the existing Google Form; its field IDs are in `app.js`.

The form validates locally, includes a honeypot, traps keyboard focus, makes the background inert and returns focus when closed. Network failures show an error and allow retrying. Google Forms returns an opaque cross-origin response, so the page cannot verify acceptance. The completion message says the request was sent and explicitly avoids claiming the visitor is subscribed. A direct Google Form link remains available with or without JavaScript.

## Google Calendar

Visitors subscribe to the series' public Google Calendar, "Berkeley AI Risk Speaker Series" (`googleCalendarId` in `data/site.json`). The **Subscribe to the calendar** menu offers Google Calendar, Apple Calendar / Outlook (`webcal:`), and a link to view the calendar. Each upcoming talk also has its own Google Calendar, Outlook.com, Outlook 365 and Apple/.ics links.

The build publishes the talks as `events.json`. The Google Apps Script in `tools/google-calendar-sync.gs` reads that file every hour and, for talks that haven't ended:

- adds an event for each new talk,
- updates the title, time, location and description of talks that changed,
- deletes events it created for upcoming talks that were removed from the site.

It leaves past events, recurring events and events it didn't create alone, except that a one-off event already in the calendar at a talk's exact start time is taken over instead of duplicated.

Set it up once, signed in to a Google account that can make changes to the calendar, after the site with `events.json` is live:

1. Go to https://script.google.com and create a new project (for example, "Berkeley AI Risk calendar sync").
2. Replace the contents of `Code.gs` with the contents of `tools/google-calendar-sync.gs`, and save.
3. Choose `installHourlyTrigger` in the function menu and click **Run**. Approve the requested access to Google Calendar and to external URLs.
4. Open **Executions** and check the log, for example "Created 2, updated 0, removed 0."

The script then runs every hour under that account. If a run fails, for example while the site is unreachable, it changes nothing and Google emails the account. If the script in this repository changes, paste the new version into the project.

## Asset sources

Portraits, video thumbnails, fonts and Berkeley marks are self-hosted. YouTube is contacted only after a visitor requests playback.

- John Sherman: portrait published on https://www.guardrailnow.org/about, downloaded without alteration. CSS crops it to fit the portrait frame.

Organizer links use labeled icons for email, websites, LinkedIn and Twitter/X. Kavli uses a text wordmark.
