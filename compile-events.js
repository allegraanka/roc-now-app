#!/usr/bin/env node
/**
 * compile-events.js
 * GitHub Actions / serverless compiler: merge today's recurring Rochester
 * specials with a live public calendar feed and write public/events.json.
 */
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.dirname(fileURLToPath(import.meta.url))
const OUTPUT_PATH = path.join(ROOT, 'public', 'events.json')
const TIMEZONE = 'America/New_York'
const LIVE_FEED_URL =
  process.env.EVENT_FEED_URL ??
  'https://example.invalid/feeds/bug-jar-calendar.json'

const VENUES = {
  lux: {
    venue: 'Lux Lounge',
    address: '666 South Ave',
    lat: 43.14624,
    lng: -77.60555,
  },
  dragonfly: {
    venue: 'Dragonfly Tavern',
    address: '725 Park Ave',
    lat: 43.1475546,
    lng: -77.5764396,
  },
  bugJar: {
    venue: 'Bug Jar',
    address: '219 Monroe Ave',
    lat: 43.1500857,
    lng: -77.6001883,
  },
  radioSocial: {
    venue: 'Radio Social',
    address: '20 Carlson Rd',
    lat: 43.1504626,
    lng: -77.5614512,
  },
  montys: {
    venue: "Monty's Krown",
    address: '875 Monroe Ave',
    lat: 43.14092,
    lng: -77.58471,
  },
  oldToad: {
    venue: 'The Old Toad',
    address: '277 Alexander St',
    lat: 43.15155,
    lng: -77.59548,
  },
  tapAndMallet: {
    venue: 'Tap & Mallet',
    address: '381 Gregory St',
    lat: 43.14682,
    lng: -77.60347,
  },
}

const WEEKLY_SPECIALS = [
  {
    weekday: 'Monday',
    title: '$3 Cans at Lux',
    description: 'Tallboys three bucks all night in the South Wedge.',
    category: 'drink-special',
    startHour: 17,
    startMinute: 0,
    endHour: 23,
    endMinute: 0,
    ...VENUES.lux,
  },
  {
    weekday: 'Monday',
    title: 'Industry Night',
    description: 'Service-industry pours and a late jukebox.',
    category: 'drink-special',
    startHour: 21,
    startMinute: 0,
    endHour: 24,
    endMinute: 0,
    ...VENUES.oldToad,
  },
  {
    weekday: 'Tuesday',
    title: '$2 Tuesdays',
    description: 'Two-dollar drafts until they kick you out.',
    category: 'drink-special',
    startHour: 16,
    startMinute: 0,
    endHour: 23,
    endMinute: 0,
    ...VENUES.montys,
  },
  {
    weekday: 'Tuesday',
    title: 'Trivia Tuesday',
    description: 'Pub quiz in the front room. Teams of six.',
    category: 'trivia',
    startHour: 19,
    startMinute: 0,
    endHour: 21,
    endMinute: 30,
    ...VENUES.oldToad,
  },
  {
    weekday: 'Wednesday',
    title: 'Wing Wednesday',
    description: 'Park Ave wings and pitcher specials.',
    category: 'food-special',
    startHour: 16,
    startMinute: 0,
    endHour: 22,
    endMinute: 0,
    ...VENUES.dragonfly,
  },
  {
    weekday: 'Wednesday',
    title: 'Vinyl Night',
    description: 'Local selectors on the Monroe Ave system.',
    category: 'live-music',
    startHour: 21,
    startMinute: 0,
    endHour: 24,
    endMinute: 0,
    ...VENUES.bugJar,
  },
  {
    weekday: 'Thursday',
    title: 'Trash Plate Trivia at Dragonfly',
    description: 'Garbage-plate rounds, cheap pitchers, bragging rights.',
    category: 'trivia',
    startHour: 19,
    startMinute: 0,
    endHour: 21,
    endMinute: 30,
    ...VENUES.dragonfly,
  },
  {
    weekday: 'Thursday',
    title: 'League Night Bowling',
    description: 'Walk-up lanes and pinsetter racket.',
    category: 'bowling',
    startHour: 18,
    startMinute: 0,
    endHour: 22,
    endMinute: 0,
    ...VENUES.radioSocial,
  },
  {
    weekday: 'Friday',
    title: 'Happy Hour Cans',
    description: 'South Ave patio cans before the weekend crush.',
    category: 'drink-special',
    startHour: 16,
    startMinute: 0,
    endHour: 19,
    endMinute: 0,
    ...VENUES.lux,
  },
  {
    weekday: 'Friday',
    title: 'Friday Night DJ',
    description: 'Sweaty floor, cheap covers, last call late.',
    category: 'live-music',
    startHour: 22,
    startMinute: 0,
    endHour: 26,
    endMinute: 0,
    ...VENUES.bugJar,
  },
  {
    weekday: 'Saturday',
    title: 'Saturday Brunch Bowling',
    description: 'Lanes, coffee, and a bloody mary.',
    category: 'bowling',
    startHour: 11,
    startMinute: 0,
    endHour: 15,
    endMinute: 0,
    ...VENUES.radioSocial,
  },
  {
    weekday: 'Saturday',
    title: 'South Wedge Cask Night',
    description: 'One-off casks and a packed Gregory St bar.',
    category: 'drink-special',
    startHour: 14,
    startMinute: 0,
    endHour: 22,
    endMinute: 0,
    ...VENUES.tapAndMallet,
  },
  {
    weekday: 'Sunday',
    title: 'Funday Funday',
    description: 'Day-drink cans and a lazy South Ave patio.',
    category: 'drink-special',
    startHour: 12,
    startMinute: 0,
    endHour: 20,
    endMinute: 0,
    ...VENUES.lux,
  },
  {
    weekday: 'Sunday',
    title: 'Sunday Funday Trivia',
    description: 'Low-stakes quiz and pub pies.',
    category: 'trivia',
    startHour: 16,
    startMinute: 0,
    endHour: 18,
    endMinute: 30,
    ...VENUES.tapAndMallet,
  },
]

function pad(value) {
  return String(value).padStart(2, '0')
}

function compositeId(venue, title) {
  const key = `${venue.trim().toLowerCase()}::${title.trim().toLowerCase()}`
  return createHash('sha256').update(key).digest('hex').slice(0, 16)
}

function formatParts(date, options) {
  const map = {}
  for (const part of new Intl.DateTimeFormat('en-US', options).formatToParts(date)) {
    if (part.type !== 'literal') map[part.type] = part.value
  }
  return map
}

function rochesterCalendar(now = new Date()) {
  const parts = formatParts(now, {
    timeZone: TIMEZONE,
    weekday: 'long',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  return {
    weekday: parts.weekday,
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    ymd: `${parts.year}-${parts.month}-${parts.day}`,
  }
}

function timeZoneOffsetMs(instant, timeZone) {
  const parts = formatParts(instant, {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
  const hour = parts.hour === '24' ? 0 : Number(parts.hour)
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    hour,
    Number(parts.minute),
    Number(parts.second),
  )
  return asUtc - instant.getTime()
}

function wallClockToDate(year, month, day, hour, minute) {
  const totalMinutes = hour * 60 + minute
  const carryDays = Math.floor(totalMinutes / (24 * 60))
  const minutesInDay = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60)
  const clockHour = Math.floor(minutesInDay / 60)
  const clockMinute = minutesInDay % 60
  const base = Date.UTC(year, month - 1, day + carryDays, clockHour, clockMinute, 0)
  let utc = base
  for (let i = 0; i < 3; i += 1) {
    const offset = timeZoneOffsetMs(new Date(utc), TIMEZONE)
    utc = base - offset
  }
  return new Date(utc)
}

function toEvent(record, calendar, source) {
  const start = wallClockToDate(
    calendar.year,
    calendar.month,
    calendar.day,
    record.startHour,
    record.startMinute ?? 0,
  )
  const end = wallClockToDate(
    calendar.year,
    calendar.month,
    calendar.day,
    record.endHour,
    record.endMinute ?? 0,
  )

  return {
    id: compositeId(record.venue, record.title),
    title: record.title,
    venue: record.venue,
    address: record.address,
    category: record.category,
    coordinates: {
      lat: record.lat,
      lng: record.lng,
    },
    startTime: start.toISOString(),
    endTime: end.toISOString(),
    weekday: calendar.weekday,
    source,
    description: record.description ?? '',
  }
}

function recurringEventsForToday(calendar) {
  return WEEKLY_SPECIALS.filter((special) => special.weekday === calendar.weekday).map(
    (special) => toEvent(special, calendar, 'recurring'),
  )
}

function stubLiveFeed(calendar) {
  return [
    {
      title: 'Garage Rock: The Retro Jets',
      description: "Monroe Ave's favorite dive-stage bill.",
      category: 'live-music',
      startHour: 21,
      startMinute: 0,
      endHour: 24,
      endMinute: 0,
      ...VENUES.bugJar,
    },
    {
      title: 'Soul & Funk Dance Night',
      description: 'DJs spinning 60s-80s vinyl after the last frame.',
      category: 'live-music',
      startHour: 21,
      startMinute: 30,
      endHour: 25,
      endMinute: 0,
      ...VENUES.radioSocial,
    },
    {
      title: '$3 Cans at Lux',
      description: 'Stub duplicate of the Monday recurring special.',
      category: 'drink-special',
      startHour: 17,
      startMinute: 0,
      endHour: 23,
      endMinute: 0,
      ...VENUES.lux,
    },
  ].map((record) => toEvent(record, calendar, 'live'))
}

function normalizeLivePayload(payload, calendar) {
  const rows = Array.isArray(payload) ? payload : payload?.events
  if (!Array.isArray(rows)) return stubLiveFeed(calendar)

  return rows
    .map((row) => {
      const venueMeta =
        Object.values(VENUES).find(
          (item) => item.venue.toLowerCase() === String(row.venue ?? '').toLowerCase(),
        ) ?? VENUES.bugJar

      return toEvent(
        {
          title: row.title,
          description: row.description ?? '',
          category: row.category ?? 'live-music',
          startHour: Number(row.startHour ?? 20),
          startMinute: Number(row.startMinute ?? 0),
          endHour: Number(row.endHour ?? 23),
          endMinute: Number(row.endMinute ?? 0),
          ...venueMeta,
          venue: row.venue ?? venueMeta.venue,
          address: row.address ?? venueMeta.address,
          lat: Number(row.lat ?? venueMeta.lat),
          lng: Number(row.lng ?? venueMeta.lng),
        },
        calendar,
        'live',
      )
    })
    .filter((event) => event.title && event.venue)
}

async function fetchLiveFeed(calendar) {
  try {
    const response = await fetch(LIVE_FEED_URL, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    })
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    return normalizeLivePayload(await response.json(), calendar)
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    console.warn(`Live feed unavailable (${LIVE_FEED_URL}): ${reason}`)
    console.warn('Using stub Bug Jar / Radio Social calendar placeholder.')
    return stubLiveFeed(calendar)
  }
}

function mergeEvents(liveEvents, recurringEvents) {
  const seen = new Set()
  const merged = []

  for (const event of [...liveEvents, ...recurringEvents]) {
    if (seen.has(event.id)) continue
    seen.add(event.id)
    merged.push(event)
  }

  return merged.sort((a, b) => a.startTime.localeCompare(b.startTime))
}

async function main() {
  const calendar = rochesterCalendar()
  const recurring = recurringEventsForToday(calendar)
  const live = await fetchLiveFeed(calendar)
  const events = mergeEvents(live, recurring)

  const payload = {
    generatedAt: new Date().toISOString(),
    timezone: TIMEZONE,
    day: calendar.weekday,
    date: calendar.ymd,
    count: events.length,
    events,
  }

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true })
  fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')

  console.log(
    `Compiled ${events.length} events for ${calendar.weekday} ${calendar.ymd} -> ${OUTPUT_PATH}`,
  )
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
