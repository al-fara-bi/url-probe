import { NotFoundException } from '@nestjs/common';
import { JobRunnerService } from './job-runner.service';
import { JobsRepository } from './jobs.repository';
import { JobsService } from './jobs.service';

describe('JobsService', () => {
  let repository: JobsRepository;
  let runner: { start: jest.Mock; cancel: jest.Mock };
  let service: JobsService;

  beforeEach(() => {
    repository = new JobsRepository();
    runner = { start: jest.fn(), cancel: jest.fn() };
    service = new JobsService(repository, runner as unknown as JobRunnerService);
  });

  it('creates a job and starts it in the background', () => {
    const { jobId } = service.create(['https://a.test']);

    expect(jobId).toEqual(expect.any(String));
    expect(runner.start).toHaveBeenCalledWith(repository.findById(jobId));
  });

  it('lists job summaries newest first without URL lists', () => {
    service.create(['https://a.test']);
    const second = service.create(['https://b.test', 'https://c.test']);

    const summaries = service.list();

    expect(summaries[0].id).toBe(second.jobId);
    expect(summaries[0].total).toBe(2);
    expect(summaries[0]).not.toHaveProperty('urls');
  });

  it('returns detail including the URL list', () => {
    const { jobId } = service.create(['https://a.test']);

    expect(service.getDetail(jobId).urls).toEqual([{ url: 'https://a.test', status: 'pending' }]);
  });

  it('throws NotFound for an unknown job', () => {
    expect(() => service.getDetail('missing')).toThrow(NotFoundException);
    expect(() => service.cancel('missing')).toThrow(NotFoundException);
  });

  it('marks the job cancelled immediately and signals the runner', () => {
    const { jobId } = service.create(['https://a.test']);

    const detail = service.cancel(jobId);

    expect(detail.status).toBe('cancelled');
    expect(runner.cancel).toHaveBeenCalledWith(jobId);
  });

  it('is a no-op when cancelling an already finished job', () => {
    const { jobId } = service.create(['https://a.test']);
    const job = repository.findById(jobId);
    if (job) {
      job.status = 'completed';
    }

    const detail = service.cancel(jobId);

    expect(detail.status).toBe('completed');
    expect(runner.cancel).not.toHaveBeenCalled();
  });
});
