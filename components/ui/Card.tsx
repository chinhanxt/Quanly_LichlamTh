import React from 'react';

export const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => {
  return (
    <div className={`bg-white rounded-3xl p-5 shadow-soft border border-surface-border/50 ${className}`}>
      {children}
    </div>
  );
};
