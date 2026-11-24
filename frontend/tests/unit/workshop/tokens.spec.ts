import { expect, test } from 'vitest';
import { RobotSimulation } from '../../../src/game/simulation';
import { level } from '../../support/level';

test('running over one ground token adds exactly one token', () => {
  // Arrange
  const token = { id: 1, distance: 20, height: 14 };
  const robot = new RobotSimulation(level({ stars: [token] }));

  // Act
  robot.advance(500);

  // Assert
  expect(robot.tokens).toBe(1);
});

// TODO: Exercise 1.
test.skip('running under an overhead token leaves the token count at zero', () => {
  throw new Error('Set up an overhead token, advance the game, and check the result.');
});

test.skip('jumping into an overhead token adds exactly one token', () => {
  throw new Error('Create a fresh robot on the same course and jump before reaching the token.');
});

// TODO: Bonus: What else in Slop Jumpers would you like to test?
