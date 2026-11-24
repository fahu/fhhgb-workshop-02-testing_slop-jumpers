import { RobotSimulation } from './simulation';
import { slopItem, type SlopItem } from './slop-items';
import type { Level, Progress } from '../types';

interface GameEvents {
  progress: (progress: Progress & { dead: boolean; speed: number; level: number }) => void;
  level: (number: number, progress: Progress) => void;
  finish: (progress: Progress) => void;
}

export class TrailGame {
  private ctx: CanvasRenderingContext2D;
  private sim?: RobotSimulation;
  private running = false;
  private waiting = false;
  private lastFrame = 0;
  private lastUpdate = 0;
  private width = 1100;
  private height = 440;

  constructor(private canvas: HTMLCanvasElement, private events: GameEvents) {
    this.ctx = canvas.getContext('2d')!;
    new ResizeObserver(() => this.resize()).observe(canvas);
    canvas.addEventListener('pointerdown', () => this.jump());
    document.addEventListener('keydown', event => {
      const target = event.target as HTMLElement;
      if (target.matches('input,button,select,textarea')) {
        return;
      }
      if (['Space', 'ArrowUp', 'KeyW'].includes(event.code)) {
        event.preventDefault();
        this.jump();
      }
    });
    requestAnimationFrame(this.frame);
  }

  start(level: Level): void {
    this.sim = new RobotSimulation(level);
    this.running = true;
    this.publish();
  }

  reset(): void {
    this.running = false;
    this.sim = undefined;
    this.publish();
  }

  loadLevel(level: Level): void {
    this.sim?.loadLevel(level);
    this.publish();
  }

  setWaiting(waiting: boolean): void {
    this.waiting = waiting;
  }

  end(): void {
    if (!this.running || !this.sim) {
      return;
    }
    this.running = false;
    this.publish();
    this.events.finish(this.sim.progress());
  }

  jump(): void {
    if (this.running && !this.waiting) {
      this.sim?.jump();
    }
  }

  private publish(): void {
    this.events.progress({ ...(this.sim?.progress() ?? { distance: 0, tokens: 0, elapsedMs: 0 }),
      dead: this.sim?.dead ?? false, speed: this.sim?.speed ?? 60, level: this.sim?.level.number ?? 1 });
  }

  private resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    this.width = rect.width;
    this.height = rect.height;
    const dpr = Math.min(devicePixelRatio, 2);
    this.canvas.width = Math.round(rect.width * dpr);
    this.canvas.height = Math.round(rect.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  private frame = (now: number): void => {
    const dt = this.lastFrame ? now - this.lastFrame : 0;
    this.lastFrame = now;
    if (this.running && !this.waiting && !document.hidden && this.sim && !this.sim.levelComplete) {
      this.sim.advance(Math.min(dt, 40));
      if (this.sim.dead) {
        this.end();
      } else if (this.sim.levelComplete) {
        this.publish();
        this.events.level(this.sim.level.number, this.sim.progress());
      }
    }
    if (now - this.lastUpdate > 100) {
      this.publish();
      this.lastUpdate = now;
    }
    this.draw();
    requestAnimationFrame(this.frame);
  };

  private draw(): void {
    const c = this.ctx;
    const w = this.width;
    const h = this.height;
    const ground = h * 0.79;
    const playerX = Math.min(170, w * 0.24);
    const scale = 6;
    const project = (distance: number) => playerX + (distance - (this.sim?.distance ?? 0)) * scale;
    const sky = c.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#252438');
    sky.addColorStop(1, '#4c3b52');
    c.fillStyle = sky;
    c.fillRect(0, 0, w, h);
    this.factoryLayer(ground, '#35334c', '#524566', 176, 152, 0.21);
    this.factoryLayer(ground, '#43364a', '#70505c', 123, 79, 0.52);
    c.fillStyle = '#191826';
    c.fillRect(0, ground, w, h - ground);
    c.fillStyle = '#6f616f';
    c.fillRect(0, ground, w, 3);
    c.fillStyle = '#3c3546';
    c.fillRect(0, ground + 4, w, 17);
    const beltOffset = ((this.sim?.distance ?? 0) * scale) % 32;
    for (let i = -1; i < w / 32 + 2; i++) {
      const x = i * 32 - beltOffset;
      c.fillStyle = '#a36b5f';
      c.fillRect(x, ground + 7, 12, 3);
      c.fillStyle = '#2c2738';
      c.beginPath();
      c.arc(x + 5, ground + 35, 7, 0, Math.PI * 2);
      c.fill();
    }
    const level = this.sim?.level;
    if (level) {
      const x = project(level.end);
      if (x > -100 && x < w + 60) {
        c.fillStyle = '#a3859a';
        c.fillRect(x - 4, ground - 150, 8, 150);
        c.fillRect(x + 80, ground - 150, 8, 150);
        c.fillStyle = '#f9bb78';
        c.fillRect(x - 8, ground - 158, 100, 20);
        this.label(`BELT ${level.number + 1}`, x + 42, ground - 180, '#292233', '#f9bb78');
      }
    }
    for (const obstacle of level?.obstacles ?? []) {
      const x = project(obstacle.distance);
      if (x < -40 || x > w + 40) {
        continue;
      }
      const item = slopItem(obstacle.slopId);
      if (item) {
        this.drawSlop(item, x, ground, obstacle.width * scale, obstacle.height);
      }
    }
    for (const token of level?.stars ?? []) {
      const x = project(token.distance);
      if (this.sim?.collected.has(token.id) || x < -15 || x > w + 15) {
        continue;
      }
      this.drawToken(x, ground - token.height);
    }
    const y = this.sim?.y ?? 0;
    c.fillStyle = '#152e2340';
    c.beginPath(); c.ellipse(playerX, ground + 4, Math.max(7, 17 - y / 12), 4, 0, 0, Math.PI * 2); c.fill();
    c.save();
    c.translate(playerX, ground - y);
    if (this.sim?.dead) {
      c.rotate(Math.PI / 2.7);
    }
    const stride = this.running && !this.waiting && y === 0 ? Math.sin((this.sim?.distance ?? 0) * 0.9) * 8 : 3;
    // Metal feet, hinged legs, square chassis and visor: a walking robot.
    c.lineCap = 'round'; c.lineWidth = 6; c.strokeStyle = '#315552';
    c.beginPath(); c.moveTo(-6, -20); c.lineTo(-6 - stride, -6); c.moveTo(6, -20); c.lineTo(6 + stride, -6); c.stroke();
    c.fillStyle = '#213c3d'; c.fillRect(-11 - stride, -6, 13, 6); c.fillRect(2 + stride, -6, 13, 6);
    c.fillStyle = '#d5e7db'; c.strokeStyle = '#315552'; c.lineWidth = 2;
    c.beginPath(); c.roundRect(-12, -40, 24, 23, 4); c.fill(); c.stroke();
    c.fillStyle = this.sim?.dead ? '#df6848' : '#e5ae50'; c.fillRect(-5, -33, 10, 8);
    c.strokeStyle = '#55746b'; c.lineWidth = 5;
    c.beginPath(); c.moveTo(-14, -36); c.lineTo(-19 + stride / 2, -22); c.moveTo(14, -36); c.lineTo(19 - stride / 2, -24); c.stroke();
    c.fillStyle = '#d5e7db'; c.strokeStyle = '#315552'; c.lineWidth = 2;
    c.beginPath(); c.roundRect(-14, -58, 28, 20, 5); c.fill(); c.stroke();
    c.fillStyle = '#213c3d'; c.fillRect(-10, -53, 20, 9);
    c.fillStyle = this.sim?.dead ? '#ff8b68' : '#8cf5d5';
    c.fillRect(-6, -51, 4, 4); c.fillRect(4, -51, 4, 4);
    c.strokeStyle = '#315552'; c.beginPath(); c.moveTo(0, -58); c.lineTo(0, -64); c.stroke();
    c.fillStyle = '#e5ae50'; c.beginPath(); c.arc(0, -65, 3, 0, Math.PI * 2); c.fill();
    c.restore();
    c.fillStyle = '#e1cbd9';
    c.font = '11px ui-monospace, monospace';
    c.fillText('SLOP JUMPERS / ONE LIFE', 22, h - 19);
    c.textAlign = 'right'; c.fillText(`LEVEL ${this.sim?.level.number ?? 1}`, w - 22, h - 19); c.textAlign = 'left';
  }

  private drawToken(x: number, y: number): void {
    const c = this.ctx;
    c.save();
    c.fillStyle = '#a8f3de';
    c.strokeStyle = '#216b67';
    c.lineWidth = 1.5;
    c.lineJoin = 'round';
    c.beginPath();
    c.moveTo(x, y - 10);
    c.lineTo(x + 9, y - 5);
    c.lineTo(x + 9, y + 5);
    c.lineTo(x, y + 10);
    c.lineTo(x - 9, y + 5);
    c.lineTo(x - 9, y - 5);
    c.closePath();
    c.fill();
    c.stroke();
    c.fillStyle = '#17443e';
    c.font = '800 11px ui-monospace, monospace';
    c.textAlign = 'center';
    c.fillText('T', x, y + 4);
    c.restore();
  }

  private factoryLayer(base: number, wall: string, windows: string, spacing: number, height: number, speed: number): void {
    const c = this.ctx;
    const travelled = (this.sim?.distance ?? 0) * speed;
    const first = Math.floor(travelled / spacing);
    for (let i = -1; i < this.width / spacing + 2; i++) {
      const x = (first + i) * spacing - travelled;
      const rise = height + ((first + i + 2) % 3) * 17;
      c.fillStyle = wall;
      c.fillRect(x, base - rise, spacing - 16, rise);
      c.fillRect(x + spacing * 0.65, base - rise - 20, 15, 21);
      c.fillStyle = windows;
      for (let j = 0; j < 4; j++) {
        c.fillRect(x + 14 + j * 19, base - rise + 20, 10, 4);
      }
      c.fillRect(x + 14, base - rise + 34, spacing - 44, 2);
    }
  }

  private drawSlop(item: SlopItem, x: number, ground: number, width: number, height: number): void {
    const c = this.ctx;
    const left = x - width / 2;
    const top = ground - height;
    c.fillStyle = item.color;
    c.beginPath();
    if (item.shape === 'gel') {
      c.moveTo(left, ground);
      c.quadraticCurveTo(left - 2, top + height * 0.4, x, top);
      c.quadraticCurveTo(left + width + 2, top + height * 0.4, left + width, ground);
      c.closePath();
    } else if (item.shape === 'stack') {
      c.roundRect(left, top + height * 0.22, width, height * 0.78, 2);
      c.roundRect(left + 3, top, width - 6, height * 0.5, 2);
    } else {
      const radius = item.shape === 'coil' || item.shape === 'can' ? 8 : 3;
      c.roundRect(left, top, width, height, radius);
    }
    c.fill();

    c.strokeStyle = '#3d2c495c';
    c.lineWidth = 1.5;
    if (item.shape === 'screen') {
      c.strokeRect(left + 3, top + 4, width - 6, height - 8);
    } else if (item.shape === 'paper' || item.shape === 'stack') {
      for (let line = 0; line < 2; line++) {
        c.beginPath();
        c.moveTo(left + 4, top + 5 + line * 4);
        c.lineTo(left + width * 0.55, top + 5 + line * 4);
        c.stroke();
      }
    } else if (item.shape === 'coil') {
      c.beginPath();
      c.ellipse(x, top + 6, width * 0.32, 3, 0, 0, Math.PI * 2);
      c.stroke();
      c.beginPath();
      c.ellipse(x, ground - 5, width * 0.32, 3, 0, 0, Math.PI * 2);
      c.stroke();
    } else if (item.shape === 'can') {
      c.strokeRect(left + 3, top + 5, width - 6, 2);
      c.strokeRect(left + 3, ground - 6, width - 6, 2);
    }
    c.fillStyle = '#2b2235';
    c.font = '800 10px ui-monospace, monospace';
    c.textAlign = 'center';
    c.fillText(item.tag, x, top + height * 0.68, width - 5);
    c.textAlign = 'left';
    const labelX = Math.min(this.width - 76, Math.max(76, x));
    this.label(item.name, labelX, top - 14, '#f9ecfa', '#241e31');
  }

  private label(text: string, x: number, y: number, ink: string, paper: string): void {
    const c = this.ctx;
    c.font = '600 11px system-ui, sans-serif';
    const width = c.measureText(text).width + 18;
    c.fillStyle = paper;
    c.beginPath(); c.roundRect(x - width / 2, y - 13, width, 23, 5); c.fill();
    c.fillStyle = ink; c.textAlign = 'center'; c.fillText(text, x, y + 2); c.textAlign = 'left';
  }
}
