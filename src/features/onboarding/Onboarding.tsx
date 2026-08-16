import { useState, type FormEvent } from 'react'
import { todayDateOnly } from '../../domain/dates'

interface OnboardingProps {
  onComplete: (birthDate: string, displayName: string | null) => Promise<void>
}

export function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState<'welcome' | 'profile'>('welcome')
  const [birthDate, setBirthDate] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!birthDate) return setError('Укажите дату рождения')
    if (birthDate > todayDateOnly()) return setError('Дата рождения не может быть в будущем')
    setSaving(true); setError('')
    try { await onComplete(birthDate, displayName || null) }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Не удалось сохранить профиль'); setSaving(false) }
  }

  return (
    <main className="onboarding">
      <div className="onboarding__art" aria-hidden="true">
        <div className="atlas-orbit atlas-orbit--one" />
        <div className="atlas-orbit atlas-orbit--two" />
        <div className="atlas-mark" />
      </div>
      <section className="onboarding__card">
        <div className="eyebrow">Личный атлас времени</div>
        <h1>ChronoAtlas</h1>
        {step === 'welcome' ? (
          <>
            <p className="lead">Собери значимые линии своей жизни в одной спокойной, наглядной карте.</p>
            <div className="intro-grid">
              <article><span>01</span><h2>Карта жизни</h2><p>Люди, места, работа, отношения и события в общем масштабе.</p></article>
              <article><span>02</span><h2>Течение</h2><p>Текущая позиция внутри дня, недели, месяца и года — без оценок и целей.</p></article>
            </div>
            <button className="button button--primary button--wide" onClick={() => setStep('profile')}>Начать</button>
            <p className="privacy-note">Все данные останутся только в этом браузере.</p>
          </>
        ) : (
          <form onSubmit={submit}>
            <h2>Положим начало карте</h2>
            <p>Дата рождения создаст центральную линию «Моя жизнь». Её можно изменить позже.</p>
            <label className="field"><span>Дата рождения <b aria-hidden="true">*</b></span><input type="date" value={birthDate} max={todayDateOnly()} onChange={(event) => setBirthDate(event.target.value)} required autoFocus /></label>
            <label className="field"><span>Имя или обращение <small>необязательно</small></span><input value={displayName} maxLength={120} onChange={(event) => setDisplayName(event.target.value)} placeholder="Как к тебе обращаться" /></label>
            {error && <div className="form-error" role="alert">{error}</div>}
            <div className="form-actions"><button className="button button--ghost" type="button" onClick={() => setStep('welcome')}>Назад</button><button className="button button--primary" disabled={saving}>{saving ? 'Сохраняю…' : 'Создать атлас'}</button></div>
          </form>
        )}
      </section>
    </main>
  )
}
