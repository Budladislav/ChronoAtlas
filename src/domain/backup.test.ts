import { createBackup, parseBackupJson, validateBackup } from './backup'
import type { AppSnapshot } from './models'
import { defaultSettings } from '../db/repository'

const snapshot: AppSnapshot = {
  profile: { id: 'primary', displayName: 'Тест', birthDate: '1990-01-01', createdAt: '', updatedAt: '' },
  categories: [{ id: 'c', name: 'Люди', color: '#123456', order: 0, visible: true, createdAt: '', updatedAt: '' }],
  entries: [{ id: 'e', categoryId: 'c', title: 'Событие', notes: null, createdAt: '', updatedAt: '', kind: 'moment', date: { value: '2012-01-01', precision: 'year', approximate: true } }],
  settings: defaultSettings(),
  meta: { id: 'primary', schemaVersion: 1, onboardingComplete: true },
}

describe('резервная копия', () => {
  it('сериализуется и проверяется', () => {
    const backup = createBackup(snapshot, '0.1.0', '2026-08-16T10:00:00.000Z')
    const parsed = parseBackupJson(JSON.stringify(backup))
    expect(parsed.appVersion).toBe('0.1.0')
    expect(parsed.data.entries[0].id).toBe('e')
  })

  it('отклоняет повреждение и новую версию до изменения данных', () => {
    expect(() => parseBackupJson('{broken')).toThrow('корректным JSON')
    const backup = createBackup(snapshot)
    expect(() => validateBackup({ ...backup, checksum: { categories: 99, entries: 1 } })).toThrow('Контрольные')
    expect(() => validateBackup({ ...backup, backupVersion: 99 })).toThrow('более новой')
    expect(() => validateBackup({ ...backup, data: { ...backup.data, entries: [{ ...backup.data.entries[0], categoryId: 'missing' }] } })).toThrow('без существующей категории')
    expect(() => validateBackup({ ...backup, data: { ...backup.data, entries: [{ ...backup.data.entries[0], date: { value: 'bad-date', precision: 'day', approximate: false } }] } })).toThrow('повреждены даты')
  })
})
