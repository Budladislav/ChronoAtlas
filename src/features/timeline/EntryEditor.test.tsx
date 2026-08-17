import { fireEvent, render, screen } from '@testing-library/react'
import { EntryEditor } from './EntryEditor'
import type { Category } from '../../domain/models'

const categories: Category[] = [{
  id: 'people',
  name: 'Люди',
  color: '#314b3c',
  order: 0,
  visible: true,
  createdAt: '2026-08-17T00:00:00.000Z',
  updatedAt: '2026-08-17T00:00:00.000Z',
}]

describe('форма записи', () => {
  it('не сбрасывает фокус с поля названия при каждом символе', () => {
    render(<EntryEditor entry={null} categories={categories} onSaved={vi.fn()} onClose={vi.fn()} />)
    const title = screen.getByLabelText(/Название/)

    expect(title).toHaveFocus()
    fireEvent.change(title, { target: { value: 'Л' } })
    expect(title).toHaveFocus()
    fireEvent.change(title, { target: { value: 'Линия' } })
    expect(title).toHaveFocus()
  })
})
