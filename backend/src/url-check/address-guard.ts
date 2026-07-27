import { lookup } from 'node:dns/promises';

/** Raised when a URL is refused before any request is made. */
export class BlockedAddressError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BlockedAddressError';
  }
}

/**
 * Ranges a public URL checker must never reach. Beyond the obvious loopback
 * and private blocks, 169.254.0.0/16 covers cloud instance metadata and
 * 172.16.0.0/12 covers Docker bridge networks, so a deployed instance cannot
 * be used to probe its own host or its sibling containers.
 */
const BLOCKED_V4: ReadonlyArray<readonly [string, number]> = [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['224.0.0.0', 4],
  ['240.0.0.0', 4],
];

function toInt(ipv4: string): number {
  return ipv4.split('.').reduce((acc, octet) => acc * 256 + Number(octet), 0);
}

function isBlockedV4(address: string): boolean {
  const value = toInt(address);

  return BLOCKED_V4.some(([base, bits]) => {
    const mask = (0xffffffff << (32 - bits)) >>> 0;

    return ((value & mask) >>> 0) === ((toInt(base) & mask) >>> 0);
  });
}

function isBlockedV6(address: string): boolean {
  const normalized = address.toLowerCase().split('%')[0];

  if (normalized === '::' || normalized === '::1') {
    return true;
  }

  const mapped = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/.exec(normalized);

  if (mapped) {
    return isBlockedV4(mapped[1]);
  }

  const leading = Number.parseInt(normalized.split(':')[0] || '0', 16);

  // fc00::/7 unique-local, fe80::/10 link-local
  return (leading & 0xfe00) === 0xfc00 || (leading & 0xffc0) === 0xfe80;
}

export function isBlockedAddress(address: string): boolean {
  return address.includes(':') ? isBlockedV6(address) : isBlockedV4(address);
}

/**
 * Resolves a hostname and rejects it if any of its addresses is private or
 * reserved.
 *
 * Known gap: the name is resolved here and resolved again by fetch when the
 * connection is made, so a DNS rebinding attack could in principle answer
 * differently the second time. Closing that requires pinning the resolved
 * address at connect time, which fetch does not expose. Proportionate for a
 * public demo; a hostile environment would need a custom agent.
 */
export async function assertPublicHostname(hostname: string): Promise<void> {
  const resolved = await lookup(hostname, { all: true });

  for (const { address } of resolved) {
    if (isBlockedAddress(address)) {
      throw new BlockedAddressError(`Blocked private or reserved address: ${address}`);
    }
  }
}

/**
 * Off by default so local runs and the test suite behave exactly as the
 * assignment describes. Enabled in the public deployment.
 */
export const isAddressGuardEnabled = (): boolean =>
  process.env.BLOCK_PRIVATE_ADDRESSES === 'true';
