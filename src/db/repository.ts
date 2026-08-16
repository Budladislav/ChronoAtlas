import type { AppSnapshot, Category, Profile, TimelineEntry, UserSettings } from '../domain/models'
import { CATEGORY_PALETTE, DEFAULT_CATEGORY_NAMES } from '../domain/models'
import { ChronoAtlasDatabase, db, SCHEMA_VERSION } from './database'

export const defaultSettings = (): UserSettings => ({
  id: 'primary',
  theme: 'system',
  reduceMotionOverride: 'system',
  weekStartsOn: 1,
  lastExportAt: null,
  dataChangedSinceExport: false,
})

export async function ensureTechnicalRecords(database: ChronoAtlasDatabase = db): Promise<void> {
  await database.transaction('rw', database.settings, database.meta, async () => {
    if (!(await database.settings.get('primary'))) await database.settings.put(defaultSettings())
    if (!(await database.meta.get('primary'))) {
      await database.meta.put({ id: 'primary', schemaVersion: SCHEMA_VERSION, onboardingComplete: false })
    }
  })
}

export async function loadSnapshot(database: ChronoAtlasDatabase = db): Promise<AppSnapshot> {
  await ensureTechnicalRecords(database)
  const [profile, categories, entries, settings, meta] = await Promise.all([
    database.profiles.get('primary'),
    database.categories.orderBy('order').toArray(),
    database.entries.toArray(),
    database.settings.get('primary'),
    database.meta.get('primary'),
  ])
  return { profile: profile ?? null, categories, entries, settings: settings ?? defaultSettings(), meta: meta! }
}

export async function completeOnboarding(birthDate: string, displayName: string | null, database: ChronoAtlasDatabase = db): Promise<void> {
  const now = new Date().toISOString()
  const profile: Profile = { id: 'primary', birthDate, displayName: displayName?.trim() || null, createdAt: now, updatedAt: now }
  const categories: Category[] = DEFAULT_CATEGORY_NAMES.map((name, order) => ({
    id: crypto.randomUUID(), name, color: CATEGORY_PALETTE[order], order, visible: true, createdAt: now, updatedAt: now,
  }))
  await database.transaction('rw', database.profiles, database.categories, database.settings, database.meta, async () => {
    await database.profiles.put(profile)
    if ((await database.categories.count()) === 0) await database.categories.bulkAdd(categories)
    await database.settings.put({ ...defaultSettings(), dataChangedSinceExport: true })
    await database.meta.put({ id: 'primary', schemaVersion: SCHEMA_VERSION, onboardingComplete: true })
  })
}

async function markChanged(database: ChronoAtlasDatabase): Promise<void> {
  const settings = (await database.settings.get('primary')) ?? defaultSettings()
  await database.settings.put({ ...settings, dataChangedSinceExport: true })
}

export async function saveProfile(profile: Profile, database: ChronoAtlasDatabase = db): Promise<void> {
  await database.transaction('rw', database.profiles, database.settings, async () => {
    await database.profiles.put({ ...profile, displayName: profile.displayName?.trim() || null, updatedAt: new Date().toISOString() })
    await markChanged(database)
  })
}

export async function saveEntry(entry: TimelineEntry, database: ChronoAtlasDatabase = db): Promise<void> {
  await database.transaction('rw', database.entries, database.settings, async () => {
    await database.entries.put({ ...entry, title: entry.title.trim(), notes: entry.notes?.trim() || null, updatedAt: new Date().toISOString() })
    await markChanged(database)
  })
}

export async function deleteEntry(id: string, database: ChronoAtlasDatabase = db): Promise<void> {
  await database.transaction('rw', database.entries, database.settings, async () => {
    await database.entries.delete(id)
    await markChanged(database)
  })
}

export async function saveCategories(categories: Category[], database: ChronoAtlasDatabase = db): Promise<void> {
  const now = new Date().toISOString()
  await database.transaction('rw', database.categories, database.settings, async () => {
    await database.categories.bulkPut(categories.map((category, order) => ({ ...category, name: category.name.trim(), order, updatedAt: now })))
    await markChanged(database)
  })
}

export async function deleteCategory(id: string, database: ChronoAtlasDatabase = db): Promise<void> {
  if (await database.entries.where('categoryId').equals(id).count()) throw new Error('Сначала перенесите или удалите записи этой категории')
  await database.transaction('rw', database.categories, database.settings, async () => {
    await database.categories.delete(id)
    await markChanged(database)
  })
}

export async function saveSettings(settings: UserSettings, database: ChronoAtlasDatabase = db): Promise<void> {
  await database.settings.put(settings)
}

export async function clearAllData(database: ChronoAtlasDatabase = db): Promise<void> {
  await database.transaction('rw', database.profiles, database.categories, database.entries, database.settings, database.meta, async () => {
    await Promise.all([database.profiles.clear(), database.categories.clear(), database.entries.clear(), database.settings.clear(), database.meta.clear()])
  })
  await ensureTechnicalRecords(database)
}
