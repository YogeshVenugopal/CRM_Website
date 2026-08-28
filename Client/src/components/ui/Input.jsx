import React, { forwardRef } from 'react';

export const Input = forwardRef(({
  label,
  error,
  icon: Icon,
  mono = false,
  className = '',
  ...props
}, ref) => {
  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label className="block text-xs font-semibold text-[#8A8FA3] uppercase tracking-wider pl-1">
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#8A8FA3]">
            <Icon className="w-4 h-4" />
          </div>
        )}
        <input
          ref={ref}
          className={`w-full h-10 rounded-full bg-[#EEF1FA] text-[#16181D] text-xs sm:text-sm transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#3B5BFD]/40 border border-transparent focus:bg-white focus:border-[#3B5BFD] placeholder-[#8A8FA3] ${
            Icon ? 'pl-10 pr-4' : 'px-4'
          } ${mono ? 'font-mono' : ''} ${
            error ? 'border-[#EF4444] bg-[#FEF2F2]' : ''
          } ${className}`}
          {...props}
        />
      </div>
      {error && <p className="text-xs text-[#EF4444] font-medium pl-2">{error}</p>}
    </div>
  );
});

Input.displayName = 'Input';
