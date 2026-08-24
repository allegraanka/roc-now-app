import { Fragment, useEffect, useMemo, useState } from 'react'

const HOUR_MS = 60 * 60 * 1000
const SOON_WINDOW_MS = 3 * HOUR_MS
const EARTH_RADIUS_MILES = 3958.7613

const BUCKETS = [
  {
    id: 'now',
    label: 'Happening Now',
    code: '01 LIVE',
    fill: 'bg-[#FF9EC8]',
    chip: 'bg-[#FF5FA8]',
  },
  {
    id: 'soon',
    label: 'Starting Soon',
    code: '02 SOON',
    fill: 'bg-[#FFB347]',
    chip: 'bg-[#FF8A1F]',
  },
  {
    id: 'later',
    label: 'Later Tonight',
    code: '03 NITE',
    fill: 'bg-[#5CE1FF]',
    chip: 'bg-[#00B8E6]',
  },
]

function deriveBucket(startTime, endTime, now) {
  const start = startTime.getTime()
  const end = endTime.getTime()
  if (now >= start && now < end) return 'now'
  if (start > now && start - now <= SOON_WINDOW_MS) return 'soon'
  if (start > now) return 'later'
  return null
}

function normalizeEvents(payload) {
  const rows = Array.isArray(payload) ? payload : payload?.events
  if (!Array.isArray(rows)) return []

  return rows
    .map((row) => {
      const startTime = new Date(row.startTime)
      const endTime = new Date(row.endTime)
      if (Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime())) return null

      return {
        id: row.id,
        title: row.title,
        description: row.description ?? '',
        venue: row.venue,
        address: row.address,
        neighborhood: row.neighborhood ?? String(row.category ?? '').replace(/-/g, ' '),
        lat: Number(row.coordinates?.lat ?? row.lat),
        lng: Number(row.coordinates?.lng ?? row.lng),
        startTime,
        endTime,
      }
    })
    .filter((event) => event && event.id && event.title && Number.isFinite(event.lat) && Number.isFinite(event.lng))
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
}

function toRadians(degrees) {
  return (degrees * Math.PI) / 180
}

function haversineMiles(lat1, lng1, lat2, lng2) {
  const dLat = toRadians(lat2 - lat1)
  const dLng = toRadians(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return EARTH_RADIUS_MILES * c
}

function formatClock(date) {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatCountdown(ms) {
  if (ms <= 0) return 'ENDED'
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function formatMiles(miles) {
  if (miles < 0.1) return '<0.1MI'
  return `${miles.toFixed(1)}MI`
}

function StatusBadge({ bucketId, label }) {
  const isLive = bucketId === 'now'

  if (isLive) {
    return (
      <span className="inline-flex shrink-0 items-center gap-2 border-4 border-black bg-black px-2 py-1 text-[10px] font-bold tracking-widest text-[#FF9EC8] uppercase">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping bg-[#FF5FA8]" />
          <span className="relative inline-flex h-2.5 w-2.5 bg-[#FF9EC8]" />
        </span>
        {label}
      </span>
    )
  }

  if (bucketId === 'soon') {
    return (
      <span className="inline-flex shrink-0 border-4 border-black bg-[#FF8A1F] px-2 py-1 text-[10px] font-bold tracking-widest text-black uppercase">
        {label}
      </span>
    )
  }

  return (
    <span className="inline-flex shrink-0 border-4 border-black bg-[#00B8E6] px-2 py-1 text-[10px] font-bold tracking-widest text-black uppercase">
      {label}
    </span>
  )
}

function EventCard({ event, userLocation, now }) {
  const bucket = BUCKETS.find((item) => item.id === event.bucket)
  const isLive = event.bucket === 'now'
  const miles =
    userLocation != null
      ? haversineMiles(userLocation.lat, userLocation.lng, event.lat, event.lng)
      : null

  return (
    <article
      className={`border-4 border-black p-4 shadow-[8px_8px_0_0_#111] ${bucket.fill}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold tracking-[0.22em] text-black uppercase">
            {event.neighborhood}
          </p>
          <h3 className="mt-1 text-lg leading-tight font-bold text-black uppercase">
            {event.title}
          </h3>
        </div>
        <StatusBadge bucketId={event.bucket} label={bucket.label} />
      </div>

      <p className="mt-3 text-sm leading-snug font-medium text-black">{event.description}</p>

      <div className="mt-4 grid grid-cols-1 gap-2">
        <div className="border-4 border-black bg-white px-3 py-2">
          <p className="text-[10px] font-bold tracking-widest text-black/50 uppercase">Venue</p>
          <p className="text-sm font-bold text-black uppercase">{event.venue}</p>
          <p className="text-xs text-black">{event.address}</p>
        </div>
        <div className="flex gap-2">
          <div className="min-w-0 flex-1 border-4 border-black bg-white px-3 py-2">
            <p className="text-[10px] font-bold tracking-widest text-black/50 uppercase">Window</p>
            <p className="text-sm font-bold text-black">
              {formatClock(event.startTime)}-{formatClock(event.endTime)}
            </p>
          </div>
          {miles != null && (
            <div className="min-w-0 flex-1 border-4 border-black bg-white px-3 py-2">
              <p className="text-[10px] font-bold tracking-widest text-black/50 uppercase">GPS</p>
              <p className="text-sm font-bold text-black">{formatMiles(miles)}</p>
            </div>
          )}
        </div>
      </div>

      {isLive && (
        <p className="mt-3 border-4 border-black bg-black px-3 py-2 text-sm font-bold tracking-widest text-[#FF9EC8] uppercase">
          Ends in {formatCountdown(event.endTime.getTime() - now)}
          <span className="ml-1 inline-block h-4 w-2 animate-pulse bg-[#FF9EC8] align-middle" />
        </p>
      )}
    </article>
  )
}

function AdPlaceholder() {
  return (
    <aside
      className="flex min-h-[104px] items-center justify-center border-4 border-dashed border-gray-400 bg-gray-200 px-4 text-center text-xs font-bold tracking-[0.18em] text-gray-500 uppercase shadow-[8px_8px_0_0_#9CA3AF]"
      aria-label="Advertisement"
    >
      Programmatic Native Ad Unit
    </aside>
  )
}

export default function App() {
  const [events, setEvents] = useState([])
  const [now, setNow] = useState(() => Date.now())
  const [userLocation, setUserLocation] = useState(null)

  useEffect(() => {
    const controller = new AbortController()

    fetch('/events.json', { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`Failed to load events (${response.status})`)
        return response.json()
      })
      .then((payload) => {
        setEvents(normalizeEvents(payload))
      })
      .catch((error) => {
        if (error.name === 'AbortError') return
        setEvents([])
      })

    return () => controller.abort()
  }, [])

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    if (!navigator.geolocation) return undefined

    const applyPosition = (position) => {
      setUserLocation({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      })
    }

    navigator.geolocation.getCurrentPosition(applyPosition, () => {}, {
      enableHighAccuracy: false,
      timeout: 8000,
      maximumAge: 15_000,
    })

    const watchId = navigator.geolocation.watchPosition(
      applyPosition,
      () => {},
      { enableHighAccuracy: true, timeout: 20_000, maximumAge: 0 },
    )

    return () => navigator.geolocation.clearWatch(watchId)
  }, [])

  const timeline = useMemo(
    () =>
      events
        .map((event) => ({
          ...event,
          bucket: deriveBucket(event.startTime, event.endTime, now),
        }))
        .filter((event) => event.bucket != null),
    [events, now],
  )

  const grouped = useMemo(
    () =>
      BUCKETS.map((bucket) => ({
        ...bucket,
        events: timeline.filter((event) => event.bucket === bucket.id),
      })),
    [timeline],
  )

  const todayLabel = new Date(now).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
  const clockLabel = new Date(now).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  })

  return (
    <div className="min-h-svh bg-[#F4EFE4] font-mono text-left text-black">
      <header className="sticky top-0 z-10 border-b-4 border-black bg-[#C8FF00]">
        <div className="mx-auto w-full max-w-lg px-4 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold tracking-[0.28em] uppercase">Rochester, NY // 146xx</p>
              <h1 className="mt-1 text-4xl leading-none font-bold tracking-tight uppercase">ROC NOW</h1>
            </div>
            <div className="border-4 border-black bg-black px-2 py-1 text-right text-[10px] font-bold tracking-widest text-[#C8FF00] uppercase">
              <p>{todayLabel}</p>
              <p>{clockLabel}</p>
            </div>
          </div>
          <p className="mt-3 border-4 border-black bg-white px-2 py-1 text-[11px] font-bold tracking-widest uppercase">
            Tonight's lineup // auto-dated test loop
          </p>
        </div>
      </header>

      <main className="mx-auto w-full max-w-lg px-4 py-6">
        <ol className="space-y-8">
          {grouped.map((bucket) => (
            <li key={bucket.id}>
              <div className="mb-3 flex items-center gap-3">
                <h2
                  className={`border-4 border-black px-3 py-1 text-sm font-bold tracking-widest uppercase shadow-[6px_6px_0_0_#111] ${bucket.chip}`}
                >
                  {bucket.code}
                </h2>
                <span className="text-xs font-bold tracking-widest uppercase">{bucket.label}</span>
              </div>
              <div className="space-y-4">
                {bucket.events.map((event) => {
                  const feedIndex = timeline.findIndex((item) => item.id === event.id)
                  return (
                    <Fragment key={event.id}>
                      <EventCard event={event} userLocation={userLocation} now={now} />
                      {feedIndex === 1 && <AdPlaceholder />}
                    </Fragment>
                  )
                })}
              </div>
            </li>
          ))}
        </ol>
      </main>
    </div>
  )
}
