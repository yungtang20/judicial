import React from 'react';

export interface BadgeProps {
  tone: 'success' | 'warning' | 'danger' | 'info';
  children: React.ReactNode;
}

export function Badge({ tone, children }: BadgeProps) {
  return (
    <span
      className="inline-flex items-center rounded-full px-[var(--space-2)] py-[var(--space-1)] text-xs font-semibold"
      style={{
        color: `var(--color-status-${tone})`,
        backgroundColor: `var(--color-status-${tone}-bg)`,
      }}
    >
      {children}
    </span>
  );
}

export default Badge;
