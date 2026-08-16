import type { AppSnapshot, Category, DateSpec, Profile, TimelineEntry, UserSettings } from './models'
import { SCHEMA_VERSION, type ChronoAtlasDatabase, db } from '../db/database'
import { defaultSettings } from '../db/repository'
import { dateSpecRange, parseDateOnly } from './dates'
import { validateEntryDates } from './timeline'

export const BACKUP_FORMAT = 'chronoatlas-backup'
export const BACKUP_VERSION = 1

export interface ChronoAtlasBackup {
  format: typeof BACKUP_FORMAT
  backupVersion: number
  appVersion: string
  schemaVersion: number
  exportedAt: string
  checksum: { categories: number; entries: number }
  data: {
    profile: Profile
    categories: Category[]
    entries: TimelineEntry[]
    settings: Pick<UserSettings, 'theme' | 'reduceMotionOverride' | 'weekStartsOn'>
  }
}

export function createBackup(snapshot: AppSnapshot, appVersion = __APP_VERSION__, exportedAt = new Date().toISOString()): ChronoAtlasBackup {
  if (!snapshot.profile) throw new Error('Профиль ещё не создан')
  return {
    format: BACKUP_FORMAT,
    backupVersion: BACKUP_VERSION,
    appVersion,
    schemaVersion: SCHEMA_VERSION,
    exportedAt,
    checksum: { categories: snapshot.categories.length, entries: snapshot.entries.length },
    data: {
      profile: snapshot.profile,
      categories: snapshot.categories,
      entries: snapshot.entries,
      settings: {
        theme: snapshot.settings.theme,
        reduceMotionOverride: snapshot.settings.reduceMotionOverride,
        weekStartsOn: 1,
      },
    },
  }
}

function isObject(value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function validateBackup(value: unknown): ChronoAtlasBackup {
  if (!isObject(value) || value.format !== BACKUP_FORMAT) throw new Error('Это не резервная копия ChronoAtlas')
  if (value.backupVersion > BACKUP_VERSION) throw new Error('Копия создана более новой версией ChronoAtlas')
  if (value.backupVersion !== 1 || !isObject(value.data)) throw new Error('Версия формата копии не поддерживается')
  if (typeof value.appVersion !== 'string' || typeof value.exportedAt !== 'string' || Number.isNaN(Date.parse(value.exportedAt))) throw new Error('В копии повреждены служебные сведения')
  if (typeof value.schemaVersion !== 'number' || value.schemaVersion > SCHEMA_VERSION) throw new Error('Версия схемы копии не поддерживается')
  const data = value.data
  if (!isObject(data.profile) || data.profile.id !== 'primary' || typeof data.profile.birthDate !== 'string') throw new Error('В копии повреждён профиль')
  try { parseDateOnly(data.profile.birthDate) } catch { throw new Error('В копии повреждена дата рождения') }
  if (data.profile.displayName !== null && typeof data.profile.displayName !== 'string') throw new Error('В копии повреждено имя профиля')
  if (!Array.isArray(data.categories) || !Array.isArray(data.entries)) throw new Error('В копии повреждены категории или записи')
  const categoryIds = new Set<string>()
  for (const category of data.categories) {
    if (!isObject(category) || typeof category.id !== 'string' || !category.id || typeof category.name !== 'string' || !category.name.trim() || typeof category.color !== 'string' || typeof category.order !== 'number' || typeof category.visible !== 'boolean') throw new Error('В копии есть повреждённая категория')
    if (categoryIds.has(category.id)) throw new Error('В копии повторяется идентификатор категории')
    categoryIds.add(category.id)
  }
  const entryIds = new Set<string>()
  for (const entry of data.entries) {
    if (!isObject(entry) || typeof entry.id !== 'string' || !entry.id || typeof entry.title !== 'string' || !entry.title.trim() || entry.title.length > 120 || !categoryIds.has(entry.categoryId)) throw new Error('В копии есть запись без существующей категории')
    if (entryIds.has(entry.id)) throw new Error('В копии повторяется идентификатор записи')
    entryIds.add(entry.id)
    if (entry.kind !== 'period' && entry.kind !== 'moment') throw new Error('В копии есть запись неизвестного типа')
    try {
      if (entry.kind === 'moment') validateDateSpec(entry.date)
      else {
        validateDateSpec(entry.start)
        if (entry.end !== null) validateDateSpec(entry.end)
        const error = validateEntryDates('period', entry.start, entry.end)
        if (error) throw new Error(error)
      }
    } catch { throw new Error(`В копии повреждены даты записи «${entry.title}»`) }
  }
  if (!isObject(data.settings) || !['system', 'light', 'dark'].includes(data.settings.theme) || !['system', 'reduce', 'allow'].includes(data.settings.reduceMotionOverride) || data.settings.weekStartsOn !== 1) throw new Error('В копии повреждены переносимые настройки')
  if (!isObject(value.checksum) || value.checksum.categories !== data.categories.length || value.checksum.entries !== data.entries.length) throw new Error('Контрольные числа копии не совпадают')
  return value as unknown as ChronoAtlasBackup
}

function validateDateSpec(value: unknown): void {
  if (!isObject(value) || typeof value.value !== 'string' || !['day', 'month', 'year'].includes(value.precision) || typeof value.approximate !== 'boolean') throw new Error('Повреждён DateSpec')
  dateSpecRange(value as DateSpec)
}

export function parseBackupJson(json: string): ChronoAtlasBackup {
  try {
    return validateBackup(JSON.parse(json))
  } catch (error) {
    if (error instanceof SyntaxError) throw new Error('Файл не является корректным JSON')
    throw error
  }
}

export async function restoreBackup(backup: ChronoAtlasBackup, database: ChronoAtlasDatabase = db): Promise<void> {
  const checked = validateBackup(backup)
  const settings: UserSettings = {
    ...defaultSettings(),
    ...checked.data.settings,
    dataChangedSinceExport: false,
    lastExportAt: checked.exportedAt,
  }
  await database.transaction('rw', database.profiles, database.categories, database.entries, database.settings, database.meta, async () => {
    await database.profiles.clear()
    await database.categories.clear()
    await database.entries.clear()
    await database.profiles.put(checked.data.profile)
    await database.categories.bulkAdd(checked.data.categories)
    await database.entries.bulkAdd(checked.data.entries)
    await database.settings.put(settings)
    await database.meta.put({ id: 'primary', schemaVersion: SCHEMA_VERSION, onboardingComplete: true })
  })
}

export function backupFilename(now = new Date()): string {
  const date = now.toISOString().slice(0, 10)
  const hh = now.getHours().toString().padStart(2, '0')
  const mm = now.getMinutes().toString().padStart(2, '0')
  return `chronoatlas-backup-${date}-${hh}${mm}.json`
}
