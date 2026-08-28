import React from 'react';
import { getStatusConfig } from '../../utils/formatters';

export const Badge = ({ status, customLabel, size = 'md', className = '' }) => {
  const config = getStatusConfig(status);
  const displayLabel = customLabel || config.label;

  const sizes = {
    sm: 'text-[11px] px-2.5 py-0.5 gap-1.5',
    md: 'text-xs px-3.5 py-1 gap-1.5',
    lg: 'text-sm px-4 py-1.5 gap-2',
  };

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border ${config.badgeBorder} ${config.bgColor} ${config.textColor} ${sizes[size]} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${config.dotColor}`} />
      <span className="capitalize tracking-tight font-medium">{displayLabel}</span>
    </span>
  );
};
