export interface ChangelogRelease {
  version: string
  date: string
  changes: string[]
}

export const changelog: ChangelogRelease[] = [
  {
    version: '0.1.0',
    date: '16 августа 2026',
    changes: [
      'Создание личной линии жизни и восьми стартовых категорий.',
      'Периоды, продолжающиеся линии и события-моменты на общей карте.',
      'Течение дня, недели, месяца, года и фактическая продолжительность жизни.',
      'Локальные данные, резервные копии, темы и офлайн-режим PWA.',
    ],
  },
]
