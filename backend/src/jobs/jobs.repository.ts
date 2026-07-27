import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { Job } from './job.types';

/**
 * In-memory job store. The assignment does not require persistence; keeping the
 * boundary explicit means swapping in a database would touch only this class.
 */
@Injectable()
export class JobsRepository {
  private readonly jobs = new Map<string, Job>();

  create(urls: string[]): Job {
    const job: Job = {
      id: randomUUID(),
      status: 'pending',
      createdAt: new Date().toISOString(),
      urls: urls.map((url) => ({ url, status: 'pending' })),
    };

    this.jobs.set(job.id, job);

    return job;
  }

  findById(id: string): Job | undefined {
    return this.jobs.get(id);
  }

  /** Newest first. A Map iterates in insertion order, so reversing is enough. */
  findAll(): Job[] {
    return [...this.jobs.values()].reverse();
  }
}
