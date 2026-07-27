import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';
import type { JobDetail, JobSummary } from './api/types';
import { useJobsStore } from './store/jobsStore';

vi.mock('./api/jobs', () => ({
  createJob: vi.fn(),
  fetchJobs: vi.fn(),
  fetchJob: vi.fn(),
  cancelJob: vi.fn(),
}));

import { fetchJob, fetchJobs } from './api/jobs';

const summary: JobSummary = {
  id: 'job-a',
  createdAt: '2026-07-26T10:00:00.000Z',
  status: 'in_progress',
  total: 2,
  processed: 1,
  succeeded: 1,
  failed: 0,
};

const detail: JobDetail = {
  ...summary,
  urls: [
    { url: 'https://a.test', status: 'success', httpStatus: 200, durationMs: 1500 },
    { url: 'https://b.test', status: 'in_progress' },
  ],
};

describe('App', () => {
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

  it('renders the empty state before any job is selected', async () => {
    vi.mocked(fetchJobs).mockResolvedValue([]);

    render(<App />);

    expect(screen.getByRole('heading', { name: 'url-probe' })).toBeDefined();
    await waitFor(() => expect(screen.getByText('Пока нет ни одного задания.')).toBeDefined());
  });

  it('renders the active job with its progress and URL rows', async () => {
    vi.mocked(fetchJobs).mockResolvedValue([summary]);
    vi.mocked(fetchJob).mockResolvedValue(detail);
    useJobsStore.setState({ activeJobId: 'job-a' });

    render(<App />);

    await waitFor(() => expect(screen.getByText(/Обработано 1 из 2/)).toBeDefined());
    expect(screen.getByText('https://a.test')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Отменить задание' })).toBeDefined();
  });

  it('shows an error banner when the job list cannot be loaded', async () => {
    vi.mocked(fetchJobs).mockRejectedValue(new Error('Сервер недоступен'));

    render(<App />);

    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Сервер недоступен'));
  });
});
