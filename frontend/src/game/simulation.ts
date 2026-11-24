import { ACCELERATION, COURSE_VERSION, MAX_SPEED, START_SPEED } from './course';
import type { Level, Obstacle, Progress } from '../types';

/** Fixed-step collision simulation; independent of drawing, network waits and viewport size. */
export class RobotSimulation {
  distance = 0;
  tokens = 0;
  elapsedMs = 0;
  y = 0;
  private vy = 0;
  collision: Obstacle | null = null;
  levelComplete = false;
  level: Level;
  collected = new Set<number>();

  constructor(level: Level) {
    this.level = level;
    this.distance = level.start;
  }

  get speed(): number {
    return Math.min(MAX_SPEED, START_SPEED + ACCELERATION * this.elapsedMs / 1000);
  }

  get dead(): boolean {
    return this.collision !== null;
  }

  progress(): Progress {
    return {
      distance: Math.floor(this.distance), tokens: this.tokens, elapsedMs: Math.round(this.elapsedMs),
      ...(this.collision ? { collisionId: this.collision.slopId } : {}),
    };
  }

  loadLevel(level: Level): void {
    if (!this.levelComplete || level.start !== this.distance || level.number !== this.level.number + 1 || level.courseVersion !== COURSE_VERSION) {
      throw new Error('The next level does not match this run.');
    }
    this.level = level;
    this.levelComplete = false;
    this.collected.clear();
  }

  jump(): void {
    if (!this.dead && !this.levelComplete && this.y === 0) {
      this.vy = 480;
    }
  }

  advance(ms: number): void {
    // Small steps prevent crossing thin obstacles between frames at maximum speed.
    for (let remaining = ms; remaining > 0 && !this.dead && !this.levelComplete;) {
      const dt = Math.min(remaining, 8) / 1000;
      remaining -= dt * 1000;
      this.distance = Math.min(this.level.end, this.distance + this.speed * dt + ACCELERATION * dt * dt / 2);
      this.elapsedMs += dt * 1000;
      this.y = Math.max(0, this.y + this.vy * dt - 750 * dt * dt);
      this.vy = this.y === 0 ? 0 : this.vy - 1500 * dt;
      for (const obstacle of this.level.obstacles) {
        if (Math.abs(obstacle.distance - this.distance) < obstacle.width / 2 + 2 && this.y < obstacle.height) {
          this.collision = obstacle;
          return;
        }
      }
      for (const token of this.level.stars) {
        if (!this.collected.has(token.id) && Math.abs(token.distance - this.distance) < 3 &&
          this.y <= token.height + 6 && this.y + 54 >= token.height - 6) {
          this.collected.add(token.id);
          this.tokens++;
        }
      }
      if (this.distance >= this.level.end) {
        this.levelComplete = true;
      }
    }
  }
}
