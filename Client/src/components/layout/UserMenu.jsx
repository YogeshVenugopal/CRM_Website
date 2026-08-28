import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { ROLE_LABELS } from '../../utils/rbac';
import { Avatar } from '../ui/Avatar';
import { LogOut, ChevronDown, Shield, Settings } from 'lucide-react';

export const UserMenu = () => {
  const { user, role, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 p-1.5 rounded-full hover:bg-[#EEF1FA] transition-colors cursor-pointer"
      >
        <Avatar name={user?.name} src={user?.avatar} size="sm" />
        <span className="text-xs font-bold text-[#16181D] hidden sm:inline-block">
          {user?.name}
        </span>
        <ChevronDown className="w-3.5 h-3.5 text-[#8A8FA3]" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white border border-[#EEF1FA] rounded-[24px] shadow-2xl z-50 p-3 space-y-2">
          {/* User Info */}
          <div className="px-3 py-3 border-b border-[#EEF1FA]">
            <p className="text-xs font-bold text-[#16181D]">{user?.name}</p>
            <p className="text-[11px] text-[#8A8FA3] font-mono">{user?.email}</p>
            <div className="flex items-center gap-1.5 mt-2">
              <Shield className="w-3 h-3 text-[#3B5BFD]" />
              <span className="text-[10px] font-mono font-bold uppercase text-[#3B5BFD]">
                {role?.replace(/_/g, ' ') || 'User'}
              </span>
            </div>
          </div>

          {/* Account Info */}
          <div className="px-3 py-2">
            <div className="text-[10px] font-mono font-bold uppercase text-[#8A8FA3] mb-2">Account</div>
            <div className="space-y-1.5 text-xs text-[#16181D]">
              <div className="flex items-center gap-2">
                <span className="text-[#8A8FA3] w-16">Role</span>
                <span className="font-medium capitalize">{role?.replace(/_/g, ' ')}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[#8A8FA3] w-16">Status</span>
                <span className="font-medium text-[#10B981]">Active</span>
              </div>
            </div>
          </div>

          {/* Logout */}
          <div className="border-t border-[#EEF1FA] pt-1">
            <button
              onClick={() => {
                logout();
                setIsOpen(false);
              }}
              className="w-full text-left px-3 py-2 rounded-full text-xs text-[#EF4444] hover:bg-[#EF4444]/10 flex items-center gap-2 font-bold transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" /> Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
