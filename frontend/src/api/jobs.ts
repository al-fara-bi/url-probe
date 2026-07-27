import { request } from './client';
import type { JobDetail, JobSummary } from './types';

export const createJob = (urls: string[]): Promise<{ jobId: string }> =>
  request('/jobs', { method: 'POST', body: JSON.stringify({ urls }) });

export const fetchJobs = (): Promise<JobSummary[]> => request('/jobs');

export const fetchJob = (id: string, signal?: AbortSignal): Promise<JobDetail> =>
  request(`/jobs/${id}`, { signal });

export const cancelJob = (id: string): Promise<JobDetail> =>
  request(`/jobs/${id}`, { method: 'DELETE' });
