import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AppShell } from '../../app/AppShell'
import { calendarAge, calendarDaysBetween, currentPeriodBounds, elapsedPeriod, formatClockDuration, parseDateOnly, todayDateOnly } from '../../domain/dates'
import type { Profile } from '../../domain/models'

const periodLabels = { day: 'День', week: 'Неделя', month: 'Месяц', year: 'Год' } as const
const periodNotes = { day: 'От полуночи до полуночи', week: 'С понедельника по воскресенье', month: 'Текущий календарный месяц', year: 'Текущий календарный год' } as const

function useVisibleNow() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    let timer: number | undefined
    const update = () => setNow(new Date())
    const sync = () => {
      if (timer) window.clearInterval(timer)
      if (!document.hidden) { update(); timer = window.setInterval(update, 1000) }
    }
    document.addEventListener('visibilitychange', sync); sync()
    return () => { document.removeEventListener('visibilitychange', sync); if (timer) window.clearInterval(timer) }
  }, [])
  return now
}

export function FlowPage({ profile }: { profile: Profile }) {
  const now = useVisibleNow()
  const age = calendarAge(profile.birthDate, now)
  const livedDays = calendarDaysBetween(profile.birthDate, todayDateOnly(now))
  const fullWeeks = Math.floor(livedDays / 7)
  const restDays = livedDays % 7
  return (
    <AppShell>
      <main className="flow-page page-width">
        <header className="page-heading"><div><span className="eyebrow">Настоящее время</span><h1>Течение</h1><p>Текущая позиция внутри естественных календарных периодов — без целей и оценки.</p></div><time dateTime={now.toISOString()}>{new Intl.DateTimeFormat('ru-RU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(now)}</time></header>
        <div className="flow-grid">
          {(Object.keys(periodLabels) as Array<keyof typeof periodLabels>).map((kind) => {
            const period = elapsedPeriod(kind, now)
            const bounds = currentPeriodBounds(kind, now)
            return <article className="flow-card" key={kind}><header><div><span className="flow-card__index">{kind === 'day' ? '01' : kind === 'week' ? '02' : kind === 'month' ? '03' : '04'}</span><h2>{periodLabels[kind]}</h2></div><strong>{period.percent.toFixed(2).replace('.', ',')}%</strong></header><div className="progress-track" aria-label={`${periodLabels[kind]} прошло на ${period.percent.toFixed(2)} процента`}><i style={{ width: `${period.percent}%` }} /></div><div className="flow-card__stats"><div><span>прошло</span><strong>{formatClockDuration(period.elapsedMs)}</strong></div><div><span>осталось</span><strong>{formatClockDuration(period.remainingMs)}</strong></div></div><details><summary>{periodNotes[kind]}</summary><p>{new Intl.DateTimeFormat('ru-RU', { dateStyle: 'medium', timeStyle: 'short' }).format(bounds.start)} — {new Intl.DateTimeFormat('ru-RU', { dateStyle: 'medium', timeStyle: 'short' }).format(bounds.end)}</p></details></article>
          })}
        </div>
        <article className="life-card">
          <div className="life-card__intro"><span className="eyebrow">Без конечной даты</span><h2>Моя жизнь</h2><p>Фактическая продолжительность от даты рождения до сегодняшнего дня.</p><Link to="/" className="button button--ghost">Показать на карте</Link></div>
          <div className="age-display"><div><strong>{age.years}</strong><span>лет</span></div><div><strong>{age.months}</strong><span>месяцев</span></div><div><strong>{age.days}</strong><span>дней</span></div></div>
          <dl className="life-facts"><div><dt>Календарных дней</dt><dd>{livedDays.toLocaleString('ru-RU')}</dd></div><div><dt>Полных недель</dt><dd>{fullWeeks.toLocaleString('ru-RU')} + {restDays} дн.</dd></div><div><dt>Дата рождения</dt><dd>{new Intl.DateTimeFormat('ru-RU', { dateStyle: 'long' }).format(parseDateOnly(profile.birthDate))}</dd></div></dl>
        </article>
      </main>
    </AppShell>
  )
}
