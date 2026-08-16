import { useCallback, useEffect, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import type { AppSnapshot } from '../domain/models'
import { completeOnboarding, loadSnapshot } from '../db/repository'
import { Onboarding } from '../features/onboarding/Onboarding'
import { TimelinePage } from '../features/timeline/TimelinePage'
import { FlowPage } from '../features/flow/FlowPage'
import { SettingsPage } from '../features/settings/SettingsPage'
import { ChangelogDialog } from '../features/changelog/ChangelogDialog'
import { useUiStore } from './store'
import { UpdateBanner } from './UpdateBanner'

export function App() {
  const [snapshot, setSnapshot] = useState<AppSnapshot | null>(null)
  const [error, setError] = useState<string | null>(null)
  const changelogOpen = useUiStore((state) => state.changelogOpen)
  const setChangelogOpen = useUiStore((state) => state.setChangelogOpen)

  const refresh = useCallback(async () => {
    try { setSnapshot(await loadSnapshot()); setError(null) }
    catch (reason) { console.error(reason); setError(reason instanceof Error ? reason.message : 'Не удалось открыть локальные данные') }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), 0)
    return () => window.clearTimeout(timer)
  }, [refresh])
  useEffect(() => {
    if (!snapshot) return
    document.documentElement.dataset.theme = snapshot.settings.theme
    document.documentElement.dataset.motion = snapshot.settings.reduceMotionOverride
  }, [snapshot])
  useEffect(() => { if (snapshot?.profile) void navigator.storage?.persist?.() }, [snapshot?.profile])

  if (error) return <main className="fatal-state"><div><h1>Не удалось открыть локальный атлас</h1><p>{error}</p><button className="button button--primary" onClick={() => void refresh()}>Попробовать снова</button><details><summary>Что можно сделать</summary><p>Не очищайте данные сайта. Перезапустите браузер и попробуйте экспортировать данные, если приложение откроется.</p></details></div></main>
  if (!snapshot) return <main className="loading-screen"><span className="brand__mark" aria-hidden="true"><i /><i /><i /></span><p>Открываю атлас…</p></main>
  if (!snapshot.profile || !snapshot.meta.onboardingComplete) {
    return <Onboarding onComplete={async (birthDate, name) => { await completeOnboarding(birthDate, name); await refresh() }} />
  }
  const readySnapshot = { ...snapshot, profile: snapshot.profile }

  return (
    <>
      <Routes>
        <Route path="/" element={<TimelinePage snapshot={readySnapshot} refresh={refresh} />} />
        <Route path="/flow" element={<FlowPage profile={snapshot.profile} />} />
        <Route path="/settings" element={<SettingsPage snapshot={readySnapshot} refresh={refresh} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <UpdateBanner />
      {changelogOpen && <ChangelogDialog onClose={() => setChangelogOpen(false)} />}
    </>
  )
}
