import { useEffect } from 'react';
import { fetchJob } from '../api/jobs';
import { isTerminalJobStatus } from '../api/types';
import { useJobsStore } from '../store/jobsStore';

const POLL_INTERVAL_MS = 1000;

/**
 * Polls one job until it reaches a terminal status.
 *
 * Three separate guarantees keep a superseded job from touching the UI: the
 * request is aborted on cleanup, the loop refuses to reschedule after cleanup,
 * and the store rejects detail whose id is no longer active.
 */
export function useJobPolling(jobId: string | null): void {
  const applyJobDetail = useJobsStore((state) => state.applyJobDetail);

  useEffect(() => {
    if (!jobId) {
      return;
    }

    const controller = new AbortController();
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const poll = async (): Promise<void> => {
      try {
        const detail = await fetchJob(jobId, controller.signal);

        if (stopped) {
          return;
        }

        applyJobDetail(detail);

        if (isTerminalJobStatus(detail.status)) {
          return;
        }
      } catch {
        // A failed poll is treated as transient: keep the loop alive so the UI
        // recovers on its own once the backend responds again.
        if (stopped) {
          return;
        }
      }

      // Scheduled only after the previous request settles, so slow responses
      // can never stack up into overlapping requests.
      timer = setTimeout(() => void poll(), POLL_INTERVAL_MS);
    };

    void poll();

    return () => {
      stopped = true;
      controller.abort();
      clearTimeout(timer);
    };
  }, [jobId, applyJobDetail]);
}
