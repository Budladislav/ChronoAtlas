import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { dateSpecRange, todayDateOnly } from '../../domain/dates'
import type { Category, DateSpec, TimelineEntry } from '../../domain/models'
import { validateEntryDates } from '../../domain/timeline'
import { Modal } from '../../shared/Modal'
import { saveEntry } from '../../db/repository'
import { DateSpecInput } from './DateSpecInput'

interface Draft {
  title: string
  categoryId: string
  kind: 'period' | 'moment'
  start: DateSpec
  end: DateSpec
  ongoing: boolean
  notes: string
}

function toDraft(entry: TimelineEntry | null, categories: Category[]): Draft {
  const today = todayDateOnly()
  if (!entry) return { title: '', categoryId: categories[0]?.id ?? '', kind: 'period', start: { value: today, precision: 'day', approximate: false }, end: { value: today, precision: 'day', approximate: false }, ongoing: true, notes: '' }
  if (entry.kind === 'moment') return { title: entry.title, categoryId: entry.categoryId, kind: 'moment', start: entry.date, end: { value: today, precision: 'day', approximate: false }, ongoing: false, notes: entry.notes ?? '' }
  return { title: entry.title, categoryId: entry.categoryId, kind: 'period', start: entry.start, end: entry.end ?? { value: today, precision: 'day', approximate: false }, ongoing: entry.end === null, notes: entry.notes ?? '' }
}

export function EntryEditor({ entry, categories, onSaved, onClose }: { entry: TimelineEntry | null; categories: Category[]; onSaved: (entry: TimelineEntry) => Promise<void>; onClose: () => void }) {
  const initial = useMemo(() => toDraft(entry, categories), [entry, categories])
  const [draft, setDraft] = useState<Draft>(initial)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial)

  function requestClose() {
    if (!dirty || window.confirm('Закрыть форму и потерять несохранённые изменения?')) onClose()
  }

  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') { event.preventDefault(); formRef.current?.requestSubmit() }
    }
    document.addEventListener('keydown', keydown)
    return () => document.removeEventListener('keydown', keydown)
  }, [])

  async function submit(event: FormEvent) {
    event.preventDefault(); setError('')
    const title = draft.title.trim()
    if (!title) return setError('Введите название')
    if (title.length > 120) return setError('Название должно быть не длиннее 120 символов')
    if (!draft.categoryId) return setError('Выберите категорию')
    if (draft.notes.length > 5000) return setError('Заметка должна быть не длиннее 5000 символов')
    try {
      dateSpecRange(draft.start)
      if (draft.kind === 'period' && !draft.ongoing) dateSpecRange(draft.end)
    } catch (reason) { return setError(reason instanceof Error ? reason.message : 'Проверьте даты') }
    const dateError = validateEntryDates(draft.kind, draft.start, draft.kind === 'period' && !draft.ongoing ? draft.end : null)
    if (dateError) return setError(dateError)
    setSaving(true)
    const now = new Date().toISOString()
    const base = { id: entry?.id ?? crypto.randomUUID(), categoryId: draft.categoryId, title, notes: draft.notes.trim() || null, createdAt: entry?.createdAt ?? now, updatedAt: now }
    const next: TimelineEntry = draft.kind === 'moment' ? { ...base, kind: 'moment', date: draft.start } : { ...base, kind: 'period', start: draft.start, end: draft.ongoing ? null : draft.end }
    try { await saveEntry(next); await onSaved(next) }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Не удалось сохранить запись'); setSaving(false) }
  }

  return (
    <Modal title={entry ? 'Редактировать запись' : 'Новая запись'} onClose={requestClose} size="large">
      <form ref={formRef} onSubmit={submit} className="entry-form">
        <div className="modal__body">
          <div className="form-grid">
            <label className="field field--span"><span>Название <b aria-hidden="true">*</b></span><input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} maxLength={120} placeholder="Например, Жизнь бабушки Анны" required /></label>
            <label className="field"><span>Категория</span><select value={draft.categoryId} onChange={(event) => setDraft({ ...draft, categoryId: event.target.value })}>{categories.map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}</select></label>
            <label className="field"><span>Тип</span><select value={draft.kind} onChange={(event) => setDraft({ ...draft, kind: event.target.value as Draft['kind'], ongoing: event.target.value === 'period' ? draft.ongoing : false })}><option value="period">Период</option><option value="moment">Момент</option></select></label>
          </div>
          <DateSpecInput label={draft.kind === 'moment' ? 'Дата события' : 'Начало периода'} value={draft.start} onChange={(start) => setDraft({ ...draft, start })} />
          {draft.kind === 'period' && (
            <section className="period-end">
              <label className="check-row check-row--featured"><input type="checkbox" checked={draft.ongoing} onChange={(event) => setDraft({ ...draft, ongoing: event.target.checked })} /><span><strong>Продолжается сейчас</strong><small>Правая граница будет открыта у линии «Сегодня»</small></span></label>
              {!draft.ongoing && <DateSpecInput label="Конец периода" value={draft.end} onChange={(end) => setDraft({ ...draft, end })} />}
            </section>
          )}
          <label className="field"><span>Заметка <small>{draft.notes.length}/5000</small></span><textarea value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} maxLength={5000} rows={5} placeholder="Контекст, воспоминание или уточнение — обычным текстом" /></label>
          {error && <div className="form-error" role="alert">{error}</div>}
        </div>
        <footer className="modal__footer"><span className="keyboard-hint">Ctrl / ⌘ + Enter</span><div><button type="button" className="button button--ghost" onClick={requestClose}>Отмена</button><button className="button button--primary" disabled={saving}>{saving ? 'Сохраняю…' : 'Сохранить'}</button></div></footer>
      </form>
    </Modal>
  )
}
