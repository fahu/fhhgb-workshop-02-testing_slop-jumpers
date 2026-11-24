import { afterEach, expect, test, vi } from 'vitest';
import { request } from '../../src/api';
import { CheckpointSync } from '../../src/runs/sync';
import type { Run } from '../../src/types';
import { memoryStorage } from '../support/memory-storage';

const progress = { distance: 1500, tokens: 5, elapsedMs: 22500 };

afterEach(() => vi.unstubAllGlobals());

test('the backend saves the checkpoint sent by the game client', async () => {
  // Arrange
  const run = await request<Run>('/runs', 'POST', {
    playerId: crypto.randomUUID(),
    alias: 'Workshop pilot',
    nationalityCode: 'AT',
  });
  const confirmation = Promise.withResolvers<void>();
  const sync = new CheckpointSync(({ receipt, error }) => {
    if (error) confirmation.reject(new Error(error));
    if (receipt) confirmation.resolve();
  }, memoryStorage());

  // Act
  sync.enqueue(run.id, 1, progress);
  await confirmation.promise;

  // Assert
  const savedRun = await request<Run>(`/runs/${run.id}`);
  expect(savedRun).toMatchObject(progress);
});

test('after a 503 the client retries the same checkpoint and clears the pending save', async () => {
  // Arrange
  const runId = crypto.randomUUID();
  const receipt = { distance: 1500, checkpoint: 1, duplicate: false, finished: false };
  const send = vi.fn<typeof fetch>()
    .mockResolvedValueOnce(new Response(null, { status: 503 }))
    .mockResolvedValueOnce(Response.json(receipt));
  vi.stubGlobal('fetch', send);

  const firstFailure = Promise.withResolvers<number>();
  let pendingSaves = 0;
  const sync = new CheckpointSync(({ pending, error }) => {
    pendingSaves = pending;
    if (error) firstFailure.resolve(pending);
  }, memoryStorage());

  sync.enqueue(runId, 1, progress);
  const pendingAfterFailure = await firstFailure.promise;

  // Act
  await sync.retry();

  // Assert
  const attempts = send.mock.calls.map(([url, options]) => ({
    url,
    method: options?.method,
    progress: JSON.parse(String(options?.body)),
  }));
  const save = { url: `/api/runs/${runId}/checkpoints/1`, method: 'PUT', progress };
  expect(pendingAfterFailure).toBe(1);
  expect(attempts).toEqual([save, save]);
  expect(pendingSaves).toBe(0);
});

test.todo('reloading after a 503 keeps the checkpoint available for retry');
