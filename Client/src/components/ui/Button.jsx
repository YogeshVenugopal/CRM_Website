import React from 'react';
import { Loader2 } from 'lucide-react';

export const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon: Icon,
  className = '',
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer select-none';

  const variants = {
    primary: 'bg-[#3B5BFD] text-white hover:bg-[#2A4AEB] active:scale-[0.98] shadow-sm shadow-[#3B5BFD]/25 focus:ring-[#3B5BFD]',
    secondary: 'bg-[#EEF1FA] text-[#16181D] hover:bg-[#E2E6F5] focus:ring-[#3B5BFD]',
    outline: 'border border-[#EEF1FA] bg-white text-[#16181D] hover:bg-[#EEF1FA] hover:border-[#3B5BFD]/30 focus:ring-[#3B5BFD]',
    ghost: 'text-[#8A8FA3] hover:text-[#16181D] hover:bg-[#EEF1FA] focus:ring-[#3B5BFD]',
    danger: 'bg-[#FEF2F2] text-[#EF4444] hover:bg-[#FEE2E2] focus:ring-[#EF4444]',
  };

  const sizes = {
    sm: 'text-xs px-3.5 py-1.5 gap-1.5',
    md: 'text-sm px-5 py-2.5 gap-2',
    lg: 'text-base px-6 py-3 gap-2.5',
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin text-current" />
      ) : Icon ? (
        <Icon className="w-4 h-4 shrink-0" />
      ) : null}
      <span>{children}</span>
    </button>
  );
};
