# Exercise 1: Unit tests

For this exercise, you'll write tests for the "token collection" logic. Work on your own, but feel free to compare tests with a colleague.

## Test token collection

1. Open [the token tests](../frontend/tests/unit/workshop/tokens.spec.ts). The first test puts one token 20 metres ahead, just above the belt. Calling `robot.advance(500)` lets the robot run for half a second. How many tokens do you expect it to collect? Run `npm run test:unit` from the project folder to check. Find the Arrange, Act, and Assert parts of the test.

2. Now raise the token to 106 pixels and keep it at the 20-metre mark. Complete the two skipped tests in the same file. For each test, change `test.skip` to `test` and replace the `throw` line. Give each test its own robot and advance the game by 500 milliseconds.
   - Let the robot run under the token. Check that it has zero tokens.
   - Call `robot.jump()` before you advance the game. Check that the robot collects exactly one token.

   Run the tests again. All three should pass.

3. What if the game counted each token twice? In [the robot simulation](../frontend/src/game/simulation.ts), temporarily change `this.tokens++` to `this.tokens += 2`. Which tests do you expect to fail? Run them and compare the failures with your prediction. Would a test that only checked whether the robot was still alive catch this bug? Undo the change and run the tests once more.

## Bonus

What else in Slop Jumpers would you like to test? Choose a behavior and write your own unit test(s) for it. What bug would your test catch?
