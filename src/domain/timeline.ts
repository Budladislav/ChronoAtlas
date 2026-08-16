import { dateOnlyToEpochDay, dateSpecRange, dateToEpochDay, epochDayToDate } from './dates'
import type { DateSpec, Profile, TimelineEntry } from './models'

export interface Viewport {
  startDay: number
  endDay: number
}

export interface LaneItem {
  id: string
  startDay: number
  endDay: number
  lane: number
}

export function entryDayRange(entry: TimelineEntry, today = new Date()): { startDay: number; endDay: number } {
  if (entry.kind === 'moment') {
    const range = dateSpecRange(entry.date)
    const middle = Math.round((dateToEpochDay(range.start) + dateToEpochDay(range.end)) / 2)
    return { startDay: middle, endDay: middle }
  }
  const start = dateSpecRange(entry.start)
  const end = entry.end ? dateSpecRange(entry.end) : { start: today, end: today }
  return { startDay: dateToEpochDay(start.start), endDay: dateToEpochDay(end.end) }
}

function padded(startDay: number, endDay: number): Viewport {
  const span = Math.max(30, endDay - startDay)
  const margin = Math.max(14, Math.ceil(span * 0.045))
  return { startDay: startDay - margin, endDay: endDay + margin }
}

export function fitLife(profile: Profile, today = new Date()): Viewport {
  return padded(dateOnlyToEpochDay(profile.birthDate), dateToEpochDay(today))
}

export function fitAll(profile: Profile, entries: TimelineEntry[], today = new Date()): Viewport {
  const life = { startDay: dateOnlyToEpochDay(profile.birthDate), endDay: dateToEpochDay(today) }
  let startDay = life.startDay
  let endDay = life.endDay
  for (const entry of entries) {
    const range = entryDayRange(entry, today)
    startDay = Math.min(startDay, range.startDay)
    endDay = Math.max(endDay, range.endDay)
  }
  return padded(startDay, endDay)
}

export function zoomViewport(viewport: Viewport, factor: number, anchor = 0.5): Viewport {
  const span = viewport.endDay - viewport.startDay
  const nextSpan = Math.max(7, Math.min(365 * 500, span * factor))
  const anchorDay = viewport.startDay + span * anchor
  return { startDay: anchorDay - nextSpan * anchor, endDay: anchorDay + nextSpan * (1 - anchor) }
}

export function panViewport(viewport: Viewport, dayDelta: number): Viewport {
  return { startDay: viewport.startDay + dayDelta, endDay: viewport.endDay + dayDelta }
}

export function packIntoLanes(entries: TimelineEntry[], today = new Date()): LaneItem[] {
  const sorted = entries
    .map((entry) => ({ id: entry.id, ...entryDayRange(entry, today) }))
    .sort((a, b) => a.startDay - b.startDay || a.endDay - b.endDay)
  const laneEnds: number[] = []
  return sorted.map((item) => {
    let lane = laneEnds.findIndex((end) => end < item.startDay)
    if (lane < 0) lane = laneEnds.length
    laneEnds[lane] = item.endDay
    return { ...item, lane }
  })
}

export interface AxisTick { day: number; label: string }

export function axisTicks(viewport: Viewport): AxisTick[] {
  const start = epochDayToDate(Math.floor(viewport.startDay))
  const end = epochDayToDate(Math.ceil(viewport.endDay))
  const span = viewport.endDay - viewport.startDay
  const ticks: AxisTick[] = []
  if (span > 365 * 30) {
    const step = span > 365 * 150 ? 20 : span > 365 * 70 ? 10 : 5
    const firstYear = Math.ceil(start.getFullYear() / step) * step
    for (let year = firstYear; year <= end.getFullYear(); year += step) ticks.push({ day: dateToEpochDay(new Date(year, 0, 1)), label: String(year) })
  } else if (span > 365 * 2) {
    const step = span > 365 * 15 ? 3 : span > 365 * 7 ? 2 : 1
    for (let year = start.getFullYear(); year <= end.getFullYear(); year += step) ticks.push({ day: dateToEpochDay(new Date(year, 0, 1)), label: String(year) })
  } else if (span > 90) {
    const cursor = new Date(start.getFullYear(), start.getMonth(), 1)
    const step = span > 365 ? 3 : 1
    while (cursor <= end) {
      ticks.push({ day: dateToEpochDay(cursor), label: new Intl.DateTimeFormat('ru-RU', { month: 'short', year: cursor.getMonth() === 0 ? 'numeric' : undefined }).format(cursor) })
      cursor.setMonth(cursor.getMonth() + step)
    }
  } else {
    const step = span > 45 ? 7 : span > 20 ? 3 : 1
    const cursor = new Date(start)
    while (cursor <= end) {
      ticks.push({ day: dateToEpochDay(cursor), label: new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' }).format(cursor) })
      cursor.setDate(cursor.getDate() + step)
    }
  }
  return ticks.slice(0, 40)
}

export function validateEntryDates(kind: 'period' | 'moment', start: DateSpec, end: DateSpec | null): string | null {
  if (kind === 'moment' || !end) return null
  const startRange = dateSpecRange(start)
  const endRange = dateSpecRange(end)
  if (endRange.end < startRange.start) return 'Конец не может быть раньше начала'
  return null
}
