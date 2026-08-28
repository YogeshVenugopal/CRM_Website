import React from 'react';

export const Avatar = ({ name = 'User', src, size = 'md', className = '' }) => {
  const sizes = {
    sm: 'w-7 h-7 text-xs',
    md: 'w-8 h-8 text-xs',
    lg: 'w-10 h-10 text-sm',
  };

  const getInitials = (str) => {
    if (!str) return 'U';
    const parts = str.split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return str.substring(0, 2).toUpperCase();
  };

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={`${sizes[size]} rounded-full object-cover border border-[#EEF1FA] ${className}`}
      />
    );
  }

  return (
    <div
      className={`${sizes[size]} rounded-full bg-[#3B5BFD] text-white flex items-center justify-center font-bold font-mono border border-[#EEF1FA] ${className}`}
    >
      {getInitials(name)}
    </div>
  );
};
