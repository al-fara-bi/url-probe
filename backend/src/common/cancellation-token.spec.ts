import { CancellationToken } from './cancellation-token';

describe('CancellationToken', () => {
  it('starts uncancelled', () => {
    expect(new CancellationToken().isCancelled).toBe(false);
  });

  it('reports cancellation and aborts its signal', () => {
    const token = new CancellationToken();

    token.cancel();

    expect(token.isCancelled).toBe(true);
    expect(token.signal.aborted).toBe(true);
  });

  it('is idempotent', () => {
    const token = new CancellationToken();

    token.cancel();
    token.cancel();

    expect(token.isCancelled).toBe(true);
  });
});
