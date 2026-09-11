import React from 'react';
import { AlertCircle, CheckCircle2, Circle, LoaderCircle } from 'lucide-react';

export interface ProcessingIndicatorProps {
  status: 'idle' | 'processing' | 'done' | 'error';
  label: string;
  detail?: string;
}

const statusStyles = {
  idle: {
    color: 'var(--color-text-muted)',
    backgroundColor: 'var(--color-surface-overlay)',
    Icon: Circle,
  },
  processing: {
    color: 'var(--color-status-info)',
    backgroundColor: 'var(--color-status-info-bg)',
    Icon: LoaderCircle,
  },
  done: {
    color: 'var(--color-status-success)',
    backgroundColor: 'var(--color-status-success-bg)',
    Icon: CheckCircle2,
  },
  error: {
    color: 'var(--color-status-danger)',
    backgroundColor: 'var(--color-status-danger-bg)',
    Icon: AlertCircle,
  },
};

export function ProcessingIndicator({ status, label, detail }: ProcessingIndicatorProps) {
  const { color, backgroundColor, Icon } = statusStyles[status];

  return (
    <div
      className="overflow-hidden rounded-xl border border-[var(--color-border-subtle)]"
      style={{ backgroundColor }}
      role={status === 'error' ? 'alert' : 'status'}
      aria-live="polite"
    >
      <div className="flex items-center gap-[var(--space-3)] p-[var(--space-4)]" style={{ color }}>
        <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
        <span className="text-sm font-semibold">{label}</span>
      </div>
      {status === 'processing' && (
        <div className="h-1 overflow-hidden bg-[var(--color-surface-base)]" aria-hidden="true">
          <div className="h-full w-1/3 animate-loading-bar bg-[var(--color-status-info)]" />
        </div>
      )}
      {detail && (
        <details className="border-t border-[var(--color-border-subtle)] px-[var(--space-4)] py-[var(--space-3)] text-xs text-[var(--color-text-secondary)]">
          <summary className="cursor-pointer text-[var(--color-text-muted)]">查看處理細節</summary>
          <pre className="mt-[var(--space-2)] whitespace-pre-wrap font-sans leading-relaxed">{detail}</pre>
        </details>
      )}
    </div>
  );
}

export default ProcessingIndicator;
