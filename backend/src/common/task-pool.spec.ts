import { CancellationToken } from './cancellation-token';
import { runWithConcurrency } from './task-pool';

const tick = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('runWithConcurrency', () => {
  it('processes every item when not cancelled', async () => {
    const items = [1, 2, 3, 4, 5, 6, 7];
    const seen: number[] = [];

    await runWithConcurrency(items, 3, new CancellationToken(), async (item) => {
      seen.push(item);
    });

    expect(seen.sort()).toEqual(items);
  });

  it('never runs more than `limit` workers at once', async () => {
    const items = Array.from({ length: 20 }, (_, index) => index);
    let active = 0;
    let peak = 0;

    await runWithConcurrency(items, 5, new CancellationToken(), async () => {
      active += 1;
      peak = Math.max(peak, active);
      await tick(5);
      active -= 1;
    });

    expect(peak).toBe(5);
  });

  it('stops claiming work once the token is cancelled', async () => {
    const items = Array.from({ length: 50 }, (_, index) => index);
    const token = new CancellationToken();
    const processed: number[] = [];

    await runWithConcurrency(items, 2, token, async (item) => {
      processed.push(item);
      if (processed.length === 4) {
        token.cancel();
      }
      await tick(1);
    });

    expect(processed.length).toBeGreaterThanOrEqual(4);
    expect(processed.length).toBeLessThan(items.length);
  });

  it('does nothing when the token is already cancelled', async () => {
    const token = new CancellationToken();
    token.cancel();
    const worker = jest.fn();

    await runWithConcurrency([1, 2, 3], 2, token, worker);

    expect(worker).not.toHaveBeenCalled();
  });

  it('spawns no more workers than there are items', async () => {
    let peak = 0;
    let active = 0;

    await runWithConcurrency([1, 2], 10, new CancellationToken(), async () => {
      active += 1;
      peak = Math.max(peak, active);
      await tick(2);
      active -= 1;
    });

    expect(peak).toBe(2);
  });
});
