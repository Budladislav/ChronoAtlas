import type { DateSpec } from './models'

const DAY_MS = 86_400_000

export function parseDateOnly(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) throw new Error('Дата должна иметь формат YYYY-MM-DD')
  const [, y, m, d] = match
  const date = new Date(Number(y), Number(m) - 1, Number(d))
  if (date.getFullYear() !== Number(y) || date.getMonth() !== Number(m) - 1 || date.getDate() !== Number(d)) {
    throw new Error('Несуществующая календарная дата')
  }
  return date
}

export function toDateOnly(date: Date): string {
  const y = date.getFullYear().toString().padStart(4, '0')
  const m = (date.getMonth() + 1).toString().padStart(2, '0')
  const d = date.getDate().toString().padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function todayDateOnly(now = new Date()): string {
  return toDateOnly(now)
}

export function dateSpecRange(spec: DateSpec): { start: Date; end: Date } {
  const value = parseDateOnly(spec.value)
  if (spec.precision === 'year') {
    return { start: new Date(value.getFullYear(), 0, 1), end: new Date(value.getFullYear(), 11, 31) }
  }
  if (spec.precision === 'month') {
    return {
      start: new Date(value.getFullYear(), value.getMonth(), 1),
      end: new Date(value.getFullYear(), value.getMonth() + 1, 0),
    }
  }
  return { start: value, end: value }
}

export function dateToEpochDay(date: Date): number {
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY_MS)
}

export function dateOnlyToEpochDay(value: string): number {
  return dateToEpochDay(parseDateOnly(value))
}

export function epochDayToDate(day: number): Date {
  const utc = new Date(day * DAY_MS)
  return new Date(utc.getUTCFullYear(), utc.getUTCMonth(), utc.getUTCDate())
}

export function calendarDaysBetween(from: Date | string, to: Date | string): number {
  const start = typeof from === 'string' ? parseDateOnly(from) : from
  const end = typeof to === 'string' ? parseDateOnly(to) : to
  return dateToEpochDay(end) - dateToEpochDay(start)
}

export function calendarAge(birthValue: string, on = new Date()): { years: number; months: number; days: number } {
  const birth = parseDateOnly(birthValue)
  const current = new Date(on.getFullYear(), on.getMonth(), on.getDate())
  if (birth > current) throw new Error('Дата рождения не может быть в будущем')

  let years = current.getFullYear() - birth.getFullYear()
  let cursor = addClampedYears(birth, years)
  if (cursor > current) {
    years -= 1
    cursor = addClampedYears(birth, years)
  }
  const yearCursor = cursor
  let months = 0
  while (months < 11) {
    const next = addClampedMonths(yearCursor, months + 1)
    if (next > current) break
    months += 1
  }
  cursor = addClampedMonths(yearCursor, months)
  return { years, months, days: calendarDaysBetween(cursor, current) }
}

function addClampedYears(date: Date, years: number): Date {
  const targetYear = date.getFullYear() + years
  const lastDay = new Date(targetYear, date.getMonth() + 1, 0).getDate()
  return new Date(targetYear, date.getMonth(), Math.min(date.getDate(), lastDay))
}

function addClampedMonths(date: Date, months: number): Date {
  const first = new Date(date.getFullYear(), date.getMonth() + months, 1)
  const lastDay = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate()
  return new Date(first.getFullYear(), first.getMonth(), Math.min(date.getDate(), lastDay))
}

export function formatDateSpec(spec: DateSpec): string {
  const date = parseDateOnly(spec.value)
  let label: string
  if (spec.precision === 'year') label = String(date.getFullYear())
  else if (spec.precision === 'month') label = new Intl.DateTimeFormat('ru-RU', { month: 'long', year: 'numeric' }).format(date)
  else label = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }).format(date)
  return `${spec.approximate ? '≈ ' : ''}${label}`
}

export function currentPeriodBounds(kind: 'day' | 'week' | 'month' | 'year', now: Date): { start: Date; end: Date } {
  if (kind === 'day') {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    return { start, end: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1) }
  }
  if (kind === 'week') {
    const mondayOffset = (now.getDay() + 6) % 7
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - mondayOffset)
    return { start, end: new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7) }
  }
  if (kind === 'month') {
    return {
      start: new Date(now.getFullYear(), now.getMonth(), 1),
      end: new Date(now.getFullYear(), now.getMonth() + 1, 1),
    }
  }
  return { start: new Date(now.getFullYear(), 0, 1), end: new Date(now.getFullYear() + 1, 0, 1) }
}

export function elapsedPeriod(kind: 'day' | 'week' | 'month' | 'year', now: Date): { start: Date; end: Date; elapsedMs: number; remainingMs: number; percent: number } {
  const { start, end } = currentPeriodBounds(kind, now)
  const total = end.getTime() - start.getTime()
  const elapsedMs = Math.max(0, Math.min(total, now.getTime() - start.getTime()))
  return { start, end, elapsedMs, remainingMs: total - elapsedMs, percent: Math.max(0, Math.min(100, (elapsedMs / total) * 100)) }
}

export function formatClockDuration(ms: number): string {
  const seconds = Math.max(0, Math.floor(ms / 1000))
  const days = Math.floor(seconds / 86_400)
  const hours = Math.floor((seconds % 86_400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  if (days > 0) return `${days} дн. ${hours} ч.`
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

export function describeEntryDuration(start: DateSpec, end: DateSpec | null, now = new Date()): string {
  const startRange = dateSpecRange(start)
  const endRange = end ? dateSpecRange(end) : { start: now, end: now }
  const days = Math.max(0, calendarDaysBetween(startRange.start, endRange.end) + 1)
  const approximate = start.approximate || start.precision !== 'day' || (end ? end.approximate || end.precision !== 'day' : false)
  return `${approximate ? '≈ ' : ''}${days.toLocaleString('ru-RU')} дн.${end ? '' : ' · продолжается'}`
}
