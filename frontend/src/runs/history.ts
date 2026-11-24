import { request, errorMessage } from '../api';
import { el, escapeHtml, flag, text, tokenCount } from '../dom';
import { COURSE_VERSION } from '../game/course';
import { slopItem } from '../game/slop-items';
import type { Run } from '../types';

export function mountRunHistory(playerId: string) {
  let latestRequest = 0;

  async function loadHistory(): Promise<void> {
    const sequence = ++latestRequest;
    try {
      const runs = await request<Run[]>(`/runs?playerId=${encodeURIComponent(playerId)}`);
      if (sequence !== latestRequest) {
        return;
      }
      el('history').innerHTML = runs.slice(0, 5).map(item => {
        const hit = slopItem(item.collisionId);
        const outcome = hit ? `Hit ${hit.name}` : item.finished ? 'Finished' : item.distance === 0 ? 'Started' : 'Level saved';
        return `<div class="history-row"><span class="history-symbol">${flag(item.nationalityCode)}</span><div><strong>${item.distance.toLocaleString()} m</strong><small>${tokenCount(item.tokens)} · ${escapeHtml(outcome)}${item.courseVersion === COURSE_VERSION ? '' : ' · earlier circuit'}</small></div><span>${new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></div>`;
      }).join('') || '<p class="empty">Your story starts with the first run.</p>';
      text('history-message', 'Recorded on the server · linked to this browser’s player identity.');
    } catch (error) {
      if (sequence === latestRequest) {
        text('history-message', `Couldn’t load previous runs: ${errorMessage(error)}`);
      }
    }
  }

  el('refresh-history').addEventListener('click', () => void loadHistory());
  void loadHistory();
  return loadHistory;
}
