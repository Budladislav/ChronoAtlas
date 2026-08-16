import { render, screen } from '@testing-library/react'
import { ChangelogDialog } from './ChangelogDialog'

describe('ChangelogDialog', () => {
  it('показывает текущую версию и пользовательские изменения', () => {
    render(<ChangelogDialog onClose={vi.fn()} />)
    expect(screen.getByText('Версия 0.1.0')).toBeInTheDocument()
    expect(screen.getByText(/Создание личной линии/)).toBeInTheDocument()
  })
})
