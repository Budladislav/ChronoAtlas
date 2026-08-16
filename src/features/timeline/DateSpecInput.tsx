import { todayDateOnly } from '../../domain/dates'
import type { DatePrecision, DateSpec } from '../../domain/models'

interface DateSpecInputProps {
  label: string
  value: DateSpec
  onChange: (value: DateSpec) => void
}

export function DateSpecInput({ label, value, onChange }: DateSpecInputProps) {
  const raw = value.precision === 'day' ? value.value : value.precision === 'month' ? value.value.slice(0, 7) : value.value.split('-')[0]
  function changePrecision(precision: DatePrecision) {
    const fallback = todayDateOnly()
    const source = /^\d{4}-\d{2}-\d{2}$/.test(value.value) ? value.value : fallback
    const nextValue = precision === 'day' ? source : precision === 'month' ? `${source.slice(0, 7)}-01` : `${source.slice(0, 4)}-01-01`
    onChange({ ...value, precision, value: nextValue })
  }
  function changeRaw(next: string) {
    const normalized = value.precision === 'day' ? next : value.precision === 'month' ? (next ? `${next}-01` : '') : (next ? `${next}-01-01` : '')
    onChange({ ...value, value: normalized })
  }
  return (
    <fieldset className="date-spec">
      <legend>{label}</legend>
      <div className="date-spec__row">
        <label className="field field--compact"><span>Точность</span><select value={value.precision} onChange={(event) => changePrecision(event.target.value as DatePrecision)}><option value="day">День</option><option value="month">Месяц</option><option value="year">Год</option></select></label>
        <label className="field field--grow"><span>{value.precision === 'day' ? 'Дата' : value.precision === 'month' ? 'Месяц' : 'Год'}</span>
          {value.precision === 'year' ? <input type="text" inputMode="numeric" pattern="\d{4}" minLength={4} maxLength={4} value={raw} onChange={(event) => changeRaw(event.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="ГГГГ" required /> : <input type={value.precision === 'day' ? 'date' : 'month'} value={raw} onChange={(event) => changeRaw(event.target.value)} required />}
        </label>
      </div>
      <label className="check-row"><input type="checkbox" checked={value.approximate} onChange={(event) => onChange({ ...value, approximate: event.target.checked })} /><span>Дата приблизительная</span></label>
    </fieldset>
  )
}
