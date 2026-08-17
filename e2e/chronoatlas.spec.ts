import { test, expect, type Page } from '@playwright/test'
import { writeFile } from 'node:fs/promises'

async function onboard(page: Page, name = 'Алекс') {
  await page.goto('/')
  await page.getByRole('button', { name: 'Начать' }).click()
  await page.getByLabel(/Дата рождения/).fill('1990-04-05')
  await page.getByLabel(/Имя или обращение/).fill(name)
  await page.getByRole('button', { name: 'Создать атлас' }).click()
  await expect(page.getByRole('heading', { name: 'Карта жизни' })).toBeVisible()
}

async function openNewEntry(page: Page) {
  await page.getByRole('button', { name: '+ Добавить', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Новая запись' })).toBeVisible()
}

test('полный жизненный сценарий: даты до рождения, ongoing, момент, edit/delete и фильтр', async ({ page }) => {
  await onboard(page)

  await openNewEntry(page)
  const titleInput = page.getByLabel(/Название/)
  await titleInput.pressSequentially('Жизнь бабушки Анны')
  await expect(titleInput).toHaveValue('Жизнь бабушки Анны')
  const start = page.getByRole('group', { name: 'Начало периода' })
  await start.getByLabel('Точность').selectOption('year')
  await start.getByPlaceholder('ГГГГ').fill('1948')
  await page.getByLabel('Продолжается сейчас').uncheck()
  const end = page.getByRole('group', { name: 'Конец периода' })
  await end.getByLabel('Точность').selectOption('year')
  await end.getByPlaceholder('ГГГГ').fill('2010')
  await page.getByRole('button', { name: 'Сохранить' }).click()
  await expect(page.getByRole('heading', { name: 'Жизнь бабушки Анны' })).toBeVisible()

  await openNewEntry(page)
  await page.getByLabel(/Название/).fill('Важные отношения')
  await page.getByRole('dialog').locator('label').filter({ hasText: 'Категория' }).locator('select').selectOption({ label: 'Отношения' })
  await page.getByRole('button', { name: 'Сохранить' }).click()
  await expect(page.getByText(/продолжается сейчас/)).toBeVisible()

  await openNewEntry(page)
  await page.getByLabel(/Название/).fill('Переезд в новый город')
  await page.getByRole('dialog').locator('label').filter({ hasText: 'Тип' }).locator('select').selectOption('moment')
  const moment = page.getByRole('group', { name: 'Дата события' })
  await moment.getByLabel('Точность').selectOption('year')
  await moment.getByPlaceholder('ГГГГ').fill('2012')
  await moment.getByLabel('Дата приблизительная').check()
  await page.getByRole('button', { name: 'Сохранить' }).click()
  await expect(page.getByText('≈ 2012', { exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Скрыть категорию Люди' }).click()
  await expect(page.getByRole('button', { name: /Жизнь бабушки Анны/ })).toHaveCount(0)
  await page.reload()
  await expect(page.getByRole('button', { name: 'Показать категорию Люди' })).toBeVisible()
  await page.getByRole('button', { name: 'Показать категорию Люди' }).click()

  await page.getByRole('button', { name: /Переезд в новый город/ }).click()
  await page.getByRole('button', { name: 'Редактировать' }).click()
  await page.getByLabel(/Название/).fill('Первый большой переезд')
  await page.getByRole('button', { name: 'Сохранить' }).click()
  await expect(page.getByRole('heading', { name: 'Первый большой переезд' })).toBeVisible()
  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: 'Удалить' }).click()
  await expect(page.getByRole('heading', { name: 'Первый большой переезд' })).toHaveCount(0)
  await page.reload()
  await expect(page.getByRole('button', { name: /Важные отношения/ })).toBeVisible()
})

test('Течение, версия, экспорт, безопасный импорт и восстановление', async ({ page }, testInfo) => {
  await onboard(page, 'Мария')
  await page.getByRole('link', { name: 'Течение' }).click()
  await expect(page.getByRole('heading', { name: 'Течение' })).toBeVisible()
  await expect(page.locator('.flow-page > .life-card').first()).toContainText('Моя жизнь')
  await expect(page.getByText('Без конечной даты')).toHaveCount(0)
  await expect(page.locator('.flow-card h2')).toHaveText(['Год', 'Месяц', 'Неделя', 'День'])
  await expect(page.getByText(/%/).first()).toBeVisible()
  await expect(page.getByText('Календарных дней')).toBeVisible()

  await page.getByRole('link', { name: 'Настройки' }).click()
  await page.getByRole('button', { name: 'Версия 0.2.0' }).click()
  await expect(page.getByRole('heading', { name: 'История изменений' })).toBeVisible()
  await page.getByRole('dialog').getByRole('button', { name: 'Закрыть' }).click()

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Скачать резервную копию' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toMatch(/^chronoatlas-backup-\d{4}-\d{2}-\d{2}-\d{4}\.json$/)
  const downloadPath = await download.path()
  expect(downloadPath).toBeTruthy()

  const invalidPath = testInfo.outputPath('invalid-backup.json')
  await writeFile(invalidPath, '{not json')
  await page.locator('input[type="file"]').setInputFiles(invalidPath)
  await expect(page.getByText('Файл не является корректным JSON')).toBeVisible()
  await expect(page.locator('#profile input').first()).toHaveValue('Мария')

  await page.locator('input[type="file"]').setInputFiles(downloadPath!)
  await expect(page.getByRole('heading', { name: 'Проверка резервной копии' })).toBeVisible()
  await expect(page.getByText('Категорий').last()).toBeVisible()
  await page.getByRole('button', { name: 'Заменить данные' }).click()
  await expect(page.getByText('Данные полностью восстановлены из копии.')).toBeVisible()
})

test('production PWA запускается офлайн после первого открытия', async ({ page, context }) => {
  const externalRequests: string[] = []
  page.on('request', (request) => {
    if (new URL(request.url()).origin !== 'http://127.0.0.1:4173') externalRequests.push(request.url())
  })
  await page.goto('/')
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute('href', './icon.svg')
  await page.waitForTimeout(1_000)
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller), null, { timeout: 15_000 })
  await context.setOffline(true)
  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: 'ChronoAtlas' })).toBeVisible()
  await expect(page.getByText('Все данные останутся только в этом браузере.')).toBeVisible()
  expect(externalRequests).toEqual([])
})
