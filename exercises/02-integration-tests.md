# Exercise 2: Integration tests

At 1,500 metres, Slop Jumpers saves the player's first checkpoint. How can you tell that the backend saved it? What should the game do if the server is busy?

Run `npm run test:integration` from the project folder. The command starts the Java backend with a fresh H2 database and runs the tests. If this is your first exercise, follow the [workshop setup](../EXERCISES.md#before-class) first.

## Follow a checkpoint from the game to the database

Open [sync.spec.ts](../frontend/tests/integration/sync.spec.ts). The first test starts a run and sends a checkpoint through the game's sync queue. Find the request that reads the run back. Why does the test wait for confirmation before it checks the distance, token count, and time?

The second test uses the same queue. This time, a mock returns `503 Service Unavailable` on the first request and a successful response on the retry. Find the assertion that checks what the client sent both times.

## Write a frontend test for a page reload

The server returns a 503 when the game tries to save a checkpoint. The player reloads the page and clicks **Retry**. Can the game still send the original checkpoint?

Add a third test to `sync.spec.ts`. Turn the `test.todo` at the bottom into an async `test` and write the test body.

1. Create a sync queue with `memoryStorage()`. Make the first request return a 503. Queue a checkpoint and wait until the queue reports the error.
2. To simulate the reload, create a new `CheckpointSync` with the same storage. Make the next request succeed. Call `retry()` on the new queue without queuing the checkpoint again.
3. Check what the new queue sent. It should send the original run ID, checkpoint number, and progress in one retry. After confirmation, it should report zero pending saves.

Run `npm --prefix frontend run test:retry` from the project folder. Both the retry example and your new test should pass. Now give the second queue an empty `memoryStorage()`. Does your test catch the lost checkpoint? Restore the shared storage and run it again.

## Send the same checkpoint twice in Java

What if the backend saved the checkpoint, but the game missed the confirmation? The game sends it again. The player should still have one saved checkpoint.

1. Open [CheckpointWorkshopTest.java](../backend/src/test/java/at/fhhagenberg/slopjumpers/CheckpointWorkshopTest.java). The first test saves one checkpoint and reads the run back. Use its setup for the second test. Remove `@Disabled` from `retryingAnIdenticalCheckpointStoresItOnlyOnce`.
2. Start one run. Send the same checkpoint twice, with the same checkpoint number and progress.
3. Check that both requests return HTTP 200. The first receipt should say `duplicate: false` and the second should say `duplicate: true`.
4. Use `checkpointCount(runId)` to check that the database contains exactly one checkpoint for this run. Run `npm run test:integration` again.

## Bonus

What else in Slop Jumpers would you like to test? Choose two parts of the game that work together and write an integration test for them. What bug would your test catch?
