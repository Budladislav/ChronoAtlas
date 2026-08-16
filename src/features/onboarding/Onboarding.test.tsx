import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { Onboarding } from './Onboarding'

describe('Onboarding', () => {
  it('создаёт профиль после приветствия', async () => {
    const onComplete = vi.fn().mockResolvedValue(undefined)
    render(<Onboarding onComplete={onComplete} />)
    expect(screen.getByText('Личный атлас времени')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Начать' }))
    fireEvent.change(screen.getByLabelText(/Дата рождения/), { target: { value: '1992-04-05' } })
    fireEvent.change(screen.getByLabelText(/Имя или обращение/), { target: { value: 'Алекс' } })
    fireEvent.click(screen.getByRole('button', { name: 'Создать атлас' }))
    await waitFor(() => expect(onComplete).toHaveBeenCalledWith('1992-04-05', 'Алекс'))
  })

  it('не принимает будущую дату', () => {
    render(<Onboarding onComplete={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Начать' }))
    fireEvent.change(screen.getByLabelText(/Дата рождения/), { target: { value: '2999-01-01' } })
    fireEvent.submit(screen.getByRole('button', { name: 'Создать атлас' }).closest('form')!)
    expect(screen.getByRole('alert')).toHaveTextContent('будущем')
  })
})
