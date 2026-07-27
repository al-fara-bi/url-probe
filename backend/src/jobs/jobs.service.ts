import { Injectable, NotFoundException } from '@nestjs/common';
import { JobRunnerService } from './job-runner.service';
import { Job, JobDetail, JobSummary, isTerminalJobStatus, toDetail, toSummary } from './job.types';
import { JobsRepository } from './jobs.repository';

@Injectable()
export class JobsService {
  constructor(
    private readonly repository: JobsRepository,
    private readonly runner: JobRunnerService,
  ) {}

  create(urls: string[]): { jobId: string } {
    const job = this.repository.create(urls);
    this.runner.start(job);

    return { jobId: job.id };
  }

  list(): JobSummary[] {
    return this.repository.findAll().map(toSummary);
  }

  getDetail(id: string): JobDetail {
    return toDetail(this.requireJob(id));
  }

  /**
   * Idempotent. The status flips synchronously so the response already reflects
   * the cancellation; the runner then stops unstarted URLs on its own schedule.
   */
  cancel(id: string): JobDetail {
    const job = this.requireJob(id);

    if (!isTerminalJobStatus(job.status)) {
      job.status = 'cancelled';
      this.runner.cancel(job.id);
    }

    return toDetail(job);
  }

  private requireJob(id: string): Job {
    const job = this.repository.findById(id);

    if (!job) {
      throw new NotFoundException(`Job ${id} not found`);
    }

    return job;
  }
}
