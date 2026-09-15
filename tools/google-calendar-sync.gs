/**
 * Berkeley AI Risk — keep the series' Google Calendar in step with the website.
 *
 * Runs in Google Apps Script (https://script.google.com) under a Google account
 * that can make changes to the calendar. Setup: README.md, "Google Calendar".
 *
 * Each run reads the talks the website publishes (events.json) and, for talks
 * that haven't ended yet:
 *   - adds a calendar event for each new talk,
 *   - updates the title, time, location and description when they change,
 *   - deletes events this script created for upcoming talks no longer on the site.
 * Past events, recurring events and events it didn't create are left alone,
 * except that a one-off event already at a talk's exact start time is taken over
 * rather than duplicated.
 */

const FEED_URL = 'https://ai-risk.berkeley.edu/events.json';
const TAG = 'bairsSlug'; // marks the events this script manages

function syncTalks() {
  const response = UrlFetchApp.fetch(`${FEED_URL}?t=${Date.now()}`, { muteHttpExceptions: true });
  if (response.getResponseCode() !== 200) {
    throw new Error(`Could not read ${FEED_URL} (HTTP ${response.getResponseCode()}). Nothing was changed.`);
  }
  const feed = JSON.parse(response.getContentText());
  if (!Array.isArray(feed.events) || feed.events.length === 0) {
    throw new Error('The website lists no talks. Nothing was changed.');
  }

  const calendar = CalendarApp.getCalendarById(feed.calendar);
  if (!calendar) throw new Error(`This account can't open the calendar ${feed.calendar}.`);

  const now = new Date();
  const upcoming = feed.events.filter((talk) => new Date(talk.end) > now);
  const onSite = new Set(upcoming.map((talk) => talk.slug));

  // Events that haven't ended, and the ones among them this script manages.
  const nearby = calendar.getEvents(now, new Date(now.getTime() + 3 * 365 * 24 * 3600 * 1000));
  const managed = new Map();
  for (const event of nearby) {
    const slug = event.getTag(TAG);
    if (!slug) continue;
    if (managed.has(slug)) event.deleteEvent(); // a duplicate left by an interrupted run
    else managed.set(slug, event);
  }

  let created = 0, updated = 0, removed = 0;
  for (const talk of upcoming) {
    const start = new Date(talk.start);
    const end = new Date(talk.end);
    let event = managed.get(talk.slug);

    if (!event) {
      event = nearby.find((e) => !e.getTag(TAG) && !e.isRecurringEvent() && !e.isAllDayEvent()
        && e.getStartTime().getTime() === start.getTime());
      if (event) event.setTag(TAG, talk.slug);
    }
    if (!event) {
      calendar.createEvent(talk.title, start, end, { description: talk.description, location: talk.location })
        .setTag(TAG, talk.slug);
      created++;
      continue;
    }

    let changed = false;
    if (event.getTitle() !== talk.title) { event.setTitle(talk.title); changed = true; }
    if (event.getDescription() !== talk.description) { event.setDescription(talk.description); changed = true; }
    if (event.getLocation() !== talk.location) { event.setLocation(talk.location); changed = true; }
    if (event.getStartTime().getTime() !== start.getTime() || event.getEndTime().getTime() !== end.getTime()) {
      event.setTime(start, end);
      changed = true;
    }
    if (changed) updated++;
  }

  for (const [slug, event] of managed) {
    if (!onSite.has(slug) && event.getStartTime() > now) {
      event.deleteEvent();
      removed++;
    }
  }

  console.log(`Created ${created}, updated ${updated}, removed ${removed}.`);
}

/** Run once after pasting the script: syncs now, then every hour. */
function installHourlyTrigger() {
  for (const trigger of ScriptApp.getProjectTriggers()) {
    if (trigger.getHandlerFunction() === 'syncTalks') ScriptApp.deleteTrigger(trigger);
  }
  ScriptApp.newTrigger('syncTalks').timeBased().everyHours(1).create();
  syncTalks();
}
