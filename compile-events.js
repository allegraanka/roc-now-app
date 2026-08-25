#!/usr/bin/env node
/**
 * compile-events.js
 * Merge today's recurring Rochester bar deals with a short, manually
 * vetted list of venue feeds and write public/events.json.
 */
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Parser from 'rss-parser'

const ROOT = path.dirname(fileURLToPath(import.meta.url))
const OUTPUT_PATH = path.join(ROOT, 'public', 'events.json')
const TIMEZONE = 'America/New_York'

const VETTED_SOURCES = [
  {
    name: 'The Little Theatre',
    category: 'Movies',
    url: 'https://thelittle.org/category/films/nowplaying/feed/',
    extraUrls: ['https://thelittle.org/category/event/upcoming-event/feed/'],
    neighborhood: 'East End',
    lat: 43.1544,
    lng: -77.5959,
    venue: 'The Little Theatre',
    address: '240 East Ave',
    scrapeShowtimes: true,
  },
  {
    name: 'Rochester Contemporary Art Center',
    category: 'Art',
    url: 'https://www.rochestercontemporary.org/events/feed/',
    neighborhood: 'East End',
    lat: 43.1551,
    lng: -77.5982,
    venue: 'Rochester Contemporary Art Center',
    address: '137 East Ave',
  },
  {
    name: 'Local Live Music',
    category: 'Live Music',
    url: 'https://placeholder.local/rochester-live-music.xml',
    neighborhood: 'Neighborhood of the Arts',
    lat: 43.1579,
    lng: -77.6017,
    placeholder: true,
  },
]

const rssParser = new Parser({
  customFields: {
    item: [
      ['geo:lat', 'geoLat'],
      ['geo:long', 'geoLng'],
      'category',
    ],
  },
})

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
  vertex: {
    venue: 'Vertex',
    address: '169 N Chestnut St',
    lat: 43.16135,
    lng: -77.61052,
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
    title: 'AngstLAB, $3 cover, drink specials all night',
    description: 'Goth/industrial night. Cheap wells until last call.',
    category: 'drink-special',
    startHour: 22,
    startMinute: 0,
    endHour: 26,
    endMinute: 0,
    ...VENUES.vertex,
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
    title: 'Darkwave Dance Night',
    description: 'Fog, mirrors, and $3 wells on the Chestnut St floor.',
    category: 'live-music',
    startHour: 22,
    startMinute: 0,
    endHour: 26,
    endMinute: 0,
    ...VENUES.vertex,
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
    title: 'Industrial Saturday',
    description: 'Vertex late-night industrial set. Cover stays cheap.',
    category: 'live-music',
    startHour: 22,
    startMinute: 0,
    endHour: 26,
    endMinute: 0,
    ...VENUES.vertex,
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

const MONTHS = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
}

function compositeId(venue, title, occurrenceKey) {
  const key = [venue, title, occurrenceKey]
    .map((value) =>
      String(value ?? '')
        .normalize('NFKD')
        .toLowerCase()
        .replace(/[^\w\s:.-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim(),
    )
    .join('::')
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

function cleanText(value) {
  return String(value ?? '')
    .replace(/<!\[CDATA\[|\]\]>/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#8211;|&#8212;|&ndash;|&mdash;/g, '-')
    .replace(/&#038;/g, '&')
    .replace(/&#8220;|&#8221;|&ldquo;|&rdquo;/g, '"')
    .replace(/&#8216;|&#8217;|&lsquo;|&rsquo;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

function parseClock(text) {
  const match = String(text).match(/\b(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)\b/i)
  if (!match) return null
  let hour = Number(match[1])
  const minute = Number(match[2] ?? 0)
  const meridiem = match[3].toLowerCase().replace(/\./g, '')
  if (meridiem === 'pm' && hour < 12) hour += 12
  if (meridiem === 'am' && hour === 12) hour = 0
  return { hour, minute }
}

function categorize(title, description, fallback = 'Event') {
  const text = `${title} ${description}`.toLowerCase()
  if (/\b(film|movie|screening|cinema|35mm|showtimes?)\b/.test(text)) return 'Movies'
  if (/\b(music|band|concert|dj|recital|jazz|orchestra|choir|symphony|gig|live music)\b/.test(text)) {
    return 'Live Music'
  }
  if (/\b(comedy|standup|stand-up)\b/.test(text)) return 'Comedy'
  if (/\b(trivia)\b/.test(text)) return 'Trivia'
  if (/\b(art|exhibit|gallery|museum)\b/.test(text)) return 'Arts'
  if (/\b(food|dinner|brunch|beer|wine|tasting)\b/.test(text)) return 'Food & Drink'
  return fallback
}

function inferVenue(title, description, feed) {
  const blob = `${title} ${description}`
  const match = blob.match(/\bat\s+([A-Z][^.,|\n]{2,50})/)
  if (match) return match[1].replace(/\s{2,}/g, ' ').trim()
  return feed.venue || feed.name
}

function dateRangeIncludesToday(text, calendar) {
  const match = String(text).match(
    /(\d{1,2})\/(\d{1,2})\/(\d{4})\s+to\s+(\d{1,2})\/(\d{1,2})\/(\d{4})/i,
  )
  if (!match) return false
  const start = Date.UTC(Number(match[3]), Number(match[1]) - 1, Number(match[2]))
  const end = Date.UTC(Number(match[6]), Number(match[4]) - 1, Number(match[5]))
  const today = Date.UTC(calendar.year, calendar.month - 1, calendar.day)
  return today >= start && today <= end
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
  const title = cleanText(record.title)
  const venue = cleanText(record.venue)

  return {
    id: compositeId(venue, title, start.toISOString()),
    title,
    venue,
    address: record.address || '',
    neighborhood: record.neighborhood || '',
    category: record.category,
    coordinates: {
      lat: record.lat,
      lng: record.lng,
    },
    startTime: start.toISOString(),
    endTime: end.toISOString(),
    weekday: calendar.weekday,
    source,
    link: record.link ?? '',
    description: cleanText(record.description ?? ''),
  }
}

function recurringEventsForToday(calendar) {
  return WEEKLY_SPECIALS.filter((special) => special.weekday === calendar.weekday).map(
    (special) => toEvent(special, calendar, 'recurring'),
  )
}

function parseRuntimeMinutes(html) {
  const text = cleanText(html)
  const match = text.match(/(\d+)\s*hr[s]?\s*(\d+)\s*min/i) || text.match(/(\d+)\s*hr[s]?/i)
  if (!match) return 150
  return Number(match[1]) * 60 + Number(match[2] ?? 0)
}

function parseLittleShowtimesFromHtml(html, calendar) {
  const heading =
    /<h4[^>]*>\s*(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})\s*<\/h4>\s*<p[^>]*>([\s\S]*?)<\/p>/gi
  const clocks = []
  for (const match of html.matchAll(heading)) {
    const month = MONTHS[match[2].toLowerCase()]
    const day = Number(match[3])
    const ymd = `${calendar.year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    if (ymd !== calendar.ymd) continue
    for (const timeMatch of match[4].matchAll(/(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)/gi)) {
      const clock = parseClock(timeMatch[0])
      if (clock) clocks.push(clock)
    }
  }
  return clocks
}

async function fetchText(url, accept) {
  const response = await fetch(url, {
    headers: {
      Accept: accept,
      'User-Agent': 'ROCNow/1.0 (Rochester events compiler)',
    },
    signal: AbortSignal.timeout(15000),
  })
  if (!response.ok) throw new Error(`${url} HTTP ${response.status}`)
  return response.text()
}

async function fetchRss(url) {
  return rssParser.parseString(
    await fetchText(url, 'application/rss+xml, application/xml, text/xml, */*'),
  )
}

function itemIsToday(item, calendar) {
  const description = cleanText(item.contentSnippet || item.content || item.description)
  const title = cleanText(item.title)
  const blob = `${title} ${description}`
  if (dateRangeIncludesToday(blob, calendar)) return true

  const pattern =
    /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\.?\s+(\d{1,2})\b/gi
  for (const match of blob.matchAll(pattern)) {
    const month = MONTHS[match[1].toLowerCase().replace(/\./g, '')]
    const day = Number(match[2])
    const ymd = `${calendar.year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    if (ymd === calendar.ymd) return true
  }
  return false
}

function mapRssItem(item, feed, calendar) {
  const title = cleanText(item.title)
  const description = cleanText(item.contentSnippet || item.content || item.description)
  if (!itemIsToday(item, calendar)) return null

  const clock = parseClock(`${title} ${description}`) ?? { hour: 19, minute: 0 }
  const venue = inferVenue(title, description, feed)
  return toEvent(
    {
      title,
      description,
      category: cleanText(categorize(title, description, feed.category)),
      startHour: clock.hour,
      startMinute: clock.minute,
      endHour: clock.hour + 2,
      endMinute: clock.minute,
      venue,
      address: feed.address || feed.neighborhood,
      neighborhood: feed.neighborhood,
      lat: Number(item.geoLat) || feed.lat,
      lng: Number(item.geoLng) || feed.lng,
      link: item.link,
    },
    calendar,
    feed.name,
  )
}

async function ingestLittleTheatre(feed, calendar) {
  const events = []
  const nowPlaying = await fetchRss(feed.url)

  const pages = await Promise.allSettled(
    (nowPlaying.items ?? []).map(async (item) => {
      if (!item.link) return []
      const html = await fetchText(item.link, 'text/html')
      const runtime = parseRuntimeMinutes(html)
      const clocks = parseLittleShowtimesFromHtml(html, calendar)
      const title = cleanText(item.title)
      const description = cleanText(item.contentSnippet || item.content || item.description)
      return clocks.map((clock) =>
        toEvent(
          {
            title,
            description,
            category: categorize(title, description, feed.category),
            startHour: clock.hour,
            startMinute: clock.minute,
            endHour: clock.hour,
            endMinute: clock.minute + runtime,
            venue: feed.venue,
            address: feed.address,
            neighborhood: feed.neighborhood,
            lat: feed.lat,
            lng: feed.lng,
            link: item.link,
          },
          calendar,
          feed.name,
        ),
      )
    }),
  )

  for (const result of pages) {
    if (result.status === 'fulfilled') events.push(...result.value)
    else console.warn(`Little Theatre film page failed: ${result.reason}`)
  }

  for (const extraUrl of feed.extraUrls ?? []) {
    try {
      const specials = await fetchRss(extraUrl)
      for (const item of specials.items ?? []) {
        const mapped = mapRssItem(item, feed, calendar)
        if (mapped) {
          mapped.category = categorize(mapped.title, mapped.description, mapped.category)
          events.push(mapped)
        }
      }
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error)
      console.warn(`Little Theatre extra feed failed: ${reason}`)
    }
  }

  return events
}

async function ingestFeed(source, calendar) {
  if (source.placeholder || !source.url) return []
  if (source.scrapeShowtimes) return ingestLittleTheatre(source, calendar)

  const parsed = await fetchRss(source.url)
  return (parsed.items ?? []).map((item) => mapRssItem(item, source, calendar)).filter(Boolean)
}

function mergeEvents(...groups) {
  const seen = new Set()
  const merged = []
  for (const event of groups.flat()) {
    if (!event?.id || seen.has(event.id)) continue
    seen.add(event.id)
    merged.push(event)
  }
  return merged.sort((a, b) => a.startTime.localeCompare(b.startTime))
}

async function main() {
  const calendar = rochesterCalendar()
  const recurring = recurringEventsForToday(calendar)
  const live = []

  for (const source of VETTED_SOURCES) {
    try {
      const events = await ingestFeed(source, calendar)
      console.log(`${source.name}: ${events.length} event(s) for ${calendar.ymd}`)
      live.push(...events)
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error)
      console.warn(`${source.name} failed: ${reason}`)
    }
  }

  const events = mergeEvents(recurring, live)
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
