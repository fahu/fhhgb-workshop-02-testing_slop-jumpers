import { expect, test } from '@playwright/test';
import { fillPilotDetails, openGame, startRun } from '../support/pilot';

test('a blank pilot name keeps registration open with a validation message', async ({ page }) => {
  await openGame(page);
  await fillPilotDetails(page, '   ');

  await page.getByRole('button', { name: 'Start running' }).click();

  await expect(page.getByLabel('Name', { exact: true })).toHaveJSProperty(
    'validationMessage', 'Enter a name with at least one visible character.',
  );
  await expect(page.locator('#profile')).toBeVisible();
  await expect(page.getByRole('alertdialog')).toBeHidden();
});

test('correcting a rejected name lets the pilot start playing', async ({ page }) => {
  await openGame(page);
  await fillPilotDetails(page, '   ');
  await page.getByRole('button', { name: 'Start running' }).click();
  await expect(page.getByLabel('Name', { exact: true })).toBeFocused();

  await startRun(page, 'Ready to run');

  await expect(page.locator('#trail')).toBeFocused();
});

test('running into the first obstacle shows what ended the run', async ({ page }) => {
  await openGame(page);

  await startRun(page);

  await expect(page.locator('#finish-hit')).toHaveText('Hit Seven-Finger Hand', { timeout: 15_000 });
  await expect(page.locator('#finish-detail')).toContainText('two bonus fingers');
  await expect(page.locator('#finish-detail')).toContainText('1 token');
  await expect(page.locator('#lives')).toHaveAttribute('aria-label', '0 lives');
  const metres = Number(await page.locator('#distance').innerText());
  expect(metres).toBeGreaterThan(0);
  expect(metres).toBeLessThan(180);
});

test('Previous runs identifies the obstacle that ended this pilot’s run', async ({ page }) => {
  await openGame(page);

  await startRun(page);

  await expect(page.locator('#history')).toContainText('Hit Seven-Finger Hand', { timeout: 15_000 });
});

test('finishing a run refreshes the rankings before the next periodic update', async ({ page }) => {
  // Arrange. The leaderboard normally refreshes every ten seconds.
  await page.clock.install({ time: new Date('2026-01-01T12:00:00Z') });
  await page.clock.pauseAt(new Date('2026-01-01T12:00:01Z'));
  await openGame(page);
  await startRun(page);

  // Act. Let the first obstacle end the run while the periodic refresh is still pending.
  const [ranking] = await Promise.all([
    page.waitForResponse(response => response.url().endsWith('/api/leaderboard')),
    page.clock.runFor(3500),
  ]);

  // Assert against the live ranking. Other pilots may already hold the top eight places.
  await expect(page.locator('#finish-hit')).toHaveText('Hit Seven-Finger Hand');
  expect(ranking.ok()).toBe(true);
  const { entries } = await ranking.json();
  expect(entries.length).toBeGreaterThan(0);
  await expect(page.locator('#records li strong').first()).toHaveText(entries[0].alias);
});

test('restarting after a collision resets the distance and restores registration', async ({ page }) => {
  await openGame(page);
  await startRun(page, 'Returning pilot');
  await expect(page.locator('#finish-overlay')).toBeVisible({ timeout: 15_000 });

  await page.locator('#again').click();

  await expect(page.getByLabel('Name', { exact: true })).toHaveValue('Returning pilot');
  await expect(page.getByLabel('Nationality', { exact: true })).toHaveValue('AT');
  await expect(page.locator('#distance')).toHaveText('0');
});

test('a complete run and restart produce no uncaught browser errors', async ({ page }) => {
  const errors: Error[] = [];
  page.on('pageerror', error => errors.push(error));
  await openGame(page);

  await startRun(page);
  await expect(page.locator('#finish-overlay')).toBeVisible({ timeout: 15_000 });
  await page.locator('#again').click();

  await expect(page.getByLabel('Name', { exact: true })).toHaveValue('Robot pilot');
  expect(errors).toEqual([]);
});

test('registration remembers the pilot details used for the latest run', async ({ page }) => {
  await openGame(page);
  await startRun(page, 'First pilot', 'AT');
  await page.reload();
  const name = page.getByLabel('Name', { exact: true });
  const nationality = page.getByLabel('Nationality', { exact: true });
  await expect(name).toHaveValue('First pilot');
  await expect(nationality).toHaveValue('AT');

  await startRun(page, 'Second pilot', 'DE');
  await page.reload();

  await expect(name).toHaveValue('Second pilot');
  await expect(nationality).toHaveValue('DE');
});

test('a new player sees an empty history even when another player has a run', async ({ page, browser, baseURL }) => {
  await openGame(page);
  await startRun(page, 'First player');
  await expect(page.locator('#history .history-row')).toHaveCount(1);

  const secondSession = await browser.newContext({ baseURL });
  try {
    const secondPage = await secondSession.newPage();
    await openGame(secondPage);
    await expect(secondPage.locator('#history')).toHaveText('Your story starts with the first run.');
  } finally {
    await secondSession.close();
  }
});
