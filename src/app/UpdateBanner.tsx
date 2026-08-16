import { useRegisterSW } from 'virtual:pwa-register/react'
import { useUiStore } from './store'

export function UpdateBanner() {
  const { needRefresh: [needRefresh, setNeedRefresh], offlineReady: [offlineReady, setOfflineReady], updateServiceWorker } = useRegisterSW({ immediate: true })
  const editorOpen = useUiStore((state) => state.entryEditorId !== null)
  function applyUpdate() {
    if (!editorOpen || window.confirm('Открыта форма записи. Обновить приложение и закрыть её?')) void updateServiceWorker(true)
  }
  if (!needRefresh && !offlineReady) return null
  return (
    <aside className="update-banner" role="status">
      <span>{needRefresh ? 'Доступна новая версия ChronoAtlas' : 'ChronoAtlas готов к работе офлайн'}</span>
      {needRefresh && <button className="button button--small button--primary" onClick={applyUpdate}>Обновить</button>}
      <button className="icon-button" aria-label="Закрыть" onClick={() => { setNeedRefresh(false); setOfflineReady(false) }}>×</button>
    </aside>
  )
}
