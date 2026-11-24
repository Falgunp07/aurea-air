import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

async function checkAccessibility(page) {
  const audit = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()
  expect(
    audit.violations.map(({ id, nodes }) => ({ id, elements: nodes.map((node) => node.target) })),
  ).toEqual([])
}

test('a household can plan around a fixed pickup and check its evidence', async ({ page }) => {
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/')
  await expect(page.getByText('42 µg/m³', { exact: true })).toBeVisible()
  await checkAccessibility(page)
  await page
    .getByLabel(/routine and constraints/i)
    .fill(
      'School pickup is fixed at 3 pm. The grocery shop closes at 2 pm. No extra travel budget.',
    )
  await page.getByRole('button', { name: 'Create my plan' }).click()
  await expect(page.getByRole('heading', { name: /your household plan/i })).toBeVisible()
  await expect(page.getByText('Standard plan', { exact: true })).toBeVisible()
  await expect(page.locator('.result')).toContainText(/clos|pickup/i)
  await checkAccessibility(page)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
  expect(errors).toEqual([])
})

test('guide supports keyboard follow-ups and restores focus on dismissal', async ({ page }) => {
  await page.goto('/')
  const launcher = page.getByRole('button', { name: 'Air guide', exact: true })
  await launcher.focus()
  await page.keyboard.press('Enter')
  const dialog = page.getByRole('dialog', { name: 'Air guide' })
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: 'Find a travel alternative' }).click()
  await dialog.getByRole('button', { name: 'The shop closes early' }).click()
  await expect(dialog.getByRole('heading', { name: 'The shop closes early' })).toBeFocused()
  await checkAccessibility(page)
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(launcher).toBeFocused()
})

test('invalid windows return focus to the field and allow correction', async ({ page }) => {
  await page.goto('/')
  const end = page.getByLabel('Until', { exact: true })
  await end.selectOption('12')
  await page.getByRole('button', { name: 'Create my plan' }).click()
  await expect(end).toBeFocused()
  await expect(end).toHaveAttribute('aria-invalid', 'true')
  await expect(page.getByRole('main').getByRole('alert')).toContainText('end hour')
  await end.selectOption('19')
  await page.getByLabel(/my local authority/i).check()
  await page.getByRole('button', { name: 'Create my plan' }).click()
  await expect(page.getByRole('heading', { name: /your household plan/i })).toBeFocused()
  await expect(page.locator('.result')).toContainText(/until the advisory is lifted/)
})
