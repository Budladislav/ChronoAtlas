import { Link } from 'react-router-dom'
import { calendarAge, calendarDaysBetween, describeEntryDuration, formatDateSpec, todayDateOnly } from '../../domain/dates'
import type { Category, Profile, TimelineEntry } from '../../domain/models'

export function EntryDetails({ entry, category, profile, lifeSelected, onEdit, onDelete, onClose }: { entry: TimelineEntry | null; category?: Category; profile: Profile; lifeSelected: boolean; onEdit: () => void; onDelete: () => void; onClose: () => void }) {
  if (lifeSelected) {
    const age = calendarAge(profile.birthDate)
    return <aside className="details-panel"><header><div><span className="eyebrow">Центральная линия</span><h2>Моя жизнь</h2></div><button className="icon-button" onClick={onClose} aria-label="Закрыть">×</button></header><div className="details-panel__body"><div className="life-age"><strong>{age.years}</strong><span>лет</span> <strong>{age.months}</strong><span>мес.</span> <strong>{age.days}</strong><span>дн.</span></div><dl><dt>Дата рождения</dt><dd>{new Intl.DateTimeFormat('ru-RU', { dateStyle: 'long' }).format(new Date(`${profile.birthDate}T12:00:00`))}</dd><dt>Прошло календарных дней</dt><dd>{calendarDaysBetween(profile.birthDate, todayDateOnly()).toLocaleString('ru-RU')}</dd></dl><p className="muted">Линия продолжается до сегодняшнего дня и не предполагает конечной даты.</p></div><footer><Link className="button button--ghost button--wide" to="/settings#profile">Изменить профиль</Link></footer></aside>
  }
  if (!entry) return null
  const dateText = entry.kind === 'moment' ? formatDateSpec(entry.date) : `${formatDateSpec(entry.start)} — ${entry.end ? formatDateSpec(entry.end) : 'продолжается сейчас'}`
  return (
    <aside className="details-panel">
      <header><div><span className="eyebrow">{entry.kind === 'period' ? 'Период' : 'Момент'}</span><h2>{entry.title}</h2></div><button className="icon-button" onClick={onClose} aria-label="Закрыть">×</button></header>
      <div className="details-panel__body">
        <div className="category-chip"><i style={{ background: category?.color }} />{category?.name ?? 'Неизвестная категория'}</div>
        <dl><dt>{entry.kind === 'moment' ? 'Дата' : 'Границы'}</dt><dd>{dateText}</dd>{entry.kind === 'period' && <><dt>Длительность</dt><dd>{describeEntryDuration(entry.start, entry.end)}</dd></>}<dt>Создано</dt><dd>{new Intl.DateTimeFormat('ru-RU').format(new Date(entry.createdAt))}</dd></dl>
        {entry.notes ? <section className="entry-notes"><h3>Заметка</h3><p>{entry.notes}</p></section> : <p className="muted">Заметки нет.</p>}
      </div>
      <footer><button className="button button--ghost" onClick={onDelete}>Удалить</button><button className="button button--primary" onClick={onEdit}>Редактировать</button></footer>
    </aside>
  )
}
