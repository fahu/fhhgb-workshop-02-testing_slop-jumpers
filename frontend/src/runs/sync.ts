import { ApiError, request, errorMessage } from '../api';
import type { Progress, Receipt } from '../types';

const OUTBOX = 'slop-jumpers.testing.outbox.v1';

interface PendingSave {
  runId: string;
  checkpoint: number;
  progress: Progress;
}

interface SyncState {
  pending: number;
  error: string;
  storageAvailable: boolean;
  receipt?: Receipt;
}

type OutboxStorage = Pick<Storage, 'getItem' | 'setItem'>;
const browserStorage: OutboxStorage = {
  getItem: key => localStorage.getItem(key),
  setItem: (key, value) => localStorage.setItem(key, value),
};

function isPendingSave(value: unknown): value is PendingSave {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const { runId, checkpoint, progress } = value as Partial<PendingSave>;
  return typeof runId === 'string' && /^[\da-f-]{36}$/i.test(runId) &&
    typeof checkpoint === 'number' && Number.isInteger(checkpoint) && checkpoint >= 0 &&
    !!progress && [progress.distance, progress.tokens, progress.elapsedMs].every(
      number => Number.isInteger(number) && number >= 0,
    ) && (progress.collisionId == null || typeof progress.collisionId === 'string');
}

/** Owns ordered retries. The payload is copied once and reused across attempts and reloads. */
export class CheckpointSync {
  private pending: PendingSave[] = [];
  private busy = false;
  private error = '';
  private storageAvailable = true;

  constructor(
    private onChange: (state: SyncState) => void,
    private storage: OutboxStorage = browserStorage,
  ) {
    let stored: string | null = null;
    try {
      stored = storage.getItem(OUTBOX);
    } catch {
      this.storageAvailable = false;
    }
    if (stored !== null) {
      try {
        const restored: unknown = JSON.parse(stored);
        if (Array.isArray(restored)) {
          this.pending = restored.filter(isPendingSave);
        }
      } catch {
        // Ignore unreadable data. A later save replaces it.
      }
    }
    if (this.pending.length > 0) {
      this.error = 'Unconfirmed progress from an earlier visit. Retry to check it safely.';
    }
  }

  announce(): void {
    this.emit();
  }

  enqueue(runId: string, checkpoint: number, progress: Progress): void {
    this.pending.push({ runId, checkpoint, progress: { ...progress } });
    this.persist();
    this.emit();
    void this.drain();
  }

  async retry(): Promise<void> {
    this.error = '';
    await this.drain();
  }

  private async drain(): Promise<void> {
    if (this.busy || this.error) {
      return;
    }
    this.busy = true;
    try {
      while (this.pending.length > 0) {
        const { runId, checkpoint, progress } = this.pending[0];
        const route = checkpoint === 0 ? 'finish' : `checkpoints/${checkpoint}`;
        let receipt: Receipt;
        try {
          receipt = await request<Receipt>(`/runs/${runId}/${route}`, 'PUT', progress);
        } catch (error) {
          if (error instanceof ApiError && error.status === 404) {
            // A server restart clears all runs. A missing run cannot accept any pending saves.
            this.pending = this.pending.filter(save => save.runId !== runId);
            this.persist();
            continue;
          }
          this.error = errorMessage(error);
          break;
        }
        this.pending.shift();
        this.persist();
        this.emit(receipt);
      }
    } finally {
      this.busy = false;
      this.emit();
    }
  }

  private persist(): void {
    try {
      this.storage.setItem(OUTBOX, JSON.stringify(this.pending));
      this.storageAvailable = true;
    } catch {
      // Keep sending from memory, even when the browser cannot persist the queue.
      this.storageAvailable = false;
    }
  }

  private emit(receipt?: Receipt): void {
    this.onChange({ pending: this.pending.length, error: this.error, storageAvailable: this.storageAvailable, receipt });
  }
}
