/**
 * Official Template Downloader
 * Downloads ODT/PDF templates from judicial.gov.tw, computes SHA-256, stores locally
 */
import https from 'node:https';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { loadManifest, updateTemplateStatus } from './officialTemplateManifest';
import type { OfficialTemplate } from '../types/officialTemplate';

const FILES_DIR = path.resolve(process.cwd(), 'data', 'official-templates', 'files');

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function fetchBuffer(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    const req = mod.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchBuffer(res.headers.location).then(resolve, reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      const chunks: Buffer[] = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    });
    req.on('error', reject);
    req.setTimeout(30000, () => { req.destroy(); reject(new Error(`TIMEOUT: ${url}`)); });
  });
}

function sha256(buf: Buffer): string {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

export async function downloadTemplate(template: OfficialTemplate): Promise<{
  localFilePath: string;
  localFileHash: string;
  templateStatus: 'DOWNLOADED' | 'NEEDS_FIELD_MAPPING' | 'SOURCE_ONLY' | 'DOWNLOAD_FAILED';
}> {
  ensureDir(FILES_DIR);

  const fileUrl = template.editableFileUrl || template.pdfFileUrl;
  if (!fileUrl) {
    return { localFilePath: '', localFileHash: '', templateStatus: 'DOWNLOAD_FAILED' };
  }

  const ext = fileUrl.includes('.odt') ? '.odt' : fileUrl.includes('.pdf') ? '.pdf' : '.dat';
  const localFileName = `${template.id}${ext}`;
  const localFilePath = path.join(FILES_DIR, localFileName);

  try {
    const buffer = await fetchBuffer(fileUrl);
    const hash = sha256(buffer);
    fs.writeFileSync(localFilePath, buffer);
    const relPath = path.relative(process.cwd(), localFilePath);

    updateTemplateStatus(template.id, 'DOWNLOADED', {
      localFilePath: relPath,
      localFileHash: hash,
      downloadedAt: new Date().toISOString(),
    });

    return { localFilePath: relPath, localFileHash: hash, templateStatus: 'DOWNLOADED' };
  } catch (err: any) {
    updateTemplateStatus(template.id, 'DOWNLOAD_FAILED');
    return { localFilePath: '', localFileHash: '', templateStatus: 'DOWNLOAD_FAILED' };
  }
}

export async function downloadAll(): Promise<{ success: number; failed: number; total: number }> {
  const manifest = loadManifest();
  let success = 0;
  let failed = 0;

  for (const template of manifest.templates) {
    const result = await downloadTemplate(template);
    if (result.templateStatus === 'DOWNLOAD_FAILED') {
      failed++;
      console.error(`  FAILED: ${template.id} (${template.name})`);
    } else {
      success++;
      console.log(`  OK: ${template.id} (${template.name}) → ${result.localFileHash.slice(0, 12)}...`);
    }
    // Small delay to be polite
    await new Promise(r => setTimeout(r, 100));
  }

  return { success, failed, total: manifest.templates.length };
}
