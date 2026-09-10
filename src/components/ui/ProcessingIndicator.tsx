import React from 'react'
import { CheckCircle, XCircle } from 'lucide-react'

interface ProcessingIndicatorProps {
  status: 'idle' | 'processing' | 'done' | 'error'
  label: string
  detail?: React.ReactNode
}

export const ProcessingIndicator: React.FC<ProcessingIndicatorProps> = ({ status, label, detail }) => {
  const renderIcon = () => {
    if (status === 'done') return <CheckCircle color='var(--color-status-success)' />
    if (status === 'error') return <XCircle color='var(--color-status-danger)' />
    return null
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-2)',
        color: 'var(--color-text-primary)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
        <div style={{ width: 18, height: 18 }}>{renderIcon()}</div>
        <div style={{ fontSize: 'var(--text-base)' }}>{label}</div>
      </div>

      {status === 'processing' && (
        <div style={{ height: 8, background: 'var(--color-surface-base)', overflow: 'hidden', borderRadius: 4 }}>
          <div className='animate-loading-bar' style={{ height: 8, background: 'var(--color-karoshi-accent)', opacity: 0.9 }} />
        </div>
      )}

      {detail && (
        <details>
          <summary style={{ cursor: 'pointer', color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}>
            顯示詳情
          </summary>
          <div style={{ marginTop: 'var(--space-2)', color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}>
            {detail}
          </div>
        </details>
      )}
    </div>
  )
}

export default ProcessingIndicator
