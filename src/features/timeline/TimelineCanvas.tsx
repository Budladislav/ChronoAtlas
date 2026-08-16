import { useMemo, useRef, type PointerEvent, type WheelEvent } from 'react'
import { axisTicks, entryDayRange, packIntoLanes, panViewport, zoomViewport, type Viewport } from '../../domain/timeline'
import { dateOnlyToEpochDay, dateToEpochDay, formatDateSpec } from '../../domain/dates'
import type { Category, Profile, TimelineEntry } from '../../domain/models'

interface TimelineCanvasProps {
  profile: Profile
  categories: Category[]
  entries: TimelineEntry[]
  viewport: Viewport
  selectedId: string | null
  onViewport: (viewport: Viewport) => void
  onSelectEntry: (id: string) => void
  onSelectLife: () => void
}

export function TimelineCanvas({ profile, categories, entries, viewport, selectedId, onViewport, onSelectEntry, onSelectLife }: TimelineCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ x: number; viewport: Viewport } | null>(null)
  const today = useMemo(() => new Date(), [])
  const ticks = useMemo(() => axisTicks(viewport), [viewport])
  const span = viewport.endDay - viewport.startDay
  const pct = (day: number) => ((day - viewport.startDay) / span) * 100
  const todayDay = dateToEpochDay(today)
  const birthDay = dateOnlyToEpochDay(profile.birthDate)
  const visibleCategories = categories.filter((category) => category.visible)
  const entriesByCategory = useMemo(() => new Map(visibleCategories.map((category) => [category.id, entries.filter((entry) => entry.categoryId === category.id)])), [visibleCategories, entries])

  function pointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return
    dragRef.current = { x: event.clientX, viewport }; event.currentTarget.setPointerCapture(event.pointerId)
  }
  function pointerMove(event: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current; if (!drag || !canvasRef.current) return
    const dayDelta = -((event.clientX - drag.x) / canvasRef.current.clientWidth) * (drag.viewport.endDay - drag.viewport.startDay)
    onViewport(panViewport(drag.viewport, dayDelta))
  }
  function wheel(event: WheelEvent<HTMLDivElement>) {
    if (!event.ctrlKey || !canvasRef.current) return
    event.preventDefault()
    const rect = canvasRef.current.getBoundingClientRect()
    const anchor = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width))
    onViewport(zoomViewport(viewport, event.deltaY > 0 ? 1.16 : 0.86, anchor))
  }
  function keyboard(event: React.KeyboardEvent<HTMLDivElement>) {
    const amount = span * (event.shiftKey ? 0.25 : 0.08)
    if (event.key === 'ArrowLeft') { event.preventDefault(); onViewport(panViewport(viewport, -amount)) }
    if (event.key === 'ArrowRight') { event.preventDefault(); onViewport(panViewport(viewport, amount)) }
    if (event.key === '+' || event.key === '=') { event.preventDefault(); onViewport(zoomViewport(viewport, 0.8)) }
    if (event.key === '-') { event.preventDefault(); onViewport(zoomViewport(viewport, 1.25)) }
  }

  return (
    <div className="timeline-frame">
      <div className="timeline-canvas" ref={canvasRef} tabIndex={0} aria-label="Временная шкала. Стрелки перемещают, плюс и минус меняют масштаб" onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={() => { dragRef.current = null }} onPointerCancel={() => { dragRef.current = null }} onWheel={wheel} onKeyDown={keyboard}>
        <div className="timeline-axis">
          {ticks.map((tick) => <span key={tick.day} className="axis-tick" style={{ left: `${pct(tick.day)}%` }}><i />{tick.label}</span>)}
        </div>
        <div className="timeline-canvas__rows">
          {birthDay > viewport.startDay && <div className="prebirth-shade" style={{ left: 0, width: `${Math.max(0, Math.min(100, pct(birthDay)))}%` }} aria-hidden="true" />}
          {ticks.map((tick) => <i key={tick.day} className="grid-line" style={{ left: `${pct(tick.day)}%` }} aria-hidden="true" />)}
          {todayDay >= viewport.startDay && todayDay <= viewport.endDay && <div className="today-line" style={{ left: `${pct(todayDay)}%` }}><span>Сегодня</span></div>}
          <section className="timeline-row timeline-row--life" aria-label="Моя жизнь">
            <span className="timeline-row__caption">Моя жизнь</span>
            <button className="life-bar" style={{ left: `${pct(birthDay)}%`, width: `${Math.max(0.4, pct(todayDay) - pct(birthDay))}%` }} onPointerDown={(event) => event.stopPropagation()} onClick={onSelectLife} title="Моя жизнь — открыть сведения"><span>{profile.displayName ? `Жизнь · ${profile.displayName}` : 'Моя жизнь'}</span></button>
          </section>
          {visibleCategories.map((category) => {
            const categoryEntries = entriesByCategory.get(category.id) ?? []
            const lanes = packIntoLanes(categoryEntries, today)
            const laneById = new Map(lanes.map((lane) => [lane.id, lane.lane]))
            const laneCount = Math.max(1, ...lanes.map((lane) => lane.lane + 1))
            return (
              <section className="timeline-row" key={category.id} style={{ height: `${Math.max(70, laneCount * 34 + 34)}px` }} aria-label={category.name}>
                <span className="timeline-row__caption"><i style={{ background: category.color }} />{category.name}</span>
                {categoryEntries.map((entry) => {
                  const range = entryDayRange(entry, today)
                  if (range.endDay < viewport.startDay || range.startDay > viewport.endDay) return null
                  const lane = laneById.get(entry.id) ?? 0
                  const left = pct(range.startDay)
                  const top = 29 + lane * 34
                  const dateLabel = entry.kind === 'moment' ? formatDateSpec(entry.date) : `${formatDateSpec(entry.start)} — ${entry.end ? formatDateSpec(entry.end) : 'сейчас'}`
                  if (entry.kind === 'moment') return <button key={entry.id} className={`moment-marker${entry.date.approximate ? ' is-approximate' : ''}${selectedId === entry.id ? ' is-selected' : ''}`} style={{ left: `${left}%`, top }} onPointerDown={(event) => event.stopPropagation()} onClick={() => onSelectEntry(entry.id)} title={`${entry.title} · ${dateLabel}`} aria-label={`${entry.title}, ${dateLabel}`}><i /><span>{entry.title}</span></button>
                  const right = pct(range.endDay)
                  return <button key={entry.id} className={`period-bar${entry.end === null ? ' is-ongoing' : ''}${entry.start.approximate || entry.end?.approximate ? ' is-approximate' : ''}${selectedId === entry.id ? ' is-selected' : ''}`} style={{ left: `${left}%`, width: `${Math.max(0.35, right - left)}%`, top, backgroundColor: category.color }} onPointerDown={(event) => event.stopPropagation()} onClick={() => onSelectEntry(entry.id)} title={`${entry.title} · ${dateLabel}`}><span>{entry.title}</span></button>
                })}
              </section>
            )
          })}
          {!visibleCategories.length && <div className="timeline-empty-row">Все категории скрыты. Включите нужные слева.</div>}
        </div>
      </div>
      <div className="timeline-hint"><span>Перетаскивание — перемещение</span><span>Ctrl + колесо — масштаб</span><span>← → и + − — с клавиатуры</span></div>
    </div>
  )
}
