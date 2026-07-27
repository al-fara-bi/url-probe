import { CancellationToken } from './cancellation-token';

/**
 * Runs `worker` over `items` with at most `limit` invocations in flight.
 *
 * Workers pull from a shared cursor and check the cancellation token before
 * claiming each item, so cancelling stops everything that has not started yet
 * while letting in-flight work settle.
 *
 * `worker` must not throw: a rejection would abandon the pool with other
 * workers still running. Callers are responsible for catching their own errors.
 */
export async function runWithConcurrency<T>(
  items: readonly T[],
  limit: number,
  token: CancellationToken,
  worker: (item: T, index: number) => Promise<void>,
): Promise<void> {
  let cursor = 0;

  const runWorker = async (): Promise<void> => {
    while (!token.isCancelled) {
      // Safe without a lock: Node runs JavaScript on a single thread and no
      // await sits between reading the cursor and incrementing it.
      const index = cursor;
      cursor += 1;

      if (index >= items.length) {
        return;
      }

      await worker(items[index], index);
    }
  };

  const workerCount = Math.min(limit, items.length);

  await Promise.all(Array.from({ length: workerCount }, () => runWorker()));
}
