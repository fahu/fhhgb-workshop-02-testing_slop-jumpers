import { describe, expect, test } from 'vitest';
import { RobotSimulation } from '../../src/game/simulation';
import { level } from '../support/level';

test('two ground tokens at the same position count as two pickups', () => {
  const stars = [
    { id: 1, distance: 20, height: 14 },
    { id: 2, distance: 20, height: 14 },
  ];
  const robot = new RobotSimulation(level({ stars }));

  robot.advance(500);

  expect(robot.tokens).toBe(2);
});

describe('Collisions', () => {
  const hand = { distance: 180, width: 4, height: 27, slopId: 'seven-finger-hand' };

  test('running into an obstacle ends the run at its near edge', () => {
    // Arrange
    const robot = new RobotSimulation(level({ obstacles: [hand] }));

    // Act
    robot.advance(4_000);

    // Assert
    expect(robot.dead).toBe(true);
    // Both the robot and this obstacle extend 2 m on either side of their centres.
    expect(robot.distance).toBeGreaterThanOrEqual(176);
    expect(robot.distance).toBeLessThan(180);
  });

  test('the collision report identifies the first obstacle hit', () => {
    // Arrange
    const secondObstacle = { ...hand, distance: 220, slopId: 'second-obstacle' };
    const robot = new RobotSimulation(level({ obstacles: [hand, secondObstacle] }));

    // Act
    robot.advance(4_000);

    // Assert
    expect(robot.progress().collisionId).toBe(hand.slopId);
  });

  test('distance and game time stay fixed after a collision', () => {
    // Arrange
    const robot = new RobotSimulation(level({ obstacles: [hand] }));
    robot.advance(4_000);
    expect(robot.dead, 'the robot must hit the obstacle during setup').toBe(true);
    const distanceAtImpact = robot.distance;
    const timeAtImpact = robot.elapsedMs;

    // Act
    robot.advance(1_000);

    // Assert
    expect(robot.distance).toBe(distanceAtImpact);
    expect(robot.elapsedMs).toBe(timeAtImpact);
  });
});

describe('Running speed', () => {
  test('ten seconds of running increase the speed to 68 metres per second', () => {
    // Arrange
    const robot = new RobotSimulation(level());

    // Act
    robot.advance(10_000);

    // Assert
    expect(robot.speed).toBe(68);
  });

  test('a long uninterrupted run caps the speed at 130 metres per second', () => {
    // Arrange
    const robot = new RobotSimulation(level({ end: 30_000 }));

    // Act
    robot.advance(120_000);

    // Assert
    expect(robot.speed).toBe(130);
  });
});

describe('Jumping through an obstacle belt', () => {
  // An empty approach gives the robot room to accelerate before the first jump.
  const approaches = [
    { name: 'starting speed', speed: 60, approachMetres: 0, warmupMs: 0 },
    { name: 'maximum speed', speed: 130, approachMetres: 10_000, warmupMs: 100_000 },
  ];

  for (const { name, speed, approachMetres, warmupMs } of approaches) {
    test(`a robot entering at ${name} can jump over all twelve obstacles`, () => {
      // Arrange
      const gate = approachMetres + 1_500;
      const robot = new RobotSimulation(level({ end: gate, obstacles: beltObstacles(approachMetres) }));
      robot.advance(warmupMs);
      expect(robot.speed, 'speed before the first jump').toBe(speed);

      // Act
      jumpThroughBelt(robot);

      // Assert
      expect(robot).toMatchObject({ levelComplete: true, dead: false, distance: gate });
      expect(robot.progress().collisionId).toBeUndefined();
    });
  }
});

describe('Belt gates', () => {
  function robotAtFirstGate() {
    const robot = new RobotSimulation(level({ end: 30 }));
    robot.advance(1_000);
    expect(robot, 'the robot must reach the first gate during setup').toMatchObject({
      levelComplete: true,
      distance: 30,
    });
    return robot;
  }

  test('waiting for the next belt keeps the robot and game clock at the gate', () => {
    // Arrange
    const robot = robotAtFirstGate();
    const timeAtGate = robot.elapsedMs;

    // Act
    robot.advance(1_000);

    // Assert
    expect(robot.distance).toBe(30);
    expect(robot.elapsedMs).toBe(timeAtGate);
  });

  test('loading the next belt lets the robot run beyond the gate', () => {
    // Arrange
    const robot = robotAtFirstGate();
    const nextBelt = level({ number: 2, start: 30, end: 60 });

    // Act
    robot.loadLevel(nextBelt);
    robot.advance(100);

    // Assert
    expect(robot.distance).toBeGreaterThan(30);
  });

  test('the gate rejects a belt that skips a number', () => {
    // Arrange
    const robot = robotAtFirstGate();
    const thirdBelt = level({ number: 3, start: 30, end: 60 });

    // Act & Assert
    expect(() => robot.loadLevel(thirdBelt)).toThrow('The next level does not match this run.');
  });

  test('the gate rejects a belt that starts beyond the current gate', () => {
    // Arrange
    const robot = robotAtFirstGate();
    const beltWithGap = level({ number: 2, start: 31, end: 61 });

    // Act & Assert
    expect(() => robot.loadLevel(beltWithGap)).toThrow('The next level does not match this run.');
  });
});

function beltObstacles(start: number) {
  const offsets = [180, 285, 395, 505, 615, 725, 835, 945, 1_055, 1_165, 1_275, 1_385];
  return offsets.map((offset, slot) => ({
    distance: start + offset,
    width: 4 + slot % 3,
    height: 27 + 6 * (slot % 3),
    slopId: `obstacle-${slot + 1}`,
  }));
}

function jumpThroughBelt(robot: RobotSimulation) {
  const jumpLeadMs = 240;
  for (const obstacle of robot.level.obstacles) {
    const travelMs = (obstacle.distance - robot.distance) / robot.speed * 1_000;
    robot.advance(travelMs - jumpLeadMs);
    robot.jump();
  }
  robot.advance(3_000);
}
