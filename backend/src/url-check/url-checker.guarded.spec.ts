jest.mock('node:dns/promises', () => ({ lookup: jest.fn() }));

import { lookup } from 'node:dns/promises';
import { UrlCheckerService } from './url-checker.service';

const lookupMock = lookup as unknown as jest.Mock;

const PUBLIC = [{ address: '93.184.216.34', family: 4 }];
const PRIVATE = [{ address: '169.254.169.254', family: 4 }];

const redirectTo = (location: string, status = 302): Response =>
  new Response(null, { status, headers: { location } });

describe('UrlCheckerService with BLOCK_PRIVATE_ADDRESSES enabled', () => {
  let service: UrlCheckerService;
  let fetchMock: jest.SpyInstance;

  beforeEach(() => {
    process.env.BLOCK_PRIVATE_ADDRESSES = 'true';
    // guardEnabled is read at construction, so the flag must be set first.
    service = new UrlCheckerService();
    fetchMock = jest.spyOn(global, 'fetch');
    lookupMock.mockReset();
  });

  afterEach(() => {
    delete process.env.BLOCK_PRIVATE_ADDRESSES;
    fetchMock.mockRestore();
  });

  const check = (url: string) => service.check(url, new AbortController().signal);

  it('refuses a URL resolving to a private address without issuing a request', async () => {
    lookupMock.mockResolvedValue(PRIVATE);

    const outcome = await check('http://metadata.test/latest/meta-data/');

    expect(outcome.status).toBe('error');
    expect(outcome.error).toContain('169.254.169.254');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('refuses a literal private IP', async () => {
    lookupMock.mockResolvedValue([{ address: '127.0.0.1', family: 4 }]);

    const outcome = await check('http://127.0.0.1:6379/');

    expect(outcome.status).toBe('error');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('allows a public URL and reports its status', async () => {
    lookupMock.mockResolvedValue(PUBLIC);
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }));

    await expect(check('https://example.com')).resolves.toEqual({
      status: 'success',
      httpStatus: 200,
    });
  });

  it('does not let fetch follow redirects on its own', async () => {
    lookupMock.mockResolvedValue(PUBLIC);
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }));

    await check('https://example.com');

    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.com',
      expect.objectContaining({ method: 'HEAD', redirect: 'manual' }),
    );
  });

  it('blocks a redirect from a public host to a private address', async () => {
    lookupMock.mockImplementation(async (hostname: string) =>
      hostname === 'example.com' ? PUBLIC : PRIVATE,
    );
    fetchMock.mockResolvedValueOnce(redirectTo('http://169.254.169.254/latest/meta-data/'));

    const outcome = await check('https://example.com/redirect');

    expect(outcome.status).toBe('error');
    expect(outcome.error).toContain('169.254.169.254');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('follows a public redirect and reports the final status', async () => {
    lookupMock.mockResolvedValue(PUBLIC);
    fetchMock
      .mockResolvedValueOnce(redirectTo('https://example.com/final'))
      .mockResolvedValueOnce(new Response(null, { status: 200 }));

    await expect(check('https://example.com/start')).resolves.toEqual({
      status: 'success',
      httpStatus: 200,
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('resolves a relative redirect target against the current URL', async () => {
    lookupMock.mockResolvedValue(PUBLIC);
    fetchMock
      .mockResolvedValueOnce(redirectTo('/moved'))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));

    await check('https://example.com/start');

    expect(fetchMock).toHaveBeenLastCalledWith(
      'https://example.com/moved',
      expect.objectContaining({ redirect: 'manual' }),
    );
  });

  it('gives up after too many redirects', async () => {
    lookupMock.mockResolvedValue(PUBLIC);
    fetchMock.mockResolvedValue(redirectTo('https://example.com/loop'));

    const outcome = await check('https://example.com/loop');

    expect(outcome).toEqual({ status: 'error', error: 'Too many redirects (more than 5)' });
  });

  it('blocks a redirect to a non-HTTP protocol', async () => {
    lookupMock.mockResolvedValue(PUBLIC);
    fetchMock.mockResolvedValueOnce(redirectTo('file:///etc/passwd'));

    const outcome = await check('https://example.com/redirect');

    expect(outcome.status).toBe('error');
    expect(outcome.error).toContain('Blocked protocol');
  });
});
