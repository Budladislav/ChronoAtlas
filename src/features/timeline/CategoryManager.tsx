import { useState } from 'react'
import type { Category } from '../../domain/models'
import { CATEGORY_PALETTE } from '../../domain/models'
import { deleteCategory, saveCategories } from '../../db/repository'
import { Modal } from '../../shared/Modal'

export function CategoryManager({ categories, counts, onChanged, onClose }: { categories: Category[]; counts: Record<string, number>; onChanged: () => Promise<void>; onClose: () => void }) {
  const [draft, setDraft] = useState(categories)
  const [error, setError] = useState('')
  const [dragId, setDragId] = useState<string | null>(null)
  function move(index: number, delta: number) {
    const target = index + delta
    if (target < 0 || target >= draft.length) return
    const next = [...draft]; [next[index], next[target]] = [next[target], next[index]]; setDraft(next)
  }
  function drop(targetId: string) {
    if (!dragId || dragId === targetId) return
    const moving = draft.find((item) => item.id === dragId)
    if (!moving) return
    const next = draft.filter((item) => item.id !== dragId)
    next.splice(next.findIndex((item) => item.id === targetId), 0, moving)
    setDraft(next); setDragId(null)
  }
  function add() {
    const now = new Date().toISOString()
    setDraft([...draft, { id: crypto.randomUUID(), name: 'Новая категория', color: CATEGORY_PALETTE[draft.length % CATEGORY_PALETTE.length], order: draft.length, visible: true, createdAt: now, updatedAt: now }])
  }
  async function save() {
    if (draft.some((item) => !item.name.trim())) return setError('Название категории не может быть пустым')
    setError(''); await saveCategories(draft); await onChanged(); onClose()
  }
  async function remove(category: Category) {
    if (counts[category.id]) return setError(`В категории «${category.name}» ${counts[category.id]} записей. Сначала перенесите или удалите их.`)
    if (!window.confirm(`Удалить пустую категорию «${category.name}»?`)) return
    if (categories.some((item) => item.id === category.id)) await deleteCategory(category.id)
    setDraft((current) => current.filter((item) => item.id !== category.id)); await onChanged()
  }
  const duplicateNames = new Set(draft.filter((item, index) => draft.findIndex((other) => other.name.trim().toLocaleLowerCase() === item.name.trim().toLocaleLowerCase()) !== index).map((item) => item.name.trim().toLocaleLowerCase()))

  return (
    <Modal title="Категории" onClose={onClose} size="large">
      <div className="modal__body">
        <p className="muted">Перетащите строки или используйте стрелки, чтобы изменить порядок. Категорию с записями нельзя удалить.</p>
        <div className="category-editor-list">
          {draft.map((category, index) => (
            <div className="category-editor-row" key={category.id} draggable onDragStart={() => setDragId(category.id)} onDragOver={(event) => event.preventDefault()} onDrop={() => drop(category.id)}>
              <span className="drag-handle" title="Перетащить" aria-hidden="true">⠿</span>
              <input className="color-input" type="color" value={category.color} aria-label={`Цвет категории ${category.name}`} onChange={(event) => setDraft(draft.map((item) => item.id === category.id ? { ...item, color: event.target.value } : item))} />
              <label className="field field--inline"><span className="sr-only">Название категории</span><input value={category.name} maxLength={60} onChange={(event) => setDraft(draft.map((item) => item.id === category.id ? { ...item, name: event.target.value } : item))} /></label>
              <span className="entry-count">{counts[category.id] ?? 0}</span>
              <div className="row-actions"><button className="icon-button" onClick={() => move(index, -1)} disabled={index === 0} aria-label="Поднять">↑</button><button className="icon-button" onClick={() => move(index, 1)} disabled={index === draft.length - 1} aria-label="Опустить">↓</button><button className="icon-button icon-button--danger" onClick={() => void remove(category)} aria-label={`Удалить ${category.name}`}>×</button></div>
              {duplicateNames.has(category.name.trim().toLocaleLowerCase()) && <small className="duplicate-warning">Такое название уже есть</small>}
            </div>
          ))}
        </div>
        <button className="button button--ghost" onClick={add}>+ Новая категория</button>
        {error && <div className="form-error" role="alert">{error}</div>}
      </div>
      <footer className="modal__footer"><span /><div><button className="button button--ghost" onClick={onClose}>Отмена</button><button className="button button--primary" onClick={() => void save()}>Сохранить порядок</button></div></footer>
    </Modal>
  )
}
