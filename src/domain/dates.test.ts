import { calendarAge, calendarDaysBetween, currentPeriodBounds, dateSpecRange, elapsedPeriod, formatDateSpec } from './dates'

describe('календарная логика', () => {
  it('разворачивает точности года и месяца в реальные диапазоны', () => {
    const year = dateSpecRange({ value: '2024-01-01', precision: 'year', approximate: true })
    expect(year.start.getDate()).toBe(1)
    expect(year.end.getMonth()).toBe(11)
    expect(year.end.getDate()).toBe(31)
    const february = dateSpecRange({ value: '2024-02-01', precision: 'month', approximate: false })
    expect(february.end.getDate()).toBe(29)
    expect(formatDateSpec({ value: '2012-01-01', precision: 'year', approximate: true })).toBe('≈ 2012')
  })

  it('считает календарные дни независимо от длительности суток при DST', () => {
    expect(calendarDaysBetween('2024-03-31', '2024-04-01')).toBe(1)
    expect(calendarDaysBetween('2024-10-27', '2024-10-28')).toBe(1)
  })

  it('начинает неделю в понедельник', () => {
    const bounds = currentPeriodBounds('week', new Date(2026, 7, 16, 12))
    expect(bounds.start.getDay()).toBe(1)
    expect(bounds.start.getDate()).toBe(10)
    expect(bounds.end.getDate()).toBe(17)
  })

  it('правильно считает возраст после високосного дня', () => {
    expect(calendarAge('2000-02-29', new Date(2025, 1, 28))).toEqual({ years: 25, months: 0, days: 0 })
    expect(calendarAge('1990-12-31', new Date(2026, 7, 16))).toEqual({ years: 35, months: 7, days: 16 })
  })

  it('держит процент периода в границах', () => {
    const value = elapsedPeriod('year', new Date(2024, 11, 31, 23, 59, 59))
    expect(value.percent).toBeGreaterThan(99)
    expect(value.percent).toBeLessThanOrEqual(100)
    expect(value.remainingMs).toBeGreaterThanOrEqual(0)
  })
})
