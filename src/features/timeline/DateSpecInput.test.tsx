import { fireEvent, render, screen } from '@testing-library/react'
import { DateSpecInput } from './DateSpecInput'

describe('DateSpecInput', () => {
  it('использует нативные date/month-контролы и нормализует DateSpec', () => {
    const onChange = vi.fn()
    const { rerender } = render(<DateSpecInput label="Начало" value={{ value: '2024-05-17', precision: 'day', approximate: false }} onChange={onChange} />)
    expect(screen.getByLabelText('Дата')).toHaveAttribute('type', 'date')
    fireEvent.change(screen.getByLabelText('Точность'), { target: { value: 'month' } })
    expect(onChange).toHaveBeenLastCalledWith({ value: '2024-05-01', precision: 'month', approximate: false })
    rerender(<DateSpecInput label="Начало" value={{ value: '2024-05-01', precision: 'month', approximate: false }} onChange={onChange} />)
    expect(screen.getByLabelText('Месяц')).toHaveAttribute('type', 'month')
  })
})
