/**
 * Cooperative cancellation for a single job. Wraps an AbortController so the
 * same signal can abort in-flight HTTP requests and stop the worker pool from
 * claiming further work.
 */
export class CancellationToken {
  private readonly controller = new AbortController();

  get isCancelled(): boolean {
    return this.controller.signal.aborted;
  }

  get signal(): AbortSignal {
    return this.controller.signal;
  }

  cancel(): void {
    this.controller.abort();
  }
}
