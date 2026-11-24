# Slop Jumpers exercises

Play a round of Slop Jumpers before you start. Which parts of that run could you test without opening a browser? If you need help starting the game, follow the [README](README.md#run-the-game).

| Exercise | What will you test? | Run from the `slop-jumpers` folder |
| --- | --- | --- |
| [1. Unit tests](exercises/01-unit-tests.md) | Can the robot reach the token without jumping? | `npm run test:unit` |
| [2. Integration tests](exercises/02-integration-tests.md) | Can the game retry a checkpoint after a reload? What if the backend receives it twice? | `npm run test:integration` |
| [3. End-to-end tests](exercises/03-end-to-end-tests.md) | After a reload, does **Previous runs** still show how far you ran and which obstacle you hit? | `npm run test:e2e` |

Start with the working example, then write your own test. For the bonus, pick something else in the game that you'd like to test.

## Before class

1. Install Node.js 24 with npm. For exercises 2 and 3, you'll also need JDK 21.
2. Open a terminal in the `slop-jumpers` folder and run `npm --prefix frontend ci` to install the test tools.
3. Download Chromium for exercise 3 with `npm --prefix frontend exec -- playwright install chromium`. Run this command again if you update Playwright.
4. Run each test command in the table once while you're online. Maven downloads the Java dependencies on its first run. For exercise 3, leave ports 8093 and 5176 free so Playwright can start the backend and frontend.

The examples should pass. The tests marked as skipped or unfinished are the ones you'll write in class.
