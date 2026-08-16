import type { Profile, TimelineEntry } from './models'
import { entryDayRange, fitAll, fitLife, packIntoLanes, validateEntryDates, zoomViewport } from './timeline'

const profile: Profile = { id: 'primary', displayName: null, birthDate: '1990-01-01', createdAt: '', updatedAt: '' }
const period = (id: string, start: string, end: string | null): TimelineEntry => ({ id, categoryId: 'c', title: id, notes: null, createdAt: '', updatedAt: '', kind: 'period', start: { value: start, precision: 'day', approximate: false }, end: end ? { value: end, precision: 'day', approximate: false } : null })

describe('геометрия карты', () => {
  it('Fit All включает запись до рождения', () => {
    const viewport = fitAll(profile, [period('ancestor', '1930-01-01', '1998-01-01')], new Date(2026, 7, 16))
    expect(viewport.startDay).toBeLessThan(entryDayRange(period('ancestor', '1930-01-01', '1998-01-01')).startDay)
    expect(viewport.endDay).toBeGreaterThan(fitLife(profile, new Date(2026, 7, 16)).endDay - 100)
  })

  it('разносит пересечения по дорожкам и переиспользует свободную', () => {
    const packed = packIntoLanes([
      period('a', '2020-01-01', '2020-12-31'),
      period('b', '2020-06-01', '2021-01-01'),
      period('c', '2021-01-02', '2021-03-01'),
    ])
    expect(packed.find((item) => item.id === 'a')?.lane).toBe(0)
    expect(packed.find((item) => item.id === 'b')?.lane).toBe(1)
    expect(packed.find((item) => item.id === 'c')?.lane).toBe(0)
  })

  it('обрабатывает продолжающийся период и 500 synthetic-записей', () => {
    const entries = Array.from({ length: 500 }, (_, index) => period(String(index), `20${String(index % 20).padStart(2, '0')}-01-01`, `20${String(index % 20).padStart(2, '0')}-06-01`))
    const started = performance.now()
    expect(packIntoLanes(entries).length).toBe(500)
    expect(performance.now() - started).toBeLessThan(1000)
    expect(entryDayRange(period('ongoing', '2020-01-01', null), new Date(2026, 7, 16)).endDay).toBeGreaterThan(entryDayRange(period('ongoing', '2020-01-01', null), new Date(2025, 7, 16)).endDay)
  })

  it('валидирует границы и ограничивает zoom', () => {
    const start = { value: '2024-01-01', precision: 'month' as const, approximate: false }
    const end = { value: '2023-01-01', precision: 'year' as const, approximate: false }
    expect(validateEntryDates('period', start, end)).toContain('раньше')
    expect(zoomViewport({ startDay: 0, endDay: 100 }, 0.0001).endDay - zoomViewport({ startDay: 0, endDay: 100 }, 0.0001).startDay).toBe(7)
  })
})
