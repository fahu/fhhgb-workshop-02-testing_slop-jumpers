import { errorMessage } from '../api';
import { el, text } from '../dom';

interface GameLoad {
  title: string;
  errorTitle: string;
  focusOnSuccess?: HTMLElement;
  load: () => Promise<void>;
}

/** Profile and level requests block the game. The leaderboard has its own recovery flow. */
export function createGameLoading(setWaiting: (waiting: boolean) => void) {
  const overlay = el('network');
  const main = document.querySelector('main')!;
  const header = document.querySelector('header')!;
  let task: Promise<void> | undefined;
  let failed: GameLoad | undefined;
  let previousFocus: HTMLElement | null;

  function show(title: string, detail: string, canRetry: boolean): void {
    text('network-title', title);
    text('network-detail', detail);
    el('network-spinner').hidden = canRetry;
    el('network-retry').hidden = !canRetry;
    if (overlay.hidden) {
      previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      overlay.hidden = false;
      main.inert = true;
      header.inert = true;
      overlay.focus();
    }
    setWaiting(true);
  }

  function run(operation: GameLoad): Promise<void> {
    if (task) {
      return task;
    }
    failed = undefined;
    show(operation.title, 'Your robot is paused while the information loads.', false);
    task = Promise.resolve().then(operation.load).then(() => {
      overlay.hidden = true;
      main.inert = false;
      header.inert = false;
      (operation.focusOnSuccess ?? previousFocus)?.focus();
    }).catch((error: unknown) => {
      failed = operation;
      show(operation.errorTitle, `${errorMessage(error)} Retry to continue.`, true);
    }).finally(() => {
      task = undefined;
      setWaiting(!overlay.hidden);
    });
    return task;
  }

  function retry(): Promise<void> {
    return failed ? run(failed) : Promise.resolve();
  }

  el('network-retry').addEventListener('click', () => void retry());
  return { run };
}
