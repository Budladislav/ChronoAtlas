export type DatePrecision = 'day' | 'month' | 'year'

export interface DateSpec {
  value: string
  precision: DatePrecision
  approximate: boolean
}

export interface Profile {
  id: 'primary'
  displayName: string | null
  birthDate: string
  createdAt: string
  updatedAt: string
}

export interface Category {
  id: string
  name: string
  color: string
  order: number
  visible: boolean
  createdAt: string
  updatedAt: string
}

interface EntryBase {
  id: string
  categoryId: string
  title: string
  notes: string | null
  createdAt: string
  updatedAt: string
}

export interface PeriodEntry extends EntryBase {
  kind: 'period'
  start: DateSpec
  end: DateSpec | null
}

export interface MomentEntry extends EntryBase {
  kind: 'moment'
  date: DateSpec
}

export type TimelineEntry = PeriodEntry | MomentEntry

export interface UserSettings {
  id: 'primary'
  theme: 'system' | 'light' | 'dark'
  reduceMotionOverride: 'system' | 'reduce' | 'allow'
  weekStartsOn: 1
  lastExportAt: string | null
  dataChangedSinceExport: boolean
}

export interface AppMeta {
  id: 'primary'
  schemaVersion: number
  onboardingComplete: boolean
}

export interface AppSnapshot {
  profile: Profile | null
  categories: Category[]
  entries: TimelineEntry[]
  settings: UserSettings
  meta: AppMeta
}

export const CATEGORY_PALETTE = [
  '#5f6f52',
  '#9a5f4e',
  '#5d7186',
  '#8a6b3f',
  '#74618a',
  '#4f7c78',
  '#a15f70',
  '#66764e',
] as const

export const DEFAULT_CATEGORY_NAMES = [
  'Люди',
  'Отношения',
  'Учёба',
  'Работа',
  'Жильё',
  'Места',
  'Транспорт',
  'Путешествия',
] as const
