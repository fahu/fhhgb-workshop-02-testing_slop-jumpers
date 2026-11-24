import { expect, test, type Locator, type Page } from '@playwright/test';
import { openGame, startRun } from '../support/pilot';

async function startSavedRun(page: Page) {
  const creation = page.waitForResponse(response =>
    response.url().endsWith('/api/runs') && response.request().method() === 'POST',
  );
  await startRun(page);
  const response = await creation;
  expect(response.status()).toBe(201);
  return await response.json() as { id: string; playerId: string };
}

test('starting a run records a zero-metre start in Previous runs', async ({ page, request }) => {
  // Arrange
  await openGame(page);

  // Act
  const run = await startSavedRun(page);

  // Assert
  const history = page.locator('#history');
  await expect(history).toContainText('0 m');
  await expect(history).toContainText('Started');
  const saved = await request.get(`/api/runs/${run.id}`);
  expect(await saved.json()).toMatchObject({ distance: 0, finished: false });
});

test('retrying a failed profile load restores the latest registered pilot', async ({ page, request }) => {
  // Arrange a newer profile on the server while the first run is open.
  await openGame(page);
  const run = await startSavedRun(page);
  const updated = await request.post('/api/runs', {
    data: { playerId: run.playerId, alias: 'Server pilot', nationalityCode: 'DE' },
  });
  expect(updated.status()).toBe(201);
  await page.route(`**/api/players/${run.playerId}/profile`, route =>
    route.fulfill({ status: 503, json: { message: 'Profile temporarily unavailable.' } }), { times: 1 });
  await page.locator('#restart').click();
  const dialog = page.getByRole('alertdialog', { name: 'Registration unavailable' });
  await expect(dialog).toBeVisible();

  // Act
  await dialog.getByRole('button', { name: 'Retry' }).click();

  // Assert
  await expect(dialog).toBeHidden();
  await expect(page.getByLabel('Name', { exact: true })).toHaveValue('Server pilot');
  await expect(page.getByLabel('Nationality', { exact: true })).toHaveValue('DE');
});

async function edgesOf(locator: Locator) {
  return locator.evaluate(element => {
    const { top, right, bottom, left } = element.getBoundingClientRect();
    return { top, right, bottom, left };
  });
}

test.describe('mobile game', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  test('registration fits the viewport without horizontal scrolling', async ({ page }) => {
    await openGame(page);

    const contentWidth = await page.evaluate(() => document.documentElement.scrollWidth);

    expect(contentWidth).toBeLessThanOrEqual(390);
  });

  test('a leaderboard refresh error stays inside the leaderboard panel', async ({ page }) => {
    await openGame(page);
    await page.route('**/api/leaderboard', route => route.fulfill({ status: 503 }));

    await page.getByRole('button', { name: 'Refresh leaderboard' }).click();

    await expect(page.locator('#leaderboard-title')).toHaveText('Refresh failed');
    const panel = await edgesOf(page.locator('#leaderboard-panel'));
    const overlay = await edgesOf(page.locator('#leaderboard-overlay'));
    expect(overlay.left).toBeGreaterThanOrEqual(panel.left);
    expect(overlay.top).toBeGreaterThanOrEqual(panel.top);
    expect(overlay.right).toBeLessThanOrEqual(panel.right);
    expect(overlay.bottom).toBeLessThanOrEqual(panel.bottom);
  });

  test('tapping to jump collects the first overhead token', async ({ page }) => {
    // The first token is 60 m ahead. Control the game clock to tap just before it.
    await page.clock.install({ time: new Date('2026-01-01T12:00:00Z') });
    await page.clock.pauseAt(new Date('2026-01-01T12:00:01Z'));
    await openGame(page);
    await startRun(page);
    await page.clock.runFor(750);

    await page.locator('#trail').tap();
    await page.clock.runFor(500);

    await expect(page.locator('#tokens')).toHaveText('1');
  });

  test('restarting during play records the run as finished', async ({ page }) => {
    await openGame(page);
    await startRun(page);

    await page.locator('#restart').click();

    await expect(page.locator('#history')).toContainText('Finished');
  });

  test('restarting during play restores the pilot’s registration', async ({ page }) => {
    await openGame(page);
    await startRun(page);

    await page.locator('#restart').click();

    await expect(page.getByLabel('Name', { exact: true })).toHaveValue('Robot pilot');
    await expect(page.getByLabel('Nationality', { exact: true })).toHaveValue('AT');
  });
});
