import { COURSE_VERSION, LEVEL_METERS } from '../../src/game/course';
import type { Level } from '../../src/types';

export function level(overrides: Partial<Level> = {}): Level {
  return {
    number: 1,
    courseVersion: COURSE_VERSION,
    start: 0,
    end: LEVEL_METERS,
    obstacles: [],
    stars: [],
    ...overrides,
  };
}
