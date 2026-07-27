import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { JobDetail } from '../api/types';
import { useJobsStore } from '../store/jobsStore';
import { useJobPolling } from './useJobPolling';

vi.mock('../api/jobs', () => ({
  createJob: vi.fn(),
  fetchJobs: vi.fn(),
  fetchJob: vi.fn(),
  cancelJob: vi.fn(),
}));

import { fetchJob } from '../api/jobs';

const detail = (id: string, status: JobDetail['status']): JobDetail => ({
  id,
  createdAt: '2026-07-26T10:00:00.000Z',
  status,
  total: 1,
  processed: status === 'in_progress' ? 0 : 1,
  succeeded: 0,
  failed: 0,
  urls: [{ url: 'https://a.test', status: 'pending' }],
});

describe('useJobPolling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useJobsStore.setState({ jobs: [], activeJobId: null, activeJob: null, error: null });
  });

  it('does nothing without a job id', () => {
    renderHook(() => useJobPolling(null));

    expect(fetchJob).not.toHaveBeenCalled();
  });

  it('writes the first response into the store', async () => {
    useJobsStore.setState({ activeJobId: 'job-a' });
    vi.mocked(fetchJob).mockResolvedValue(detail('job-a', 'completed'));

    renderHook(() => useJobPolling('job-a'));

    await waitFor(() => expect(useJobsStore.getState().activeJob?.id).toBe('job-a'));
  });

  it('stops polling once the job reaches a terminal status', async () => {
    useJobsStore.setState({ activeJobId: 'job-a' });
    vi.mocked(fetchJob).mockResolvedValue(detail('job-a', 'completed'));

    renderHook(() => useJobPolling('job-a'));

    await waitFor(() => expect(fetchJob).toHaveBeenCalledTimes(1));
    await new Promise((resolve) => setTimeout(resolve, 1500));

    expect(fetchJob).toHaveBeenCalledTimes(1);
  });

  it('aborts the in-flight request when the hook unmounts', async () => {
    useJobsStore.setState({ activeJobId: 'job-a' });
    let capturedSignal: AbortSignal | undefined;
    vi.mocked(fetchJob).mockImplementation(
      (_id, signal) =>
        new Promise(() => {
          capturedSignal = signal;
        }),
    );

    const { unmount } = renderHook(() => useJobPolling('job-a'));
    await waitFor(() => expect(capturedSignal).toBeDefined());

    unmount();

    expect(capturedSignal?.aborted).toBe(true);
  });

  it('discards a response that resolves after the active job changed', async () => {
    useJobsStore.setState({ activeJobId: 'job-a' });
    let resolveSlow: ((value: JobDetail) => void) | undefined;
    vi.mocked(fetchJob).mockImplementation(
      () =>
        new Promise<JobDetail>((resolve) => {
          resolveSlow = resolve;
        }),
    );

    renderHook(() => useJobPolling('job-a'));
    await waitFor(() => expect(resolveSlow).toBeDefined());

    useJobsStore.setState({ activeJobId: 'job-b', activeJob: null });
    resolveSlow?.(detail('job-a', 'completed'));
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(useJobsStore.getState().activeJob).toBeNull();
  });
});
