import React from 'react';

export const SkeletonRow = ({ columns = 5 }) => {
  return (
    <tr className="animate-pulse border-b border-[#EEF1FA]">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="py-3.5 px-4">
          <div className="h-4 bg-[#EEF1FA] rounded-full w-3/4" />
        </td>
      ))}
    </tr>
  );
};

export const SkeletonCard = () => {
  return (
    <div className="p-6 rounded-[24px] border border-[#EEF1FA] bg-white shadow-xs animate-pulse space-y-3">
      <div className="h-4 bg-[#EEF1FA] rounded-full w-1/3" />
      <div className="h-7 bg-[#EEF1FA] rounded-full w-1/2" />
      <div className="h-3 bg-[#EEF1FA] rounded-full w-full" />
    </div>
  );
};

export const SkeletonMetric = () => {
  return (
    <div className="p-6 rounded-[24px] border border-[#EEF1FA] bg-white shadow-xs animate-pulse space-y-3">
      <div className="h-3 bg-[#EEF1FA] rounded-full w-1/3" />
      <div className="h-8 bg-[#EEF1FA] rounded-full w-1/2" />
      <div className="h-2 bg-[#EEF1FA] rounded-full w-full mt-2" />
    </div>
  );
};
