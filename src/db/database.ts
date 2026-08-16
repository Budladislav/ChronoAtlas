import Dexie, { type EntityTable } from 'dexie'
import type { AppMeta, Category, Profile, TimelineEntry, UserSettings } from '../domain/models'

export const DATABASE_NAME = 'chronoatlas'
export const SCHEMA_VERSION = 1

export class ChronoAtlasDatabase extends Dexie {
  profiles!: EntityTable<Profile, 'id'>
  categories!: EntityTable<Category, 'id'>
  entries!: EntityTable<TimelineEntry, 'id'>
  settings!: EntityTable<UserSettings, 'id'>
  meta!: EntityTable<AppMeta, 'id'>

  constructor(name = DATABASE_NAME) {
    super(name)
    this.version(1).stores({
      profiles: 'id',
      categories: 'id, order, visible',
      entries: 'id, categoryId, kind, createdAt, updatedAt',
      settings: 'id',
      meta: 'id',
    })
  }
}

export const db = new ChronoAtlasDatabase()
