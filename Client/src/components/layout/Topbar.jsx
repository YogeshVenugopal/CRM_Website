import React, { useState } from 'react';
import { Breadcrumbs } from '../ui/Breadcrumbs';
import { useNotification } from '../../contexts/NotificationContext';
import { CommandPalette } from '../ui/CommandPalette';
import { NotificationPanel } from '../ui/NotificationPanel';
import { UserMenu } from './UserMenu';
import {
  Menu,
  Search,
  Bell,
  Command,
} from 'lucide-react';

export const Topbar = ({ onToggleMobileSidebar, onQuickAction }) => {
  const { unreadCount } = useNotification();
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  return (
    <header className="h-20 bg-transparent px-6 sm:px-8 flex items-center justify-between sticky top-0 z-30 pt-2">
      {/* Left: Mobile Toggle & Page Title / Breadcrumb Context */}
      <div className="flex items-center gap-4">
        <button
          onClick={onToggleMobileSidebar}
          className="p-2 rounded-full bg-white text-[#8A8FA3] hover:text-[#16181D] shadow-xs md:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <Breadcrumbs />
        </div>
      </div>

      {/* Right: Pill Search Bar + Actions */}
      <div className="flex items-center space-x-3">
        {/* Pill-Shaped Search Input */}
        <button
          onClick={() => setIsCommandOpen(true)}
          className="flex items-center gap-3 px-4 py-2 rounded-full bg-[#EEF1FA] hover:bg-[#E2E6F5] text-xs text-[#8A8FA3] transition-all cursor-pointer shadow-2xs border border-transparent hover:border-[#3B5BFD]/30"
        >
          <Search className="w-4 h-4 text-[#8A8FA3]" />
          <span className="hidden sm:inline-block font-medium text-[#16181D]">Search platform or command...</span>
          <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-white text-[#3B5BFD] font-bold shadow-2xs flex items-center gap-0.5">
            <Command className="w-2.5 h-2.5" /> K
          </span>
        </button>

        {/* Notifications Bell */}
        <div className="relative">
          <button
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            className="w-10 h-10 rounded-full bg-white hover:bg-[#EEF1FA] text-[#16181D] flex items-center justify-center relative transition-colors shadow-xs"
            title="Notifications"
          >
            <Bell className="w-4 h-4 text-[#8A8FA3]" />
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#3B5BFD] animate-pulse" />
            )}
          </button>
          <NotificationPanel
            isOpen={isNotifOpen}
            onClose={() => setIsNotifOpen(false)}
          />
        </div>

        {/* User Profile Menu */}
        <UserMenu />
      </div>

      {/* Global Command Palette */}
      <CommandPalette
        isOpen={isCommandOpen}
        onClose={() => setIsCommandOpen(false)}
        onQuickAction={onQuickAction}
      />
    </header>
  );
};
