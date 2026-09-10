import React from 'react';

export interface ButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onClick' | 'disabled'> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md';
  children: React.ReactNode;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  disabled?: boolean;
}

const variantClasses = {
  primary: 'bg-[var(--color-brand-primary)] text-[var(--color-surface-base)] hover:opacity-90',
  secondary: 'bg-[var(--color-surface-overlay)] text-[var(--color-text-primary)] border border-[var(--color-border-strong)] hover:bg-[var(--color-border-subtle)]',
  ghost: 'bg-transparent text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-overlay)]',
};

const sizeClasses = {
  sm: 'px-[var(--space-3)] py-[var(--space-2)] text-xs',
  md: 'px-[var(--space-4)] py-[var(--space-3)] text-sm',
};

export function Button({
  variant = 'primary',
  size = 'md',
  children,
  onClick,
  disabled = false,
  className = '',
  type = 'button',
  ...buttonProps
}: ButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-[var(--space-2)] rounded-xl font-bold transition-opacity disabled:cursor-not-allowed disabled:opacity-50 ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...buttonProps}
    >
      {children}
    </button>
  );
}

export default Button;
