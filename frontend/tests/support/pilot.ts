import { expect, type Page } from '@playwright/test';

export async function openGame(page: Page): Promise<void> {
  await page.goto('/');
  await expect(page.locator('#network')).toBeHidden();
  await expect(page.locator('#leaderboard-overlay')).toBeHidden();
}

export async function fillPilotDetails(page: Page, name: string, nationality = 'AT'): Promise<void> {
  await page.getByLabel('Name', { exact: true }).fill(name);
  await page.getByLabel('Nationality', { exact: true }).selectOption(nationality);
}

export async function startRun(page: Page, alias = 'Robot pilot', nationality = 'AT'): Promise<void> {
  await fillPilotDetails(page, alias, nationality);
  await page.getByRole('button', { name: 'Start running' }).click();
  await expect(page.locator('#pilot')).toContainText(alias);
  await expect(page.locator('#game-hud')).toBeVisible();
  await expect(page.locator('#network')).toBeHidden();
}
