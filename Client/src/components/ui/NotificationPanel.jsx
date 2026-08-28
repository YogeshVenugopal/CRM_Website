import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotification } from '../../contexts/NotificationContext';
import { Bell, CheckCheck, ExternalLink, X } from 'lucide-react';
import { formatDate } from '../../utils/formatters';

export const NotificationPanel = ({ isOpen, onClose }) => {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotification();
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleItemClick = (notif) => {
    markAsRead(notif.id);
    if (notif.link) {
      navigate(notif.link);
      onClose();
    }
  };

  return (
    <div className="absolute right-0 top-12 w-80 sm:w-96 bg-white border border-[#EEF1FA] rounded-[24px] shadow-2xl z-50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#EEF1FA] bg-[#EEF1FA]/40">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-[#3B5BFD]" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#16181D]">
            Notifications
          </h3>
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-[#3B5BFD] text-white text-[10px] font-mono font-bold">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-[11px] text-[#3B5BFD] hover:underline flex items-center gap-1 font-semibold"
            >
              <CheckCheck className="w-3.5 h-3.5" /> Mark all read
            </button>
          )}
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-[#EEF1FA] text-[#8A8FA3] hover:text-[#16181D] flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* List */}
      <div className="max-h-96 overflow-y-auto divide-y divide-[#EEF1FA]">
        {notifications.length === 0 ? (
          <div className="p-6 text-center text-xs text-[#8A8FA3]">
            No notifications.
          </div>
        ) : (
          notifications.map((item) => (
            <div
              key={item.id}
              onClick={() => handleItemClick(item)}
              className={`p-4 transition-colors cursor-pointer hover:bg-[#EEF1FA]/50 ${
                !item.read ? 'bg-[#3B5BFD]/5 font-medium' : ''
              }`}
            >
              <div className="flex items-start justify-between">
                <span className="text-[10px] uppercase font-mono tracking-wider font-bold text-[#3B5BFD]">
                  {item.category || 'System'}
                </span>
                <span className="text-[10px] font-mono text-[#8A8FA3]">
                  {formatDate(item.createdAt, true)}
                </span>
              </div>
              <h4 className="text-xs font-bold text-[#16181D] mt-1">
                {item.title}
              </h4>
              <p className="text-xs text-[#8A8FA3] mt-0.5 leading-relaxed">
                {item.message}
              </p>
              {item.link && (
                <div className="mt-2 text-xs font-semibold text-[#3B5BFD] inline-flex items-center gap-1 hover:underline">
                  View Record <ExternalLink className="w-3 h-3" />
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
