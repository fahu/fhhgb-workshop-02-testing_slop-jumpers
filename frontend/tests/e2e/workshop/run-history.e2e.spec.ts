import { expect, test } from '@playwright/test';
import { fillPilotDetails, openGame } from '../../support/pilot';

test('starting a run shows the registered pilot in the game', { tag: '@demo' }, async ({ page }) => {
  // Arrange
  await openGame(page);
  await fillPilotDetails(page, 'Workshop pilot');

  // Act
  await page.getByRole('button', { name: 'Start running' }).click();

  // Assert
  const game = page.getByRole('region', { name: 'Runner game' });
  await expect(game.getByText('Workshop pilot')).toBeVisible();
});

test.fixme('Previous runs shows the distance and obstacle from the finish screen after a reload', async ({ page }) => {
  await openGame(page);
  throw new Error('Write your end-to-end test here.');
});
