# Exercise 3: End-to-end tests

You finish a run and see how far you got. If you reload the game, can you still see that distance and the obstacle you hit? Write a Playwright test that checks what the player sees.

## Install Chromium and run the example

Running E2E tests in Playwright requires a real browser. Execute the following commands to install the frontend dependencies and Chromium before your first browser test.

```sh
cd frontend
npm ci
npx playwright install chromium
cd ..
```

If Playwright reports `Executable doesn't exist` after an update, run `npx playwright install chromium` again from `frontend/`.

Run `npm run test:browser:demo` from the project folder or from `frontend/`. Playwright starts the game and opens Chromium and the Playwright Inspector.

Put the two windows side by side. Click **Step over** in the Inspector to watch Playwright enter the pilot name, select the nationality, and click **Start running**. The last line of the [registration test](../frontend/tests/e2e/workshop/run-history.e2e.spec.ts) checks the name shown in the game. Click **Resume** to finish.

## Write a test for a finished run

1. In the second test, change `test.fixme` to `test` and replace the `throw` line with your test code. Add [startRun](../frontend/tests/support/pilot.ts) to the import from `../../support/pilot`. Call `await startRun(page)` and let the robot hit the first obstacle without jumping.
2. Read the distance and the “Hit …” message from the finish screen. Use the distance from this run as your expected value. For example, the finish screen shows `175 metres.` and **Previous runs** shows `175 m`.
3. Wait until the result appears in **Previous runs**. The finish screen appears while the game is still saving. A Playwright assertion such as `await expect(...).toBeVisible()` waits for the result.
4. Reload the same tab with `await page.reload()`. Check that one entry in **Previous runs** shows both the distance and the obstacle you read from the finish screen.

Run `npm run test:e2e`. Now change the distance you expect after the reload. Does the test fail on the history entry? Restore the correct distance and run `npm run test:e2e -- --repeat-each=2` to check that the test passes twice.

## Bonus

Which other part of Slop Jumpers would you test in a browser? Pick something a player can do and write an end-to-end test for it. What would the player see if it broke?
