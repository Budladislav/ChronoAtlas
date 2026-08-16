import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppShell } from '../../app/AppShell'
import { useUiStore } from '../../app/store'
import { backupFilename, createBackup, parseBackupJson, restoreBackup, type ChronoAtlasBackup } from '../../domain/backup'
import { todayDateOnly } from '../../domain/dates'
import type { AppSnapshot, Profile, UserSettings } from '../../domain/models'
import { clearAllData, saveProfile, saveSettings } from '../../db/repository'
import { Modal } from '../../shared/Modal'

export function SettingsPage({ snapshot, refresh }: { snapshot: AppSnapshot & { profile: NonNullable<AppSnapshot['profile']> }; refresh: () => Promise<void> }) {
  const { profile, categories, entries, settings } = snapshot
  const setChangelogOpen = useUiStore((state) => state.setChangelogOpen)
  const navigate = useNavigate()
  const [name, setName] = useState(profile.displayName ?? '')
  const [birthDate, setBirthDate] = useState(profile.birthDate)
  const [profileMessage, setProfileMessage] = useState('')
  const [dataMessage, setDataMessage] = useState('')
  const [importError, setImportError] = useState('')
  const [preview, setPreview] = useState<ChronoAtlasBackup | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  useEffect(() => { if (location.hash.includes('#data')) document.getElementById('data')?.scrollIntoView() }, [])

  async function updateProfile(event: FormEvent) {
    event.preventDefault(); setProfileMessage('')
    if (!birthDate || birthDate > todayDateOnly()) return setProfileMessage('Проверьте дату рождения')
    const next: Profile = { ...profile, displayName: name.trim() || null, birthDate }
    await saveProfile(next); await refresh(); setProfileMessage('Профиль сохранён')
  }
  async function updateAppearance(patch: Partial<UserSettings>) {
    await saveSettings({ ...settings, ...patch }); await refresh()
  }
  async function exportData() {
    try {
      const now = new Date()
      const backup = createBackup(snapshot, __APP_VERSION__, now.toISOString())
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a'); link.href = url; link.download = backupFilename(now); link.click(); URL.revokeObjectURL(url)
      await saveSettings({ ...settings, lastExportAt: now.toISOString(), dataChangedSinceExport: false }); await refresh(); setDataMessage('Резервная копия создана. Храните файл безопасно.')
    } catch (reason) { setDataMessage(reason instanceof Error ? reason.message : 'Не удалось создать копию') }
  }
  async function selectFile(event: ChangeEvent<HTMLInputElement>) {
    setImportError(''); setPreview(null)
    const file = event.target.files?.[0]; if (!file) return
    try { setPreview(parseBackupJson(await file.text())) }
    catch (reason) { setImportError(reason instanceof Error ? reason.message : 'Не удалось прочитать файл') }
    event.target.value = ''
  }
  async function confirmRestore() {
    if (!preview) return
    try { await restoreBackup(preview); setPreview(null); await refresh(); setDataMessage('Данные полностью восстановлены из копии.') }
    catch (reason) { setImportError(reason instanceof Error ? reason.message : 'Восстановление не удалось'); setPreview(null) }
  }
  async function removeEverything() {
    if (!window.confirm('Все записи, категории и профиль будут безвозвратно удалены. Продолжить?')) return
    const answer = window.prompt('Для подтверждения введите УДАЛИТЬ')
    if (answer !== 'УДАЛИТЬ') return setDataMessage('Удаление отменено: контрольное слово не совпало.')
    await clearAllData(); await refresh(); navigate('/')
  }

  return (
    <AppShell>
      <main className="settings-page page-width">
        <header className="page-heading"><div><span className="eyebrow">Локальные предпочтения</span><h1>Настройки</h1><p>Профиль, внешний вид, резервные копии и сведения о приложении.</p></div></header>
        <div className="settings-layout">
          <nav className="settings-nav" aria-label="Разделы настроек"><a href="#profile">Профиль</a><a href="#appearance">Внешний вид</a><a href="#data">Данные</a><a href="#about">О приложении</a></nav>
          <div className="settings-content">
            <section className="settings-section" id="profile"><header><span>01</span><div><h2>Профиль</h2><p>Изменение даты перестроит линию «Моя жизнь» и расчёт возраста.</p></div></header><form onSubmit={updateProfile} className="settings-form"><label className="field"><span>Имя или обращение</span><input value={name} maxLength={120} onChange={(event) => setName(event.target.value)} /></label><label className="field"><span>Дата рождения</span><input type="date" value={birthDate} max={todayDateOnly()} onChange={(event) => setBirthDate(event.target.value)} required /></label><div className="inline-actions"><button className="button button--primary">Сохранить профиль</button>{profileMessage && <span role="status">{profileMessage}</span>}</div></form></section>
            <section className="settings-section" id="appearance"><header><span>02</span><div><h2>Внешний вид</h2><p>Обе темы сохраняют одинаковую информационную иерархию.</p></div></header><div className="settings-form"><fieldset className="choice-group"><legend>Тема</legend>{(['system', 'light', 'dark'] as const).map((theme) => <label key={theme}><input type="radio" name="theme" value={theme} checked={settings.theme === theme} onChange={() => void updateAppearance({ theme })} /><span><i className={`theme-swatch theme-swatch--${theme}`} />{theme === 'system' ? 'Системная' : theme === 'light' ? 'Светлая' : 'Тёмная'}</span></label>)}</fieldset><label className="field"><span>Анимация</span><select value={settings.reduceMotionOverride} onChange={(event) => void updateAppearance({ reduceMotionOverride: event.target.value as UserSettings['reduceMotionOverride'] })}><option value="system">Как в системе</option><option value="reduce">Уменьшить</option><option value="allow">Разрешить</option></select></label><button className="button button--ghost" onClick={() => { sessionStorage.removeItem('chronoatlas-viewport'); setDataMessage('Масштаб карты будет сброшен при следующем открытии.') }}>Сбросить масштаб карты</button></div></section>
            <section className="settings-section" id="data"><header><span>03</span><div><h2>Данные</h2><p>Данные хранятся только в этом браузере. Смена устройства, браузера или адреса публикации не переносит их автоматически.</p></div></header><div className="data-summary"><div><span>Категорий</span><strong>{categories.length}</strong></div><div><span>Записей</span><strong>{entries.length}</strong></div><div><span>Последняя копия</span><strong>{settings.lastExportAt ? new Intl.DateTimeFormat('ru-RU', { dateStyle: 'medium' }).format(new Date(settings.lastExportAt)) : 'ещё не создана'}</strong></div></div><div className="backup-actions"><article><h3>Экспортировать данные</h3><p>Будет скачан читаемый JSON. Файл не зашифрован и содержит личные данные — храните его безопасно.</p><button className="button button--primary" onClick={() => void exportData()}>Скачать резервную копию</button></article><article><h3>Восстановить из копии</h3><p>Файл будет полностью проверен до замены текущих данных. Сначала рекомендуется экспортировать текущее состояние.</p><input className="sr-only" ref={fileRef} type="file" accept="application/json,.json" onChange={(event) => void selectFile(event)} /><button className="button button--ghost" onClick={() => fileRef.current?.click()}>Выбрать JSON-файл</button></article></div>{(dataMessage || importError) && <div className={importError ? 'form-error' : 'success-message'} role="status">{importError || dataMessage}</div>}<div className="danger-zone"><div><h3>Удалить локальный атлас</h3><p>Профиль, категории и записи будут удалены без корзины. Перед этим создайте резервную копию.</p></div><button className="button button--danger" onClick={() => void removeEverything()}>Удалить все данные</button></div></section>
            <section className="settings-section" id="about"><header><span>04</span><div><h2>О приложении</h2><p>ChronoAtlas работает локально и не отправляет личные данные.</p></div></header><div className="about-card"><span className="brand__mark brand__mark--large" aria-hidden="true"><i /><i /><i /></span><div><h3>ChronoAtlas</h3><p>Личный атлас времени</p><button className="version-button" onClick={() => setChangelogOpen(true)}>Версия {__APP_VERSION__}</button></div><button className="button button--ghost" onClick={() => setChangelogOpen(true)}>История изменений</button></div></section>
          </div>
        </div>
      </main>
      {preview && <Modal title="Проверка резервной копии" size="small" onClose={() => setPreview(null)}><div className="modal__body"><p>Файл полностью проверен и готов к восстановлению.</p><dl className="preview-list"><dt>Создана</dt><dd>{new Intl.DateTimeFormat('ru-RU', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(preview.exportedAt))}</dd><dt>Версия приложения</dt><dd>{preview.appVersion}</dd><dt>Категорий</dt><dd>{preview.data.categories.length}</dd><dt>Записей</dt><dd>{preview.data.entries.length}</dd></dl><div className="warning-box">Текущие данные будут полностью заменены. Это действие нельзя отменить без отдельной копии.</div></div><footer className="modal__footer"><span /><div><button className="button button--ghost" onClick={() => setPreview(null)}>Отмена</button><button className="button button--danger" onClick={() => void confirmRestore()}>Заменить данные</button></div></footer></Modal>}
    </AppShell>
  )
}
