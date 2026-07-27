import { BlockedAddressError, assertPublicHostname, isBlockedAddress } from './address-guard';

jest.mock('node:dns/promises', () => ({ lookup: jest.fn() }));

import { lookup } from 'node:dns/promises';

const lookupMock = lookup as unknown as jest.Mock;

describe('isBlockedAddress', () => {
  it.each([
    ['0.0.0.0', 'unspecified'],
    ['127.0.0.1', 'loopback'],
    ['10.1.2.3', 'private class A'],
    ['172.17.0.2', 'Docker bridge'],
    ['172.31.255.254', 'upper edge of 172.16/12'],
    ['192.168.1.1', 'private class C'],
    ['169.254.169.254', 'cloud instance metadata'],
    ['100.64.0.1', 'carrier-grade NAT'],
    ['224.0.0.1', 'multicast'],
    ['255.255.255.255', 'broadcast'],
    ['::1', 'IPv6 loopback'],
    ['fe80::1', 'IPv6 link-local'],
    ['fc00::1', 'IPv6 unique-local'],
    ['::ffff:127.0.0.1', 'IPv4-mapped loopback'],
  ])('blocks %s (%s)', (address) => {
    expect(isBlockedAddress(address)).toBe(true);
  });

  it.each([
    ['8.8.8.8'],
    ['1.1.1.1'],
    ['93.184.216.34'],
    ['172.15.255.255'],
    ['172.32.0.1'],
    ['2606:4700:4700::1111'],
  ])('allows %s', (address) => {
    expect(isBlockedAddress(address)).toBe(false);
  });
});

describe('assertPublicHostname', () => {
  beforeEach(() => {
    lookupMock.mockReset();
  });

  it('passes for a hostname resolving to a public address', async () => {
    lookupMock.mockResolvedValue([{ address: '93.184.216.34', family: 4 }]);

    await expect(assertPublicHostname('example.com')).resolves.toBeUndefined();
  });

  it('rejects a hostname resolving to a private address', async () => {
    lookupMock.mockResolvedValue([{ address: '169.254.169.254', family: 4 }]);

    await expect(assertPublicHostname('metadata.test')).rejects.toBeInstanceOf(
      BlockedAddressError,
    );
  });

  it('rejects when any one of several addresses is private', async () => {
    lookupMock.mockResolvedValue([
      { address: '93.184.216.34', family: 4 },
      { address: '127.0.0.1', family: 4 },
    ]);

    await expect(assertPublicHostname('split.test')).rejects.toThrow('127.0.0.1');
  });
});
