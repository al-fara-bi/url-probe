import { delay } from './delay';

describe('delay', () => {
  it('resolves true when the delay elapses', async () => {
    await expect(delay(5, new AbortController().signal)).resolves.toBe(true);
  });

  it('resolves false immediately when the signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(delay(10_000, controller.signal)).resolves.toBe(false);
  });

  it('resolves false when aborted while waiting', async () => {
    const controller = new AbortController();
    const pending = delay(10_000, controller.signal);

    setTimeout(() => controller.abort(), 5);

    await expect(pending).resolves.toBe(false);
  });
});
