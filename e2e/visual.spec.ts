import { test, expect, type Page } from '@playwright/test'

async function onboard(page: Page) {
  await page.goto('/')
  await page.getByRole('button', { name: 'Начать' }).click()
  await page.getByLabel(/Дата рождения/).fill('1988-11-03')
  await page.getByLabel(/Имя или обращение/).fill('Визуальный тест')
  await page.getByRole('button', { name: 'Создать атлас' }).click()
}

async function addPeriod(page: Page, title: string, category: string, startDate: string, ongoing = true) {
  await page.getByRole('button', { name: '+ Добавить', exact: true }).click()
  await page.getByLabel(/Название/).fill(title)
  await page.getByRole('dialog').locator('label').filter({ hasText: 'Категория' }).locator('select').selectOption({ label: category })
  await page.getByRole('dialog').locator('input[type="date"]').first().fill(startDate)
  if (!ongoing) {
    await page.getByLabel('Продолжается сейчас').uncheck()
    await page.getByRole('dialog').locator('input[type="date"]').last().fill('2018-08-20')
  }
  await page.getByRole('button', { name: 'Сохранить' }).click()
}

test('визуальная матрица основных экранов и тем', async ({ page }, testInfo) => {
  await onboard(page)
  await addPeriod(page, 'Долгая линия с выразительным названием для проверки подписей', 'Люди', '1970-02-11', false)
  await addPeriod(page, 'Работа над важным проектом', 'Работа', '2021-03-01')
  await addPeriod(page, 'Переезд и новый дом', 'Жильё', '2016-05-12', false)
  await page.getByRole('button', { name: 'Все записи' }).click()

  for (const viewport of [{ width: 1366, height: 768 }, { width: 1440, height: 900 }, { width: 1920, height: 1080 }]) {
    await page.setViewportSize(viewport)
    await expect(page.getByRole('heading', { name: 'Карта жизни' })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
    await page.screenshot({ path: testInfo.outputPath(`map-${viewport.width}x${viewport.height}.png`), fullPage: true })
  }

  await page.getByRole('link', { name: 'Течение' }).click()
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.screenshot({ path: testInfo.outputPath('flow-1440x900.png'), fullPage: true })

  await page.getByRole('link', { name: 'Настройки' }).click()
  await page.getByText('Тёмная', { exact: true }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.screenshot({ path: testInfo.outputPath('settings-dark-1440x900.png'), fullPage: true })

  await page.getByRole('link', { name: 'Карта жизни', exact: true }).click()
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(page.getByRole('heading', { name: 'Карта жизни' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
  await page.screenshot({ path: testInfo.outputPath('map-mobile-detail-dark-390x844.png'), fullPage: true })
  await page.locator('.details-panel').getByRole('button', { name: 'Закрыть' }).click()
  await page.screenshot({ path: testInfo.outputPath('map-mobile-dark-390x844.png'), fullPage: true })
})
