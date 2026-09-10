import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Card Component
 * A unified container with consistent rounded corners, padding, background, and border.
 * Uses design tokens for colors to ensure consistency across the application.
 */
export const Card: React.FC<CardProps> = ({ children, className = '' }) => {
  return (
    <div
      className={`
        rounded-lg
        p-4
        bg-[var(--color-surface-raised)]
        border
        border-[var(--color-border-subtle)]
        ${className}
      `}
    >
      {children}
    </div>
  );
};

export default Card;
