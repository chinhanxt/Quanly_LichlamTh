import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  fullWidth = false,
  className = '',
  ...props
}) => {
  const base = "px-6 py-3 rounded-full font-medium transition-all duration-200 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer";
  const variants = {
    primary: "bg-brand-600 hover:bg-brand-700 text-white shadow-pill",
    secondary: "bg-brand-50 hover:bg-brand-100 text-brand-600",
    ghost: "bg-transparent text-surface-textSecondary hover:bg-black/5"
  };

  return (
    <button
      className={`${base} ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
