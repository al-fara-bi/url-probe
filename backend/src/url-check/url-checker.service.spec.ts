import { UrlCheckerService } from './url-checker.service';

describe('UrlCheckerService', () => {
  let service: UrlCheckerService;
  let fetchMock: jest.SpyInstance;

  beforeEach(() => {
    service = new UrlCheckerService();
    fetchMock = jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    fetchMock.mockRestore();
  });

  const respondWith = (status: number): void => {
    fetchMock.mockResolvedValue(new Response(null, { status }));
  };

  it('issues a HEAD request that follows redirects', async () => {
    respondWith(200);

    await service.check('https://example.com', new AbortController().signal);

    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.com',
      expect.objectContaining({ method: 'HEAD', redirect: 'follow' }),
    );
  });

  it('treats a 2xx response as success', async () => {
    respondWith(200);

    await expect(
      service.check('https://example.com', new AbortController().signal),
    ).resolves.toEqual({ status: 'success', httpStatus: 200 });
  });

  it('treats a 3xx response as success', async () => {
    respondWith(304);

    const outcome = await service.check('https://example.com', new AbortController().signal);

    expect(outcome.status).toBe('success');
  });

  it('treats a 404 as an error and keeps the status code', async () => {
    respondWith(404);

    await expect(
      service.check('https://example.com', new AbortController().signal),
    ).resolves.toEqual({ status: 'error', httpStatus: 404, error: 'HTTP 404' });
  });

  it('treats a 500 as an error', async () => {
    respondWith(500);

    const outcome = await service.check('https://example.com', new AbortController().signal);

    expect(outcome).toEqual({ status: 'error', httpStatus: 500, error: 'HTTP 500' });
  });

  it('reports the underlying cause of a transport failure', async () => {
    const failure = new TypeError('fetch failed');
    (failure as { cause?: unknown }).cause = new Error('getaddrinfo ENOTFOUND nope.invalid');
    fetchMock.mockRejectedValue(failure);

    await expect(
      service.check('https://nope.invalid', new AbortController().signal),
    ).resolves.toEqual({ status: 'error', error: 'getaddrinfo ENOTFOUND nope.invalid' });
  });

  it('reports a timeout', async () => {
    fetchMock.mockImplementation(
      (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => reject(new Error('aborted')));
        }),
    );

    const outcome = await service.check('https://slow.example', new AbortController().signal, 10);

    expect(outcome).toEqual({ status: 'error', error: 'Request timed out after 10 ms' });
  });
});
