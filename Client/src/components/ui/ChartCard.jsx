import React from 'react';

export const ChartCard = ({ title, subtitle, children, action, className = '' }) => {
  return (
    <div className={`p-6 sm:p-8 rounded-[24px] bg-white border border-[#EEF1FA] shadow-[0_10px_30px_rgba(0,0,0,0.04)] flex flex-col justify-between ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h3 className="text-base font-bold font-display text-[#16181D]">
            {title}
          </h3>
          {subtitle && (
            <p className="text-xs text-[#8A8FA3] mt-0.5 font-normal">
              {subtitle}
            </p>
          )}
        </div>
        {action && <div>{action}</div>}
      </div>
      <div className="w-full flex-1 min-h-[240px]">{children}</div>
    </div>
  );
};
