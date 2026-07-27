import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { UrlCheckerService } from '../url-check/url-checker.service';
import { JobsModule } from './jobs.module';

describe('JobsController', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [JobsModule] })
      .overrideProvider(UrlCheckerService)
      .useValue({ check: jest.fn(async () => ({ status: 'success', httpStatus: 200 })) })
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('creates a job', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/jobs')
      .send({ urls: ['https://example.com'] })
      .expect(201);

    expect(response.body).toEqual({ jobId: expect.any(String) });
  });

  it('rejects an empty URL list', async () => {
    await request(app.getHttpServer()).post('/api/jobs').send({ urls: [] }).expect(400);
  });

  it('rejects a malformed URL', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/jobs')
      .send({ urls: ['not a url'] })
      .expect(400);

    expect(JSON.stringify(response.body)).toContain('not a url');
  });

  it('rejects unknown properties', async () => {
    await request(app.getHttpServer())
      .post('/api/jobs')
      .send({ urls: ['https://example.com'], sneaky: true })
      .expect(400);
  });

  it('lists jobs', async () => {
    await request(app.getHttpServer()).post('/api/jobs').send({ urls: ['https://example.com'] });

    const response = await request(app.getHttpServer()).get('/api/jobs').expect(200);

    expect(response.body).toHaveLength(1);
    expect(response.body[0]).toMatchObject({ total: 1, status: expect.any(String) });
  });

  it('returns detail for a job', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/jobs')
      .send({ urls: ['https://example.com'] });

    const response = await request(app.getHttpServer())
      .get(`/api/jobs/${created.body.jobId}`)
      .expect(200);

    expect(response.body.urls).toHaveLength(1);
  });

  it('returns 404 for an unknown job', async () => {
    await request(app.getHttpServer()).get('/api/jobs/missing').expect(404);
  });

  it('cancels a job', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/jobs')
      .send({ urls: ['https://example.com'] });

    const response = await request(app.getHttpServer())
      .delete(`/api/jobs/${created.body.jobId}`)
      .expect(200);

    expect(response.body.status).toBe('cancelled');
  });
});
