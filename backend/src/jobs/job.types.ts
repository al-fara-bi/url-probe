export type JobStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'failed';

export type UrlStatus = 'pending' | 'in_progress' | 'success' | 'error' | 'cancelled';

export interface UrlCheck {
  url: string;
  status: UrlStatus;
  httpStatus?: number;
  error?: string;
  startedAt?: string;
  finishedAt?: string;
  durationMs?: number;
}

export interface Job {
  id: string;
  status: JobStatus;
  createdAt: string;
  urls: UrlCheck[];
}

export interface JobSummary {
  id: string;
  createdAt: string;
  status: JobStatus;
  total: number;
  processed: number;
  succeeded: number;
  failed: number;
}

export interface JobDetail extends JobSummary {
  urls: UrlCheck[];
}

const TERMINAL_JOB_STATUSES: readonly JobStatus[] = ['completed', 'cancelled', 'failed'];

const TERMINAL_URL_STATUSES: readonly UrlStatus[] = ['success', 'error', 'cancelled'];

export function isTerminalJobStatus(status: JobStatus): boolean {
  return TERMINAL_JOB_STATUSES.includes(status);
}

export function isTerminalUrlStatus(status: UrlStatus): boolean {
  return TERMINAL_URL_STATUSES.includes(status);
}

export function toSummary(job: Job): JobSummary {
  return {
    id: job.id,
    createdAt: job.createdAt,
    status: job.status,
    total: job.urls.length,
    processed: job.urls.filter((check) => isTerminalUrlStatus(check.status)).length,
    succeeded: job.urls.filter((check) => check.status === 'success').length,
    failed: job.urls.filter((check) => check.status === 'error').length,
  };
}

export function toDetail(job: Job): JobDetail {
  return { ...toSummary(job), urls: job.urls };
}
