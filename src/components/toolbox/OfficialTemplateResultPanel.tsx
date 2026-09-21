import React, { useState } from 'react';
import { Download, Loader2, ShieldCheck } from 'lucide-react';

export interface OfficialTemplateRenderResult {
  templateId: string;
  documentBase64: string;
  documentText: string;
  fileName: string;
  mimeType: string;
  artifactFingerprint: string;
  authorization: {
    finalGateStatus: 'READY';
    exportPolicy: 'READY_ONLY';
    templateId?: string;
    templateSourceHash?: string;
    artifactFingerprint?: string;
    artifactMimeType?: string;
    artifactFileName?: string;
    documentFingerprint: string;
  };
}

async function sha256Hex(value: ArrayBuffer | string): Promise<string> {
  const bytes = typeof value === 'string' ? new TextEncoder().encode(value) : value;
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

interface OfficialTemplateResultPanelProps {
  result: OfficialTemplateRenderResult;
  onError: (message: string) => void;
}

export const OfficialTemplateResultPanel: React.FC<OfficialTemplateResultPanelProps> = ({ result, onError }) => {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const binary = atob(result.documentBase64);
      const bytes = new Uint8Array(binary.length);
      for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
      const artifactFingerprint = await sha256Hex(bytes.buffer);
      const normalizedTextFingerprint = await sha256Hex(JSON.stringify(result.documentText));
      if (
        result.authorization.finalGateStatus !== 'READY' ||
        result.authorization.exportPolicy !== 'READY_ONLY' ||
        artifactFingerprint !== result.artifactFingerprint ||
        artifactFingerprint !== result.authorization.artifactFingerprint ||
        normalizedTextFingerprint !== result.authorization.documentFingerprint ||
        result.authorization.templateId !== result.templateId ||
        result.authorization.artifactMimeType !== result.mimeType ||
        result.authorization.artifactFileName !== result.fileName
      ) {
        throw new Error('ODT artifact 與 P9 授權 fingerprint 不一致，已拒絕下載。');
      }
      const blob = new Blob([bytes], { type: result.mimeType });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = result.fileName;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      onError(error instanceof Error ? error.message : 'ODT 授權驗證失敗。');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
      <p className="flex items-center gap-2 text-sm font-semibold text-emerald-300">
        <ShieldCheck className="h-4 w-4" />P9 READY_ONLY 授權已取得
      </p>
      <p className="mt-1 text-xs text-slate-300">ODT binary 與 normalized text 會在下載前再次驗證。</p>
      <button
        type="button"
        onClick={handleDownload}
        disabled={isDownloading}
        className="mt-3 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
      >
        {isDownloading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
        下載已授權 ODT
      </button>
      <span className="ml-3 text-xs text-slate-400" aria-label="artifact fingerprint">
        {result.artifactFingerprint.slice(0, 12)}…
      </span>
    </div>
  );
};
