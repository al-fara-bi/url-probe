import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { JobDetail } from '../api/types';
import { useJobsStore } from './jobsStore';

vi.mock('../api/jobs', () => ({
  createJob: vi.fn(),
  fetchJobs: vi.fn(),
  fetchJob: vi.fn(),
  cancelJob: vi.fn(),
}));

import { createJob, fetchJobs } from '../api/jobs';

const detail = (id: string, overrides: Partial<JobDetail> = {}): JobDetail => ({
  id,
  createdAt: '2026-07-26T10:00:00.000Z',
  status: 'in_progress',
  total: 1,
  processed: 0,
  succeeded: 0,
  failed: 0,
  urls: [{ url: 'https://a.test', status: 'pending' }],
  ...overrides,
});

describe('jobsStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useJobsStore.setState({
      jobs: [],
      activeJobId: null,
      activeJob: null,
      isCreating: false,
      isCancelling: false,
      error: null,
    });
  });

  it('ignores detail for a job that is no longer active', () => {
    useJobsStore.setState({ activeJobId: 'job-b' });

    useJobsStore.getState().applyJobDetail(detail('job-a'));

    expect(useJobsStore.getState().activeJob).toBeNull();
  });

  it('accepts detail for the active job', () => {
    useJobsStore.setState({ activeJobId: 'job-a' });

    useJobsStore.getState().applyJobDetail(detail('job-a'));

    expect(useJobsStore.getState().activeJob?.id).toBe('job-a');
  });

  it('refreshes the matching summary in the list without the URL array', () => {
    useJobsStore.setState({
      activeJobId: 'job-a',
      jobs: [
        {
          id: 'job-a',
          createdAt: 'x',
          status: 'pending',
          total: 1,
          processed: 0,
          succeeded: 0,
          failed: 0,
        },
      ],
    });

    useJobsStore
      .getState()
      .applyJobDetail(detail('job-a', { status: 'completed', processed: 1, succeeded: 1 }));

    const [summary] = useJobsStore.getState().jobs;
    expect(summary.status).toBe('completed');
    expect(summary).not.toHaveProperty('urls');
  });

  it('clears the previous detail when the active job changes', () => {
    useJobsStore.setState({ activeJobId: 'job-a', activeJob: detail('job-a') });

    useJobsStore.getState().setActiveJob('job-b');

    expect(useJobsStore.getState().activeJob).toBeNull();
    expect(useJobsStore.getState().activeJobId).toBe('job-b');
  });

  it('makes a newly created job active and reloads the list', async () => {
    vi.mocked(createJob).mockResolvedValue({ jobId: 'job-new' });
    vi.mocked(fetchJobs).mockResolvedValue([]);

    await useJobsStore.getState().submitUrls(['https://a.test']);

    expect(useJobsStore.getState().activeJobId).toBe('job-new');
    expect(useJobsStore.getState().isCreating).toBe(false);
  });

  it('stores the error message when creation fails', async () => {
    vi.mocked(createJob).mockRejectedValue(new Error('bad url'));

    await useJobsStore.getState().submitUrls(['nope']);

    expect(useJobsStore.getState().error).toBe('bad url');
    expect(useJobsStore.getState().isCreating).toBe(false);
  });
});
