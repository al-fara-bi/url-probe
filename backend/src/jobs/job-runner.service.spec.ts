import { Logger } from '@nestjs/common';
import { UrlCheckerService } from '../url-check/url-checker.service';
import { JobRunnerService, MAX_CONCURRENT_CHECKS } from './job-runner.service';
import { Job } from './job.types';

jest.mock('../common/delay', () => ({
  delay: jest.fn(async () => true),
}));

import { delay } from '../common/delay';

const delayMock = delay as jest.MockedFunction<typeof delay>;

const makeJob = (count: number): Job => ({
  id: 'job-1',
  status: 'pending',
  createdAt: new Date().toISOString(),
  urls: Array.from({ length: count }, (_, index) => ({
    url: `https://host-${index}.test`,
    status: 'pending' as const,
  })),
});

describe('JobRunnerService', () => {
  let checker: { check: jest.MockedFunction<UrlCheckerService['check']> };
  let runner: JobRunnerService;

  beforeEach(() => {
    delayMock.mockImplementation(async () => true);
    checker = { check: jest.fn() };
    checker.check.mockResolvedValue({ status: 'success', httpStatus: 200 });
    runner = new JobRunnerService(checker as unknown as UrlCheckerService);
  });

  const settle = async (job: Job): Promise<void> => {
    while (job.status === 'pending' || job.status === 'in_progress') {
      await new Promise((resolve) => setImmediate(resolve));
    }
  };

  const runToCompletion = async (job: Job): Promise<void> => {
    runner.start(job);
    await settle(job);
  };

  it('completes a job and records every result', async () => {
    const job = makeJob(3);

    await runToCompletion(job);

    expect(job.status).toBe('completed');
    expect(job.urls.every((check) => check.status === 'success')).toBe(true);
    expect(job.urls.every((check) => check.httpStatus === 200)).toBe(true);
  });

  it('records timing for every processed URL', async () => {
    const job = makeJob(1);

    await runToCompletion(job);

    const [check] = job.urls;
    expect(check.startedAt).toEqual(expect.any(String));
    expect(check.finishedAt).toEqual(expect.any(String));
    expect(check.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('runs the artificial delay after the check and before saving the result', async () => {
    const order: string[] = [];
    checker.check.mockImplementation(async () => {
      order.push('check');
      return { status: 'success', httpStatus: 200 };
    });
    delayMock.mockImplementation(async () => {
      order.push('delay');
      return true;
    });

    await runToCompletion(makeJob(1));

    expect(order).toEqual(['check', 'delay']);
  });

  it('caps concurrent checks at the configured limit', async () => {
    let active = 0;
    let peak = 0;
    checker.check.mockImplementation(async () => {
      active += 1;
      peak = Math.max(peak, active);
      await new Promise((resolve) => setTimeout(resolve, 2));
      active -= 1;
      return { status: 'success', httpStatus: 200 };
    });

    await runToCompletion(makeJob(20));

    expect(peak).toBe(MAX_CONCURRENT_CHECKS);
  });

  it('marks unstarted URLs cancelled and finishes the job as cancelled', async () => {
    const job = makeJob(30);
    checker.check.mockImplementation(async () => {
      await new Promise((resolve) => setTimeout(resolve, 2));
      return { status: 'success', httpStatus: 200 };
    });

    runner.start(job);
    await new Promise((resolve) => setTimeout(resolve, 5));
    runner.cancel(job.id);
    await settle(job);

    expect(job.status).toBe('cancelled');
    expect(job.urls.some((check) => check.status === 'cancelled')).toBe(true);
    expect(job.urls.every((check) => check.status !== 'pending')).toBe(true);
    expect(job.urls.every((check) => check.status !== 'in_progress')).toBe(true);
  });

  it('marks a URL cancelled when the artificial delay is cut short', async () => {
    delayMock.mockImplementation(async () => false);
    const job = makeJob(1);

    await runToCompletion(job);

    expect(job.urls[0].status).toBe('cancelled');
  });

  it('cancels every running job on shutdown', async () => {
    const job = makeJob(30);
    checker.check.mockImplementation(async () => {
      await new Promise((resolve) => setTimeout(resolve, 2));
      return { status: 'success', httpStatus: 200 };
    });

    runner.start(job);
    await new Promise((resolve) => setTimeout(resolve, 5));
    runner.onModuleDestroy();
    await settle(job);

    expect(job.status).toBe('cancelled');
  });

  it('fails the job when the runner throws unexpectedly', async () => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    const job = makeJob(1);
    checker.check.mockImplementation(() => {
      throw new Error('boom');
    });

    await runToCompletion(job);

    expect(job.status).toBe('failed');
  });
});
