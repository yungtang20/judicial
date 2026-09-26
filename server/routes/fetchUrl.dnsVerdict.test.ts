import { describe, it, expect } from 'vitest';
import { classifyHostDns, verifyDnsSafe, resolveSafeDnsAddresses } from './fetchUrl';

describe('DNS 安全判定分類', () => {
  it('IP 形式：私有位址判為 private，公開位址判為 safe', async () => {
    expect((await classifyHostDns('127.0.0.1')).status).toBe('private');
    expect((await classifyHostDns('10.0.0.1')).status).toBe('private');
    expect((await classifyHostDns('169.254.169.254')).status).toBe('private');
    expect((await classifyHostDns('::1')).status).toBe('private');
    expect((await classifyHostDns('8.8.8.8')).status).toBe('safe');
  });

  it('無法解析的網域判為 unresolvable，不得誤報為私有位址', async () => {
    const verdict = await classifyHostDns('this-domain-should-never-resolve.invalid');
    expect(verdict.status).toBe('unresolvable');
    expect(verdict.addresses).toEqual([]);
    // 這是本次修正的核心：DNS 失敗與 SSRF 是兩件事。
    expect(verdict.status).not.toBe('private');
  });

  it('verifyDnsSafe 僅在 safe 時為 true', async () => {
    expect(await verifyDnsSafe('127.0.0.0.1')).toBe(false);
    expect(await verifyDnsSafe('this-domain-should-never-resolve.invalid')).toBe(false);
  });

  it('resolveSafeDnsAddresses 維持既有回傳契約（位址陣列）', async () => {
    expect(await resolveSafeDnsAddresses('8.8.8.8')).toEqual(['8.8.8.8']);
    expect(await resolveSafeDnsAddresses('127.0.0.1')).toEqual([]);
  });
});
