import { Injectable } from '@nestjs/common';

export interface UrlCheckOutcome {
  status: 'success' | 'error';
  httpStatus?: number;
  error?: string;
}

export const DEFAULT_REQUEST_TIMEOUT_MS = 10_000;

@Injectable()
export class UrlCheckerService {
  /**
   * Probes a single URL with a HEAD request.
   *
   * Never throws: cancellation is reported by the caller inspecting its own
   * token, so every return value here describes the URL rather than the run.
   */
  async check(
    url: string,
    signal: AbortSignal,
    timeoutMs: number = DEFAULT_REQUEST_TIMEOUT_MS,
  ): Promise<UrlCheckOutcome> {
    const timeout = AbortSignal.timeout(timeoutMs);

    try {
      const response = await fetch(url, {
        method: 'HEAD',
        redirect: 'follow',
        signal: AbortSignal.any([signal, timeout]),
      });

      if (response.status >= 400) {
        return { status: 'error', httpStatus: response.status, error: `HTTP ${response.status}` };
      }

      return { status: 'success', httpStatus: response.status };
    } catch (error) {
      if (timeout.aborted) {
        return { status: 'error', error: `Request timed out after ${timeoutMs} ms` };
      }

      return { status: 'error', error: describeFailure(error) };
    }
  }
}

/** Node wraps network failures in `TypeError: fetch failed`; the cause carries the detail. */
function describeFailure(error: unknown): string {
  if (!(error instanceof Error)) {
    return 'Unknown error';
  }

  const { cause } = error as { cause?: unknown };

  return cause instanceof Error && cause.message ? cause.message : error.message;
}
