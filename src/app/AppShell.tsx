import { NavLink } from 'react-router-dom'
import type { ReactNode } from 'react'

export function AppShell({ children, onOpenSettings }: { children: ReactNode; onOpenSettings?: () => void }) {
  return (
    <div className="app-shell">
      <header className="app-header">
        <NavLink to="/" className="brand" aria-label="ChronoAtlas — Карта жизни">
          <span className="brand__mark" aria-hidden="true"><i /><i /><i /></span>
          <span><strong>ChronoAtlas</strong><small>Личный атлас времени</small></span>
        </NavLink>
        <nav className="main-nav" aria-label="Основные разделы">
          <NavLink to="/" end>Карта жизни</NavLink>
          <NavLink to="/flow">Течение</NavLink>
        </nav>
        <NavLink to="/settings" className="settings-link" onClick={onOpenSettings} aria-label="Настройки" title="Настройки"><span aria-hidden="true">⚙</span><span className="settings-link__text">Настройки</span></NavLink>
      </header>
      {children}
    </div>
  )
}
