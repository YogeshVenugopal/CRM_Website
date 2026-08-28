import React, { forwardRef } from 'react';

export const Select = forwardRef(({
  label,
  error,
  options = [],
  className = '',
  placeholder = 'Select option...',
  ...props
}, ref) => {
  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label className="block text-xs font-semibold text-[#8A8FA3] uppercase tracking-wider pl-1">
          {label}
        </label>
      )}
      <select
        ref={ref}
        className={`w-full h-10 rounded-full bg-[#EEF1FA] text-[#16181D] text-xs sm:text-sm px-4 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#3B5BFD]/40 border border-transparent focus:bg-white focus:border-[#3B5BFD] ${
          error ? 'border-[#EF4444] bg-[#FEF2F2]' : ''
        } ${className}`}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-[#EF4444] font-medium pl-2">{error}</p>}
    </div>
  );
});

Select.displayName = 'Select';
