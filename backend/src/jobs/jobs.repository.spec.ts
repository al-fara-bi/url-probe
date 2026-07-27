import { JobsRepository } from './jobs.repository';

describe('JobsRepository', () => {
  let repository: JobsRepository;

  beforeEach(() => {
    repository = new JobsRepository();
  });

  it('creates a pending job with one pending entry per URL', () => {
    const job = repository.create(['https://a.test', 'https://b.test']);

    expect(job.status).toBe('pending');
    expect(job.id).toEqual(expect.any(String));
    expect(job.urls).toEqual([
      { url: 'https://a.test', status: 'pending' },
      { url: 'https://b.test', status: 'pending' },
    ]);
  });

  it('finds a job by id', () => {
    const job = repository.create(['https://a.test']);

    expect(repository.findById(job.id)).toBe(job);
  });

  it('returns undefined for an unknown id', () => {
    expect(repository.findById('nope')).toBeUndefined();
  });

  it('lists jobs newest first', () => {
    const first = repository.create(['https://a.test']);
    const second = repository.create(['https://b.test']);

    expect(repository.findAll().map((job) => job.id)).toEqual([second.id, first.id]);
  });

  it('keeps duplicate URLs', () => {
    const job = repository.create(['https://a.test', 'https://a.test']);

    expect(job.urls).toHaveLength(2);
  });
});
