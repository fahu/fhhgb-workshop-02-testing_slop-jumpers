# Slop Jumpers

We'll use Slop Jumpers for the Automated Testing Strategies workshop at FH Hagenberg. Play a round before you start the exercises. You'll be writing tests for token collection, checkpoint saves, and the run history.

## Run the game

You'll need JDK 21 and Node.js 24 with npm. Clone the project into a folder called `slop-jumpers`.

```sh
git clone https://github.com/fahu/fhhgb-workshop-02-testing_slop-jumpers.git slop-jumpers
```

Open two terminals in the `slop-jumpers` folder.

### Start the backend in terminal 1

Use the Maven wrapper for your system. On macOS or Linux, run these commands.

```sh
cd backend
./mvnw spring-boot:run
```

On Windows, run these commands in PowerShell.

```powershell
cd backend
.\mvnw.cmd spring-boot:run
```

The first run downloads Maven and the Java dependencies. When the backend is ready, [the health check](http://localhost:8092/api/health) returns `{"status":"UP"}`. Leave this terminal running.

### Start the frontend in terminal 2

```sh
cd frontend
npm ci
npm run dev
```

Open [Slop Jumpers](http://localhost:5175). Enter a pilot name, choose a nationality, and click **Start running**. Press **Space** or tap the game to jump.

Next time, run `npm run dev` from `frontend/`. You only need `npm ci` again if the dependencies change. To stop the game, press **Ctrl+C** in both terminals. Stopping the backend clears the saved runs.

## Workshop exercises

Run the test commands from the `slop-jumpers` folder. For the full setup, see the [workshop instructions](EXERCISES.md).

| Exercise | Test command |
| --- | --- |
| [1. Unit tests](exercises/01-unit-tests.md) | `npm run test:unit` |
| [2. Integration tests](exercises/02-integration-tests.md) | `npm run test:integration` |
| [3. End-to-end tests](exercises/03-end-to-end-tests.md) | `npm run test:e2e` |

Before your first end-to-end test, run `npx playwright install chromium` from `frontend/`. Repeat this after updating Playwright. To watch Playwright register a pilot one step at a time, run `npm run test:browser:demo` from the project folder.
