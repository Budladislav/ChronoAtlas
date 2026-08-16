import { ChronoAtlasDatabase } from './database'
import { completeOnboarding, loadSnapshot, saveEntry } from './repository'

describe('IndexedDB repository', () => {
  it('создаёт профиль и сохраняет данные после повторного открытия', async () => {
    const name = `chronoatlas-test-${crypto.randomUUID()}`
    const first = new ChronoAtlasDatabase(name)
    await completeOnboarding('1995-05-20', 'Мария', first)
    const snapshot = await loadSnapshot(first)
    expect(snapshot.categories).toHaveLength(8)
    await saveEntry({ id: 'e1', categoryId: snapshot.categories[0].id, title: '  Линия  ', notes: '  заметка ', kind: 'period', start: { value: '1990-01-01', precision: 'year', approximate: true }, end: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }, first)
    first.close()
    const second = new ChronoAtlasDatabase(name)
    const reopened = await loadSnapshot(second)
    expect(reopened.profile?.displayName).toBe('Мария')
    expect(reopened.entries[0].title).toBe('Линия')
    expect(reopened.entries[0].notes).toBe('заметка')
    expect(reopened.meta.schemaVersion).toBe(1)
    second.close(); await second.delete()
  })
})
