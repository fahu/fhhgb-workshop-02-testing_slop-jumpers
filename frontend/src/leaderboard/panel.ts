import { request, errorMessage } from '../api';
import { el, escapeHtml, flag, text, tokenCount } from '../dom';
import { slopItem } from '../game/slop-items';
import type { Leaderboard } from '../types';

export function mountLeaderboard() {
  const overlay = el('leaderboard-overlay');
  const retryButton = el<HTMLButtonElement>('leaderboard-retry');
  let board: Leaderboard | undefined;
  let task: Promise<void> | undefined;
  let failed = false;

  function showOverlay(message: string, detail: string): void {
    overlay.hidden = false;
    el('leaderboard-content').inert = true;
    el('leaderboard-panel').setAttribute('aria-busy', String(!failed));
    text('leaderboard-title', message);
    text('leaderboard-detail', detail);
    el('leaderboard-spinner').hidden = failed;
    retryButton.hidden = !failed;
  }

  function hideOverlay(): void {
    const returnFocus = overlay.contains(document.activeElement);
    overlay.hidden = true;
    el('leaderboard-content').inert = false;
    el('leaderboard-panel').setAttribute('aria-busy', 'false');
    if (returnFocus) {
      el('refresh-leaderboard').focus();
    }
  }

  function refresh(): Promise<void> {
    if (task) {
      return task;
    }
    failed = false;
    showOverlay('Refreshing leaderboard..', 'Updating the latest rankings.');
    text('board-status', 'Refreshing leaderboard..');
    task = request<Leaderboard>('/leaderboard').then(result => {
      board = result;
      el('records').innerHTML = result.entries.slice(0, 8).map((entry, index) => {
        const hit = slopItem(entry.collisionId);
        const outcome = hit ? `Hit ${hit.name}` : entry.finished ? 'Finished without a collision' : 'In progress';
        const outcomeStyle = hit ? ` style="--slop-color:${hit.color}"` : '';
        return `<li><span class="rank">${String(index + 1).padStart(2, '0')}</span><span class="avatar">${flag(entry.nationality.code)}</span><div><strong>${escapeHtml(entry.alias)}</strong><small>${escapeHtml(entry.nationality.name)}</small><small class="slop-result"${outcomeStyle}>${escapeHtml(outcome)}</small></div><span class="record-distance">${entry.distance.toLocaleString()}<small>m</small><small class="token-score"><span aria-hidden="true">⬢</span> ${tokenCount(entry.tokens)}</small></span></li>`;
      }).join('') || '<li class="empty">Your robot could set the first record.</li>';
      text('board-status', 'Best distance per pilot');
      hideOverlay();
    }).catch((error: unknown) => {
      failed = true;
      text('board-status', 'Refresh failed');
      showOverlay('Refresh failed', `${errorMessage(error)} Retry to update the rankings.`);
    }).finally(() => {
      task = undefined;
    });
    return task;
  }

  function refreshInBackground(): void {
    if (!failed) {
      void refresh();
    }
  }

  function retry(): Promise<void> {
    return failed ? refresh() : Promise.resolve();
  }

  el('refresh-leaderboard').addEventListener('click', () => void refresh());
  retryButton.addEventListener('click', () => void retry());

  void refresh();
  setInterval(() => {
    if (board) {
      const seconds = Math.max(0, Math.floor((Date.now() - board.generatedAt) / 1000));
      text('freshness', `Updated ${seconds}s ago`);
    }
  }, 1000);
  setInterval(() => {
    if (!document.hidden) {
      refreshInBackground();
    }
  }, 10000);

  return { refreshInBackground };
}
