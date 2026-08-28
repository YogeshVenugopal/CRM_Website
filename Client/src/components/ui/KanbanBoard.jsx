import React, { useState } from 'react';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Calendar, User } from 'lucide-react';

export const KanbanBoard = ({
  columns = [],
  items = [],
  onItemMove,
  onItemClick,
  getItemStage = (item) => item.stage,
}) => {
  const [draggedItemId, setDraggedItemId] = useState(null);

  const handleDragStart = (e, itemId) => {
    e.dataTransfer.setData('text/plain', itemId);
    setDraggedItemId(itemId);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e, stageKey) => {
    e.preventDefault();
    const itemId = e.dataTransfer.getData('text/plain') || draggedItemId;
    if (itemId && onItemMove) {
      onItemMove(itemId, stageKey);
    }
    setDraggedItemId(null);
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 pt-1 min-h-[550px] scrollbar-thin">
      {columns.map((col) => {
        const columnItems = items.filter((item) => getItemStage(item) === col.key);

        return (
          <div
            key={col.key}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, col.key)}
            className="w-72 shrink-0 flex flex-col bg-[#EEF1FA]/60 rounded-[24px] border border-[#EEF1FA] max-h-[75vh] p-3"
          >
            {/* Column Header */}
            <div className="flex items-center justify-between p-3 mb-2 rounded-full bg-white shadow-2xs">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold font-display uppercase tracking-wider text-[#16181D]">
                  {col.label}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-[#EEF1FA] text-[#3B5BFD] text-[11px] font-mono font-bold">
                  {columnItems.length}
                </span>
              </div>
              {col.totalValue !== undefined && (
                <span className="text-xs font-mono font-bold text-[#3B5BFD]">
                  {formatCurrency(col.totalValue)}
                </span>
              )}
            </div>

            {/* Column Cards Container */}
            <div className="space-y-3 overflow-y-auto flex-1 pr-1">
              {columnItems.length === 0 ? (
                <div className="p-6 text-center text-xs text-[#8A8FA3] border border-dashed border-[#8A8FA3]/30 rounded-2xl">
                  Drop items here
                </div>
              ) : (
                columnItems.map((item) => (
                  <div
                    key={item.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, item.id)}
                    onClick={() => onItemClick && onItemClick(item)}
                    className="p-4 rounded-2xl border border-[#EEF1FA] bg-white shadow-xs hover:shadow-md transition-all cursor-pointer group space-y-3 relative border-l-4 border-l-[#3B5BFD]"
                  >
                    {/* Title & Client */}
                    <div>
                      <h4 className="text-xs font-bold text-[#16181D] group-hover:text-[#3B5BFD] transition-colors">
                        {item.title || item.name}
                      </h4>
                      {item.clientName && (
                        <p className="text-[11px] text-[#8A8FA3] mt-0.5 font-medium">
                          {item.clientName}
                        </p>
                      )}
                    </div>

                    {/* Monetary Value & Probability */}
                    {item.value !== undefined && (
                      <div className="flex items-center justify-between text-xs pt-2 border-t border-[#EEF1FA]">
                        <span className="font-mono font-bold text-[#16181D]">
                          {formatCurrency(item.value)}
                        </span>
                        {item.probability !== undefined && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#EEF1FA] text-[#3B5BFD] font-bold">
                            {item.probability}% prob
                          </span>
                        )}
                      </div>
                    )}

                    {/* Metadata Footer */}
                    <div className="flex items-center justify-between text-[11px] text-[#8A8FA3]">
                      {item.ownerName && (
                        <div className="flex items-center gap-1 font-medium">
                          <User className="w-3 h-3 text-[#3B5BFD]" />
                          <span>{item.ownerName.split(' ')[0]}</span>
                        </div>
                      )}
                      {item.expectedCloseDate && (
                        <div className="flex items-center gap-1 font-mono text-[10px]">
                          <Calendar className="w-3 h-3 text-[#8A8FA3]" />
                          <span>{formatDate(item.expectedCloseDate)}</span>
                        </div>
                      )}
                    </div>

                    {/* Keyboard / Select Quick Move Button */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute top-3 right-3">
                      <select
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => {
                          e.stopPropagation();
                          if (e.target.value && onItemMove) {
                            onItemMove(item.id, e.target.value);
                          }
                        }}
                        className="text-[10px] bg-[#EEF1FA] border border-transparent rounded-full px-2 py-1 text-[#16181D] font-medium"
                        defaultValue=""
                      >
                        <option value="" disabled>
                          Move...
                        </option>
                        {columns.map((c) => (
                          <option key={c.key} value={c.key}>
                            → {c.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
