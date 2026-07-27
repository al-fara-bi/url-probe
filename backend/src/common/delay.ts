/**
 * Waits `ms` milliseconds unless the signal aborts first.
 * Resolves true if the full delay elapsed, false if it was cut short.
 */
export function delay(ms: number, signal: AbortSignal): Promise<boolean> {
  if (signal.aborted) {
    return Promise.resolve(false);
  }

  return new Promise((resolve) => {
    const onAbort = (): void => {
      clearTimeout(timer);
      resolve(false);
    };

    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort);
      resolve(true);
    }, ms);

    signal.addEventListener('abort', onAbort, { once: true });
  });
}
