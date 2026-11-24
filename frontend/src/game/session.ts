import { request } from '../api';
import { el, escapeHtml, flag, text, tokenCount } from '../dom';
import { CheckpointSync } from '../runs/sync';
import type { Level, Nationality, PlayerProfile, Progress, Run } from '../types';
import { COURSE_VERSION } from './course';
import { TrailGame } from './game';
import { createGameLoading } from './loading';
import { slopItem } from './slop-items';

interface RunEvents {
  started: () => void;
  saved: () => void;
  finished: () => void;
}

export function mountRunSession(playerId: string, events: RunEvents) {
  let runId: string | undefined;

  const nickname = el<HTMLInputElement>('nickname');
  const game = new TrailGame(el<HTMLCanvasElement>('trail'), {
    progress: progress => {
      text('distance', progress.distance.toLocaleString());
      text('tokens', String(progress.tokens));
      text('speed', `${(progress.speed / 60).toFixed(2)}× SPEED`);
      text('level-label', `LEVEL ${String(progress.level).padStart(2, '0')}`);
      text('lives', progress.dead ? '♥ UNIT LOST' : '♥ 1 LIFE');
      el('lives').setAttribute('aria-label', progress.dead ? '0 lives' : '1 life');
    },
    level: (number, progress) => {
      if (runId) {
        sync.enqueue(runId, number, progress);
        void loadNextLevel(number + 1);
      }
    },
    finish,
  });

  const loading = createGameLoading(waiting => game.setWaiting(waiting));

  const sync = new CheckpointSync(state => {
    if (state.receipt) {
      events.saved();
      if (state.receipt.finished) {
        events.finished();
      }
    }
    const storageWarning = 'Browser storage is unavailable. Reloading may lose unconfirmed progress.';
    el('save-warning').hidden = !state.error && state.storageAvailable;
    el('retry').hidden = !state.error;
    if (state.error) {
      text('save-title', state.pending === 1 ? 'One save awaiting confirmation' : `${state.pending} saves awaiting confirmation`);
      const recovery = state.storageAvailable ? 'Progress is kept in this browser for retry.' : storageWarning;
      text('save-detail', `${state.error} ${recovery}`);
    } else if (!state.storageAvailable) {
      text('save-title', 'Local saves unavailable');
      text('save-detail', storageWarning);
    }
  });

  function loadProfile(): Promise<void> {
    return loading.run({
      title: 'Loading player profile..',
      errorTitle: 'Registration unavailable',
      load: async () => {
        const [countries, profile] = await Promise.all([
          request<Nationality[]>('/nationalities'),
          request<PlayerProfile | undefined>(`/players/${encodeURIComponent(playerId)}/profile`),
        ]);
        el('nationality').innerHTML = '<option value="">Choose nationality</option>' + countries.map(country => `<option value="${escapeHtml(country.code)}">${escapeHtml(country.name)}</option>`).join('');
        nickname.value = profile?.alias ?? '';
        nickname.setCustomValidity('');
        const nationalityCode = profile?.nationalityCode ?? '';
        el<HTMLSelectElement>('nationality').value = countries.some(country => country.code === nationalityCode) ? nationalityCode : '';
      },
    });
  }

  function start(): Promise<void> {
    const form = el<HTMLFormElement>('profile');
    const alias = nickname.value.trim();
    nickname.setCustomValidity(alias ? '' : 'Enter a name with at least one visible character.');
    if (runId || !form.reportValidity()) {
      return Promise.resolve();
    }
    const nationalityCode = el<HTMLSelectElement>('nationality').value;
    return loading.run({
      title: 'Loading level 1..',
      errorTitle: 'Start failed',
      focusOnSuccess: el('trail'),
      load: async () => {
        const level = await request<Level>('/levels/1');
        if (level.courseVersion !== COURSE_VERSION) {
          throw new Error('The circuit has changed. Reload this page.');
        }
        runId = (await request<Run>('/runs', 'POST', { alias, playerId, nationalityCode })).id;
        form.hidden = true;
        el('finish-overlay').hidden = true;
        el('game-hud').hidden = false;
        text('pilot', `${alias} ${flag(nationalityCode)}`);
        text('mode-label', 'Every jump counts');
        text('system-state', 'SYSTEM ONLINE');
        game.start(level);
        events.started();
      },
    });
  }

  function loadNextLevel(number: number): Promise<void> {
    return loading.run({
      title: `Loading level ${number}..`,
      errorTitle: 'Level load failed',
      load: async () => {
        const level = await request<Level>(`/levels/${number}`);
        if (runId) {
          game.loadLevel(level);
        }
      },
    });
  }

  function finish(progress: Progress): void {
    if (!runId) {
      return;
    }
    const finishedRunId = runId;
    runId = undefined;
    el('finish-overlay').hidden = false;
    const hit = slopItem(progress.collisionId);
    const tokens = tokenCount(progress.tokens);
    text('finish-heading', hit ? 'ROBOT OFFLINE' : 'SHIFT COMPLETE');
    text('system-state', hit ? 'UNIT LOST' : 'SHIFT COMPLETE');
    el('finish-hit').hidden = !hit;
    if (hit) {
      text('finish-hit', `Hit ${hit.name}`);
      el('finish-hit').style.setProperty('--slop-color', hit.color);
    }
    text('finish-distance', `${progress.distance.toLocaleString()} metres.`);
    text('finish-detail', hit ? `${hit.detail} · ${tokens}` : `${tokens} collected.`);
    sync.enqueue(finishedRunId, 0, progress);
  }

  function restart(): void {
    game.end();
    game.reset();
    el<HTMLFormElement>('profile').reset();
    el('profile').hidden = false;
    el('finish-overlay').hidden = true;
    el('game-hud').hidden = true;
    text('pilot', 'Awaiting registration');
    text('system-state', 'READY TO BOOT');
    text('mode-label', 'Ready for the sorting belt');
    nickname.focus();
    void loadProfile();
  }

  nickname.addEventListener('input', () => nickname.setCustomValidity(''));
  el('profile').addEventListener('submit', event => {
    event.preventDefault();
    void start();
  });
  el('again').addEventListener('click', restart);
  el('restart').addEventListener('click', restart);
  el('retry').addEventListener('click', () => void sync.retry());

  sync.announce();
  void loadProfile();
}
