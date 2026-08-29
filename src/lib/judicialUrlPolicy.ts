import { lookup as dnsLookup } from 'node:dns/promises';
import { isIP } from 'node:net';

export interface JudicialUrlPolicyOptions {
  lookup?: (hostname: string) => Promise<Array<{ address: string; family: number }>>;
}

export interface JudicialFetchOptions extends JudicialUrlPolicyOptions {
  maxRedirects?: number;
  timeoutMs?: number;
}

function policyError(code: string, message: string): Error & { code: string } {
  return Object.assign(new Error(message), { code });
}

function ipv4ToNumber(address: string): number | null {
  const parts = address.split('.');
  if (parts.length !== 4 || parts.some((part) => !/^\d+$/.test(part))) return null;
  const octets = parts.map(Number);
  if (octets.some((octet) => octet < 0 || octet > 255)) return null;
  return (((octets[0] * 256 + octets[1]) * 256 + octets[2]) * 256 + octets[3]) >>> 0;
}

function ipv6ToBigInt(address: string): bigint | null {
  const normalized = address.split('%')[0].toLowerCase();
  if (normalized.includes('.')) {
    const separator = normalized.lastIndexOf(':');
    const ipv4 = ipv4ToNumber(normalized.slice(separator + 1));
    if (separator < 0 || ipv4 === null) return null;
    const high = ((ipv4 >>> 16) & 0xffff).toString(16);
    const low = (ipv4 & 0xffff).toString(16);
    address = `${normalized.slice(0, separator)}:${high}:${low}`;
  } else {
    address = normalized;
  }

  const halves = address.split('::');
  if (halves.length > 2) return null;
  const left = halves[0] ? halves[0].split(':') : [];
  const right = halves.length === 2 && halves[1] ? halves[1].split(':') : [];
  if (left.concat(right).some((part) => !/^[0-9a-f]{1,4}$/.test(part))) return null;
  const missing = 8 - left.length - right.length;
  if ((halves.length === 1 && missing !== 0) || (halves.length === 2 && missing < 1)) return null;
  const parts = [...left, ...Array.from({ length: missing }, () => '0'), ...right];
  return parts.reduce((value, part) => (value << 16n) | BigInt(parseInt(part, 16)), 0n);
}

function isPrivateOrReservedIpv4Number(value: number): boolean {
  const first20 = value >>> 20;
  return value === 0 ||
    (value >>> 24) === 10 ||
    (first20 >= (172 << 4) && first20 <= ((172 << 4) | 0x0f)) ||
    (value >>> 16) === ((192 << 8) | 168) ||
    (value >>> 16) === ((169 << 8) | 254) ||
    (value >>> 24) === 127;
}

export function isPrivateOrReservedAddress(address: string, family: number): boolean {
  if (family === 4 || isIP(address) === 4) {
    const value = ipv4ToNumber(address);
    if (value === null) return true;
    return isPrivateOrReservedIpv4Number(value);
  }

  const value = ipv6ToBigInt(address);
  if (value === null) return true;
  if ((value >> 32n) === 0xffffn) {
    return isPrivateOrReservedIpv4Number(Number(value & 0xffffffffn));
  }
  return value === 1n || (value >> 121n) === 0x7en || (value >> 118n) === 0x3fan;
}

export async function validateJudicialUrl(
  input: string,
  options: JudicialUrlPolicyOptions = {}
): Promise<URL> {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw policyError('JUDICIAL_URL_INVALID', 'Invalid URL');
  }

  if (url.protocol !== 'https:') {
    throw policyError('JUDICIAL_URL_INVALID_PROTOCOL', 'Only HTTPS URLs are allowed');
  }

  if (url.username || url.password) {
    throw policyError('JUDICIAL_URL_USERINFO', 'URL userinfo is not allowed');
  }

  if (url.hostname !== 'judicial.gov.tw' && !url.hostname.endsWith('.judicial.gov.tw')) {
    throw policyError('JUDICIAL_URL_FORBIDDEN_HOST', 'Only judicial.gov.tw hosts are allowed');
  }

  const lookup = options.lookup ?? (async (hostname) => dnsLookup(hostname, { all: true }));
  let addresses: Array<{ address: string; family: number }>;
  try {
    addresses = await lookup(url.hostname);
  } catch {
    throw policyError('JUDICIAL_URL_DNS_FAILED', 'Unable to resolve judicial.gov.tw host');
  }
  if (!Array.isArray(addresses) || addresses.length === 0 || addresses.some(({ address, family }) => isPrivateOrReservedAddress(address, family))) {
    throw policyError('JUDICIAL_URL_PRIVATE_ADDRESS', 'URL resolves to a private or reserved address');
  }

  return url;
}

export async function fetchJudicialUrl(
  fetchImpl: typeof fetch,
  url: string,
  options: JudicialFetchOptions = {}
): Promise<Response> {
  const maxRedirects = options.maxRedirects ?? 5;
  const timeoutMs = options.timeoutMs ?? 8000;
  const fetchOne = async (currentUrl: string, redirects: number): Promise<Response> => {
    const validated = await validateJudicialUrl(currentUrl, options);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let response: Response;
    try {
      response = await fetchImpl(validated.toString(), { redirect: 'manual', signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
    const location = response.status >= 300 && response.status < 400
      ? response.headers.get('location')
      : null;
    if (!location) return response;
    if (redirects >= maxRedirects) {
      throw policyError('JUDICIAL_URL_REDIRECT_LIMIT', 'Too many redirects');
    }
    const nextUrl = new URL(location, validated).toString();
    return fetchOne(nextUrl, redirects + 1);
  };

  return fetchOne(url, 0);
}
