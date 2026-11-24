import './style.css';
import { mountRunSession } from './game/session';
import { mountLeaderboard } from './leaderboard/panel';
import { mountRunHistory } from './runs/history';

function getPlayerId(): string {
  const key = 'slop-jumpers.testing.player';
  let playerId: string = crypto.randomUUID();
  try {
    const savedPlayerId = localStorage.getItem(key);
    if (savedPlayerId) {
      return savedPlayerId;
    }
    localStorage.setItem(key, playerId);
  } catch {
    // Players can still play for this visit when local storage is unavailable.
  }
  return playerId;
}

const playerId = getPlayerId();

const refreshHistory = mountRunHistory(playerId);
const leaderboard = mountLeaderboard();
mountRunSession(playerId, {
  started: refreshHistory,
  saved: refreshHistory,
  finished: leaderboard.refreshInBackground,
});
