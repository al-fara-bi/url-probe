// Mirrors backend/src/jobs/job.types.ts. Kept as a copy rather than a shared
// workspace package: deduplicating ~40 lines is not worth cross-package build
// ordering in the Docker images.

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

export function isTerminalJobStatus(status: JobStatus): boolean {
  return TERMINAL_JOB_STATUSES.includes(status);
}
