import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { CancellationToken } from '../common/cancellation-token';
import { delay } from '../common/delay';
import { runWithConcurrency } from '../common/task-pool';
import { UrlCheckerService } from '../url-check/url-checker.service';
import { Job, UrlCheck } from './job.types';

export const MAX_CONCURRENT_CHECKS = 5;

export const MAX_ARTIFICIAL_DELAY_MS = 10_000;

/**
 * Owns background execution for jobs: one cancellation token per running job,
 * one bounded pool per job so jobs never contend with each other.
 */
@Injectable()
export class JobRunnerService implements OnModuleDestroy {
  private readonly logger = new Logger(JobRunnerService.name);

  private readonly tokens = new Map<string, CancellationToken>();

  constructor(private readonly urlChecker: UrlCheckerService) {}

  start(job: Job): void {
    const token = new CancellationToken();
    this.tokens.set(job.id, token);

    void this.run(job, token).finally(() => this.tokens.delete(job.id));
  }

  cancel(jobId: string): void {
    this.tokens.get(jobId)?.cancel();
  }

  /** Stops background work on shutdown so pending checks cannot outlive the app. */
  onModuleDestroy(): void {
    for (const token of this.tokens.values()) {
      token.cancel();
    }
  }

  private async run(job: Job, token: CancellationToken): Promise<void> {
    job.status = 'in_progress';

    try {
      await runWithConcurrency(job.urls, MAX_CONCURRENT_CHECKS, token, (check) =>
        this.processUrl(check, token),
      );

      if (token.isCancelled) {
        this.markRemainingCancelled(job);
        job.status = 'cancelled';
        return;
      }

      job.status = 'completed';
    } catch (error) {
      this.logger.error(
        `Job ${job.id} failed`,
        error instanceof Error ? error.stack : String(error),
      );
      this.markRemainingCancelled(job);
      job.status = 'failed';
    }
  }

  private async processUrl(check: UrlCheck, token: CancellationToken): Promise<void> {
    const startedAt = new Date();
    check.status = 'in_progress';
    check.startedAt = startedAt.toISOString();

    const outcome = await this.urlChecker.check(check.url, token.signal);

    // The assignment requires an artificial delay before the result is stored.
    const completed = await delay(Math.random() * MAX_ARTIFICIAL_DELAY_MS, token.signal);

    const finishedAt = new Date();
    check.finishedAt = finishedAt.toISOString();
    check.durationMs = finishedAt.getTime() - startedAt.getTime();

    if (!completed || token.isCancelled) {
      check.status = 'cancelled';
      return;
    }

    check.status = outcome.status;
    check.httpStatus = outcome.httpStatus;
    check.error = outcome.error;
  }

  /** The pool has settled by now, so anything unfinished was never started. */
  private markRemainingCancelled(job: Job): void {
    for (const check of job.urls) {
      if (check.status === 'pending' || check.status === 'in_progress') {
        check.status = 'cancelled';
      }
    }
  }
}
