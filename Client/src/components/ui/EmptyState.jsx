import React from 'react';
import { Button } from './Button';

export const EmptyState = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center rounded-[24px] border border-dashed border-[#EEF1FA] bg-[#EEF1FA]/40">
      {Icon && (
        <div className="w-12 h-12 rounded-full bg-[#3B5BFD]/10 flex items-center justify-center text-[#3B5BFD] mb-4">
          <Icon className="w-6 h-6" />
        </div>
      )}
      <h3 className="text-base font-bold font-display text-[#16181D]">
        {title}
      </h3>
      <p className="text-xs text-[#8A8FA3] max-w-sm mt-1 mb-5">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button variant="primary" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
