import React from 'react'

interface BadgeProps {
  tone: 'success' | 'warning' | 'danger' | 'info'
  children: React.ReactNode
  className?: string
}

export const Badge: React.FC<BadgeProps> = ({ tone, children, className = '' }) => {
  const bg =
    tone === 'success'
      ? 'var(--color-status-success-bg)'
      : tone === 'warning'
      ? 'var(--color-status-warning-bg)'
      : tone === 'danger'
      ? 'var(--color-status-danger-bg)'
      : 'var(--color-status-info-bg)'

  const color =
    tone === 'success'
      ? 'var(--color-status-success)'
      : tone === 'warning'
      ? 'var(--color-status-warning)'
      : tone === 'danger'
      ? 'var(--color-status-danger)'
      : 'var(--color-status-info)'

  return (
    <span
      className={className}
      style={{
        backgroundColor: bg,
        color,
        padding: 'calc(var(--space-1) - 2px) var(--space-2)',
        fontSize: 'var(--text-sm)',
        borderRadius: '9999px',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
      }}
    >
      {children}
    </span>
  )
}

export default Badge
