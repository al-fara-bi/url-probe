import { Job, isTerminalJobStatus, toDetail, toSummary } from './job.types';

const job = (overrides: Partial<Job> = {}): Job => ({
  id: 'job-1',
  status: 'in_progress',
  createdAt: '2026-07-26T10:00:00.000Z',
  urls: [],
  ...overrides,
});

describe('isTerminalJobStatus', () => {
  it.each(['completed', 'cancelled', 'failed'] as const)('treats %s as terminal', (status) => {
    expect(isTerminalJobStatus(status)).toBe(true);
  });

  it.each(['pending', 'in_progress'] as const)('treats %s as non-terminal', (status) => {
    expect(isTerminalJobStatus(status)).toBe(false);
  });
});

describe('toSummary', () => {
  it('counts successes, errors and overall progress', () => {
    const summary = toSummary(
      job({
        urls: [
          { url: 'a', status: 'success', httpStatus: 200 },
          { url: 'b', status: 'error', error: 'HTTP 404', httpStatus: 404 },
          { url: 'c', status: 'cancelled' },
          { url: 'd', status: 'in_progress' },
          { url: 'e', status: 'pending' },
        ],
      }),
    );

    expect(summary).toEqual({
      id: 'job-1',
      createdAt: '2026-07-26T10:00:00.000Z',
      status: 'in_progress',
      total: 5,
      processed: 3,
      succeeded: 1,
      failed: 1,
    });
  });

  it('omits the URL list', () => {
    expect(toSummary(job())).not.toHaveProperty('urls');
  });
});

describe('toDetail', () => {
  it('includes the URL list alongside the summary fields', () => {
    const detail = toDetail(job({ urls: [{ url: 'a', status: 'pending' }] }));

    expect(detail.total).toBe(1);
    expect(detail.urls).toEqual([{ url: 'a', status: 'pending' }]);
  });
});
