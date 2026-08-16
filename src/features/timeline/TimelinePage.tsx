import { useEffect, useMemo, useState } from 'react'
import type { AppSnapshot, Category, TimelineEntry } from '../../domain/models'
import { deleteEntry, saveCategories } from '../../db/repository'
import { dateToEpochDay } from '../../domain/dates'
import { fitAll, fitLife, zoomViewport, type Viewport } from '../../domain/timeline'
import { AppShell } from '../../app/AppShell'
import { useUiStore } from '../../app/store'
import { TimelineCanvas } from './TimelineCanvas'
import { EntryDetails } from './EntryDetails'
import { EntryEditor } from './EntryEditor'
import { CategoryManager } from './CategoryManager'

function savedViewport(): Viewport | null {
  try {
    const value = JSON.parse(sessionStorage.getItem('chronoatlas-viewport') ?? 'null')
    return value && Number.isFinite(value.startDay) && Number.isFinite(value.endDay) && value.endDay > value.startDay ? value : null
  } catch { return null }
}

export function TimelinePage({ snapshot, refresh }: { snapshot: AppSnapshot & { profile: NonNullable<AppSnapshot['profile']> }; refresh: () => Promise<void> }) {
  const { profile, categories, entries, settings } = snapshot
  const selectedId = useUiStore((state) => state.selectedEntryId)
  const setSelectedId = useUiStore((state) => state.setSelectedEntryId)
  const editorId = useUiStore((state) => state.entryEditorId)
  const openEditor = useUiStore((state) => state.openEntryEditor)
  const closeEditor = useUiStore((state) => state.closeEntryEditor)
  const categoriesOpen = useUiStore((state) => state.categoriesOpen)
  const setCategoriesOpen = useUiStore((state) => state.setCategoriesOpen)
  const [lifeSelected, setLifeSelected] = useState(false)
  const [renderedAt] = useState(Date.now)
  const [viewport, setViewport] = useState<Viewport>(() => savedViewport() ?? fitLife(profile))
  const selectedEntry = entries.find((entry) => entry.id === selectedId) ?? null
  const editorEntry = editorId && editorId !== 'new' ? entries.find((entry) => entry.id === editorId) ?? null : null
  const counts = useMemo(() => Object.fromEntries(categories.map((category) => [category.id, entries.filter((entry) => entry.categoryId === category.id).length])), [categories, entries])
  useEffect(() => sessionStorage.setItem('chronoatlas-viewport', JSON.stringify(viewport)), [viewport])

  async function toggleCategory(category: Category) {
    await saveCategories(categories.map((item) => item.id === category.id ? { ...item, visible: !item.visible } : item)); await refresh()
  }
  async function removeSelected() {
    if (!selectedEntry || !window.confirm(`Удалить запись «${selectedEntry.title}»?`)) return
    await deleteEntry(selectedEntry.id); setSelectedId(null); await refresh()
  }
  function showToday() {
    const span = viewport.endDay - viewport.startDay
    const today = dateToEpochDay(new Date())
    setViewport({ startDay: today - span / 2, endDay: today + span / 2 })
  }
  const backupDue = settings.dataChangedSinceExport && (!settings.lastExportAt || renderedAt - new Date(settings.lastExportAt).getTime() > 30 * 86_400_000)

  return (
    <AppShell>
      <main className="timeline-page">
        <div className="section-toolbar">
          <div><span className="eyebrow">Общая шкала</span><h1>Карта жизни</h1></div>
          <div className="toolbar-actions">
            <button className="button button--primary" onClick={() => openEditor()}>+ Добавить</button>
            <div className="button-group"><button className="button button--quiet" onClick={() => setViewport(fitLife(profile))} title="Диапазон от рождения до сегодня">Моя жизнь</button><button className="button button--quiet" onClick={() => setViewport(fitAll(profile, entries))} title="Диапазон всех записей">Все записи</button></div>
            <div className="button-group"><button className="icon-button icon-button--bordered" onClick={() => setViewport(zoomViewport(viewport, 1.25))} aria-label="Уменьшить масштаб" title="Уменьшить масштаб">−</button><button className="icon-button icon-button--bordered" onClick={() => setViewport(zoomViewport(viewport, 0.8))} aria-label="Увеличить масштаб" title="Увеличить масштаб">+</button><button className="button button--quiet" onClick={showToday} title="Вернуть линию Сегодня">Сегодня</button></div>
          </div>
        </div>
        {backupDue && <div className="backup-reminder"><span>После последних изменений резервная копия ещё не создана.</span><a href="#/settings#data">Перейти к данным</a></div>}
        <div className={`map-workspace${selectedEntry || lifeSelected ? ' has-details' : ''}`}>
          <aside className="category-sidebar">
            <div className="category-sidebar__heading"><span>Линии карты</span><button className="icon-button" aria-label="Управление категориями" title="Управление категориями" onClick={() => setCategoriesOpen(true)}>⋯</button></div>
            <button className={`category-row category-row--life${lifeSelected ? ' is-active' : ''}`} onClick={() => { setLifeSelected(true); setSelectedId(null) }}><span className="life-dot" /><span>Моя жизнь</span><small>1</small></button>
            <div className="category-list">
              {categories.map((category) => <div className="category-row" key={category.id}><button className="visibility-toggle" onClick={() => void toggleCategory(category)} aria-label={`${category.visible ? 'Скрыть' : 'Показать'} категорию ${category.name}`} title={category.visible ? 'Скрыть на карте' : 'Показать на карте'}><span className={category.visible ? 'is-visible' : ''}>{category.visible ? '●' : '○'}</span></button><i style={{ background: category.color }} /><span title={category.name}>{category.name}</span><small>{counts[category.id]}</small></div>)}
            </div>
            <button className="category-manage" onClick={() => setCategoriesOpen(true)}>Управлять категориями</button>
          </aside>
          <section className="map-main">
            <TimelineCanvas profile={profile} categories={categories} entries={entries} viewport={viewport} selectedId={selectedId} onViewport={setViewport} onSelectEntry={(id) => { setSelectedId(id); setLifeSelected(false) }} onSelectLife={() => { setLifeSelected(true); setSelectedId(null) }} />
            {!entries.length && <div className="empty-invitation"><div><span className="eyebrow">Пока здесь просторно</span><h2>Начни с нескольких больших линий</h2><p>Люди, места, учёба, работа или отношения помогут увидеть первый ритм карты.</p><button className="button button--primary" onClick={() => openEditor()}>Добавить первую запись</button></div></div>}
          </section>
          {(selectedEntry || lifeSelected) && <EntryDetails entry={selectedEntry} category={categories.find((category) => category.id === selectedEntry?.categoryId)} profile={profile} lifeSelected={lifeSelected} onEdit={() => selectedEntry && openEditor(selectedEntry.id)} onDelete={() => void removeSelected()} onClose={() => { setSelectedId(null); setLifeSelected(false) }} />}
        </div>
      </main>
      {editorId && <EntryEditor entry={editorEntry} categories={categories} onSaved={async (entry: TimelineEntry) => { await refresh(); setSelectedId(entry.id); setLifeSelected(false); closeEditor(); setViewport(fitAll(profile, [entry])) }} onClose={closeEditor} />}
      {categoriesOpen && <CategoryManager categories={categories} counts={counts} onChanged={refresh} onClose={() => setCategoriesOpen(false)} />}
    </AppShell>
  )
}
