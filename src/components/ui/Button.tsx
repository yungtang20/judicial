import React from 'react'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost'
export type ButtonSize = 'sm' | 'md'

interface ButtonProps {
  variant?: ButtonVariant
  size?: ButtonSize
  children: React.ReactNode
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void
  disabled?: boolean
  className?: string
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  children,
  onClick,
  disabled = false,
  className = '',
}) => {
  const backgroundColor =
    variant === 'primary'
      ? 'var(--color-karoshi-accent)'
      : variant === 'secondary'
      ? 'var(--color-surface-raised)'
      : 'transparent'

  const color = variant === 'primary' ? 'var(--color-text-primary)' : 'var(--color-text-primary)'

  const padding = size === 'sm' ? 'calc(var(--space-2) + "")' : 'calc(var(--space-3) + "")'
  // Using explicit pixel fallback if css variable not available

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={className}
      style={{
        backgroundColor,
        color,
        padding: size === 'sm' ? 'var(--space-2)' : 'var(--space-3)',
        fontSize: 'var(--text-base)',
        border: variant === 'ghost' ? 'none' : '1px solid var(--color-border-subtle)',
        borderRadius: '6px',
        opacity: disabled ? 0.6 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      {children}
    </button>
  )
}

export default Button
