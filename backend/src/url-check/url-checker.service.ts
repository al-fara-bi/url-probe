import { Injectable } from '@nestjs/common';
import { BlockedAddressError, assertPublicHostname, isAddressGuardEnabled } from './address-guard';

export interface UrlCheckOutcome {
  status: 'success' | 'error';
  httpStatus?: number;
  error?: string;
}

export const DEFAULT_REQUEST_TIMEOUT_MS = 10_000;

const MAX_REDIRECTS = 5;

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

@Injectable()
export class UrlCheckerService {
  private readonly guardEnabled = isAddressGuardEnabled();

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
    const combined = AbortSignal.any([signal, timeout]);

    try {
      if (this.guardEnabled) {
        return await this.probeGuarded(url, combined);
      }

      const response = await fetch(url, {
        method: 'HEAD',
        redirect: 'follow',
        signal: combined,
      });

      return classify(response.status);
    } catch (error) {
      if (error instanceof BlockedAddressError) {
        return { status: 'error', error: error.message };
      }

      if (timeout.aborted) {
        return { status: 'error', error: `Request timed out after ${timeoutMs} ms` };
      }

      return { status: 'error', error: describeFailure(error) };
    }
  }

  /**
   * Follows redirects by hand so that every hop is checked.
   *
   * With redirect: 'follow' the address check is trivially bypassed — a public
   * URL can answer 302 with a private target, and fetch follows it after the
   * check has already passed.
   */
  private async probeGuarded(url: string, signal: AbortSignal): Promise<UrlCheckOutcome> {
    let target = url;

    for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
      const { hostname, protocol } = new URL(target);

      if (protocol !== 'http:' && protocol !== 'https:') {
        throw new BlockedAddressError(`Blocked protocol: ${protocol}`);
      }

      await assertPublicHostname(hostname);

      const response = await fetch(target, { method: 'HEAD', redirect: 'manual', signal });
      const location = response.headers.get('location');

      if (!REDIRECT_STATUSES.has(response.status) || !location) {
        return classify(response.status);
      }

      target = new URL(location, target).toString();
    }

    return { status: 'error', error: `Too many redirects (more than ${MAX_REDIRECTS})` };
  }
}

function classify(httpStatus: number): UrlCheckOutcome {
  return httpStatus >= 400
    ? { status: 'error', httpStatus, error: `HTTP ${httpStatus}` }
    : { status: 'success', httpStatus };
}

/** Node wraps network failures in `TypeError: fetch failed`; the cause carries the detail. */
function describeFailure(error: unknown): string {
  if (!(error instanceof Error)) {
    return 'Unknown error';
  }

  const { cause } = error as { cause?: unknown };

  return cause instanceof Error && cause.message ? cause.message : error.message;
}
