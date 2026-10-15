/**
 * Berkeley AI Risk — keep the series' Google Calendar in step with the website.
 *
 * Runs in Google Apps Script (https://script.google.com) under a Google account
 * that can make changes to the calendar. Setup: README.md, "Google Calendar".
 *
 * Each run reads the talks the website publishes (events.json) and, for talks
 * that haven't ended yet:
 *   - adds an event for each new talk and invites the guests,
 *   - invites guests who are missing from an event it already made,
 *   - changes a title, abstract or venue quietly, without emailing anyone,
 *   - emails the guests when a talk moves to a new date or time, or is cancelled,
 *   - deletes events it created for upcoming talks no longer on the site.
 * Past events, recurring events and events it didn't create are left alone,
 * except that a one-off event already at a talk's exact start time is taken over
 * rather than duplicated.
 *
 * Project Settings -> Script properties:
 *   guests   who to invite, comma separated, e.g.
 *            "ai-risk-announce@lists.berkeley.edu, wfithian@berkeley.edu".
 *            Unset means events are created with no guests.
 *   dryRun   set to "1" to log what a run would change without changing it.
 *
 * Services -> "Google Calendar API" must be added. That service is what allows
 * sending or withholding guest email for each kind of change.
 */

const FEED_URL = 'https://ai-risk.berkeley.edu/events.json';
const TAG = 'bairsSlug';          // marks the events this script manages
const TIME_ZONE = 'America/Los_Angeles';
const YEARS_AHEAD = 3;

function settings() {
  const props = PropertiesService.getScriptProperties();
  return {
    guests: (props.getProperty('guests') || '').split(',').map((s) => s.trim()).filter(Boolean),
    dryRun: props.getProperty('dryRun') === '1',
  };
}

function syncTalks() {
  if (typeof Calendar === 'undefined') {
    throw new Error('Add the "Google Calendar API" service to this project (Services, then +), then run again.');
  }
  const { guests, dryRun } = settings();
  const note = dryRun ? 'Would have: ' : '';

  const response = UrlFetchApp.fetch(`${FEED_URL}?t=${Date.now()}`, { muteHttpExceptions: true });
  if (response.getResponseCode() !== 200) {
    throw new Error(`Could not read ${FEED_URL} (HTTP ${response.getResponseCode()}). Nothing was changed.`);
  }
  const feed = JSON.parse(response.getContentText());
  if (!Array.isArray(feed.events) || feed.events.length === 0) {
    throw new Error('The website lists no talks. Nothing was changed.');
  }
  const calendarId = feed.calendar;

  const now = new Date();
  const upcoming = feed.events.filter((talk) => new Date(talk.end) > now);
  const onSite = new Set(upcoming.map((talk) => talk.slug));
  const horizon = new Date(now.getTime() + YEARS_AHEAD * 365 * 24 * 3600 * 1000);
  const nearby = listEvents(calendarId, now, horizon);

  const managed = new Map();
  let created = 0, invited = 0, changed = 0, moved = 0, removed = 0;
  for (const event of nearby) {
    const slug = tagOf(event);
    if (!slug) continue;
    if (managed.has(slug)) {            // a duplicate left by an interrupted run
      if (!dryRun) Calendar.Events.remove(calendarId, event.id, { sendUpdates: 'none' });
      removed++;
    } else {
      managed.set(slug, event);
    }
  }

  for (const talk of upcoming) {
    let event = managed.get(talk.slug);
    if (!event) {
      event = nearby.find((e) => !tagOf(e) && !e.recurringEventId && e.start && e.start.dateTime
        && new Date(e.start.dateTime).getTime() === new Date(talk.start).getTime());
    }

    if (!event) {
      const resource = {
        summary: talk.title,
        description: talk.description,
        location: talk.location,
        start: { dateTime: talk.start, timeZone: TIME_ZONE },
        end: { dateTime: talk.end, timeZone: TIME_ZONE },
        attendees: guests.map((email) => ({ email })),
        guestsCanSeeOtherGuests: false,
        guestsCanInviteOthers: false,
        extendedProperties: { private: { [TAG]: talk.slug } },
      };
      if (!dryRun) Calendar.Events.insert(resource, calendarId, { sendUpdates: 'all' });
      console.log(`${note}added ${talk.slug}${guests.length ? ` and invited ${guests.join(', ')}` : ''}`);
      created++;
      continue;
    }

    // What differs from the website?
    const patch = {};
    if (!tagOf(event)) patch.extendedProperties = { private: { [TAG]: talk.slug } };
    if (event.summary !== talk.title) patch.summary = talk.title;
    if ((event.description || '') !== talk.description) patch.description = talk.description;
    if ((event.location || '') !== talk.location) patch.location = talk.location;

    const movedInTime = !event.start || !event.start.dateTime
      || new Date(event.start.dateTime).getTime() !== new Date(talk.start).getTime()
      || new Date(event.end.dateTime).getTime() !== new Date(talk.end).getTime();
    if (movedInTime) {
      patch.start = { dateTime: talk.start, timeZone: TIME_ZONE };
      patch.end = { dateTime: talk.end, timeZone: TIME_ZONE };
    }

    const already = new Set((event.attendees || []).map((a) => String(a.email).toLowerCase()));
    const missing = guests.filter((email) => !already.has(email.toLowerCase()));
    if (missing.length) {
      patch.attendees = (event.attendees || []).concat(missing.map((email) => ({ email })));
      patch.guestsCanSeeOtherGuests = false;
      patch.guestsCanInviteOthers = false;
    }
    if (!Object.keys(patch).length) continue;

    // Email the guests only when the plan changed or someone is newly invited.
    const sendUpdates = (movedInTime || missing.length) ? 'all' : 'none';
    if (!dryRun) Calendar.Events.patch(patch, calendarId, event.id, { sendUpdates });
    if (missing.length) {
      console.log(`${note}invited ${missing.join(', ')} to ${talk.slug}`);
      invited++;
    }
    if (movedInTime) {
      console.log(`${note}moved ${talk.slug} to ${talk.start} and told the guests`);
      moved++;
    } else if (!missing.length) {
      console.log(`${note}updated ${talk.slug} quietly (${Object.keys(patch).join(', ')})`);
      changed++;
    }
  }

  for (const [slug, event] of managed) {
    if (onSite.has(slug)) continue;
    if (new Date(event.start.dateTime || event.start.date) <= now) continue;   // already happened
    if (!dryRun) Calendar.Events.remove(calendarId, event.id, { sendUpdates: 'all' });
    console.log(`${note}cancelled ${slug} and told the guests`);
    removed++;
  }

  const summary = `${note}Added ${created}, invited ${invited}, updated ${changed}, moved ${moved}, removed ${removed}.`;
  console.log(summary);
  return summary;
}

/** All one-off events between two times, including ones this script doesn't manage. */
function listEvents(calendarId, from, to) {
  const items = [];
  let pageToken;
  do {
    const page = Calendar.Events.list(calendarId, {
      timeMin: from.toISOString(),
      timeMax: to.toISOString(),
      singleEvents: true,
      showDeleted: false,
      maxResults: 2500,
      pageToken,
    });
    items.push(...(page.items || []));
    pageToken = page.nextPageToken;
  } while (pageToken);
  return items;
}

function tagOf(event) {
  return event.extendedProperties && event.extendedProperties.private
    ? event.extendedProperties.private[TAG] || null
    : null;
}

/** Run once after pasting this script: syncs now, then every hour. */
function installHourlyTrigger() {
  for (const trigger of ScriptApp.getProjectTriggers()) {
    if (trigger.getHandlerFunction() === 'syncTalks') ScriptApp.deleteTrigger(trigger);
  }
  ScriptApp.newTrigger('syncTalks').timeBased().everyHours(1).create();
  syncTalks();
}
