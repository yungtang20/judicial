import React from 'react'

interface CardProps {
  children: React.ReactNode
  className?: string
}

export const Card: React.FC<CardProps> = ({ children, className = '' }) => {
  return (
    <div
      className={className}
      style={{
        backgroundColor: 'var(--color-surface-raised)',
        border: '1px solid var(--color-border-subtle)',
        color: 'var(--color-text-primary)',
        padding: 'var(--space-4)',
        borderRadius: '8px',
      }}
    >
      {children}
    </div>
  )
}

export default Card
