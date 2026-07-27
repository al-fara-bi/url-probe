import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, request } from './client';

describe('request', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns the parsed body on success', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ jobId: 'abc' }), { status: 200 }),
    );

    await expect(request('/jobs')).resolves.toEqual({ jobId: 'abc' });
  });

  it('throws ApiError carrying the server message', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ message: ['bad url'] }), { status: 400 }),
    );

    await expect(request('/jobs')).rejects.toMatchObject({ status: 400, message: 'bad url' });
  });

  it('falls back to a generic message when the body is not JSON', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('oops', { status: 500 }));

    await expect(request('/jobs')).rejects.toBeInstanceOf(ApiError);
  });
});
