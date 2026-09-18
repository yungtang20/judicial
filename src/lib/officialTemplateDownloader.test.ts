import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { OfficialTemplate } from '../types/officialTemplate';

type Handler = (arg?: unknown) => void;

interface MockResponse {
  statusCode: number | undefined;
  headers: Record<string, string | undefined>;
  on(event: string, cb: Handler): void;
}

interface MockRequest {
  on(event: string, cb: Handler): void;
  setTimeout(ms: number, cb: () => void): void;
  destroy(): void;
}

type GetFn = (url: string, opts: Record<string, unknown>, cb: (res: MockResponse) => void) => MockRequest;

const state = vi.hoisted(() => {
  return {
    calls: [] as { url: string; opts: Record<string, unknown> }[],
    timeoutHandlers: [] as (() => void)[],
    destroyed: [] as string[],
  };
});

function makeRequest(url: string): MockRequest {
  const handlers = new Map<string, Handler>();
  const req: MockRequest = {
    on(event, cb) {
      handlers.set(event, cb);
      return req;
    },
    setTimeout(_ms: number, cb: () => void) {
      state.timeoutHandlers.push(cb);
      return req;
    },
    destroy() {
      state.destroyed.push(url);
    },
  };
  return req;
}

interface ResponseScript {
  statusCode?: number | undefined;
  headers?: Record<string, string | undefined>;
  body?: Buffer;
  error?: Error;
  timeout?: boolean;
  redirect?: string;
}

let responseQueue: ResponseScript[] = [];

function makeGet(impl: (url: string, opts: Record<string, unknown>, cb: (res: MockResponse) => void) => MockRequest): GetFn {
  return (url, opts, cb) => {
    state.calls.push({ url, opts });
    return impl(url, opts, cb);
  };
}

const sha256Hex = (buf: Buffer): string => crypto.createHash('sha256').update(buf).digest('hex');

function makeResponse(statusCode: number, headers: Record<string, string>, chunks: Buffer[]): MockResponse {
  const listeners = new Map<string, Handler[]>();
  return {
    statusCode,
    headers,
    on(event, cb) {
      const list = listeners.get(event) || [];
      list.push(cb);
      listeners.set(event, list);
      if (event === 'data') chunks.forEach(chunk => cb(chunk));
      if (event === 'end') {
        for (const h of listeners.get('end') || []) h();
      }
      return;
    },
  };
}

vi.mock('node:https', () => ({
  default: {
    get: (...args: Parameters<GetFn>) => httpsGetRef(...args),
  },
}));

vi.mock('node:http', () => ({
  default: {
    get: (...args: Parameters<GetFn>) => httpGetRef(...args),
  },
}));

let httpsGetRef: GetFn = () => { throw new Error('https.get not configured'); };
let httpGetRef: GetFn = () => { throw new Error('http.get not configured'); };

describe('officialTemplateDownloader', () => {
  let tmpDir: string;
  let manifestPath: string;

  beforeEach(() => {
    vi.resetModules();
    state.calls.length = 0;
    state.timeoutHandlers.length = 0;
    state.destroyed.length = 0;
    responseQueue = [];
    httpsGetRef = () => { throw new Error('Unexpected https.get'); };
    httpGetRef = () => { throw new Error('Unexpected http.get'); };
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'odt-dl-'));
    manifestPath = path.join(tmpDir, 'data', 'official-templates', 'manifest.json');
    fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
    vi.spyOn(process, 'cwd').mockReturnValue(tmpDir);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  const importDownloader = async () => (await import('./officialTemplateDownloader')).downloadTemplate;

  const makeTemplate = (overrides: Partial<OfficialTemplate> = {}): OfficialTemplate => ({
    id: 'judicial-test-1',
    category: '民事',
    code: '0000',
    name: '測試範本',
    sourcePageUrl: 'https://www.judicial.gov.tw/tw/test.html',
    editableFileUrl: 'https://www.judicial.gov.tw/tw/test.odt',
    pdfFileUrl: null,
    officialUpdatedAt: '114-08-28',
    localFilePath: null,
    localFileHash: null,
    templateStatus: 'SOURCE_ONLY',
    fields: [],
    downloadedAt: null,
    ...overrides,
  });

  it('downloads a template, records hash and DOWNLOADED status in a temp dir', async () => {
    const body = Buffer.from('ODT-body');
    const expectedHash = sha256Hex(body);
    fs.writeFileSync(manifestPath, JSON.stringify([makeTemplate()]));
    httpsGetRef = makeGet((url, _opts, cb) => {
      const req = makeRequest(url);
      queueMicrotask(() => cb(makeResponse(200, {}, [body])));
      return req;
    });
    const downloadTemplate = await importDownloader();
    const result = await downloadTemplate(makeTemplate());
    expect(result.templateStatus).toBe('DOWNLOADED');
    expect(result.localFileHash).toBe(expectedHash);
    expect(result.localFilePath).toBe(path.join('data', 'official-templates', 'files', 'judicial-test-1.odt'));
    expect(fs.readFileSync(path.join(tmpDir, 'data', 'official-templates', 'files', 'judicial-test-1.odt'))).toEqual(body);
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8')) as OfficialTemplate[];
    const updated = manifest.find(t => t.id === 'judicial-test-1');
    expect(updated).toBeDefined();
    expect(updated!.templateStatus).toBe('DOWNLOADED');
    expect(updated!.localFileHash).toBe(expectedHash);
    expect(updated!.localFilePath).toBe(result.localFilePath);
    expect(typeof updated!.downloadedAt).toBe('string');
  });

  it('fails closed for template without any file URL', async () => {
    fs.writeFileSync(manifestPath, JSON.stringify([makeTemplate({ editableFileUrl: null, pdfFileUrl: null })]));
    const downloadTemplate = await importDownloader();
    const result = await downloadTemplate(makeTemplate({ editableFileUrl: null, pdfFileUrl: null }));
    expect(result).toEqual({ localFilePath: '', localFileHash: '', templateStatus: 'DOWNLOAD_FAILED' });
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8')) as OfficialTemplate[];
    expect(manifest.find(t => t.id === 'judicial-test-1')!.templateStatus).toBe('SOURCE_ONLY');
  });

  it('marks DOWNLOAD_FAILED and updates manifest on HTTP error response', async () => {
    fs.writeFileSync(manifestPath, JSON.stringify([makeTemplate()]));
    httpsGetRef = makeGet((url, _opts, cb) => {
      const req = makeRequest(url);
      queueMicrotask(() => cb(makeResponse(500, {}, [Buffer.from('err')])));
      return req;
    });
    const downloadTemplate = await importDownloader();
    const result = await downloadTemplate(makeTemplate());
    expect(result).toEqual({ localFilePath: '', localFileHash: '', templateStatus: 'DOWNLOAD_FAILED' });
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8')) as OfficialTemplate[];
    expect(manifest.find(t => t.id === 'judicial-test-1')!.templateStatus).toBe('DOWNLOAD_FAILED');
    expect(fs.existsSync(path.join(tmpDir, 'data', 'official-templates', 'files', 'judicial-test-1.odt'))).toBe(false);
  });

  it('follows redirects to download the final body', async () => {
    const body = Buffer.from('redirected-odt');
    const expectedHash = sha256Hex(body);
    fs.writeFileSync(manifestPath, JSON.stringify([makeTemplate()]));
    let call = 0;
    httpsGetRef = makeGet((url, _opts, cb) => {
      const req = makeRequest(url);
      if (call === 0) {
        call++;
        queueMicrotask(() => cb(makeResponse(302, { location: 'https://mirror.example.gov.tw/final.odt' }, [])));
      } else {
        queueMicrotask(() => cb(makeResponse(200, {}, [body])));
      }
      return req;
    });
    const downloadTemplate = await importDownloader();
    const result = await downloadTemplate(makeTemplate());
    expect(result.templateStatus).toBe('DOWNLOADED');
    expect(result.localFileHash).toBe(expectedHash);
    expect(state.calls).toHaveLength(2);
    expect(state.calls[1].url).toBe('https://mirror.example.gov.tw/final.odt');
  });

  it('rejects non-http(s) urls via http mock absence (uses https only when needed)', async () => {
    const body = Buffer.from('pdf-body');
    fs.writeFileSync(manifestPath, JSON.stringify([makeTemplate({ editableFileUrl: 'http://www.judicial.gov.tw/tw/test.pdf' })]));
    httpsGetRef = () => { throw new Error('Unexpected https.get for http url'); };
    httpGetRef = makeGet((url, _opts, cb) => {
      const req = makeRequest(url);
      queueMicrotask(() => cb(makeResponse(200, {}, [body])));
      return req;
    });
    const downloadTemplate = await importDownloader();
    const result = await downloadTemplate(makeTemplate({ editableFileUrl: 'http://www.judicial.gov.tw/tw/test.pdf' }));
    expect(result.templateStatus).toBe('DOWNLOADED');
    expect(result.localFilePath).toContain('.pdf');
  });
});
